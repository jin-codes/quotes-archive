/**
 * Quotes Archive backend (Google Apps Script + Google Sheets).
 *
 * Sheets (created automatically on first call):
 *   quotes    id | quote | author | category | tags | language | date_added | translation_group
 *   favorites email | quote_id
 *   pending   id | submitter_email | type | original_quote_id | quote | author | category | tags | language | status | created_at
 *
 * Script properties (Project Settings -> Script properties):
 *   GOOGLE_CLIENT_ID  OAuth web client id used by the site's Google sign-in button
 *   ADMIN_EMAILS      comma separated admin emails
 *   SESSION_SECRET    any long random string
 *
 * Deploy as Web app: execute as "Me", access "Anyone".
 */

var QUOTE_COLS = ['id', 'quote', 'author', 'category', 'tags', 'language', 'date_added', 'translation_group'];
var FAV_COLS = ['email', 'quote_id'];
var PENDING_COLS = [
  'id', 'submitter_email', 'type', 'original_quote_id', 'quote', 'author',
  'category', 'tags', 'language', 'status', 'created_at',
];
var SESSION_TTL_MS = 30 * 24 * 3600 * 1000;

function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    out = { ok: true, data: handle_(req) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('quotes-archive api');
}

function handle_(req) {
  var a = req.action;
  var p = req.payload || {};
  if (a === 'list') return { quotes: listQuotes_() };
  if (a === 'login') return login_(p.idToken);

  var user = verifySession_(req.token);
  if (a === 'me') return user;
  if (!user) throw new Error('unauthorized');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (a) {
      case 'favorites':
        return { ids: favoriteIds_(user.email) };
      case 'setFavorite':
        return setFavorite_(user.email, p.id, !!p.on);
      case 'add':
        return user.isAdmin ? { status: 'applied', quote: insertQuote_(p) } : submit_(user, 'new', null, p);
      case 'update':
        return user.isAdmin ? { status: 'applied', quote: updateQuote_(p.id, p) } : submit_(user, 'edit', p.id, p);
      case 'remove':
        requireAdmin_(user);
        deleteRow_(sheet_('quotes', QUOTE_COLS), p.id);
        return {};
      case 'import':
        requireAdmin_(user);
        return { quotes: (p.quotes || []).map(insertQuote_) };
      case 'pending':
        requireAdmin_(user);
        return { items: readAll_(sheet_('pending', PENDING_COLS), PENDING_COLS)
          .filter(function (r) { return r.status === 'pending'; })
          .map(pendingOut_).reverse() };
      case 'approve':
        requireAdmin_(user);
        return approve_(p.id);
      case 'reject':
        requireAdmin_(user);
        setPendingStatus_(p.id, 'rejected');
        return {};
    }
  } finally {
    lock.releaseLock();
  }
  throw new Error('unknown action');
}

/* ---------- auth ---------- */

function login_(idToken) {
  var res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true },
  );
  if (res.getResponseCode() !== 200) throw new Error('invalid google token');
  var info = JSON.parse(res.getContentText());
  var props = PropertiesService.getScriptProperties();
  if (info.aud !== props.getProperty('GOOGLE_CLIENT_ID')) throw new Error('wrong client id');
  if (String(info.email_verified) !== 'true') throw new Error('email not verified');
  var email = String(info.email).toLowerCase();
  var user = { email: email, isAdmin: isAdmin_(email) };
  var payload = Utilities.base64EncodeWebSafe(
    JSON.stringify({ email: email, exp: Date.now() + SESSION_TTL_MS }),
  );
  return { token: payload + '.' + sign_(payload), user: user };
}

function verifySession_(token) {
  if (!token) return null;
  var parts = String(token).split('.');
  if (parts.length !== 2 || sign_(parts[0]) !== parts[1]) return null;
  var data = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  if (data.exp < Date.now()) return null;
  return { email: data.email, isAdmin: isAdmin_(data.email) };
}

function sign_(s) {
  var secret = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, secret));
}

function isAdmin_(email) {
  var list = (PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '')
    .toLowerCase().split(',').map(function (s) { return s.trim(); });
  return list.indexOf(email) >= 0;
}

function requireAdmin_(user) {
  if (!user.isAdmin) throw new Error('forbidden');
}

/* ---------- sheet helpers ---------- */

function sheet_(name, cols) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(cols);
  }
  return sh;
}

function cell_(v) {
  if (v instanceof Date) return v.toISOString();
  return v === null || v === undefined ? '' : String(v);
}

function readAll_(sh, cols) {
  var n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, cols.length).getValues().map(function (row) {
    var o = {};
    cols.forEach(function (c, i) { o[c] = cell_(row[i]); });
    return o;
  });
}

function findRow_(sh, id) {
  var n = sh.getLastRow();
  if (n < 2) return -1;
  var ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function deleteRow_(sh, id) {
  var r = findRow_(sh, id);
  if (r > 0) sh.deleteRow(r);
}

function splitTags_(s) {
  return String(s || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
}

function quoteOut_(r) {
  return {
    id: r.id, quote: r.quote, author: r.author, category: r.category,
    tags: splitTags_(r.tags), language: r.language,
    date_added: r.date_added, translation_group: r.translation_group || null,
  };
}

function pendingOut_(r) {
  return {
    id: r.id, submitter_email: r.submitter_email, type: r.type,
    original_quote_id: r.original_quote_id || null, quote: r.quote, author: r.author,
    category: r.category, tags: splitTags_(r.tags), language: r.language,
    status: r.status, created_at: r.created_at,
  };
}

/* ---------- quotes ---------- */

function listQuotes_() {
  return readAll_(sheet_('quotes', QUOTE_COLS), QUOTE_COLS)
    .filter(function (r) { return r.quote; })
    .map(quoteOut_)
    .sort(function (a, b) { return a.date_added < b.date_added ? 1 : -1; });
}

function rowFrom_(cols, o) {
  return cols.map(function (c) {
    var v = o[c];
    return Array.isArray(v) ? v.join(',') : cell_(v);
  });
}

function insertQuote_(p) {
  var rec = {
    id: Utilities.getUuid(), quote: p.quote, author: p.author || '', category: p.category || '',
    tags: p.tags || [], language: p.language, date_added: p.date_added || new Date().toISOString(),
    translation_group: '',
  };
  sheet_('quotes', QUOTE_COLS).appendRow(rowFrom_(QUOTE_COLS, rec));
  return quoteOut_({
    id: rec.id, quote: rec.quote, author: rec.author, category: rec.category,
    tags: rec.tags.join(','), language: rec.language, date_added: rec.date_added, translation_group: '',
  });
}

function updateQuote_(id, p) {
  var sh = sheet_('quotes', QUOTE_COLS);
  var r = findRow_(sh, id);
  if (r < 0) throw new Error('not found');
  var cur = {};
  var vals = sh.getRange(r, 1, 1, QUOTE_COLS.length).getValues()[0];
  QUOTE_COLS.forEach(function (c, i) { cur[c] = cell_(vals[i]); });
  cur.quote = p.quote;
  cur.author = p.author || '';
  cur.category = p.category || '';
  cur.tags = (p.tags || []).join(',');
  cur.language = p.language;
  sh.getRange(r, 1, 1, QUOTE_COLS.length).setValues([rowFrom_(QUOTE_COLS, cur)]);
  return quoteOut_(cur);
}

/* ---------- favorites ---------- */

function favoriteIds_(email) {
  return readAll_(sheet_('favorites', FAV_COLS), FAV_COLS)
    .filter(function (r) { return r.email === email; })
    .map(function (r) { return r.quote_id; });
}

function setFavorite_(email, id, on) {
  var sh = sheet_('favorites', FAV_COLS);
  var rows = readAll_(sh, FAV_COLS);
  var idx = -1;
  rows.forEach(function (r, i) { if (r.email === email && r.quote_id === id) idx = i; });
  if (on && idx < 0) sh.appendRow([email, id]);
  if (!on && idx >= 0) sh.deleteRow(idx + 2);
  return {};
}

/* ---------- pending queue ---------- */

function submit_(user, type, originalId, p) {
  var rec = {
    id: Utilities.getUuid(), submitter_email: user.email, type: type,
    original_quote_id: originalId || '', quote: p.quote, author: p.author || '',
    category: p.category || '', tags: p.tags || [], language: p.language,
    status: 'pending', created_at: new Date().toISOString(),
  };
  sheet_('pending', PENDING_COLS).appendRow(rowFrom_(PENDING_COLS, rec));
  return { status: 'pending' };
}

function setPendingStatus_(id, status) {
  var sh = sheet_('pending', PENDING_COLS);
  var r = findRow_(sh, id);
  if (r < 0) throw new Error('not found');
  sh.getRange(r, PENDING_COLS.indexOf('status') + 1).setValue(status);
}

function approve_(id) {
  var item = readAll_(sheet_('pending', PENDING_COLS), PENDING_COLS)
    .filter(function (r) { return r.id === id; })[0];
  if (!item) throw new Error('not found');
  var p = {
    quote: item.quote, author: item.author, category: item.category,
    tags: splitTags_(item.tags), language: item.language,
  };
  var quote = item.type === 'new' ? insertQuote_(p) : updateQuote_(item.original_quote_id, p);
  setPendingStatus_(id, 'approved');
  return { quote: quote, type: item.type };
}

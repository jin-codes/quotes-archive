import * as XLSX from "xlsx";

export type Quote = {
  id: string;
  quote: string;
  author: string;
  category: string;
  favorite: boolean;
  date_added: string;
};

const KEY = "quotes_xlsx_v1";
const COLUMNS = ["id", "quote", "author", "category", "favorite", "date_added"] as const;

function toSheet(quotes: Quote[]) {
  const rows = quotes.map((q) => ({
    ...q,
    favorite: q.favorite ? "TRUE" : "FALSE",
  }));
  const ws = XLSX.utils.json_to_sheet(rows, { header: COLUMNS as unknown as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Quotes");
  return wb;
}

export function serializeToBase64(quotes: Quote[]): string {
  const wb = toSheet(quotes);
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
}

export function parseFromArrayBuffer(buf: ArrayBuffer): Quote[] {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  return rows.map((r) => ({
    id: String(r.id ?? crypto.randomUUID()),
    quote: String(r.quote ?? ""),
    author: String(r.author ?? ""),
    category: String(r.category ?? ""),
    favorite: String(r.favorite ?? "").toUpperCase() === "TRUE" || r.favorite === true,
    date_added: String(r.date_added ?? new Date().toISOString()),
  }));
}

export function loadQuotes(): Quote[] {
  if (typeof window === "undefined") return [];
  const b64 = localStorage.getItem(KEY);
  if (!b64) return [];
  try {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return parseFromArrayBuffer(buf.buffer);
  } catch {
    return [];
  }
}

export function saveQuotes(quotes: Quote[]) {
  if (typeof window === "undefined") return;
  const b64 = serializeToBase64(quotes);
  localStorage.setItem(KEY, b64);
}

export function downloadXlsx(quotes: Quote[], filename = "quotes.xlsx") {
  const wb = toSheet(quotes);
  XLSX.writeFile(wb, filename);
}

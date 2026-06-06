import type { Quote } from "./quotes-store";

const SIZE = 1080;
const PADDING = 96;
const FONT_STACK =
  '"Inter", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, -apple-system, sans-serif';

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  isKor: boolean,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\n+/);

  for (const para of paragraphs) {
    // Split into tokens. For Korean, prefer word (eojeol) boundaries on spaces,
    // falling back to per-character wrap if a single token is too wide.
    const tokens = para.split(/(\s+)/).filter((t) => t.length > 0);
    let line = "";

    const pushChunk = (chunk: string) => {
      const candidate = line ? line + chunk : chunk;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line.trimEnd());
        line = chunk.trimStart();
      }
    };

    for (const token of tokens) {
      if (ctx.measureText(token).width <= maxWidth) {
        pushChunk(token);
      } else {
        // Break long token by character (handles long English words and Korean
        // sequences without spaces).
        const chars = Array.from(token);
        for (const ch of chars) {
          const candidate = line + ch;
          if (ctx.measureText(candidate).width <= maxWidth) {
            line = candidate;
          } else {
            if (line) lines.push(line);
            line = ch;
          }
        }
      }
    }
    if (line) {
      lines.push(line);
      line = "";
    }
  }
  void isKor;
  return lines;
}

function drawRoundedPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export async function downloadQuoteImage(quote: Quote): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  // Background gradient (pastel, matches hero)
  const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bg.addColorStop(0, "#efe4ff");
  bg.addColorStop(0.5, "#ffe8db");
  bg.addColorStop(1, "#daf3e6");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Soft radial glows (blobs)
  const glow1 = ctx.createRadialGradient(140, 140, 0, 140, 140, 420);
  glow1.addColorStop(0, "rgba(210,180,255,0.65)");
  glow1.addColorStop(1, "rgba(210,180,255,0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const glow2 = ctx.createRadialGradient(SIZE - 160, SIZE - 160, 0, SIZE - 160, SIZE - 160, 460);
  glow2.addColorStop(0, "rgba(180,230,210,0.7)");
  glow2.addColorStop(1, "rgba(180,230,210,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Light overlay for legibility
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(0, 0, SIZE, SIZE);

  const isKor = quote.language === "KOR";
  const maxWidth = SIZE - PADDING * 2;

  // Quote text — auto-fit size to roughly 4–7 lines
  const len = quote.quote.length;
  let fontSize = len > 220 ? 46 : len > 140 ? 56 : len > 80 ? 66 : 78;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  let lines: string[] = [];
  for (let i = 0; i < 8; i++) {
    ctx.font = `500 ${fontSize}px ${FONT_STACK}`;
    lines = wrapLines(ctx, `\u201C${quote.quote}\u201D`, maxWidth, isKor);
    if (lines.length <= 8 && fontSize * 1.4 * lines.length < SIZE - 360) break;
    fontSize -= 4;
    if (fontSize <= 28) break;
  }

  const lineHeight = Math.round(fontSize * 1.4);
  const quoteBlockH = lineHeight * lines.length;
  // Reserve room for author below
  const metaBlockH = 60 + 48; // author + bottom margin
  const totalH = quoteBlockH + 64 + metaBlockH;
  const startY = Math.max(PADDING + lineHeight, (SIZE - totalH) / 2 + lineHeight);

  // Subtle text "shadow" (white halo) for legibility
  ctx.shadowColor = "rgba(255,255,255,0.75)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#2a2336";
  lines.forEach((ln, i) => {
    ctx.fillText(ln, SIZE / 2, startY + i * lineHeight);
  });
  ctx.shadowBlur = 0;

  // Author
  const authorY = startY + quoteBlockH + 64;
  ctx.font = `600 28px ${FONT_STACK}`;
  ctx.fillStyle = "#6b5d7a";
  const authorText = `— ${(quote.author || "Unknown").toUpperCase()}`;
  // Letter spacing via manual char draw
  const drawSpaced = (text: string, y: number, spacing: number) => {
    const chars = Array.from(text);
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let x = (SIZE - total) / 2;
    for (let i = 0; i < chars.length; i++) {
      ctx.textAlign = "left";
      ctx.fillText(chars[i], x, y);
      x += widths[i] + spacing;
    }
    ctx.textAlign = "center";
  };
  drawSpaced(authorText, authorY, 4);

  // Pills row: category + language
  const pillY = authorY + 36;
  const pillH = 52;
  const pillPadX = 28;
  ctx.font = `600 22px ${FONT_STACK}`;
  ctx.textBaseline = "middle";

  const pills: { text: string; bg: string; color: string }[] = [];
  if (quote.category) pills.push({ text: quote.category, bg: "rgba(255,255,255,0.78)", color: "#5a4a78" });
  pills.push({ text: quote.language, bg: "rgba(255,255,255,0.6)", color: "#5a4a78" });

  const measured = pills.map((p) => ctx.measureText(p.text).width + pillPadX * 2);
  const gap = 16;
  const totalPillsW = measured.reduce((a, b) => a + b, 0) + gap * (pills.length - 1);
  let px = (SIZE - totalPillsW) / 2;

  pills.forEach((p, i) => {
    const w = measured[i];
    drawRoundedPill(ctx, px, pillY, w, pillH, p.bg);
    ctx.fillStyle = p.color;
    ctx.textAlign = "center";
    ctx.fillText(p.text, px + w / 2, pillY + pillH / 2 + 1);
    px += w + gap;
  });

  // Export
  const slug =
    (quote.author || "quote")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "quote";
  const filename = `${slug}-${quote.id.slice(0, 6)}.png`;

  await new Promise<void>((resolve, reject) => {
    const trigger = (url: string, revoke?: () => void) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (revoke) setTimeout(revoke, 1000);
      resolve();
    };
    try {
      if (typeof canvas.toBlob === "function") {
        canvas.toBlob((blob) => {
          if (!blob) {
            try {
              trigger(canvas.toDataURL("image/png"));
            } catch (e) {
              reject(e);
            }
            return;
          }
          const url = URL.createObjectURL(blob);
          trigger(url, () => URL.revokeObjectURL(url));
        }, "image/png");
      } else {
        trigger(canvas.toDataURL("image/png"));
      }
    } catch (e) {
      reject(e);
    }
  });
}
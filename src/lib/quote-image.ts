import html2canvas from "html2canvas";
import type { Quote } from "./quotes-store";

export async function downloadQuoteImage(quote: Quote) {
  const root = document.createElement("div");
  root.style.cssText =
    "position:fixed;left:-99999px;top:0;width:1080px;height:1080px;";
  const card = document.createElement("div");
  const isKor = quote.language === "KOR";
  card.style.cssText = [
    "width:1080px",
    "height:1080px",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
    "padding:96px",
    "box-sizing:border-box",
    "background:linear-gradient(135deg,#efe4ff 0%,#ffe8db 50%,#daf3e6 100%)",
    "font-family:'Inter','Pretendard','Apple SD Gothic Neo',sans-serif",
    "color:#2a2336",
    "text-align:center",
    "position:relative",
    "overflow:hidden",
  ].join(";");

  const blob1 = document.createElement("div");
  blob1.style.cssText =
    "position:absolute;top:-120px;left:-120px;width:420px;height:420px;border-radius:9999px;background:rgba(210,180,255,0.55);filter:blur(80px);";
  const blob2 = document.createElement("div");
  blob2.style.cssText =
    "position:absolute;bottom:-140px;right:-120px;width:460px;height:460px;border-radius:9999px;background:rgba(180,230,210,0.6);filter:blur(80px);";
  card.appendChild(blob1);
  card.appendChild(blob2);

  const inner = document.createElement("div");
  inner.style.cssText =
    "position:relative;max-width:880px;display:flex;flex-direction:column;align-items:center;gap:48px;";

  const q = document.createElement("p");
  const len = quote.quote.length;
  const fontSize = len > 220 ? 44 : len > 140 ? 54 : len > 80 ? 64 : 76;
  q.style.cssText = [
    `font-size:${fontSize}px`,
    "line-height:1.4",
    "font-weight:500",
    "margin:0",
    isKor ? "word-break:keep-all" : "word-break:normal",
    "overflow-wrap:break-word",
    "color:#2a2336",
  ].join(";");
  q.textContent = `\u201C${quote.quote}\u201D`;

  const meta = document.createElement("div");
  meta.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:16px;";

  const author = document.createElement("p");
  author.style.cssText =
    "margin:0;font-size:28px;letter-spacing:0.25em;text-transform:uppercase;color:#6b5d7a;font-weight:600;";
  author.textContent = `\u2014 ${quote.author || "Unknown"}`;

  const tags = document.createElement("div");
  tags.style.cssText = "display:flex;gap:12px;flex-wrap:wrap;justify-content:center;";
  const mkTag = (text: string, bg: string, color: string) => {
    const t = document.createElement("span");
    t.style.cssText = `padding:10px 22px;border-radius:9999px;font-size:22px;font-weight:600;background:${bg};color:${color};`;
    t.textContent = text;
    return t;
  };
  if (quote.category) tags.appendChild(mkTag(quote.category, "rgba(255,255,255,0.7)", "#5a4a78"));
  tags.appendChild(mkTag(quote.language, "rgba(255,255,255,0.55)", "#5a4a78"));

  meta.appendChild(author);
  meta.appendChild(tags);
  inner.appendChild(q);
  inner.appendChild(meta);
  card.appendChild(inner);
  root.appendChild(card);
  document.body.appendChild(root);

  try {
    const canvas = await html2canvas(card, {
      width: 1080,
      height: 1080,
      scale: 1,
      backgroundColor: null,
      useCORS: true,
    });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    const slug = (quote.author || "quote")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "quote";
    a.href = url;
    a.download = `${slug}-${quote.id.slice(0, 6)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    root.remove();
  }
}
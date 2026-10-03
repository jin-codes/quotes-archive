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

export type GradientBackground = {
  kind: "gradient";
  id: string;
  label: string;
  stops: string[];
  dark: boolean;
  blobs?: boolean;
};
export type QuoteBackground =
  | GradientBackground
  | { kind: "image"; id: string; label: string; src: string };

export const BACKGROUNDS: GradientBackground[] = [
  { kind: "gradient", id: "pastel", label: "기본", stops: ["#efe4ff", "#ffe8db", "#daf3e6"], dark: false, blobs: true },
  { kind: "gradient", id: "sunset", label: "노을", stops: ["#ff7e5f", "#ff6a88", "#feb47b"], dark: true },
  { kind: "gradient", id: "ocean", label: "바다", stops: ["#2193b0", "#6dd5ed"], dark: true },
  { kind: "gradient", id: "forest", label: "숲", stops: ["#134e5e", "#71b280"], dark: true },
  { kind: "gradient", id: "night", label: "밤", stops: ["#0f2027", "#203a43", "#2c5364"], dark: true },
  { kind: "gradient", id: "cream", label: "크림", stops: ["#fbf6ee", "#fbf6ee"], dark: false },
];

/**
 * Free-to-use photos (Unsplash License) served from /public/backgrounds.
 * Files that are not present are skipped by the picker.
 */
export const PHOTO_BACKGROUNDS: QuoteBackground[] = [
  { kind: "image", id: "photo-sunrise-clouds", label: "구름 위 해돋이", src: "/backgrounds/sunrise-clouds.jpg" },
  { kind: "image", id: "photo-sunset-rays", label: "노을", src: "/backgrounds/sunset-rays.jpg" },
  { kind: "image", id: "photo-cloud-orange", label: "노을 구름", src: "/backgrounds/cloud-orange.jpg" },
  { kind: "image", id: "photo-sky-pastel", label: "구름 위 하늘", src: "/backgrounds/sky-pastel.jpg" },
  { kind: "image", id: "photo-night-milkyway", label: "은하수", src: "/backgrounds/night-milkyway.jpg" },
  { kind: "image", id: "photo-night-pines", label: "별 가득한 숲의 밤", src: "/backgrounds/night-pines.jpg" },
  { kind: "image", id: "photo-night-teal", label: "청록빛 밤하늘", src: "/backgrounds/night-teal.jpg" },
  { kind: "image", id: "photo-night-aurora", label: "오로라", src: "/backgrounds/night-aurora.jpg" },
  { kind: "image", id: "photo-ocean-cove", label: "바다 동굴", src: "/backgrounds/ocean-cove.jpg" },
  { kind: "image", id: "photo-ocean-underwater", label: "바닷속", src: "/backgrounds/ocean-underwater.jpg" },
  { kind: "image", id: "photo-forest-sunbeams", label: "숲 속 햇살", src: "/backgrounds/forest-sunbeams.jpg" },
  { kind: "image", id: "photo-forest-mist", label: "안개 낀 숲", src: "/backgrounds/forest-mist.jpg" },
  { kind: "image", id: "photo-forest-dark", label: "깊은 숲", src: "/backgrounds/forest-dark.jpg" },
  { kind: "image", id: "photo-mountain-moon", label: "달 뜬 산", src: "/backgrounds/mountain-moon.jpg" },
  { kind: "image", id: "photo-snow-mountain", label: "설산", src: "/backgrounds/snow-mountain.jpg" },
  { kind: "image", id: "photo-desert-dunes", label: "사막", src: "/backgrounds/desert-dunes.jpg" },
  { kind: "image", id: "photo-blossom-blue", label: "벚꽃, 푸른 하늘", src: "/backgrounds/blossom-blue.jpg" },
  { kind: "image", id: "photo-blossom-pink", label: "분홍 벚꽃", src: "/backgrounds/blossom-pink.jpg" },
  { kind: "image", id: "photo-rain-dark", label: "빗방울", src: "/backgrounds/rain-dark.jpg" },
  { kind: "image", id: "photo-rain-bokeh", label: "비 오는 밤거리", src: "/backgrounds/rain-bokeh.jpg" },
  { kind: "image", id: "photo-paper-cream", label: "종이", src: "/backgrounds/paper-cream.jpg" },
  { kind: "image", id: "photo-paper-crumpled", label: "구겨진 종이", src: "/backgrounds/paper-crumpled.jpg" },
];

// Tag -> photo file names (without extension), best match first.
const TAG_PHOTOS: Record<string, string[]> = {};
const link = (tags: string[], photos: string[]) => tags.forEach((t) => (TAG_PHOTOS[t] = [...(TAG_PHOTOS[t] ?? []), ...photos]));
link(["시작", "도전", "희망", "기회", "성장", "성취"], ["sunrise-clouds", "sky-pastel", "blossom-blue"]);
link(["끈기", "역경", "용기", "극복", "실패", "신념", "태도"], ["mountain-moon", "snow-mountain", "sunset-rays", "desert-dunes"]);
link(["삶", "시간", "현재", "의미", "죽음", "변화", "위기"], ["cloud-orange", "night-milkyway", "ocean-cove"]);
link(["마음", "자기성찰", "지혜", "진실", "겸손", "철학", "준비", "선택"], ["night-pines", "forest-mist", "paper-cream"]);
link(["고통", "두려움", "위로", "후회", "위선"], ["rain-dark", "rain-bokeh", "ocean-underwater"]);
link(["사랑", "행복", "즐거움", "감사", "인간관계"], ["blossom-pink", "forest-sunbeams", "night-teal"]);
link(["일", "성공", "리더십", "집중", "약속", "신뢰", "책임"], ["snow-mountain", "paper-cream", "paper-crumpled"]);
link(["문학"], ["paper-cream", "paper-crumpled", "night-aurora"]);
link(["속담"], ["desert-dunes", "forest-dark"]);

/** Photo backgrounds that fit the quote's tags best, most fitting first. */
export function recommendBackgrounds(tags: string[], limit = 4): QuoteBackground[] {
  const score = new Map<string, number>();
  tags.forEach((t) =>
    (TAG_PHOTOS[t] ?? []).forEach((name, i) =>
      score.set(name, (score.get(name) ?? 0) + 1 + (4 - i) * 0.01),
    ),
  );
  return Array.from(score.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => PHOTO_BACKGROUNDS.find((b) => b.id === `photo-${name}`))
    .filter((b): b is QuoteBackground => !!b)
    .slice(0, limit);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

function imageLuminance(ctx: CanvasRenderingContext2D): number {
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4 * 997) {
    sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    n++;
  }
  return n ? sum / n : 0.5;
}

/** Paints the background; returns true when light text should be used on it. */
function paintBackground(
  ctx: CanvasRenderingContext2D,
  bgSpec: QuoteBackground,
  img: HTMLImageElement | null,
): boolean {
  if (bgSpec.kind === "image" && img) {
    // cover-fit
    const scale = Math.max(SIZE / img.width, SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
    const lum = imageLuminance(ctx);
    if (lum >= 0.6) {
      // Very bright photo (snow, paper, blossoms): soften it and use dark text.
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(0, 0, SIZE, SIZE);
      return false;
    }
    // Otherwise darken (brighter photos more) so white text stays readable.
    const alpha = Math.min(0.6, Math.max(0.22, 0.2 + lum * 0.6));
    ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(2)})`;
    ctx.fillRect(0, 0, SIZE, SIZE);
    return true;
  }
  const g: GradientBackground = bgSpec.kind === "gradient" ? bgSpec : BACKGROUNDS[1];
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  g.stops.forEach((c, i) => grad.addColorStop(g.stops.length === 1 ? 0 : i / (g.stops.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  if (g.blobs) {
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
  }
  if (!g.dark) {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(0, 0, SIZE, SIZE);
  }
  return g.dark;
}

/** Renders only the quote and its author (no tags) onto the chosen background. */
export async function renderQuoteCanvas(
  quote: Quote,
  bgSpec: QuoteBackground = BACKGROUNDS[0],
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  const img = bgSpec.kind === "image" ? await loadImage(bgSpec.src) : null;
  const lightText = paintBackground(ctx, bgSpec, img);

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
  ctx.shadowColor = lightText ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.75)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = lightText ? "#ffffff" : "#2a2336";
  lines.forEach((ln, i) => {
    ctx.fillText(ln, SIZE / 2, startY + i * lineHeight);
  });
  ctx.shadowBlur = 0;

  // Author
  const authorY = startY + quoteBlockH + 64;
  ctx.font = `600 28px ${FONT_STACK}`;
  ctx.fillStyle = lightText ? "rgba(255,255,255,0.88)" : "#4a3f58";
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

  return canvas;
}

export async function downloadQuoteImage(
  quote: Quote,
  bgSpec: QuoteBackground = BACKGROUNDS[0],
): Promise<void> {
  const canvas = await renderQuoteCanvas(quote, bgSpec);



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
import * as XLSX from "xlsx";

export type Quote = {
  id: string;
  quote: string;
  author: string;
  category: string;
  language: "ENG" | "KOR";
  date_added: string;
  translation_group?: string | null;
  tags: string[];
};

const COLUMNS = ["id", "quote", "author", "category", "tags", "language", "date_added"] as const;

export function parseTags(input: unknown): string[] {
  const raw = Array.isArray(input) ? input.map(String) : String(input ?? "").split(/[,，、]/);
  return Array.from(new Set(raw.map((t) => t.trim().replace(/^#/, "")).filter(Boolean)));
}

export function detectLanguage(text: string): "ENG" | "KOR" {
  return /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(text) ? "KOR" : "ENG";
}

export function parseFromArrayBuffer(buf: ArrayBuffer): Omit<Quote, "id">[] {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  return rows
    .map((r) => {
      const quote = String(r.quote ?? "").trim();
      const langRaw = String(r.language ?? "").toUpperCase();
      const language: "ENG" | "KOR" =
        langRaw === "ENG" || langRaw === "KOR" ? langRaw : detectLanguage(quote);
      return {
        quote,
        author: String(r.author ?? "").trim(),
        category: String(r.category ?? "").trim(),
        tags: parseTags(r.tags),
        language,
        date_added: String(r.date_added ?? new Date().toISOString()),
      };
    })
    .filter((q) => q.quote.length > 0);
}

export function downloadXlsx(
  quotes: Quote[],
  favoriteIds: Set<string>,
  filename = "quotes.xlsx",
) {
  const rows = quotes.map((q) => ({
    id: q.id,
    quote: q.quote,
    author: q.author,
    category: q.category,
    tags: q.tags.join(", "),
    favorite: favoriteIds.has(q.id) ? "TRUE" : "FALSE",
    language: q.language,
    date_added: q.date_added,
  }));
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["id", "quote", "author", "category", "tags", "favorite", "language", "date_added"],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Quotes");
  XLSX.writeFile(wb, filename);
}

export { COLUMNS };

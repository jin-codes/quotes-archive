import * as XLSX from "xlsx";

export type Quote = {
  id: string;
  quote: string;
  author: string;
  category: string;
  favorite: boolean;
  date_added: string;
};

const COLUMNS = ["id", "quote", "author", "category", "favorite", "date_added"] as const;

function toWorkbook(quotes: Quote[]) {
  const rows = quotes.map((q) => ({ ...q, favorite: q.favorite ? "TRUE" : "FALSE" }));
  const ws = XLSX.utils.json_to_sheet(rows, { header: COLUMNS as unknown as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Quotes");
  return wb;
}

export function parseFromArrayBuffer(buf: ArrayBuffer): Omit<Quote, "id">[] {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  return rows
    .map((r) => ({
      quote: String(r.quote ?? "").trim(),
      author: String(r.author ?? "").trim(),
      category: String(r.category ?? "").trim(),
      favorite: String(r.favorite ?? "").toUpperCase() === "TRUE" || r.favorite === true,
      date_added: String(r.date_added ?? new Date().toISOString()),
    }))
    .filter((q) => q.quote.length > 0);
}

export function downloadXlsx(quotes: Quote[], filename = "quotes.xlsx") {
  const wb = toWorkbook(quotes);
  XLSX.writeFile(wb, filename);
}

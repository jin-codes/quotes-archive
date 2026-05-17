import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadQuotes, saveQuotes, type Quote, parseFromArrayBuffer, downloadXlsx } from "./quotes-store";

type Ctx = {
  quotes: Quote[];
  addQuote: (q: Omit<Quote, "id" | "favorite" | "date_added">) => void;
  removeQuote: (id: string) => void;
  toggleFavorite: (id: string) => void;
  importFile: (file: File) => Promise<void>;
  exportFile: () => void;
};

const QuotesContext = createContext<Ctx | null>(null);

const SEED: Quote[] = [
  { id: "s1", quote: "The only true wisdom is in knowing you know nothing.", author: "Socrates", category: "Philosophy", favorite: true, date_added: new Date().toISOString() },
  { id: "s2", quote: "It is not in the stars to hold our destiny but in ourselves.", author: "William Shakespeare", category: "Literature", favorite: false, date_added: new Date().toISOString() },
  { id: "s3", quote: "The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design.", author: "Friedrich Hayek", category: "Economics", favorite: false, date_added: new Date().toISOString() },
];

export function QuotesProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadQuotes();
    setQuotes(loaded.length ? loaded : SEED);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveQuotes(quotes);
  }, [quotes, hydrated]);

  const addQuote: Ctx["addQuote"] = useCallback((q) => {
    setQuotes((prev) => [
      { ...q, id: crypto.randomUUID(), favorite: false, date_added: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const removeQuote = useCallback((id: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, favorite: !q.favorite } : q)));
  }, []);

  const importFile = useCallback(async (file: File) => {
    const buf = await file.arrayBuffer();
    const parsed = parseFromArrayBuffer(buf);
    setQuotes(parsed);
  }, []);

  const exportFile = useCallback(() => downloadXlsx(quotes), [quotes]);

  const value = useMemo(
    () => ({ quotes, addQuote, removeQuote, toggleFavorite, importFile, exportFile }),
    [quotes, addQuote, removeQuote, toggleFavorite, importFile, exportFile],
  );

  return <QuotesContext.Provider value={value}>{children}</QuotesContext.Provider>;
}

export function useQuotes() {
  const ctx = useContext(QuotesContext);
  if (!ctx) throw new Error("useQuotes must be used inside QuotesProvider");
  return ctx;
}

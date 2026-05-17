import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { downloadXlsx, parseFromArrayBuffer, type Quote } from "./quotes-store";

type Ctx = {
  quotes: Quote[];
  loading: boolean;
  user: User | null;
  addQuote: (q: Omit<Quote, "id" | "favorite" | "date_added">) => Promise<void>;
  removeQuote: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  importFile: (file: File) => Promise<void>;
  exportFile: () => void;
  signOut: () => Promise<void>;
};

const QuotesContext = createContext<Ctx | null>(null);

export function QuotesProvider({ user, children }: { user: User; children: ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("quotes")
      .select("id, quote, author, category, favorite, date_added")
      .order("date_added", { ascending: false });
    if (error) {
      console.error(error);
      setQuotes([]);
    } else {
      setQuotes(data as Quote[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addQuote: Ctx["addQuote"] = useCallback(
    async (q) => {
      const { data, error } = await supabase
        .from("quotes")
        .insert({ ...q, user_id: user.id })
        .select("id, quote, author, category, favorite, date_added")
        .single();
      if (error) {
        console.error(error);
        return;
      }
      setQuotes((prev) => [data as Quote, ...prev]);
    },
    [user.id],
  );

  const removeQuote: Ctx["removeQuote"] = useCallback(async (id) => {
    const prev = quotes;
    setQuotes((p) => p.filter((q) => q.id !== id));
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) {
      console.error(error);
      setQuotes(prev);
    }
  }, [quotes]);

  const toggleFavorite: Ctx["toggleFavorite"] = useCallback(
    async (id) => {
      const target = quotes.find((q) => q.id === id);
      if (!target) return;
      const next = !target.favorite;
      setQuotes((p) => p.map((q) => (q.id === id ? { ...q, favorite: next } : q)));
      const { error } = await supabase.from("quotes").update({ favorite: next }).eq("id", id);
      if (error) {
        console.error(error);
        setQuotes((p) => p.map((q) => (q.id === id ? { ...q, favorite: !next } : q)));
      }
    },
    [quotes],
  );

  const importFile: Ctx["importFile"] = useCallback(
    async (file) => {
      const buf = await file.arrayBuffer();
      const parsed = parseFromArrayBuffer(buf);
      if (!parsed.length) return;
      const rows = parsed.map((q) => ({ ...q, user_id: user.id }));
      const { data, error } = await supabase
        .from("quotes")
        .insert(rows)
        .select("id, quote, author, category, favorite, date_added");
      if (error) {
        console.error(error);
        return;
      }
      setQuotes((prev) => [...(data as Quote[]), ...prev]);
    },
    [user.id],
  );

  const exportFile = useCallback(() => downloadXlsx(quotes), [quotes]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<Ctx>(
    () => ({ quotes, loading, user, addQuote, removeQuote, toggleFavorite, importFile, exportFile, signOut }),
    [quotes, loading, user, addQuote, removeQuote, toggleFavorite, importFile, exportFile, signOut],
  );

  return <QuotesContext.Provider value={value}>{children}</QuotesContext.Provider>;
}

export function useQuotes() {
  const ctx = useContext(QuotesContext);
  if (!ctx) throw new Error("useQuotes must be used inside QuotesProvider");
  return ctx;
}

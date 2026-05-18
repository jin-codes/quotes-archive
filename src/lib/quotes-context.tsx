import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  downloadXlsx,
  parseFromArrayBuffer,
  detectLanguage,
  type Quote,
} from "./quotes-store";

type AddQuoteInput = {
  quote: string;
  author: string;
  category: string;
  language?: "ENG" | "KOR";
};

type Ctx = {
  quotes: Quote[];
  loading: boolean;
  user: User | null;
  isAdmin: boolean;
  favoriteIds: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => Promise<void>;
  addQuote: (q: AddQuoteInput) => Promise<void>;
  updateQuote: (id: string, patch: Partial<AddQuoteInput>) => Promise<void>;
  removeQuote: (id: string) => Promise<void>;
  importFile: (file: File) => Promise<void>;
  exportFile: () => void;
  signOut: () => Promise<void>;
};

const QuotesContext = createContext<Ctx | null>(null);

export function QuotesProvider({
  user,
  isAdmin,
  children,
}: {
  user: User | null;
  isAdmin: boolean;
  children: ReactNode;
}) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("quotes")
      .select("id, quote, author, category, language, date_added")
      .order("date_added", { ascending: false });
    if (error) {
      console.error(error);
      setQuotes([]);
    } else {
      setQuotes((data ?? []) as Quote[]);
    }
    setLoading(false);
  }, []);

  const refreshFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    const { data, error } = await supabase
      .from("user_favorites")
      .select("quote_id")
      .eq("user_id", user.id);
    if (error) {
      console.error(error);
      return;
    }
    setFavoriteIds(new Set((data ?? []).map((r) => r.quote_id as string)));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    // when user logs out, favorites reset to in-memory (cleared)
    refreshFavorites();
  }, [refreshFavorites]);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  const toggleFavorite: Ctx["toggleFavorite"] = useCallback(
    async (id) => {
      const currentlyFav = favoriteIds.has(id);
      const next = new Set(favoriteIds);
      if (currentlyFav) next.delete(id);
      else next.add(id);
      setFavoriteIds(next);

      if (!user) return; // guest: in-memory only

      if (currentlyFav) {
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("quote_id", id);
        if (error) {
          console.error(error);
          setFavoriteIds(favoriteIds); // revert
        }
      } else {
        const { error } = await supabase
          .from("user_favorites")
          .insert({ user_id: user.id, quote_id: id });
        if (error) {
          console.error(error);
          setFavoriteIds(favoriteIds);
        }
      }
    },
    [favoriteIds, user],
  );

  const addQuote: Ctx["addQuote"] = useCallback(
    async (q) => {
      if (!user || !isAdmin) return;
      const language = q.language ?? detectLanguage(q.quote);
      const { data, error } = await supabase
        .from("quotes")
        .insert({
          quote: q.quote,
          author: q.author,
          category: q.category,
          language,
          user_id: user.id,
        })
        .select("id, quote, author, category, language, date_added")
        .single();
      if (error) {
        console.error(error);
        return;
      }
      setQuotes((prev) => [data as Quote, ...prev]);
    },
    [user, isAdmin],
  );

  const updateQuote: Ctx["updateQuote"] = useCallback(
    async (id, patch) => {
      if (!isAdmin) return;
      const next: Partial<AddQuoteInput> = { ...patch };
      if (patch.quote && !patch.language) next.language = detectLanguage(patch.quote);
      const { data, error } = await supabase
        .from("quotes")
        .update(next)
        .eq("id", id)
        .select("id, quote, author, category, language, date_added")
        .single();
      if (error) {
        console.error(error);
        return;
      }
      setQuotes((prev) => prev.map((q) => (q.id === id ? (data as Quote) : q)));
    },
    [isAdmin],
  );

  const removeQuote: Ctx["removeQuote"] = useCallback(
    async (id) => {
      if (!isAdmin) return;
      const prev = quotes;
      setQuotes((p) => p.filter((q) => q.id !== id));
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) {
        console.error(error);
        setQuotes(prev);
      }
    },
    [quotes, isAdmin],
  );

  const importFile: Ctx["importFile"] = useCallback(
    async (file) => {
      if (!user || !isAdmin) return;
      const buf = await file.arrayBuffer();
      const parsed = parseFromArrayBuffer(buf);
      if (!parsed.length) return;
      const rows = parsed.map((q) => ({
        quote: q.quote,
        author: q.author,
        category: q.category,
        language: q.language,
        date_added: q.date_added,
        user_id: user.id,
      }));
      const { data, error } = await supabase
        .from("quotes")
        .insert(rows)
        .select("id, quote, author, category, language, date_added");
      if (error) {
        console.error(error);
        return;
      }
      setQuotes((prev) => [...((data ?? []) as Quote[]), ...prev]);
    },
    [user, isAdmin],
  );

  const exportFile = useCallback(
    () => downloadXlsx(quotes, favoriteIds),
    [quotes, favoriteIds],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      quotes,
      loading,
      user,
      isAdmin,
      favoriteIds,
      isFavorite,
      toggleFavorite,
      addQuote,
      updateQuote,
      removeQuote,
      importFile,
      exportFile,
      signOut,
    }),
    [
      quotes,
      loading,
      user,
      isAdmin,
      favoriteIds,
      isFavorite,
      toggleFavorite,
      addQuote,
      updateQuote,
      removeQuote,
      importFile,
      exportFile,
      signOut,
    ],
  );

  return <QuotesContext.Provider value={value}>{children}</QuotesContext.Provider>;
}

export function useQuotes() {
  const ctx = useContext(QuotesContext);
  if (!ctx) throw new Error("useQuotes must be used inside QuotesProvider");
  return ctx;
}

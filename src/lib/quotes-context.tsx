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

export type PendingItem = {
  id: string;
  submitter_id: string;
  submitter_email: string;
  type: "new" | "edit";
  original_quote_id: string | null;
  quote: string;
  author: string;
  category: string;
  language: "ENG" | "KOR";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Ctx = {
  quotes: Quote[];
  loading: boolean;
  user: User | null;
  isAdmin: boolean;
  favoriteIds: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => Promise<void>;
  /** Returns true if applied directly, false if queued as pending. */
  addQuote: (q: AddQuoteInput) => Promise<"applied" | "pending" | "denied">;
  updateQuote: (
    id: string,
    patch: AddQuoteInput,
  ) => Promise<"applied" | "pending" | "denied">;
  removeQuote: (id: string) => Promise<void>;
  importFile: (file: File) => Promise<void>;
  exportFile: () => void;
  signOut: () => Promise<void>;
  pending: PendingItem[];
  refreshPending: () => Promise<void>;
  approvePending: (id: string) => Promise<void>;
  rejectPending: (id: string) => Promise<void>;
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
  const [pending, setPending] = useState<PendingItem[]>([]);

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
      if (!user) return "denied";
      const language = q.language ?? detectLanguage(q.quote);
      if (!isAdmin) {
        const { error } = await supabase.from("pending_quotes" as never).insert({
          submitter_id: user.id,
          submitter_email: user.email ?? "",
          type: "new",
          original_quote_id: null,
          quote: q.quote,
          author: q.author,
          category: q.category,
          language,
        } as never);
        if (error) {
          console.error(error);
          return "denied";
        }
        return "pending";
      }
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
        return "denied";
      }
      setQuotes((prev) => [data as Quote, ...prev]);
      return "applied";
    },
    [user, isAdmin],
  );

  const updateQuote: Ctx["updateQuote"] = useCallback(
    async (id, patch) => {
      if (!user) return "denied";
      const language = patch.language ?? detectLanguage(patch.quote);
      if (!isAdmin) {
        const { error } = await supabase.from("pending_quotes" as never).insert({
          submitter_id: user.id,
          submitter_email: user.email ?? "",
          type: "edit",
          original_quote_id: id,
          quote: patch.quote,
          author: patch.author,
          category: patch.category,
          language,
        } as never);
        if (error) {
          console.error(error);
          return "denied";
        }
        return "pending";
      }
      const { data, error } = await supabase
        .from("quotes")
        .update({
          quote: patch.quote,
          author: patch.author,
          category: patch.category,
          language,
        })
        .eq("id", id)
        .select("id, quote, author, category, language, date_added")
        .single();
      if (error) {
        console.error(error);
        return "denied";
      }
      setQuotes((prev) => prev.map((q) => (q.id === id ? (data as Quote) : q)));
      return "applied";
    },
    [user, isAdmin],
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

  const refreshPending = useCallback(async () => {
    if (!isAdmin) {
      setPending([]);
      return;
    }
    const { data, error } = await supabase
      .from("pending_quotes" as never)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setPending(((data ?? []) as unknown) as PendingItem[]);
  }, [isAdmin]);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  const approvePending: Ctx["approvePending"] = useCallback(
    async (id) => {
      if (!isAdmin || !user) return;
      const item = pending.find((p) => p.id === id);
      if (!item) return;
      if (item.type === "new") {
        const { data, error } = await supabase
          .from("quotes")
          .insert({
            quote: item.quote,
            author: item.author,
            category: item.category,
            language: item.language,
            user_id: item.submitter_id,
          })
          .select("id, quote, author, category, language, date_added")
          .single();
        if (error) {
          console.error(error);
          return;
        }
        setQuotes((prev) => [data as Quote, ...prev]);
      } else if (item.original_quote_id) {
        const { data, error } = await supabase
          .from("quotes")
          .update({
            quote: item.quote,
            author: item.author,
            category: item.category,
            language: item.language,
          })
          .eq("id", item.original_quote_id)
          .select("id, quote, author, category, language, date_added")
          .single();
        if (error) {
          console.error(error);
          return;
        }
        setQuotes((prev) =>
          prev.map((q) => (q.id === item.original_quote_id ? (data as Quote) : q)),
        );
      }
      const { error: upErr } = await supabase
        .from("pending_quotes" as never)
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        } as never)
        .eq("id", id);
      if (upErr) console.error(upErr);
      setPending((prev) => prev.filter((p) => p.id !== id));
    },
    [isAdmin, user, pending],
  );

  const rejectPending: Ctx["rejectPending"] = useCallback(
    async (id) => {
      if (!isAdmin || !user) return;
      const { error } = await supabase
        .from("pending_quotes" as never)
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        } as never)
        .eq("id", id);
      if (error) {
        console.error(error);
        return;
      }
      setPending((prev) => prev.filter((p) => p.id !== id));
    },
    [isAdmin, user],
  );

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
      pending,
      refreshPending,
      approvePending,
      rejectPending,
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
      pending,
      refreshPending,
      approvePending,
      rejectPending,
    ],
  );

  return <QuotesContext.Provider value={value}>{children}</QuotesContext.Provider>;
}

export function useQuotes() {
  const ctx = useContext(QuotesContext);
  if (!ctx) throw new Error("useQuotes must be used inside QuotesProvider");
  return ctx;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type AppUser } from "./api";
import { signOut as sessionSignOut } from "./session";
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
  tags: string[];
  language?: "ENG" | "KOR";
};

export type PendingItem = {
  id: string;
  submitter_email: string;
  type: "new" | "edit";
  original_quote_id: string | null;
  quote: string;
  author: string;
  category: string;
  tags: string[];
  language: "ENG" | "KOR";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Ctx = {
  quotes: Quote[];
  loading: boolean;
  user: AppUser | null;
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
  pinnedId: string | null;
  pinQuote: (id: string | null) => void;
};

const QuotesContext = createContext<Ctx | null>(null);

export function QuotesProvider({
  user,
  isAdmin,
  children,
}: {
  user: AppUser | null;
  isAdmin: boolean;
  children: ReactNode;
}) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const pinQuote = useCallback((id: string | null) => {
    setPinnedId((cur) => (cur === id ? null : id));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { quotes } = await api<{ quotes: Quote[] }>("list");
      setQuotes(quotes);
    } catch (error) {
      console.error(error);
      setQuotes([]);
    }
    setLoading(false);
  }, []);

  const refreshFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    try {
      const { ids } = await api<{ ids: string[] }>("favorites");
      setFavoriteIds(new Set(ids));
    } catch (error) {
      console.error(error);
    }
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

      try {
        await api("setFavorite", { id, on: !currentlyFav });
      } catch (error) {
        console.error(error);
        setFavoriteIds(favoriteIds); // revert
      }
    },
    [favoriteIds, user],
  );

  const addQuote: Ctx["addQuote"] = useCallback(
    async (q) => {
      if (!user) return "denied";
      const language = q.language ?? detectLanguage(q.quote);
      try {
        const res = await api<{ status: "applied" | "pending"; quote?: Quote }>("add", {
          ...q,
          language,
        });
        if (res.quote) setQuotes((prev) => [res.quote as Quote, ...prev]);
        return res.status;
      } catch (error) {
        console.error(error);
        return "denied";
      }
    },
    [user],
  );

  const updateQuote: Ctx["updateQuote"] = useCallback(
    async (id, patch) => {
      if (!user) return "denied";
      const language = patch.language ?? detectLanguage(patch.quote);
      try {
        const res = await api<{ status: "applied" | "pending"; quote?: Quote }>("update", {
          ...patch,
          id,
          language,
        });
        if (res.quote) setQuotes((prev) => prev.map((q) => (q.id === id ? (res.quote as Quote) : q)));
        return res.status;
      } catch (error) {
        console.error(error);
        return "denied";
      }
    },
    [user],
  );

  const removeQuote: Ctx["removeQuote"] = useCallback(
    async (id) => {
      if (!isAdmin) return;
      const prev = quotes;
      setQuotes((p) => p.filter((q) => q.id !== id));
      try {
        await api("remove", { id });
      } catch (error) {
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
      try {
        const { quotes: added } = await api<{ quotes: Quote[] }>("import", { quotes: parsed });
        setQuotes((prev) => [...added, ...prev]);
      } catch (error) {
        console.error(error);
      }
    },
    [user, isAdmin],
  );

  const exportFile = useCallback(
    () => downloadXlsx(quotes, favoriteIds),
    [quotes, favoriteIds],
  );

  const signOut = useCallback(async () => {
    sessionSignOut();
  }, []);

  const refreshPending = useCallback(async () => {
    if (!isAdmin) {
      setPending([]);
      return;
    }
    try {
      const { items } = await api<{ items: PendingItem[] }>("pending");
      setPending(items);
    } catch (error) {
      console.error(error);
    }
  }, [isAdmin]);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  const approvePending: Ctx["approvePending"] = useCallback(
    async (id) => {
      if (!isAdmin || !user) return;
      const item = pending.find((p) => p.id === id);
      if (!item) return;
      try {
        const { quote } = await api<{ quote: Quote }>("approve", { id });
        if (item.type === "new") setQuotes((prev) => [quote, ...prev]);
        else setQuotes((prev) => prev.map((q) => (q.id === quote.id ? quote : q)));
        setPending((prev) => prev.filter((p) => p.id !== id));
      } catch (error) {
        console.error(error);
      }
    },
    [isAdmin, user, pending],
  );

  const rejectPending: Ctx["rejectPending"] = useCallback(
    async (id) => {
      if (!isAdmin || !user) return;
      try {
        await api("reject", { id });
        setPending((prev) => prev.filter((p) => p.id !== id));
      } catch (error) {
        console.error(error);
      }
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
      pinnedId,
      pinQuote,
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
      pinnedId,
      pinQuote,
    ],
  );

  return <QuotesContext.Provider value={value}>{children}</QuotesContext.Provider>;
}

export function useQuotes() {
  const ctx = useContext(QuotesContext);
  if (!ctx) throw new Error("useQuotes must be used inside QuotesProvider");
  return ctx;
}

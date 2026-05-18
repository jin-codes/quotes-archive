import { useMemo, useRef, useState } from "react";
import { Search, Download, Upload, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuotes } from "@/lib/quotes-context";
import type { Quote } from "@/lib/quotes-store";
import { QuoteCard } from "./QuoteCard";

export type QuoteFilters = {
  search: string;
  favOnly: boolean;
  category: string | null;
  language: "ENG" | "KOR" | null;
};

export function filterQuotes(
  quotes: Quote[],
  favoriteIds: Set<string>,
  f: QuoteFilters,
): Quote[] {
  const term = f.search.trim().toLowerCase();
  return quotes.filter((q) => {
    if (f.favOnly && !favoriteIds.has(q.id)) return false;
    if (f.category && q.category !== f.category) return false;
    if (f.language && q.language !== f.language) return false;
    if (!term) return true;
    return (
      q.quote.toLowerCase().includes(term) ||
      q.author.toLowerCase().includes(term) ||
      q.category.toLowerCase().includes(term)
    );
  });
}

export function QuoteLibrary({
  filters,
  setFilters,
}: {
  filters: QuoteFilters;
  setFilters: (updater: (prev: QuoteFilters) => QuoteFilters) => void;
}) {
  const {
    quotes,
    favoriteIds,
    isFavorite,
    toggleFavorite,
    removeQuote,
    exportFile,
    importFile,
    isAdmin,
  } = useQuotes();
  const fileRef = useRef<HTMLInputElement>(null);
  const [, force] = useState(0);

  const categories = useMemo(() => {
    const set = new Set<string>();
    quotes.forEach((q) => q.category && set.add(q.category));
    return Array.from(set).sort();
  }, [quotes]);

  const filtered = useMemo(
    () => filterQuotes(quotes, favoriteIds, filters),
    [quotes, favoriteIds, filters],
  );

  const pill = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium transition ${
      active
        ? "bg-primary text-primary-foreground"
        : "bg-card text-muted-foreground hover:bg-accent/60"
    }`;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            placeholder="Search by keyword, author, or category…"
            className="rounded-full bg-card pl-9"
          />
        </div>
        <Button
          variant={filters.favOnly ? "default" : "outline"}
          onClick={() => setFilters((p) => ({ ...p, favOnly: !p.favOnly }))}
          className="rounded-full"
        >
          <Heart className={filters.favOnly ? "fill-current" : ""} /> Favorites
        </Button>
        <Button
          variant={filters.language === "ENG" ? "default" : "outline"}
          onClick={() =>
            setFilters((p) => ({ ...p, language: p.language === "ENG" ? null : "ENG" }))
          }
          className="rounded-full"
        >
          ENG
        </Button>
        <Button
          variant={filters.language === "KOR" ? "default" : "outline"}
          onClick={() =>
            setFilters((p) => ({ ...p, language: p.language === "KOR" ? null : "KOR" }))
          }
          className="rounded-full"
        >
          KOR
        </Button>
        {isAdmin && (
          <>
            <Button variant="outline" className="rounded-full" onClick={() => fileRef.current?.click()}>
              <Upload /> Import
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await importFile(f);
                e.target.value = "";
                force((n) => n + 1);
              }}
            />
          </>
        )}
        <Button variant="outline" className="rounded-full" onClick={exportFile}>
          <Download /> Export .xlsx
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilters((p) => ({ ...p, category: null }))}
            className={pill(filters.category === null)}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() =>
                setFilters((p) => ({ ...p, category: c === p.category ? null : c }))
              }
              className={pill(filters.category === c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
          No quotes match your filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((q) => (
            <QuoteCard
              key={q.id}
              quote={q}
              favorite={isFavorite(q.id)}
              canDelete={isAdmin}
              onToggleFavorite={toggleFavorite}
              onRemove={removeQuote}
            />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {quotes.length} quote{quotes.length === 1 ? "" : "s"} in the archive
      </p>
    </section>
  );
}

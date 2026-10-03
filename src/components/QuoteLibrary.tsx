import { useMemo, useRef, useState } from "react";
import { Search, Download, Upload, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuotes } from "@/lib/quotes-context";
import type { Quote } from "@/lib/quotes-store";
import { QuoteCard } from "./QuoteCard";
import { TAG_GROUPS, OTHER_GROUP, groupOfTag, tagsOfGroup } from "@/lib/tag-groups";

export type QuoteFilters = {
  search: string;
  favOnly: boolean;
  group: string | null;
  tags: string[];
  language: "ENG" | "KOR";
};

export function filterQuotes(
  quotes: Quote[],
  favoriteIds: Set<string>,
  f: QuoteFilters,
): Quote[] {
  const term = f.search.trim().toLowerCase();
  return quotes.filter((q) => {
    if (f.favOnly && !favoriteIds.has(q.id)) return false;
    if (f.group && !q.tags.some((t) => groupOfTag(t) === f.group)) return false;
    if (f.tags.length && !f.tags.some((t) => q.tags.includes(t))) return false;
    if (q.language !== f.language) return false;
    if (!term) return true;
    return (
      q.quote.toLowerCase().includes(term) ||
      q.author.toLowerCase().includes(term) ||
      q.tags.some((t) => t.toLowerCase().includes(term))
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
    user,
  } = useQuotes();
  const fileRef = useRef<HTMLInputElement>(null);
  const [, force] = useState(0);

  // Quotes of the selected language, for tag and group counts.
  const langQuotes = useMemo(
    () => quotes.filter((q) => q.language === filters.language),
    [quotes, filters.language],
  );

  const groups = useMemo(() => {
    const names = [...TAG_GROUPS.map((g) => g.name), OTHER_GROUP];
    return names
      .map((name) => ({
        name,
        count: langQuotes.filter((q) => q.tags.some((t) => groupOfTag(t) === name)).length,
      }))
      .filter((g) => g.count > 0);
  }, [langQuotes]);

  // Detailed tags of the open group, most used first.
  const tagList = useMemo(() => {
    if (!filters.group) return [];
    const inGroup = new Set(tagsOfGroup(filters.group, langQuotes.flatMap((q) => q.tags)));
    const counts = new Map<string, number>();
    langQuotes
      .filter((q) => q.tags.some((t) => groupOfTag(t) === filters.group))
      .forEach((q) => q.tags.forEach((t) => inGroup.has(t) && counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
  }, [langQuotes, filters.group]);

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
            placeholder="Search by keyword, author, or tag…"
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
            setFilters((p) => ({ ...p, language: "ENG", tags: [] }))
          }
          className="rounded-full"
        >
          ENG
        </Button>
        <Button
          variant={filters.language === "KOR" ? "default" : "outline"}
          onClick={() =>
            setFilters((p) => ({ ...p, language: "KOR", tags: [] }))
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

      {groups.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilters((p) => ({ ...p, group: null, tags: [] }))}
              className={pill(filters.group === null)}
            >
              전체
            </button>
            {groups.map((g) => (
              <button
                key={g.name}
                onClick={() =>
                  setFilters((p) => ({ ...p, group: p.group === g.name ? null : g.name, tags: [] }))
                }
                className={pill(filters.group === g.name)}
              >
                {g.name} <span className="opacity-60">{g.count}</span>
              </button>
            ))}
          </div>
          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-2xl bg-card/60 p-3">
              {tagList.map(([t, n]) => {
                const active = filters.tags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() =>
                      setFilters((p) => ({
                        ...p,
                        tags: active ? p.tags.filter((x) => x !== t) : [...p.tags, t],
                      }))
                    }
                    className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-accent/60"
                    }`}
                  >
                    #{t} <span className="opacity-60">{n}</span>
                  </button>
                );
              })}
            </div>
          )}
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
              canEdit={!!user}
              onToggleFavorite={toggleFavorite}
              onRemove={removeQuote}
            />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {filtered.length} quote{filtered.length === 1 ? "" : "s"} shown · {filters.language}
      </p>
    </section>
  );
}

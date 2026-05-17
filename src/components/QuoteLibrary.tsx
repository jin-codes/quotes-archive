import { useMemo, useRef, useState } from "react";
import { Search, Download, Upload, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuotes } from "@/lib/quotes-context";
import { QuoteCard } from "./QuoteCard";

export function QuoteLibrary() {
  const { quotes, toggleFavorite, removeQuote, exportFile, importFile } = useQuotes();
  const [search, setSearch] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    quotes.forEach((q) => q.category && set.add(q.category));
    return Array.from(set).sort();
  }, [quotes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quotes.filter((q) => {
      if (favOnly && !q.favorite) return false;
      if (category && q.category !== category) return false;
      if (!term) return true;
      return (
        q.quote.toLowerCase().includes(term) ||
        q.author.toLowerCase().includes(term) ||
        q.category.toLowerCase().includes(term)
      );
    });
  }, [quotes, search, favOnly, category]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by keyword, author, or category…"
            className="rounded-full bg-card pl-9"
          />
        </div>
        <Button
          variant={favOnly ? "default" : "outline"}
          onClick={() => setFavOnly((v) => !v)}
          className="rounded-full"
        >
          <Heart className={favOnly ? "fill-current" : ""} /> Favorites
        </Button>
        <Button variant="outline" className="rounded-full" onClick={() => fileRef.current?.click()}>
          <Upload /> Import
        </Button>
        <Button variant="outline" className="rounded-full" onClick={exportFile}>
          <Download /> Export .xlsx
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
          }}
        />
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              category === null ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent/60"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c === category ? null : c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                category === c ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent/60"
              }`}
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
            <QuoteCard key={q.id} quote={q} onToggleFavorite={toggleFavorite} onRemove={removeQuote} />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {quotes.length} quote{quotes.length === 1 ? "" : "s"} saved · stored as .xlsx in your browser
      </p>
    </section>
  );
}

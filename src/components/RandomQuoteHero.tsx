import { useEffect, useMemo, useState } from "react";
import { Shuffle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuotes } from "@/lib/quotes-context";
import { filterQuotes, type QuoteFilters } from "./QuoteLibrary";

export function RandomQuoteHero({ filters }: { filters: QuoteFilters }) {
  const { quotes, favoriteIds, isFavorite, toggleFavorite } = useQuotes();
  const [idx, setIdx] = useState<number | null>(null);
  const [fade, setFade] = useState(true);

  const pool = useMemo(
    () => filterQuotes(quotes, favoriteIds, filters),
    [quotes, favoriteIds, filters],
  );

  useEffect(() => {
    if (!pool.length) {
      setIdx(null);
      return;
    }
    setIdx((cur) => (cur !== null && cur < pool.length ? cur : Math.floor(Math.random() * pool.length)));
  }, [pool]);

  const shuffle = () => {
    if (pool.length < 2) {
      setIdx(pool.length ? 0 : null);
      return;
    }
    setFade(false);
    setTimeout(() => {
      let next = Math.floor(Math.random() * pool.length);
      if (next === idx) next = (next + 1) % pool.length;
      setIdx(next);
      setFade(true);
    }, 180);
  };

  const current = idx !== null ? pool[idx] : null;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[oklch(0.93_0.05_300)] via-[oklch(0.95_0.04_30)] to-[oklch(0.93_0.06_165)] px-6 py-16 shadow-[0_10px_40px_-15px_oklch(0.72_0.11_300_/_0.4)] sm:px-12 sm:py-24">
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[oklch(0.85_0.1_300_/_0.4)] blur-3xl" aria-hidden />
      <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[oklch(0.88_0.09_165_/_0.45)] blur-3xl" aria-hidden />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        {current ? (
          <div className={`transition-opacity duration-200 ${fade ? "opacity-100" : "opacity-0"}`}>
            <p className="text-2xl font-medium leading-snug text-foreground sm:text-4xl">
              <span className="text-primary">"</span>
              {current.quote}
              <span className="text-primary">"</span>
            </p>
            <p className="mt-6 text-sm uppercase tracking-[0.2em] text-muted-foreground">
              — {current.author || "Unknown"}
              {current.category && <span className="ml-2 text-primary">· {current.category}</span>}
              <span className="ml-2 text-primary">· {current.language}</span>
            </p>
          </div>
        ) : (
          <p className="text-lg text-muted-foreground">
            {quotes.length ? "No quotes match your current filters." : "The archive is empty."}
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={shuffle} size="lg" className="rounded-full shadow-md" disabled={!pool.length}>
            <Shuffle /> Surprise me
          </Button>
          {current && (
            <Button
              onClick={() => toggleFavorite(current.id)}
              variant="outline"
              size="lg"
              className="rounded-full bg-card/70 backdrop-blur"
            >
              <Heart className={isFavorite(current.id) ? "fill-[oklch(0.78_0.13_20)] text-[oklch(0.78_0.13_20)]" : ""} />
              {isFavorite(current.id) ? "Favorited" : "Favorite"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

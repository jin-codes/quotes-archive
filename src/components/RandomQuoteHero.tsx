import { useEffect, useMemo, useRef, useState } from "react";
import { Shuffle, Heart, Pin, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuotes } from "@/lib/quotes-context";
import type { Quote } from "@/lib/quotes-store";
import { QuoteImageDialog } from "./QuoteImageDialog";
import { filterQuotes, type QuoteFilters } from "./QuoteLibrary";

export function RandomQuoteHero({ filters }: { filters: QuoteFilters }) {
  const { quotes, favoriteIds, isFavorite, toggleFavorite, pinnedId, pinQuote } = useQuotes();
  const [idx, setIdx] = useState<number | null>(null);
  const [fade, setFade] = useState(true);

  const pool = useMemo(
    () => filterQuotes(quotes, favoriteIds, filters),
    [quotes, favoriteIds, filters],
  );

  // A pinned quote only shows in the selected language: use its translation, if any.
  const pinnedQuote = useMemo(() => {
    const pinned = pinnedId ? quotes.find((q) => q.id === pinnedId) ?? null : null;
    if (!pinned || pinned.language === filters.language) return pinned;
    if (!pinned.translation_group) return null;
    return (
      quotes.find(
        (q) => q.translation_group === pinned.translation_group && q.language === filters.language,
      ) ?? null
    );
  }, [pinnedId, quotes, filters.language]);

  // Last quote shown, so switching language can jump to its translation.
  const lastShown = useRef<Quote | null>(null);

  useEffect(() => {
    if (pinnedQuote) return;
    if (!pool.length) {
      setIdx(null);
      return;
    }
    const group = lastShown.current?.translation_group;
    const twin = group ? pool.findIndex((q) => q.translation_group === group) : -1;
    if (twin >= 0) {
      setIdx(twin);
      return;
    }
    setIdx((cur) => {
      const shown = cur !== null ? pool[cur] : undefined;
      return shown && shown.id === lastShown.current?.id
        ? cur
        : Math.floor(Math.random() * pool.length);
    });
  }, [pool, pinnedQuote]);

  // fade animation whenever the displayed quote source changes (pin change, etc.)
  useEffect(() => {
    setFade(false);
    const t = setTimeout(() => setFade(true), 20);
    return () => clearTimeout(t);
  }, [pinnedId, idx]);

  const shuffle = () => {
    if (pinnedQuote) {
      // unpin so shuffle takes over
      pinQuote(pinnedQuote.id);
    }
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

  const current = pinnedQuote ?? (idx !== null ? pool[idx] ?? null : null);
  useEffect(() => {
    if (current) lastShown.current = current;
  }, [current]);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[oklch(0.93_0.05_300)] via-[oklch(0.95_0.04_30)] to-[oklch(0.93_0.06_165)] px-6 py-16 shadow-[0_10px_40px_-15px_oklch(0.72_0.11_300_/_0.4)] sm:px-12 sm:py-24">
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[oklch(0.85_0.1_300_/_0.4)] blur-3xl" aria-hidden />
      <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[oklch(0.88_0.09_165_/_0.45)] blur-3xl" aria-hidden />
      <div className="absolute inset-0 bg-white/15 backdrop-blur-[1px]" aria-hidden />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        {pinnedQuote && (
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur">
            <Pin className="size-3.5 fill-primary" /> Pinned
          </div>
        )}
        {current ? (
          <div
            key={current.id}
            className={`w-full transition-all duration-300 ease-out ${
              fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <p
              className="mx-auto line-clamp-4 max-w-3xl text-xl font-medium leading-snug text-foreground sm:text-3xl md:text-4xl"
              style={{
                wordBreak: "keep-all",
                overflowWrap: "break-word",
                textShadow: "0 1px 2px rgba(255,255,255,0.6)",
              }}
            >
              <span className="text-primary">"</span>
              {current.quote}
              <span className="text-primary">"</span>
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground sm:text-sm">
                — {current.author || "Unknown"}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {current.tags.map((t) => (
                  <span key={t} className="rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur">
                    #{t}
                  </span>
                ))}
                <span className="rounded-full bg-white/50 px-3 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur">
                  {current.language}
                </span>
              </div>
            </div>
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
          {current && (
            <QuoteImageDialog
              quote={current}
              trigger={
                <Button variant="outline" size="lg" className="rounded-full bg-card/70 backdrop-blur">
                  <Download /> Save image
                </Button>
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

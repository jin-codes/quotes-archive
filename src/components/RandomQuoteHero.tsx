import { useEffect, useState } from "react";
import { Shuffle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuotes } from "@/lib/quotes-context";

export function RandomQuoteHero() {
  const { quotes, toggleFavorite } = useQuotes();
  const [idx, setIdx] = useState<number | null>(null);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (quotes.length && idx === null) setIdx(Math.floor(Math.random() * quotes.length));
  }, [quotes, idx]);

  const shuffle = () => {
    if (quotes.length < 2) {
      setIdx(quotes.length ? 0 : null);
      return;
    }
    setFade(false);
    setTimeout(() => {
      let next = Math.floor(Math.random() * quotes.length);
      if (next === idx) next = (next + 1) % quotes.length;
      setIdx(next);
      setFade(true);
    }, 180);
  };

  const current = idx !== null ? quotes[idx] : null;

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
            </p>
          </div>
        ) : (
          <p className="text-lg text-muted-foreground">Add your first quote to get started.</p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={shuffle} size="lg" className="rounded-full shadow-md" disabled={!quotes.length}>
            <Shuffle /> Surprise me
          </Button>
          {current && (
            <Button
              onClick={() => toggleFavorite(current.id)}
              variant="outline"
              size="lg"
              className="rounded-full bg-card/70 backdrop-blur"
            >
              <Heart className={current.favorite ? "fill-[oklch(0.78_0.13_20)] text-[oklch(0.78_0.13_20)]" : ""} />
              {current.favorite ? "Favorited" : "Favorite"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

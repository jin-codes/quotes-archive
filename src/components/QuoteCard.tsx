import { Heart, Trash2 } from "lucide-react";
import type { Quote } from "@/lib/quotes-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function QuoteCard({
  quote,
  onToggleFavorite,
  onRemove,
}: {
  quote: Quote;
  onToggleFavorite: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <article className="group relative rounded-2xl bg-card p-6 shadow-[0_4px_20px_-8px_oklch(0.72_0.11_300_/_0.25)] ring-1 ring-border/60 transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-10px_oklch(0.72_0.11_300_/_0.4)]">
      <p className="text-base leading-relaxed text-card-foreground">"{quote.quote}"</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{quote.author || "Unknown"}</p>
          {quote.category && (
            <Badge variant="secondary" className="mt-1 rounded-full bg-accent/60 text-accent-foreground">
              {quote.category}
            </Badge>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleFavorite(quote.id)}
            aria-label={quote.favorite ? "Unfavorite" : "Favorite"}
            className="rounded-full"
          >
            <Heart
              className={
                quote.favorite
                  ? "fill-[oklch(0.78_0.13_20)] text-[oklch(0.78_0.13_20)]"
                  : "text-muted-foreground"
              }
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(quote.id)}
            aria-label="Delete"
            className="rounded-full text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </article>
  );
}

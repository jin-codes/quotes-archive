import { useMemo, useState } from "react";
import { Check, X, Inbox, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuotes, type PendingItem } from "@/lib/quotes-context";
import type { Quote } from "@/lib/quotes-store";

function DiffLine({ label, before, after }: { label: string; before: string; after: string }) {
  const changed = (before || "") !== (after || "");
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3 text-sm">
      <span className="pt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="space-y-1">
        {changed ? (
          <>
            <p className="rounded-lg bg-[oklch(0.95_0.04_20_/_0.6)] px-3 py-1.5 text-foreground line-through decoration-[oklch(0.78_0.13_20)]/60">
              {before || <span className="italic text-muted-foreground">empty</span>}
            </p>
            <p className="rounded-lg bg-[oklch(0.94_0.06_165_/_0.55)] px-3 py-1.5 text-foreground">
              {after || <span className="italic text-muted-foreground">empty</span>}
            </p>
          </>
        ) : (
          <p className="rounded-lg bg-card px-3 py-1.5 text-muted-foreground">
            {after || <span className="italic">empty</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function PendingCard({
  item,
  original,
  onApprove,
  onReject,
}: {
  item: PendingItem;
  original?: Quote;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handle = async (fn: () => Promise<void> | void) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <article className="rounded-2xl bg-card p-5 shadow-[0_4px_20px_-8px_oklch(0.72_0.11_300_/_0.2)] ring-1 ring-border/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`rounded-full ${
              item.type === "new"
                ? "bg-[oklch(0.93_0.06_165_/_0.6)] text-foreground"
                : "bg-[oklch(0.93_0.06_55_/_0.6)] text-foreground"
            }`}
          >
            {item.type === "new" ? "New quote" : "Edit"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            from {item.submitter_email || "anonymous"}
          </span>
          <span className="text-xs text-muted-foreground">
            · {new Date(item.created_at).toLocaleDateString()}
          </span>
        </div>
        {item.type === "edit" && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp /> : <ChevronDown />}
            {expanded ? "Hide diff" : "Show diff"}
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {item.type === "edit" && expanded && original ? (
          <div className="space-y-2 rounded-xl bg-background/60 p-3">
            <DiffLine label="Quote" before={original.quote} after={item.quote} />
            <DiffLine label="Author" before={original.author} after={item.author} />
            <DiffLine label="Category" before={original.category} after={item.category} />
            <DiffLine label="Language" before={original.language} after={item.language} />
          </div>
        ) : item.type === "edit" && !original ? (
          <p className="rounded-xl bg-background/60 p-3 text-sm text-muted-foreground">
            Original quote no longer exists.
          </p>
        ) : (
          <div className="space-y-2 rounded-xl bg-background/60 p-3">
            <p className="text-base leading-relaxed text-card-foreground">"{item.quote}"</p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-medium text-foreground">{item.author || "Unknown"}</span>
              {item.category && (
                <Badge variant="secondary" className="rounded-full bg-accent/60 text-accent-foreground">
                  {item.category}
                </Badge>
              )}
              <Badge variant="secondary" className="rounded-full bg-secondary/60 text-secondary-foreground">
                {item.language}
              </Badge>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => handle(onReject)}
          disabled={busy}
        >
          <X /> Reject
        </Button>
        <Button
          size="sm"
          className="rounded-full"
          onClick={() => handle(onApprove)}
          disabled={busy || (item.type === "edit" && !original)}
        >
          <Check /> Approve
        </Button>
      </div>
    </article>
  );
}

export function PendingQueue() {
  const { pending, quotes, approvePending, rejectPending } = useQuotes();

  const byId = useMemo(() => {
    const m = new Map<string, Quote>();
    quotes.forEach((q) => m.set(q.id, q));
    return m;
  }, [quotes]);

  if (pending.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
        <Inbox className="mx-auto mb-2 size-6" />
        No pending submissions. You're all caught up.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {pending.map((p) => (
        <PendingCard
          key={p.id}
          item={p}
          original={p.original_quote_id ? byId.get(p.original_quote_id) : undefined}
          onApprove={() => approvePending(p.id)}
          onReject={() => rejectPending(p.id)}
        />
      ))}
    </div>
  );
}

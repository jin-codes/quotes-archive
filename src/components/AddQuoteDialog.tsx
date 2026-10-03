import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuotes } from "@/lib/quotes-context";
import { detectLanguage, parseTags, type Quote } from "@/lib/quotes-store";
import { TAG_GROUPS, OTHER_GROUP, groupOfTag } from "@/lib/tag-groups";
import { toast } from "sonner";


function QuoteFormDialog({
  trigger,
  mode,
  initial,
  onSubmit,
  title,
  description,
  submitLabel,
}: {
  trigger: ReactNode;
  mode: "add" | "edit";
  initial?: Quote;
  onSubmit: (input: {
    quote: string;
    author: string;
    category: string;
    tags: string[];
    language: "ENG" | "KOR";
  }) => Promise<"applied" | "pending" | "denied">;
  title: string;
  description?: string;
  submitLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState(initial?.quote ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [language, setLanguage] = useState<"ENG" | "KOR">(initial?.language ?? "ENG");
  const [langTouched, setLangTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && initial) {
      setQuote(initial.quote);
      setAuthor(initial.author);
      setTagsText(initial.tags.join(", "));
      setLanguage(initial.language);
      setLangTouched(false);
    } else if (open && !initial) {
      setQuote("");
      setAuthor("");
      setTagsText("");
      setLanguage("ENG");
      setLangTouched(false);
    }
  }, [open, initial]);

  const { quotes } = useQuotes();
  const currentTags = parseTags(tagsText);
  const suggestionGroups = useMemo(() => {
    const all = new Set<string>(TAG_GROUPS.flatMap((g) => g.tags));
    quotes.forEach((q) => q.tags.forEach((t) => all.add(t)));
    const names = [...TAG_GROUPS.map((g) => g.name), OTHER_GROUP];
    return names
      .map((name) => ({ name, tags: Array.from(all).filter((t) => groupOfTag(t) === name) }))
      .filter((g) => g.tags.length > 0);
  }, [quotes]);
  const toggleTag = (t: string) =>
    setTagsText((cur) => {
      const list = parseTags(cur);
      return (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]).join(", ");
    });

  const detected = quote.trim() ? detectLanguage(quote) : null;
  const effectiveLang: "ENG" | "KOR" = langTouched ? language : detected ?? language;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote.trim() || busy) return;
    setBusy(true);
    const result = await onSubmit({
      quote: quote.trim(),
      author: author.trim(),
      category: initial?.category ?? "",
      tags: parseTags(tagsText),
      language: effectiveLang,
    });
    setBusy(false);
    if (result === "applied") {
      toast.success(mode === "add" ? "Quote added" : "Quote updated");
      setOpen(false);
    } else if (result === "pending") {
      toast.success(
        mode === "add"
          ? "Submitted for review"
          : "Edit submitted for review",
      );
      setOpen(false);
    } else {
      toast.error("Could not submit. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="q">
              Quote{" "}
              <span className="ml-1 text-xs text-muted-foreground">· {effectiveLang}</span>
            </Label>
            <Textarea
              id="q"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={4}
              placeholder="Something worth remembering…"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a">Author / Source</Label>
            <Input id="a" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Marcus Aurelius" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t">Tags</Label>
            <Input
              id="t"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="용기, 끈기, 성장 (쉼표로 구분)"
            />
            <div className="max-h-36 space-y-1.5 overflow-y-auto">
              {suggestionGroups.map((g) => (
                <div key={g.name} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{g.name}</span>
                  {g.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                        currentTags.includes(t)
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:bg-accent/60"
                      }`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Language</Label>
            <div className="flex gap-1">
              {(["ENG", "KOR"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setLanguage(l);
                    setLangTouched(true);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    effectiveLang === l
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-accent/60"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="rounded-full" disabled={busy}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddQuoteDialog() {
  const { addQuote, isAdmin } = useQuotes();
  return (
    <QuoteFormDialog
      mode="add"
      trigger={
        <Button className="rounded-full shadow-sm">
          <Plus /> Add quote
        </Button>
      }
      title="Add a new quote"
      description={
        isAdmin
          ? "This will be published immediately."
          : "Your submission will be reviewed by an admin before appearing in the archive."
      }
      submitLabel={isAdmin ? "Save quote" : "Submit for review"}
      onSubmit={(input) => addQuote(input)}
    />
  );
}

export function EditQuoteDialog({
  quote,
  trigger,
}: {
  quote: Quote;
  trigger: ReactNode;
}) {
  const { updateQuote, isAdmin } = useQuotes();
  return (
    <QuoteFormDialog
      mode="edit"
      initial={quote}
      trigger={trigger}
      title="Edit quote"
      description={
        isAdmin
          ? "Changes will apply immediately."
          : "Your edit will be reviewed by an admin. The original quote stays visible until approved."
      }
      submitLabel={isAdmin ? "Save changes" : "Submit edit for review"}
      onSubmit={(input) => updateQuote(quote.id, input)}
    />
  );
}

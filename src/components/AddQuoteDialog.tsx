import { useEffect, useState, type ReactNode } from "react";
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
import { detectLanguage, type Quote } from "@/lib/quotes-store";
import { toast } from "sonner";

const SUGGESTED = ["Philosophy", "Literature", "Economics", "Science", "Art", "Life"];

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
    language: "ENG" | "KOR";
  }) => Promise<"applied" | "pending" | "denied">;
  title: string;
  description?: string;
  submitLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState(initial?.quote ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [language, setLanguage] = useState<"ENG" | "KOR">(initial?.language ?? "ENG");
  const [langTouched, setLangTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && initial) {
      setQuote(initial.quote);
      setAuthor(initial.author);
      setCategory(initial.category);
      setLanguage(initial.language);
      setLangTouched(false);
    } else if (open && !initial) {
      setQuote("");
      setAuthor("");
      setCategory("");
      setLanguage("ENG");
      setLangTouched(false);
    }
  }, [open, initial]);

  const detected = quote.trim() ? detectLanguage(quote) : null;
  const effectiveLang: "ENG" | "KOR" = langTouched ? language : detected ?? language;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote.trim() || busy) return;
    setBusy(true);
    const result = await onSubmit({
      quote: quote.trim(),
      author: author.trim(),
      category: category.trim(),
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="a">Author / Source</Label>
              <Input id="a" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Marcus Aurelius" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c">Category</Label>
              <Input
                id="c"
                list="cat-suggest"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Philosophy"
              />
              <datalist id="cat-suggest">
                {SUGGESTED.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
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

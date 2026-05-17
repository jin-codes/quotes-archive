import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuotes } from "@/lib/quotes-context";

const SUGGESTED = ["Philosophy", "Literature", "Economics", "Science", "Art", "Life"];

export function AddQuoteDialog() {
  const { addQuote } = useQuotes();
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote.trim()) return;
    addQuote({ quote: quote.trim(), author: author.trim(), category: category.trim() });
    setQuote(""); setAuthor(""); setCategory("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full shadow-sm">
          <Plus /> Add quote
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add a new quote</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="q">Quote</Label>
            <Textarea id="q" value={quote} onChange={(e) => setQuote(e.target.value)} rows={4} placeholder="Something worth remembering…" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="a">Author / Source</Label>
              <Input id="a" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Marcus Aurelius" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c">Category</Label>
              <Input id="c" list="cat-suggest" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Philosophy" />
              <datalist id="cat-suggest">
                {SUGGESTED.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="rounded-full">Save quote</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

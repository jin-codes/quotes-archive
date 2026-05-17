import { createFileRoute } from "@tanstack/react-router";
import { QuotesProvider } from "@/lib/quotes-context";
import { RandomQuoteHero } from "@/components/RandomQuoteHero";
import { QuoteLibrary } from "@/components/QuoteLibrary";
import { AddQuoteDialog } from "@/components/AddQuoteDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quote Keeper — Your Personal Quote Collection" },
      { name: "description", content: "Collect, search, and rediscover the quotes that move you. Saved as a portable .xlsx file." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <QuotesProvider>
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Quote Keeper</h1>
              <p className="text-sm text-muted-foreground">Your personal anthology.</p>
            </div>
            <AddQuoteDialog />
          </header>

          <RandomQuoteHero />

          <div className="mt-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold text-foreground">Library</h2>
            </div>
            <QuoteLibrary />
          </div>
        </div>
      </main>
    </QuotesProvider>
  );
}

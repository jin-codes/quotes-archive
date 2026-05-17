import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { QuotesProvider, useQuotes } from "@/lib/quotes-context";
import { RandomQuoteHero } from "@/components/RandomQuoteHero";
import { QuoteLibrary } from "@/components/QuoteLibrary";
import { AddQuoteDialog } from "@/components/AddQuoteDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quote Keeper — Your Personal Quote Collection" },
      { name: "description", content: "Collect, search, and rediscover the quotes that move you, synced across all your devices." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/auth" });
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </main>
    );
  }

  return (
    <QuotesProvider user={user}>
      <Shell />
    </QuotesProvider>
  );
}

function Shell() {
  const { user, signOut } = useQuotes();
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Quote Keeper</h1>
            <p className="truncate text-sm text-muted-foreground">
              Signed in as {user.email ?? "you"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AddQuoteDialog />
            <Button variant="outline" size="icon" className="rounded-full" onClick={signOut} aria-label="Sign out">
              <LogOut />
            </Button>
          </div>
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
  );
}

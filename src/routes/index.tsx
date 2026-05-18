import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { QuotesProvider, useQuotes } from "@/lib/quotes-context";
import { RandomQuoteHero } from "@/components/RandomQuoteHero";
import { QuoteLibrary, type QuoteFilters } from "@/components/QuoteLibrary";
import { AddQuoteDialog } from "@/components/AddQuoteDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quote Archive — A Shared Collection of Quotes" },
      {
        name: "description",
        content:
          "Browse, search, and favorite quotes from a shared archive. Sign in to keep your favorites across devices.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </main>
    );
  }

  return (
    <QuotesProvider user={user} isAdmin={isAdmin}>
      <Shell />
    </QuotesProvider>
  );
}

function Shell() {
  const { user, isAdmin, signOut } = useQuotes();
  const [filters, setFilters] = useState<QuoteFilters>({
    search: "",
    favOnly: false,
    category: null,
    language: null,
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Quote Archive</h1>
            <p className="truncate text-sm text-muted-foreground">
              {user
                ? isAdmin
                  ? `Signed in as ${user.email ?? "admin"} · Admin`
                  : `Signed in as ${user.email ?? "you"}`
                : "Browsing as guest · favorites are saved on sign-in"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <AddQuoteDialog />}
            {user ? (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={signOut}
                aria-label="Sign out"
              >
                <LogOut />
              </Button>
            ) : (
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/auth">
                  <LogIn /> Sign in
                </Link>
              </Button>
            )}
          </div>
        </header>

        <RandomQuoteHero filters={filters} />

        <div className="mt-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold text-foreground">Library</h2>
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
                <ShieldCheck className="size-3.5" /> Admin tools enabled
              </span>
            )}
          </div>
          <QuoteLibrary filters={filters} setFilters={setFilters} />
        </div>
      </div>
    </main>
  );
}

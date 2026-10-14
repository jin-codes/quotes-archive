import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { signInWithGoogle, useSession } from "@/lib/session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Quote Keeper" },
      { name: "description", content: "Sign in to save and sync your quote collection across devices." },
    ],
  }),
  component: AuthPage,
});

type GoogleId = {
  initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GSI_SRC = "https://accounts.google.com/gsi/client";

function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google) return resolve();
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google sign-in"));
    document.head.appendChild(s);
  });
}

function AuthPage() {
  const navigate = useNavigate();
  const { user, ready } = useSession();
  const btnRef = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) navigate({ to: "/" });
  }, [ready, user, navigate]);

  useEffect(() => {
    if (!CLIENT_ID) {
      setMsg("VITE_GOOGLE_CLIENT_ID is not set");
      return;
    }
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !btnRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (r) => {
            setMsg(null);
            signInWithGoogle(r.credential).catch((e) =>
              setMsg(e instanceof Error ? e.message : "Something went wrong"),
            );
          },
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
        });
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : "Something went wrong"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (ready && user) return <Navigate to="/" />;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="rounded-3xl bg-card p-8 shadow-[0_10px_40px_-15px_oklch(0.72_0.11_300_/_0.35)] ring-1 ring-border/60">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your personal anthology, synced everywhere.
          </p>
          <div ref={btnRef} className="mt-6 flex justify-center" />
          {msg && <p className="mt-4 text-center text-sm text-muted-foreground">{msg}</p>}
        </div>
      </div>
    </main>
  );
}

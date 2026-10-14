import { useEffect, useState } from "react";
import { api, getToken, setToken, type AppUser } from "./api";

type State = { user: AppUser | null; ready: boolean };

let state: State = { user: null, ready: false };
let started = false;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

async function restore() {
  if (!getToken()) return set({ user: null, ready: true });
  try {
    const user = await api<AppUser | null>("me");
    if (!user) setToken(null);
    set({ user, ready: true });
  } catch {
    set({ user: null, ready: true });
  }
}

export async function signInWithGoogle(idToken: string) {
  const { token, user } = await api<{ token: string; user: AppUser }>("login", { idToken });
  setToken(token);
  set({ user, ready: true });
}

export function signOut() {
  setToken(null);
  set({ user: null, ready: true });
}

export function useSession(): State {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    if (!started) {
      started = true;
      restore();
    }
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

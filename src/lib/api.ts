const URL_ = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined;
const TOKEN_KEY = "qa_session";

export type AppUser = { email: string; isAdmin: boolean };

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export async function api<T = unknown>(action: string, payload?: unknown): Promise<T> {
  if (!URL_) throw new Error("VITE_APPS_SCRIPT_URL is not set");
  // text/plain keeps this a "simple" request so Apps Script needs no CORS preflight.
  const res = await fetch(URL_, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload, token: getToken() }),
  });
  const json = (await res.json()) as { ok: boolean; data?: T; error?: string };
  if (!json.ok) throw new Error(json.error || "request failed");
  return json.data as T;
}

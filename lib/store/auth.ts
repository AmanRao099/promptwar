import { create } from "zustand";

export interface SessionUser {
  id: number;
  email: string;
  role: "user" | "caretaker";
  shareCode: string | null;
  linked?: Array<{ id: number; email: string }>;
}

interface AuthState {
  user: SessionUser | null;
  loaded: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loaded: false,

  refresh: async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      set({ user: data.user ?? null, loaded: true });
    } catch {
      set({ user: null, loaded: true });
    }
  },

  signOut: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      set({ user: null });
    }
  },
}));

// Fire-and-forget activity log. No-op when signed out (401) — the app works
// fully without an account; the feed is only for linked caretakers.
export function logActivity(
  type: "checkin" | "voice" | "sos",
  payload: Record<string, unknown>,
): void {
  void fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, payload }),
  }).catch(() => {});
}

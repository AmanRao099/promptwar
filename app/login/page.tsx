"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import { Icon } from "@/components/ui/Icon";

type Mode = "signin" | "signup";
type Role = "user" | "caretaker";

export default function LoginPage() {
  const router = useRouter();
  const refresh = useAuthStore((s) => s.refresh);
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(
        mode === "signup" ? "/api/auth/signup" : "/api/auth/login",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            mode === "signup" ? { email, password, role } : { email, password },
          ),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "email_taken"
            ? "That email already has an account — sign in instead."
            : data.error === "invalid_credentials"
              ? "Email or password didn't match."
              : data.error === "storage_unavailable"
                ? "Account storage isn't configured on this deployment yet. (Admin: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.)"
                : mode === "signup"
                  ? "Couldn't create the account. Password needs 8+ characters."
                  : "Sign-in failed. Try again.",
        );
        return;
      }
      await refresh();
      router.push(data.user.role === "caretaker" ? "/caregiver" : "/recovery");
    } catch {
      setError("Network hiccup — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-margin-mobile py-stack-lg">
      <Link href="/" className="mb-8 flex items-center gap-3" aria-label="HavenAI home">
        <Icon name="healing" className="text-3xl text-primary" />
        <span className="text-label-lg uppercase tracking-widest text-primary">
          HavenAI
        </span>
      </Link>

      <h1 className="text-headline-lg-mobile text-on-surface">
        {mode === "signin" ? "Welcome back" : "Create your space"}
      </h1>
      <p className="mt-2 text-body-md text-on-surface-variant">
        {mode === "signin"
          ? "You stay signed in on this device until you sign out."
          : "One account. Private by default — a caretaker only sees what you choose to share."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        {mode === "signup" && (
          <fieldset>
            <legend className="text-label-lg text-on-surface">I am…</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={role === "user"}
                onClick={() => setRole("user")}
                className={[
                  "min-h-touch rounded-xl border-2 px-4 py-3 text-left transition-all",
                  role === "user"
                    ? "border-primary bg-primary/15 text-on-surface"
                    : "border-outline-variant bg-surface-container text-on-surface-variant",
                ].join(" ")}
              >
                <span className="block font-semibold text-on-surface">In recovery</span>
                <span className="block text-xs">My own space</span>
              </button>
              <button
                type="button"
                aria-pressed={role === "caretaker"}
                onClick={() => setRole("caretaker")}
                className={[
                  "min-h-touch rounded-xl border-2 px-4 py-3 text-left transition-all",
                  role === "caretaker"
                    ? "border-secondary bg-secondary/15 text-on-surface"
                    : "border-outline-variant bg-surface-container text-on-surface-variant",
                ].join(" ")}
              >
                <span className="block font-semibold text-on-surface">Caretaker</span>
                <span className="block text-xs">Supporting someone</span>
              </button>
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor="email" className="text-label-lg text-on-surface">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-body-md text-on-surface focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-label-lg text-on-surface">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : 1}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-body-md text-on-surface focus:border-primary"
          />
          {mode === "signup" && (
            <p className="mt-1 text-xs text-on-surface-variant">8+ characters.</p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-error/50 bg-error/10 px-4 py-3 text-sm text-on-surface">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-bold text-on-primary transition-all active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
        className="mt-6 min-h-touch text-sm text-on-surface-variant underline underline-offset-4 hover:text-on-surface"
      >
        {mode === "signin"
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </main>
  );
}

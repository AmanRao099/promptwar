"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";

// Session indicator in the top bar: sign-in link when signed out, email +
// sign-out when signed in. Session persists via the 30-day cookie.
export function AccountChip() {
  const { user, loaded, refresh, signOut } = useAuthStore();

  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);

  if (!loaded) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex min-h-touch items-center rounded-lg border border-outline-variant px-3 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden max-w-[160px] truncate text-xs text-on-surface-variant sm:block"
        title={`${user.email} (${user.role})`}
      >
        {user.email}
      </span>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          window.location.href = "/";
        }}
        className="flex min-h-touch items-center rounded-lg border border-outline-variant px-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
      >
        Sign out
      </button>
    </div>
  );
}

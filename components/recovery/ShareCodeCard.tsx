"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { Icon } from "@/components/ui/Icon";

// Shown to a signed-in recovery user: the consent code a caretaker enters to
// link accounts and see check-ins, SOS alerts, and shared locations.
export function ShareCodeCard() {
  const { user, loaded, refresh } = useAuthStore();

  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);

  if (!loaded || !user || user.role !== "user" || !user.shareCode) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-outline-variant bg-surface-container-low px-6 py-4">
      <div className="flex items-center gap-3">
        <Icon name="verified_user" className="text-secondary" />
        <p className="text-sm text-on-surface-variant">
          Your caretaker code — share it only with someone you trust. They&apos;ll
          see your check-ins, SOS alerts, and shared locations.
        </p>
      </div>
      <span
        aria-label={`Caretaker code ${user.shareCode.split("").join(" ")}`}
        className="rounded-lg bg-surface-container-high px-4 py-2 font-mono text-xl font-bold tracking-[0.3em] text-primary"
      >
        {user.shareCode}
      </span>
    </div>
  );
}

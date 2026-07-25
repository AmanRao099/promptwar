"use client";

import Link from "next/link";
import { Icon } from "./Icon";

// Persistent bottom navigation. Links only to real routes; the SOS button opens
// the deterministic emergency overlay (no fake "beacon"/dispatch destinations).
export function BottomNav({
  active,
  onEmergency,
}: {
  active: "recovery" | "caregiver";
  onEmergency: () => void;
}) {
  const itemBase =
    "flex min-h-touch min-w-touch flex-col items-center justify-center gap-1 rounded-xl px-5 py-2 text-[11px] font-semibold transition-all active:scale-90";

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 z-40 flex h-[76px] w-full items-center justify-center border-t border-outline-variant bg-surface-container-lowest/95 backdrop-blur"
    >
      <div className="flex w-full max-w-md items-center justify-around px-4">
      <button
        type="button"
        onClick={onEmergency}
        aria-label="Emergency help"
        className={`${itemBase} animate-pulse-red bg-error-container/20 text-error`}
      >
        <Icon name="sos" fill className="text-3xl" />
        SOS
      </button>

      <Link
        href="/recovery"
        aria-current={active === "recovery" ? "page" : undefined}
        className={`${itemBase} ${
          active === "recovery"
            ? "bg-primary-container/20 text-primary"
            : "text-on-surface-variant hover:text-primary"
        }`}
      >
        <Icon name="dashboard_customize" fill={active === "recovery"} className="text-3xl" />
        Recovery
      </Link>

      <Link
        href="/caregiver"
        aria-current={active === "caregiver" ? "page" : undefined}
        className={`${itemBase} ${
          active === "caregiver"
            ? "bg-primary-container/20 text-primary"
            : "text-on-surface-variant hover:text-primary"
        }`}
      >
        <Icon name="record_voice_over" fill={active === "caregiver"} className="text-3xl" />
        Caregiver
      </Link>
      </div>
    </nav>
  );
}

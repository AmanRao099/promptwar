"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui/Icon";
import { useAuthStore } from "@/lib/store/auth";

// Hardcoded crisis overlay. ZERO LLM dependency by design — rendered when the
// deterministic fail-safe (lib/safety/failSafe.ts) trips. Content here must
// never be generated. No fabricated dispatch/GPS/medical data is shown.

const HOTLINES = [
  {
    id: "911",
    label: "Call 911 / paramedics",
    detail: "If someone is unresponsive or not breathing",
    href: "tel:911",
    action: "911",
    icon: "emergency",
    tone: "error" as const,
  },
  {
    id: "988",
    label: "Call 988 Crisis Lifeline",
    detail: "Call or text 988 — 24/7, free, confidential",
    href: "tel:988",
    action: "988",
    icon: "support_agent",
    tone: "secondary" as const,
  },
  {
    id: "text",
    label: "Text the Crisis Line",
    detail: "Text HOME to 741741",
    href: "sms:741741?&body=HOME",
    action: "741741",
    icon: "chat_bubble",
    tone: "secondary" as const,
  },
];

type LocationStatus = "idle" | "sending" | "sent" | "error";

export function EmergencyOverlay({ onDismiss }: { onDismiss?: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const [locStatus, setLocStatus] = useState<LocationStatus>("idle");

  const canShareLocation =
    user?.role === "user" &&
    typeof navigator !== "undefined" &&
    "geolocation" in navigator;

  const sendLocation = () => {
    setLocStatus("sending");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/location", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
            }),
          });
          setLocStatus(res.ok ? "sent" : "error");
        } catch {
          setLocStatus("error");
        }
      },
      () => setLocStatus("error"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  // Move focus into the dialog on open, restore on close, trap Tab, Escape to
  // dismiss (when dismissible). Standard modal a11y.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    focusables?.[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onDismiss) {
        onDismiss();
        return;
      }
      if (e.key !== "Tab" || !focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onDismiss]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
      aria-describedby="emergency-desc"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 p-4 md:p-10"
    >
      <div
        ref={panelRef}
        className="animate-pulse-red flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border-4 border-error bg-surface shadow-2xl"
      >
        <header className="bg-error px-6 py-5 text-center">
          <h2
            id="emergency-title"
            className="text-emergency-action uppercase tracking-wider text-[#3a0000]"
          >
            Emergency Safety Override
          </h2>
        </header>

        <div className="flex flex-col gap-stack-md p-margin-mobile md:p-10">
          <p id="emergency-desc" className="text-body-lg text-on-surface-variant">
            What you described needs a real person right now. You are not alone.
            The AI is bypassed for your safety.
          </p>

          <ul className="flex flex-col gap-4">
            {HOTLINES.map((h) => (
              <li key={h.id}>
                <a
                  href={h.href}
                  className={[
                    "group flex min-h-[64px] items-center justify-between gap-4 rounded-lg px-5 py-4 text-left transition-all active:scale-[0.98]",
                    h.tone === "error"
                      ? "bg-error text-[#3a0000]"
                      : "bg-secondary-container text-on-secondary-container",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-3">
                    <Icon name={h.icon} fill className="text-3xl" />
                    <span>
                      <span className="block text-lg font-bold">{h.label}</span>
                      <span className="block text-sm opacity-80">{h.detail}</span>
                    </span>
                  </span>
                  <span className="text-emergency-action shrink-0">{h.action}</span>
                </a>
              </li>
            ))}
          </ul>

          {canShareLocation && (
            <div className="flex flex-col items-center py-2 text-center">
              <button
                type="button"
                onClick={sendLocation}
                disabled={locStatus === "sending" || locStatus === "sent"}
                aria-label="Send my live location to my caretaker"
                className={[
                  "flex h-32 w-32 items-center justify-center rounded-full border-4 shadow-2xl transition-all active:scale-90 disabled:cursor-default",
                  locStatus === "sent"
                    ? "border-primary bg-primary/25 text-primary"
                    : "animate-pulse-red border-error bg-error text-[#3a0000] hover:brightness-110",
                ].join(" ")}
              >
                <Icon
                  name={locStatus === "sent" ? "check" : "emergency_share"}
                  className={`text-6xl ${locStatus === "sending" ? "animate-pulse" : ""}`}
                />
              </button>
              <p className="mt-3 text-label-lg font-bold text-on-surface">
                {locStatus === "idle" && "Send my live location"}
                {locStatus === "sending" && "Getting your location…"}
                {locStatus === "sent" && "Location sent to your caretaker"}
                {locStatus === "error" && "Couldn't get location — tap to retry"}
              </p>
              {locStatus !== "sent" && (
                <p className="mt-1 text-sm text-on-surface-variant">
                  Goes straight to your caretaker with a map link.
                </p>
              )}
            </div>
          )}

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="flex min-h-touch w-full items-center justify-center gap-2 rounded-lg border-2 border-outline-variant px-4 py-3 text-label-lg text-on-surface transition-colors hover:bg-surface-container-highest"
            >
              <Icon name="close" />
              I&apos;m safe now — go back
            </button>
          )}
        </div>

        <footer className="flex items-center justify-center gap-2 border-t border-outline-variant bg-surface-container-lowest px-6 py-4">
          <Icon name="verified_user" className="text-sm text-on-surface-variant" />
          <p className="text-center text-xs uppercase tracking-widest text-on-surface-variant">
            Bypassed AI engine for immediate safety
          </p>
        </footer>
      </div>
    </div>
  );
}

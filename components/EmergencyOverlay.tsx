"use client";

import { useEffect, useRef } from "react";

// Hardcoded crisis overlay. ZERO LLM dependency by design — rendered when the
// deterministic fail-safe (lib/safety/failSafe.ts) trips. Content here must
// never be generated.

const HOTLINES = [
  {
    id: "988",
    label: "988 Suicide & Crisis Lifeline",
    detail: "Call or text 988 — 24/7, free, confidential",
    href: "tel:988",
    action: "Call 988",
  },
  {
    id: "911",
    label: "Medical emergency",
    detail: "If someone is unresponsive or not breathing",
    href: "tel:911",
    action: "Call 911",
  },
  {
    id: "text",
    label: "Crisis Text Line",
    detail: "Text HOME to 741741",
    href: "sms:741741?&body=HOME",
    action: "Text 741741",
  },
];

export function EmergencyOverlay({ onDismiss }: { onDismiss?: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog on open, restore it on close, trap Tab inside,
  // and let Escape dismiss (when dismissible). Standard modal a11y.
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg rounded-2xl border-2 border-haven-danger bg-haven-dangerBg p-6 shadow-2xl"
      >
        <h2 id="emergency-title" className="text-2xl font-bold text-haven-text">
          Let&apos;s get help right now
        </h2>
        <p id="emergency-desc" className="mt-2 text-lg text-haven-muted">
          What you described needs a real person immediately. You are not alone
          in this.
        </p>

        <ul className="mt-6 space-y-3">
          {HOTLINES.map((h) => (
            <li key={h.id}>
              <a
                href={h.href}
                className="flex min-h-touch items-center justify-between gap-4 rounded-xl border border-haven-danger bg-haven-surface px-5 py-4 text-left transition hover:bg-haven-surfaceHi focus-visible:bg-haven-surfaceHi"
              >
                <span>
                  <span className="block text-lg font-semibold text-haven-text">
                    {h.label}
                  </span>
                  <span className="block text-base text-haven-muted">
                    {h.detail}
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-haven-danger px-4 py-2 text-base font-bold text-black">
                  {h.action}
                </span>
              </a>
            </li>
          ))}
        </ul>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-6 min-h-touch w-full rounded-xl border border-haven-border px-4 py-3 text-base font-medium text-haven-muted hover:bg-haven-surfaceHi"
          >
            I&apos;m safe now — go back
          </button>
        )}
      </div>
    </div>
  );
}

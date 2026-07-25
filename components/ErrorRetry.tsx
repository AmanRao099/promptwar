"use client";

import { Icon } from "./ui/Icon";

// Shown when a stream fails outright (network/server). Recovery is one tap —
// the user's selections are preserved in the store, so retry re-runs them.
export function ErrorRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-tertiary/50 bg-surface-container p-6"
    >
      <p className="flex items-center gap-2 text-body-lg font-semibold text-on-surface">
        <Icon name="cloud_off" className="text-tertiary" />
        That didn&apos;t come through.
      </p>
      <p className="mt-1 text-body-md text-on-surface-variant">
        The connection hiccuped — your choices are saved. Try once more.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-touch items-center gap-2 rounded-xl border-2 border-primary bg-surface-container-high px-5 py-3 text-label-lg text-on-surface transition-colors hover:bg-surface-container"
      >
        <Icon name="refresh" />
        Try again
      </button>
    </div>
  );
}

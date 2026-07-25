"use client";

// Shown when a stream fails outright (network/server). Recovery is one tap —
// the user's selections are preserved in the store, so retry re-runs them.
export function ErrorRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-haven-warn bg-haven-surface px-5 py-4"
    >
      <p className="text-lg font-semibold text-haven-text">
        That didn&apos;t come through.
      </p>
      <p className="mt-1 text-base text-haven-muted">
        The connection hiccuped — your choices are saved. Try once more.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-touch rounded-xl border-2 border-haven-accent bg-haven-surfaceHi px-5 py-3 text-lg font-semibold text-haven-text hover:bg-haven-surface"
      >
        Try again
      </button>
    </div>
  );
}

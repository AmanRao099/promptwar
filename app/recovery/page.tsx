"use client";

import Link from "next/link";
import { useRecoveryStore } from "@/lib/store/recovery";
import { CravingDial } from "@/components/recovery/CravingDial";
import { SomaticSelector } from "@/components/recovery/SomaticSelector";
import { ScriptStream } from "@/components/recovery/ScriptStream";
import { EmergencyOverlay } from "@/components/EmergencyOverlay";

export default function RecoveryPage() {
  const cravingValue = useRecoveryStore((s) => s.cravingValue);
  const somaticId = useRecoveryStore((s) => s.somaticId);
  const note = useRecoveryStore((s) => s.note);
  const setNote = useRecoveryStore((s) => s.setNote);
  const status = useRecoveryStore((s) => s.status);
  const generate = useRecoveryStore((s) => s.generate);
  const reset = useRecoveryStore((s) => s.reset);

  const ready = cravingValue != null && somaticId != null;
  const busy = status === "streaming";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-haven-muted underline-offset-4 hover:underline"
        >
          ← Haven
        </Link>
        {status !== "idle" && (
          <button
            type="button"
            onClick={reset}
            className="min-h-touch rounded-lg border border-haven-border px-4 text-sm text-haven-muted hover:bg-haven-surfaceHi"
          >
            Start over
          </button>
        )}
      </div>

      <h1 className="mt-4 text-3xl font-bold text-haven-text sm:text-4xl">
        You reached for this instead. That counts.
      </h1>
      <p className="mt-2 text-lg text-haven-muted">
        Two taps. We&apos;ll hand you the words and walk you through it.
      </p>

      <div className="mt-8 space-y-8">
        <CravingDial />
        <SomaticSelector />

        <div>
          <label
            htmlFor="note"
            className="text-lg font-semibold text-haven-text"
          >
            Anything else? <span className="text-haven-muted">(optional)</span>
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Type only if you want to. It stays private and is scrubbed of personal details."
            className="mt-2 w-full rounded-xl border border-haven-border bg-haven-surface px-4 py-3 text-lg text-haven-text placeholder:text-haven-muted/70"
          />
        </div>

        <button
          type="button"
          disabled={!ready || busy}
          onClick={generate}
          className="min-h-touch w-full rounded-xl bg-haven-accent px-6 py-4 text-xl font-bold text-black transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Coming to you…" : "Help me through this"}
        </button>

        <ScriptStream />
      </div>

      {status === "crisis" && (
        <EmergencyOverlay onDismiss={reset} />
      )}
    </main>
  );
}

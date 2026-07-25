"use client";

import { useRecoveryStore } from "@/lib/store/recovery";
import { CravingDial } from "@/components/recovery/CravingDial";
import { VoiceChat } from "@/components/recovery/VoiceChat";
import { SomaticSelector } from "@/components/recovery/SomaticSelector";
import { ScriptStream } from "@/components/recovery/ScriptStream";
import { EmergencyOverlay } from "@/components/EmergencyOverlay";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { BottomNav } from "@/components/ui/BottomNav";
import { Icon } from "@/components/ui/Icon";

export default function RecoveryPage() {
  const cravingValue = useRecoveryStore((s) => s.cravingValue);
  const somaticId = useRecoveryStore((s) => s.somaticId);
  const note = useRecoveryStore((s) => s.note);
  const setNote = useRecoveryStore((s) => s.setNote);
  const status = useRecoveryStore((s) => s.status);
  const generate = useRecoveryStore((s) => s.generate);
  const reset = useRecoveryStore((s) => s.reset);
  const showEmergency = useRecoveryStore((s) => s.showEmergency);

  const ready = cravingValue != null && somaticId != null;
  const busy = status === "streaming";

  return (
    <>
      <TopAppBar status="Safety plan active" onEmergency={showEmergency} />

      <main className="mx-auto max-w-5xl px-margin-mobile pb-32 pt-stack-md md:px-margin-desktop">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
              You reached for this instead.
            </h1>
            <p className="mt-2 text-body-lg text-on-surface-variant">
              Two taps. We&apos;ll hand you the words and walk you through it.
            </p>
          </div>
          {status !== "idle" && (
            <button
              type="button"
              onClick={reset}
              className="min-h-touch shrink-0 rounded-lg border border-outline-variant px-4 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              Start over
            </button>
          )}
        </div>

        <div className="mt-8 space-y-stack-md">
          <VoiceChat />
          <CravingDial />
          <SomaticSelector />
        </div>

        <div className="mt-stack-md rounded-2xl border-2 border-outline-variant bg-surface-container p-6 md:p-8">
          <label htmlFor="note" className="text-label-lg text-on-surface">
            Anything else?{" "}
            <span className="text-on-surface-variant">(optional)</span>
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Type only if you want to. It stays private and is scrubbed of personal details."
            className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary"
          />
        </div>

        <button
          type="button"
          disabled={!ready || busy}
          onClick={generate}
          className="mt-stack-md flex min-h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-primary text-xl font-bold text-on-primary transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Icon
            name={busy ? "hourglass_top" : "spa"}
            className={busy ? "animate-spin" : undefined}
          />
          {busy ? "Coming to you…" : "Help me through this"}
        </button>
        {!ready && (
          <p className="mt-3 text-center text-sm text-on-surface-variant">
            Pick a craving level and where you feel it — then tap the button.
          </p>
        )}

        <div className="mt-stack-lg">
          <ScriptStream />
        </div>
      </main>

      <BottomNav active="recovery" onEmergency={showEmergency} />

      {status === "crisis" && <EmergencyOverlay onDismiss={reset} />}
    </>
  );
}

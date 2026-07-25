"use client";

import { useCaregiverStore } from "@/lib/store/caregiver";
import { SituationTags } from "@/components/caregiver/SituationTags";
import { CaregiverScriptStream } from "@/components/caregiver/CaregiverScriptStream";
import { CaretakerFeed } from "@/components/caregiver/CaretakerFeed";
import { EmergencyOverlay } from "@/components/EmergencyOverlay";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { BottomNav } from "@/components/ui/BottomNav";
import { Icon } from "@/components/ui/Icon";

export default function CaregiverPage() {
  const tagId = useCaregiverStore((s) => s.tagId);
  const note = useCaregiverStore((s) => s.note);
  const setNote = useCaregiverStore((s) => s.setNote);
  const status = useCaregiverStore((s) => s.status);
  const generate = useCaregiverStore((s) => s.generate);
  const reset = useCaregiverStore((s) => s.reset);
  const showEmergency = useCaregiverStore((s) => s.showEmergency);

  const ready = tagId != null;
  const busy = status === "streaming";

  return (
    <>
      <TopAppBar title="Caregiver Co-Pilot" status="Real-time support" onEmergency={showEmergency} />

      <main className="mx-auto max-w-4xl px-margin-mobile pb-32 pt-stack-md md:px-margin-desktop">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
              You&apos;re showing up. That&apos;s the hard part.
            </h1>
            <p className="mt-2 text-body-lg text-on-surface-variant">
              Tap what&apos;s happening. We&apos;ll hand you the exact words,
              tone, and posture — right now.
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
          <CaretakerFeed />
          <SituationTags />

          <div className="rounded-2xl border-2 border-outline-variant bg-surface-container p-6 md:p-8">
            <label htmlFor="cg-note" className="text-label-lg text-on-surface">
              Anything else?{" "}
              <span className="text-on-surface-variant">(optional)</span>
            </label>
            <textarea
              id="cg-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Type only if you want to. It stays private and is scrubbed of personal details."
              className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-secondary"
            />
          </div>

          <button
            type="button"
            disabled={!ready || busy}
            onClick={generate}
            className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-secondary text-xl font-bold text-on-secondary transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Icon
              name={busy ? "hourglass_top" : "record_voice_over"}
              className={busy ? "animate-spin" : undefined}
            />
            {busy ? "Coming to you…" : "Coach me through this"}
          </button>
          {!ready && (
            <p className="text-center text-sm text-on-surface-variant">
              Tap what&apos;s happening above — then tap the button.
            </p>
          )}

          <div className="pt-stack-sm">
            <CaregiverScriptStream />
          </div>
        </div>
      </main>

      <BottomNav active="caregiver" onEmergency={showEmergency} />

      {status === "crisis" && <EmergencyOverlay onDismiss={reset} />}
    </>
  );
}

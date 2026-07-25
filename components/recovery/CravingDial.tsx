"use client";

import { cravingLevels } from "@/lib/config/craving";
import { useRecoveryStore } from "@/lib/store/recovery";
import { useRovingRadio } from "@/lib/client/useRovingRadio";

const CRAVING_VALUES = cravingLevels.map((l) => l.value);

// Map the config tone onto Material tokens.
const TONE: Record<string, { ring: string; fill: string; text: string }> = {
  calm: { ring: "border-secondary", fill: "bg-secondary/20", text: "text-secondary" },
  warn: { ring: "border-primary", fill: "bg-primary/20", text: "text-primary" },
  danger: { ring: "border-error", fill: "bg-error/20", text: "text-error" },
};

// One-tap craving intensity dial. Options come from schema-validated config.
export function CravingDial() {
  const selected = useRecoveryStore((s) => s.cravingValue);
  const setCraving = useRecoveryStore((s) => s.setCraving);
  const { onKeyDown, getTabIndex } = useRovingRadio(
    CRAVING_VALUES,
    selected,
    setCraving,
  );

  const activeTone = cravingLevels.find((l) => l.value === selected)?.tone ?? "warn";

  return (
    <div className="rounded-2xl border-2 border-outline-variant bg-surface-container p-6 md:p-8">
      <fieldset>
        <div className="mb-6 flex items-center justify-between">
          <legend className="text-headline-md text-on-surface">Craving level</legend>
          <span className={`text-4xl font-extrabold ${TONE[activeTone].text}`}>
            {selected ?? "—"}
          </span>
        </div>
        <div
          role="radiogroup"
          aria-label="Craving intensity"
          className="grid grid-cols-1 gap-3 sm:grid-cols-5"
        >
          {cravingLevels.map((lvl, index) => {
            const active = selected === lvl.value;
            const tone = TONE[lvl.tone];
            return (
              <button
                key={lvl.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${lvl.label}. ${lvl.helper}`}
                tabIndex={getTabIndex(index)}
                onKeyDown={onKeyDown}
                onClick={() => setCraving(lvl.value)}
                className={[
                  "min-h-touch rounded-xl border-2 px-4 py-4 text-left transition-all active:scale-95",
                  tone.ring,
                  active ? tone.fill : "bg-surface-container-low hover:bg-surface-container-high",
                ].join(" ")}
              >
                <span aria-hidden="true" className={`block text-2xl font-black ${tone.text}`}>
                  {lvl.value}
                </span>
                <span className="block text-label-lg text-on-surface">{lvl.label}</span>
                <span className="mt-1 block text-sm text-on-surface-variant">
                  {lvl.helper}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm italic text-on-surface-variant">
          Higher levels trigger an active grounding sequence.
        </p>
      </fieldset>
    </div>
  );
}

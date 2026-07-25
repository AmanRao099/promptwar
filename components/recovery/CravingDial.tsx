"use client";

import { cravingLevels } from "@/lib/config/craving";
import { useRecoveryStore } from "@/lib/store/recovery";

const TONE_RING: Record<string, string> = {
  calm: "border-haven-calm",
  warn: "border-haven-warn",
  danger: "border-haven-danger",
};
const TONE_FILL: Record<string, string> = {
  calm: "bg-haven-calm/20",
  warn: "bg-haven-warn/20",
  danger: "bg-haven-danger/20",
};

// One-tap craving intensity dial. Options come from schema-validated config.
export function CravingDial() {
  const selected = useRecoveryStore((s) => s.cravingValue);
  const setCraving = useRecoveryStore((s) => s.setCraving);

  return (
    <fieldset>
      <legend className="text-lg font-semibold text-haven-text">
        How strong is the craving right now?
      </legend>
      <div
        role="radiogroup"
        aria-label="Craving intensity"
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5"
      >
        {cravingLevels.map((lvl) => {
          const active = selected === lvl.value;
          return (
            <button
              key={lvl.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${lvl.label}. ${lvl.helper}`}
              onClick={() => setCraving(lvl.value)}
              className={[
                "min-h-touch rounded-xl border-2 px-4 py-4 text-left transition",
                TONE_RING[lvl.tone],
                active ? TONE_FILL[lvl.tone] : "bg-haven-surface hover:bg-haven-surfaceHi",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className="block text-2xl font-black text-haven-text"
              >
                {lvl.value}
              </span>
              <span className="block text-base font-semibold text-haven-text">
                {lvl.label}
              </span>
              <span className="mt-1 block text-sm text-haven-muted">
                {lvl.helper}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

"use client";

import { situationTags } from "@/lib/config/tags";
import { useCaregiverStore } from "@/lib/store/caregiver";
import { useRovingRadio } from "@/lib/client/useRovingRadio";

const TAG_IDS = situationTags.map((t) => t.id);

const SEVERITY_RING: Record<string, string> = {
  support: "border-haven-calm",
  tense: "border-haven-warn",
  acute: "border-haven-danger",
};
const SEVERITY_FILL: Record<string, string> = {
  support: "bg-haven-calm/20",
  tense: "bg-haven-warn/20",
  acute: "bg-haven-danger/20",
};

// One-tap situation picker. Tags come from schema-validated config.
export function SituationTags() {
  const selected = useCaregiverStore((s) => s.tagId);
  const setTag = useCaregiverStore((s) => s.setTag);
  const { onKeyDown, getTabIndex } = useRovingRadio(TAG_IDS, selected, setTag);

  return (
    <fieldset>
      <legend className="text-lg font-semibold text-haven-text">
        What&apos;s happening right now?
      </legend>
      <div
        role="radiogroup"
        aria-label="Situation"
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {situationTags.map((tag, index) => {
          const active = selected === tag.id;
          return (
            <button
              key={tag.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${tag.label}. ${tag.context}`}
              tabIndex={getTabIndex(index)}
              onKeyDown={onKeyDown}
              onClick={() => setTag(tag.id)}
              className={[
                "min-h-touch rounded-xl border-2 px-4 py-4 text-left transition",
                SEVERITY_RING[tag.severity],
                active ? SEVERITY_FILL[tag.severity] : "bg-haven-surface hover:bg-haven-surfaceHi",
              ].join(" ")}
            >
              <span className="block text-lg font-semibold text-haven-text">
                {tag.label}
              </span>
              <span className="mt-1 block text-sm text-haven-muted">
                {tag.context}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

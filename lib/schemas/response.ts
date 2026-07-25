import { z } from "zod";

// Structured shape we ask Gemini to emit (and that the mock mirrors).
// Streamed to the client as NDJSON-ish incremental text, then the final
// assembled JSON is validated against this schema.

export const recoveryScriptSchema = z.object({
  // High-contrast, immediate refusal / boundary statements. Short.
  boundaryLines: z.array(z.string().min(1)).min(1).max(4),
  // Sensory / breathing grounding matched to the somatic input.
  grounding: z.object({
    intro: z.string().min(1),
    steps: z.array(z.string().min(1)).min(2).max(6),
  }),
  // One steadying closing affirmation.
  affirmation: z.string().min(1),
});

export type RecoveryScript = z.infer<typeof recoveryScriptSchema>;

export const caregiverScriptSchema = z.object({
  // Word-for-word lines the caregiver can say aloud.
  sayThis: z.array(z.string().min(1)).min(1).max(5),
  toneAdvice: z.string().min(1),
  postureAdvice: z.string().min(1),
  avoid: z.array(z.string().min(1)).min(1).max(4),
});

export type CaregiverScript = z.infer<typeof caregiverScriptSchema>;

import { z } from "zod";

// Schema-validated craving-intensity levels. Components read from here — no
// literal option arrays live in the UI layer.
export const cravingLevelSchema = z.object({
  id: z.string(),
  value: z.number().int().min(1).max(5),
  label: z.string(),
  helper: z.string(),
  tone: z.enum(["calm", "warn", "danger"]),
});

export type CravingLevel = z.infer<typeof cravingLevelSchema>;

export const cravingLevels: CravingLevel[] = cravingLevelSchema.array().parse([
  {
    id: "flicker",
    value: 1,
    label: "A flicker",
    helper: "Noticing a thought. Steady.",
    tone: "calm",
  },
  {
    id: "pull",
    value: 2,
    label: "A pull",
    helper: "It has my attention.",
    tone: "calm",
  },
  {
    id: "wave",
    value: 3,
    label: "A wave",
    helper: "Rising. Riding it.",
    tone: "warn",
  },
  {
    id: "surge",
    value: 4,
    label: "A surge",
    helper: "Loud. Need an anchor now.",
    tone: "warn",
  },
  {
    id: "flood",
    value: 5,
    label: "A flood",
    helper: "Overwhelming. Hold on.",
    tone: "danger",
  },
]);

import { z } from "zod";

// Somatic-map points a person can tap to locate where a craving is felt.
// Position is percent-based (0-100) over the body diagram container.
export const somaticPointSchema = z.object({
  id: z.string(),
  label: z.string(),
  sensation: z.string(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export type SomaticPoint = z.infer<typeof somaticPointSchema>;

export const somaticPoints: SomaticPoint[] = somaticPointSchema.array().parse([
  { id: "head", label: "Head", sensation: "racing thoughts, pressure", x: 50, y: 8 },
  { id: "jaw", label: "Jaw", sensation: "clenching, tightness", x: 50, y: 18 },
  { id: "throat", label: "Throat", sensation: "tight, hard to swallow", x: 50, y: 26 },
  { id: "chest", label: "Chest", sensation: "pounding, heavy, fast breath", x: 50, y: 40 },
  { id: "stomach", label: "Stomach", sensation: "knot, churn, hollow", x: 50, y: 56 },
  { id: "hands", label: "Hands", sensation: "restless, tingling, shaky", x: 22, y: 58 },
  { id: "legs", label: "Legs", sensation: "restless, urge to move", x: 50, y: 80 },
]);

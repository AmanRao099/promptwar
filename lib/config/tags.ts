import { z } from "zod";

// Caregiver situation tags. Drive the caregiver co-pilot buttons (Phase 5 UI).
export const situationTagSchema = z.object({
  id: z.string(),
  label: z.string(),
  context: z.string(),
  severity: z.enum(["support", "tense", "acute"]),
});

export type SituationTag = z.infer<typeof situationTagSchema>;

export const situationTags: SituationTag[] = situationTagSchema.array().parse([
  { id: "withdrawn", label: "They've gone quiet", context: "loved one is withdrawn, not responding", severity: "support" },
  { id: "craving", label: "They're craving", context: "loved one reports strong craving right now", severity: "tense" },
  { id: "angry", label: "They're angry at me", context: "conflict, raised voices, blame", severity: "tense" },
  { id: "relapse", label: "They just used", context: "a recent lapse or return to use", severity: "tense" },
  { id: "shame", label: "Deep shame spiral", context: "loved one expressing worthlessness, self-blame", severity: "acute" },
  { id: "leaving", label: "Threatening to leave", context: "loved one wants to walk out / leave treatment", severity: "acute" },
]);

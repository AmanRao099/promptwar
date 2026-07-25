import { z } from "zod";
import { somaticPoints } from "@/lib/config/somatic";
import { cravingLevels } from "@/lib/config/craving";
import { situationTags } from "@/lib/config/tags";

const somaticIds = somaticPoints.map((p) => p.id) as [string, ...string[]];
const cravingValues = cravingLevels.map((c) => c.value);
const tagIds = situationTags.map((t) => t.id) as [string, ...string[]];

// Payload for /api/generate-script (recovery persona).
export const generateScriptRequestSchema = z.object({
  cravingValue: z
    .number()
    .int()
    .refine((v) => cravingValues.includes(v), "unknown craving level"),
  somaticId: z.enum(somaticIds),
  // Free-text is optional and always scrubbed before dispatch.
  note: z.string().max(500).optional(),
});

export type GenerateScriptRequest = z.infer<typeof generateScriptRequestSchema>;

// Payload for /api/voice-support (free-form spoken check-in, recovery persona).
export const voiceRequestSchema = z.object({
  transcript: z.string().trim().min(2).max(1000),
});

export type VoiceRequest = z.infer<typeof voiceRequestSchema>;

// Payload for /api/caregiver-copilot (caregiver persona).
export const caregiverRequestSchema = z.object({
  tagId: z.enum(tagIds),
  note: z.string().max(500).optional(),
});

export type CaregiverRequest = z.infer<typeof caregiverRequestSchema>;

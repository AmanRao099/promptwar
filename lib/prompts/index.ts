export { refusalSystemPrompt } from "./refusal";
export { caregiverSystemPrompt } from "./caregiver";

import { cravingLevels } from "@/lib/config/craving";
import { somaticPoints } from "@/lib/config/somatic";
import { situationTags } from "@/lib/config/tags";

// Build the user-turn text from validated inputs. The optional note is passed
// in ALREADY SCRUBBED by the caller (see lib/safety/scrubber.ts).
export function buildRecoveryUserTurn(input: {
  cravingValue: number;
  somaticId: string;
  scrubbedNote?: string;
}): string {
  const level = cravingLevels.find((c) => c.value === input.cravingValue);
  const point = somaticPoints.find((p) => p.id === input.somaticId);
  const lines = [
    `Craving intensity: ${input.cravingValue}/5 (${level?.label ?? "unknown"}).`,
    `Felt in the body at: ${point?.label ?? input.somaticId} (${point?.sensation ?? ""}).`,
  ];
  if (input.scrubbedNote) lines.push(`They add: "${input.scrubbedNote}"`);
  return lines.join("\n");
}

export function buildCaregiverUserTurn(input: {
  tagId: string;
  scrubbedNote?: string;
}): string {
  const tag = situationTags.find((t) => t.id === input.tagId);
  const lines = [
    `Situation: ${tag?.label ?? input.tagId} — ${tag?.context ?? ""} (severity: ${tag?.severity ?? "unknown"}).`,
  ];
  if (input.scrubbedNote) lines.push(`Caregiver adds: "${input.scrubbedNote}"`);
  return lines.join("\n");
}

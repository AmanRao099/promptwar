import type { RecoveryScript, CaregiverScript } from "@/lib/schemas/response";
import { somaticPoints } from "@/lib/config/somatic";
import { situationTags } from "@/lib/config/tags";

// Deterministic, input-matched fallback content used when GEMINI_API_KEY is
// absent. Written to satisfy lib/schemas/response.ts. Not a substitute for the
// live model — just enough that the app + demo run fully offline.

const GROUNDING_BY_AREA: Record<string, { intro: string; steps: string[] }> = {
  chest: {
    intro: "Let's soften your chest first.",
    steps: [
      "Breathe in for a slow count of 4.",
      "Now let it out for a count of 6 — longer out than in.",
      "Feel your shoulders drop on the exhale.",
      "Do that three more times, no rush.",
    ],
  },
  hands: {
    intro: "Let's put your hands to work grounding you.",
    steps: [
      "Press both palms flat against something cool and solid.",
      "Name the temperature and the texture out loud.",
      "Squeeze your fists tight for 5 seconds, then release.",
      "Notice the tingle fade.",
    ],
  },
  stomach: {
    intro: "Let's steady you from the ground up.",
    steps: [
      "Plant both feet flat and feel the floor holding you.",
      "Push down gently through your heels.",
      "Take one slow breath down into your belly.",
      "Let the seat under you take your weight.",
    ],
  },
  default: {
    intro: "Let's bring you back to right now.",
    steps: [
      "Name 5 things you can see.",
      "4 things you can feel.",
      "3 things you can hear.",
      "One slow breath after each.",
    ],
  },
};

export function buildRecoveryMock(input: {
  cravingValue: number;
  somaticId: string;
}): RecoveryScript {
  const point = somaticPoints.find((p) => p.id === input.somaticId);
  const g = GROUNDING_BY_AREA[input.somaticId] ?? GROUNDING_BY_AREA.default;
  const intense = input.cravingValue >= 4;
  return {
    boundaryLines: intense
      ? ["Not today.", "This craving is a wave. Waves pass.", "I don't have to act on this."]
      : ["I noticed it. I don't have to feed it.", "I can let this pass."],
    grounding: {
      intro: point ? `${g.intro} You said it's in your ${point.label.toLowerCase()}.` : g.intro,
      steps: g.steps,
    },
    affirmation: intense
      ? "You're still here, still choosing. That's the whole win right now."
      : "One steady breath at a time. You've got this moment.",
  };
}

export function buildCaregiverMock(input: { tagId: string }): CaregiverScript {
  const tag = situationTags.find((t) => t.id === input.tagId);
  const acute = tag?.severity === "acute";
  return {
    sayThis: [
      "I'm here. I'm not going anywhere.",
      "You don't have to say anything right now.",
      acute
        ? "Can we get through the next few minutes together?"
        : "Whatever you're feeling, it makes sense to me.",
    ],
    toneAdvice: "Slow, low, and warm — half the pace you'd normally use.",
    postureAdvice: "Sit at their level, relaxed hands, soft eye contact — not looming.",
    avoid: [
      "Don't lecture or bring up past lapses.",
      "Don't issue ultimatums.",
      acute ? "Don't leave them alone if they're in danger." : "Don't try to fix it right now.",
    ],
  };
}

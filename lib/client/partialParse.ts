/**
 * Tolerant, incremental parsers for the JSON the route streams. Runs on the
 * client so boundary lines / grounding steps reveal as tokens arrive, without
 * waiting for a complete, valid JSON document.
 *
 * Only fully-closed quoted strings are emitted — a half-streamed line never
 * flashes on screen. Once the stream ends, callers should still do a strict
 * JSON.parse + Zod validate for the authoritative render.
 */

// Grab the [...] region following "key". Returns "" until the opening [ arrives.
function arrayRegion(text: string, key: string): string {
  const keyIdx = text.indexOf(`"${key}"`);
  if (keyIdx === -1) return "";
  const open = text.indexOf("[", keyIdx);
  if (open === -1) return "";
  const close = text.indexOf("]", open);
  return text.slice(open + 1, close === -1 ? text.length : close);
}

const QUOTED = /"((?:[^"\\]|\\.)*)"/g;

function completeStrings(region: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  QUOTED.lastIndex = 0;
  while ((m = QUOTED.exec(region)) !== null) {
    try {
      out.push(JSON.parse(`"${m[1]}"`) as string);
    } catch {
      out.push(m[1]);
    }
  }
  return out;
}

function extractStringArray(text: string, key: string): string[] {
  return completeStrings(arrayRegion(text, key));
}

function extractString(text: string, key: string): string | undefined {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = re.exec(text);
  if (!m) return undefined;
  try {
    return JSON.parse(`"${m[1]}"`) as string;
  } catch {
    return m[1];
  }
}

export interface PartialRecovery {
  boundaryLines: string[];
  grounding: { intro?: string; steps: string[] };
  affirmation?: string;
}

export function parseRecoveryPartial(text: string): PartialRecovery {
  return {
    boundaryLines: extractStringArray(text, "boundaryLines"),
    grounding: {
      intro: extractString(text, "intro"),
      steps: extractStringArray(text, "steps"),
    },
    affirmation: extractString(text, "affirmation"),
  };
}

export interface PartialCaregiver {
  sayThis: string[];
  toneAdvice?: string;
  postureAdvice?: string;
  avoid: string[];
}

export function parseCaregiverPartial(text: string): PartialCaregiver {
  return {
    sayThis: extractStringArray(text, "sayThis"),
    toneAdvice: extractString(text, "toneAdvice"),
    postureAdvice: extractString(text, "postureAdvice"),
    avoid: extractStringArray(text, "avoid"),
  };
}

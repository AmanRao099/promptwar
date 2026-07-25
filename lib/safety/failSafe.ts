/**
 * Deterministic pre-LLM safety guardrail. Highest priority in the system.
 *
 * Any input matching an active medical-emergency / overdose / self-harm signal
 * MUST bypass Gemini entirely and route to a hardcoded emergency overlay.
 * No model is consulted for these states — zero LLM dependency, zero latency,
 * zero hallucination surface.
 */

export type CrisisCategory = "overdose" | "self_harm" | "medical";

export interface FailSafeMatch {
  category: CrisisCategory;
  keyword: string;
}

export interface FailSafeResult {
  triggered: boolean;
  matches: FailSafeMatch[];
}

// Keyword bank. Kept as data (not scattered literals) so it is testable and
// auditable in one place. Matched on word boundaries, case-insensitive.
const CRISIS_KEYWORDS: Record<CrisisCategory, string[]> = {
  overdose: [
    "overdose",
    "overdosed",
    "od'd",
    "od'ing",
    "too many pills",
    "took the whole bottle",
  ],
  self_harm: [
    "suicide",
    "suicidal",
    "kill myself",
    "killing myself",
    "end my life",
    "want to die",
    "hurt myself",
    "harm myself",
  ],
  medical: [
    "unresponsive",
    "not responding",
    "stopped breathing",
    "not breathing",
    "no pulse",
    "turning blue",
    "seizure",
    "can't wake",
    "cant wake",
    "won't wake up",
    "wont wake up",
    "unconscious",
  ],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build one boundary-aware matcher per phrase. Boundaries are relaxed at the
// phrase edges so punctuation/possessives (e.g. "od'd") still match.
function buildMatcher(phrase: string): RegExp {
  const escaped = escapeRegExp(phrase.toLowerCase());
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i");
}

const MATCHERS: Array<{ category: CrisisCategory; keyword: string; re: RegExp }> =
  Object.entries(CRISIS_KEYWORDS).flatMap(([category, phrases]) =>
    phrases.map((keyword) => ({
      category: category as CrisisCategory,
      keyword,
      re: buildMatcher(keyword),
    })),
  );

/**
 * Scan free text for crisis signals. Pure, synchronous, no external calls.
 */
export function detectCrisis(input: string | null | undefined): FailSafeResult {
  if (!input || typeof input !== "string") {
    return { triggered: false, matches: [] };
  }
  // Normalize curly apostrophes so "od’d" == "od'd".
  const text = input.replace(/[‘’]/g, "'").toLowerCase();
  const matches: FailSafeMatch[] = [];
  for (const m of MATCHERS) {
    if (m.re.test(text)) {
      matches.push({ category: m.category, keyword: m.keyword });
    }
  }
  return { triggered: matches.length > 0, matches };
}

/** Convenience boolean for guard clauses. */
export function isCrisis(input: string | null | undefined): boolean {
  return detectCrisis(input).triggered;
}

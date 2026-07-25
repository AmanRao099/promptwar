/**
 * PII scrubber. Strips sensitive personal details from free text before it is
 * ever dispatched to the Gemini API. Best-effort, deterministic, no network.
 *
 * Redactions are labelled (e.g. [PHONE]) so the model still understands the
 * shape of the message without receiving the raw identifier.
 */

export interface ScrubResult {
  clean: string;
  redactions: Record<string, number>;
}

const RULES: Array<{ label: string; re: RegExp }> = [
  // Email addresses.
  { label: "EMAIL", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi },
  // Phone numbers (US-ish, incl. +country and separators).
  {
    label: "PHONE",
    re: /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  },
  // SSN.
  { label: "SSN", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  // Credit-card-ish 13-16 digit runs (allowing spaces/dashes).
  { label: "CARD", re: /\b(?:\d[ -]?){13,16}\b/g },
  // Street address lines.
  {
    label: "ADDRESS",
    re: /\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+)*\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl)\b\.?/gi,
  },
  // URLs.
  { label: "URL", re: /\bhttps?:\/\/[^\s]+/gi },
];

export function scrubPII(input: string | null | undefined): ScrubResult {
  const redactions: Record<string, number> = {};
  if (!input || typeof input !== "string") {
    return { clean: "", redactions };
  }
  let clean = input;
  for (const rule of RULES) {
    clean = clean.replace(rule.re, () => {
      redactions[rule.label] = (redactions[rule.label] ?? 0) + 1;
      return `[${rule.label}]`;
    });
  }
  // Collapse whitespace introduced by redactions.
  clean = clean.replace(/[ \t]{2,}/g, " ").trim();
  return { clean, redactions };
}

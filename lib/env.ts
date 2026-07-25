import { z } from "zod";

/**
 * Server-side environment validation. Runs on the server only (route handlers).
 * A live LLM provider key (Groq or Gemini) is required — there is no offline
 * mode; the server fails fast at startup when neither key is set.
 */
const envSchema = z
  .object({
    // Groq (OpenAI-compatible). Takes priority when set.
    GROQ_API_KEY: z.string().trim().min(1).optional(),
    GROQ_MODEL: z.string().trim().min(1).default("llama-3.3-70b-versatile"),
    // Gemini (Google GenAI). Used if Groq is not configured.
    GEMINI_API_KEY: z.string().trim().min(1).optional(),
    GEMINI_MODEL: z.string().trim().min(1).default("gemini-2.0-flash"),
  })
  // Production requires a real LLM provider. No mock fallback exists — if
  // neither key is set the server fails fast at startup rather than silently
  // serving canned content.
  .refine((e) => Boolean(e.GROQ_API_KEY || e.GEMINI_API_KEY), {
    message:
      "No LLM provider configured. Set GROQ_API_KEY (recommended) or GEMINI_API_KEY.",
  });

export type HavenEnv = z.infer<typeof envSchema>;

let cached: HavenEnv | null = null;

export function getEnv(): HavenEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse({
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
  });
  if (!parsed.success) {
    // Only malformed (not missing) values throw — missing key is allowed.
    throw new Error(
      `Invalid environment: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  cached = parsed.data;
  return cached;
}

export type Provider = "groq" | "gemini";

// Groq first (recommended), then Gemini. getEnv() guarantees at least one key.
export function activeProvider(): Provider {
  const env = getEnv();
  if (env.GROQ_API_KEY) return "groq";
  return "gemini";
}

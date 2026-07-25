import { z } from "zod";

/**
 * Server-side environment validation. Runs on the server only (route handlers).
 * GEMINI_API_KEY is optional by design: when absent, the app degrades to
 * deterministic mock scripts (see lib/genai/client.ts) so demos work offline.
 */
const envSchema = z.object({
  // Groq (OpenAI-compatible, free tier). Takes priority when set.
  GROQ_API_KEY: z.string().trim().min(1).optional(),
  GROQ_MODEL: z.string().trim().min(1).default("llama-3.3-70b-versatile"),
  // Gemini (Google GenAI). Used if Groq is not configured.
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-2.0-flash"),
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

export type Provider = "groq" | "gemini" | "mock";

// Groq first (chosen free provider), then Gemini, else deterministic mock.
export function activeProvider(): Provider {
  const env = getEnv();
  if (env.GROQ_API_KEY) return "groq";
  if (env.GEMINI_API_KEY) return "gemini";
  return "mock";
}

export function hasLiveKey(): boolean {
  return activeProvider() !== "mock";
}

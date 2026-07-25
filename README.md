# HavenAI

A calm, low-touch, GenAI companion for the hardest minutes of substance use
disorder (SUD) recovery — and for the people supporting someone through it.

Two personas, two taps each, spoken grounding, and a **deterministic crisis
guardrail that never routes an emergency through a language model.**

- **`/recovery`** — 1-tap craving dial + body somatic map → streamed refusal
  lines and a body-matched grounding exercise, read aloud via the Web Speech API.
- **`/caregiver`** — 1-tap situation tags → word-for-word de-escalation script,
  tone + posture coaching, and things to avoid.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | TailwindCSS, high-contrast dark theme (WCAG-AAA leaning) |
| AI | Google GenAI SDK (`@google/genai`), `gemini-2.0-flash` streaming |
| State | Zustand |
| Validation | Zod (env, request payloads, model responses) |
| Tests | Vitest + React Testing Library + jest-axe |

---

## Architecture

```
app/
  api/generate-script/route.ts    recovery streaming route
  api/caregiver-copilot/route.ts  caregiver streaming route
  api/health/route.ts             liveness/readiness probe
  recovery/  caregiver/  page.tsx
lib/
  safety/failSafe.ts    deterministic pre-LLM crisis detector (bypasses Gemini)
  safety/scrubber.ts    PII redaction before any model dispatch
  http/streamRoute.ts   shared route handler (rate-limit→validate→bypass→scrub→stream)
  http/rateLimit.ts     in-memory sliding-window limiter
  genai/client.ts       Gemini streaming + deterministic mock fallback
  genai/mocks.ts        offline, input-matched fallback content
  prompts/*             modular system prompts (no prompt strings in components)
  schemas/*             Zod request/response schemas
  config/*              schema-validated UI config (craving, somatic, tags)
  store/*               Zustand stores (AbortController-cancellable streams)
  client/*              partial-JSON streaming parser, roving-radio a11y hook
components/*             UI (crisis overlay is hardcoded, zero-LLM)
tests/*                 55 tests
```

### Safety invariant

Every model-facing route runs this order, enforced in one place
(`lib/http/streamRoute.ts`):

```
rate-limit → parse → validate → DETERMINISTIC CRISIS BYPASS → scrub PII → stream
```

If input matches an overdose / self-harm / medical-emergency signal, the request
returns a crisis flag with **zero** model involvement and the UI renders the
hardcoded 988 / 911 / 741741 overlay.

---

## Local development

```bash
npm install
cp .env.example .env.local     # optional — see below
npm run dev                    # http://localhost:3000
```

### Environment

| Var | Required | Default | Notes |
|---|---|---|---|
| `GEMINI_API_KEY` | No | — | Google AI Studio key. **Absent or over-quota → app serves deterministic mock content**, so it runs fully offline. |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Any `@google/genai`-compatible model id. |

The response header `x-haven-mode` reports `live` or `mock` per request.

---

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build (standalone output)
npm start           # run the production build
npm run lint        # eslint (next/core-web-vitals)
npm run typecheck   # tsc --noEmit
npm test            # vitest (55 tests)
```

---

## Deploy

### Vercel
Zero-config. Import the repo, set `GEMINI_API_KEY` in project env vars, deploy.
Streaming routes run on the Node.js runtime.

### Docker
`next.config.mjs` emits a standalone server.

```bash
docker build -t havenai .
docker run -p 3000:3000 -e GEMINI_API_KEY=... havenai
```

The image runs as a non-root user and ships a `/api/health` healthcheck.

---

## Production hardening

- Security headers (CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`,
  `Permissions-Policy`) via `next.config.mjs`.
- Per-IP in-memory rate limiting on both streaming routes (swap for Redis to
  scale horizontally).
- In-flight request cancellation (`AbortController`) so rapid re-taps never race.
- Live-model failure (e.g. 429 quota) falls back to mock mid-flight — the user
  never sees a blank screen.
- Automated accessibility checks (jest-axe) + WCAG radiogroup keyboard nav +
  modal focus trap.

---

## Not a medical device

HavenAI is a supportive tool, not a clinician, and does not diagnose or treat.
In an emergency, call or text **988** (Suicide & Crisis Lifeline) or **911**.

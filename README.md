# HavenAI

A calm, low-touch, GenAI companion for the hardest minutes of substance use
disorder (SUD) recovery — and for the people supporting someone through it.

Two personas, two taps each, spoken grounding, and a **deterministic crisis
guardrail that never routes an emergency through a language model.**

- **`/recovery`** — 1-tap craving dial + body-area selector → streamed refusal
  lines and a body-matched grounding exercise, read aloud via the Web Speech
  API. Plus a **voice check-in**: speak what's happening, get evidence-based
  guidance back — on screen and out loud.
- **`/caregiver`** — 1-tap situation tags → word-for-word de-escalation script,
  tone + posture coaching, and things to avoid. Signed-in caretakers also get
  a live **activity feed** for the people they support.
- **Accounts (optional)** — `user` and `caretaker` roles, 30-day sessions.
  A recovery user hands their caretaker a 6-char consent code; the caretaker
  then sees check-ins, SOS alerts, and **emergency live-location shares**.
  Everything works signed-out too — accounts only add the caretaker link.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | TailwindCSS, high-contrast dark theme (WCAG-AAA leaning) |
| AI | Groq (`llama-3.3-70b-versatile`) primary · Google GenAI SDK (`@google/genai`, `gemini-2.0-flash`) secondary — both streaming, JSON-structured |
| Speech | Web Speech API — SpeechRecognition (voice in) + SpeechSynthesis (voice out) |
| State | Zustand |
| Validation | Zod (env, request payloads, model responses, auth) |
| Auth & data | scrypt password hashing + HMAC-signed httpOnly cookie · SQLite (better-sqlite3) |
| Tests | Vitest + React Testing Library + jest-axe |

---

## Architecture

```
app/
  api/generate-script/route.ts    recovery streaming route
  api/caregiver-copilot/route.ts  caregiver streaming route
  api/voice-support/route.ts      spoken check-in streaming route
  api/auth/*                      signup / login / logout / me
  api/link, feed, events, location  caretaker link + activity + SOS location
  api/health/route.ts             liveness/readiness probe
  recovery/  caregiver/  login/  page.tsx
lib/
  safety/failSafe.ts    deterministic pre-LLM crisis detector (bypasses the LLM)
  safety/scrubber.ts    PII redaction before model dispatch AND before storage
  http/streamRoute.ts   shared route handler (rate-limit→validate→bypass→scrub→stream)
  http/rateLimit.ts     in-memory sliding-window limiter (all mutating routes)
  genai/client.ts       Groq + Gemini streaming (live only, no mock)
  auth/*                scrypt passwords, HMAC sessions, SQLite service + ACL
  prompts/*             modular system prompts (no prompt strings in components)
  schemas/*             Zod request/response/auth schemas
  config/*              schema-validated UI config (craving, somatic, tags)
  store/*               Zustand stores (AbortController-cancellable streams)
  client/streamRequest.ts  one shared client streaming loop (stores + voice)
  client/*              partial-JSON parser, roving-radio a11y hook
components/*             UI (crisis overlay is hardcoded, zero-LLM)
tests/*                 87 tests
```

### Safety invariant

Every model-facing route runs this order, enforced in one place
(`lib/http/streamRoute.ts`):

```
rate-limit → parse → validate → DETERMINISTIC CRISIS BYPASS → scrub PII → stream
```

If input matches an overdose / self-harm / medical-emergency signal, the request
returns a crisis flag with **zero** model involvement and the UI renders the
hardcoded 988 / 911 / 741741 overlay. This applies to typed notes AND voice
transcripts, and holds even when a live provider key is configured.

---

## Requirements traceability

| Requirement | Where |
|---|---|
| Zero-typing, high-load UI (1-tap dial, body map, tags) | `components/recovery/CravingDial`, `SomaticSelector`, `components/caregiver/SituationTags` |
| Streaming GenAI scripts (refusal, grounding, de-escalation) | `app/api/generate-script`, `app/api/caregiver-copilot`, `lib/genai/client.ts` |
| Multi-modal: voice in / voice out | `components/recovery/VoiceChat` (SpeechRecognition), `AudioGroundingButton` (SpeechSynthesis), `app/api/voice-support` |
| Deterministic crisis fail-safe, zero LLM in emergencies | `lib/safety/failSafe.ts`, `components/EmergencyOverlay` |
| PII scrubbing before model + before storage | `lib/safety/scrubber.ts`, `lib/auth/service.ts` |
| No hardcoded prompts/config in components | `lib/prompts/*`, `lib/config/*` (Zod-validated) |
| Caregiver support loop (consent link, activity feed, live location) | `lib/auth/*`, `app/api/{link,feed,events,location}`, `components/caregiver/CaretakerFeed` |
| Env validation + graceful provider failure | `lib/env.ts` (fail-fast), 502 + one bounded retry in `lib/http/streamRoute.ts` |
| Accessibility | WCAG radiogroup keyboard nav, focus-trapped alert dialog, jest-axe page scans |

---

## Local development

```bash
npm install
cp .env.example .env.local     # optional — see below
npm run dev                    # http://localhost:3000
```

### Environment

A real LLM provider is **required** — there is no mock/offline mode. The server
fails fast at startup if no provider key is set.

| Var | Required | Default | Notes |
|---|---|---|---|
| `GROQ_API_KEY` | **Yes*** | — | Groq key (free, no card): https://console.groq.com/keys |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Any Groq chat model. |
| `GEMINI_API_KEY` | No | — | Google AI Studio key; used only if `GROQ_API_KEY` is empty. |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Any `@google/genai`-compatible model id. |

| `AUTH_SECRET` | Prod | dev fallback | Signs session cookies. `openssl rand -hex 32`. |
| `DATABASE_PATH` | No | `./data/haven.db` | SQLite file. Needs a persistent volume in production. |

\* At least one of `GROQ_API_KEY` / `GEMINI_API_KEY` is required.

Provider priority: **Groq → Gemini**. The response header `x-haven-provider`
reports which served each request; `/api/health` reports the active provider.
When the provider is unreachable, routes return **502** and the UI shows an
honest retry — never fabricated content. The hardcoded 988/911 crisis overlay
and the deterministic crisis bypass are always available, independent of any
provider.

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
Import the repo and set these project env vars, then deploy:

| Var | Why |
|---|---|
| `GROQ_API_KEY` | live model (required) |
| `AUTH_SECRET` | session signing (`openssl rand -hex 32`) |
| `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` | **required for accounts** — Vercel's filesystem is ephemeral/read-only, so the local SQLite file cannot work there. Create a free DB at https://turso.tech. |

**Built-in demo logins** work on any deploy with **no database at all** — they
authenticate without touching storage, so judges/reviewers can sign in
immediately:

| Role | Email | Password |
|---|---|---|
| Recovery | `demo@haven.app` | `haven1234` |
| Caretaker | `care@haven.app` | `haven1234` |

The demo caretaker is pre-linked to the demo user, so the activity feed
demonstrates end-to-end (demo activity is in-process and ephemeral). Real,
DB-backed accounts need the Turso vars above; without them, *creating* a real
account returns `503 storage_unavailable`, but the demo logins and the whole
signed-out app (scripts, voice, crisis overlay) still work. Streaming routes
run on the Node.js runtime.

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
- Provider failure fails fast with a 502 + one bounded retry on transient
  errors; the UI shows an honest retry rather than fabricated content.
- Automated accessibility checks (jest-axe) + WCAG radiogroup keyboard nav +
  modal focus trap.

---

## Not a medical device

HavenAI is a supportive tool, not a clinician, and does not diagnose or treat.
In an emergency, call or text **988** (Suicide & Crisis Lifeline) or **911**.

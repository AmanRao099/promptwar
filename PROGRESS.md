# HavenAI — Build Progress

Multi-modal GenAI recovery & prevention platform for Substance Use Disorder (SUD) recovery + caregivers.
Stack: Next.js 14 App Router · TypeScript · Tailwind · Zustand · Zod · `@google/genai` (`gemini-2.0-flash`) · Vitest.

Provider: **Groq** (`llama-3.3-70b-versatile`) active, **Gemini** secondary (`gemini-2.0-flash`). Priority: **Groq → Gemini**. **No mock/offline mode** — a real provider key is required at startup; provider failure returns a 502 with an honest retry (never fabricated content). The deterministic crisis bypass + hardcoded 988/911 overlay are always available, independent of any provider.
Scope: **all 8 phases complete**, live-only, verified end-to-end.

---

## [x] Phase 1: Next.js Setup, Env Validation (@google/genai) & Zod Schemas
- [x] `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`
- [x] `.env.example`, `.gitignore`
- [x] `lib/env.ts` — Zod-validated environment (`GEMINI_API_KEY`, `GEMINI_MODEL`)
- [x] `lib/schemas/request.ts` — API payload Zod schemas (generate-script, caregiver)
- [x] `lib/schemas/response.ts` — Gemini structured-output Zod schemas
- [x] `lib/config/somatic.ts`, `craving.ts`, `tags.ts` — schema-validated UI config (no hardcoding in components)
- [x] `app/globals.css`, `app/layout.tsx`

## [x] Phase 2: Safety Layer & Deterministic Fail-Safe Routing (Pre-LLM)
- [x] `lib/safety/failSafe.ts` — deterministic crisis keyword detector, bypasses Gemini
- [x] `lib/safety/scrubber.ts` — PII scrubber before any Gemini dispatch
- [x] `tests/failSafe.test.ts`, `tests/scrubber.test.ts` — built first, safety before LLM (17 tests green)

## [x] Phase 3: Route Handlers & Gemini Streaming Integration
- [x] `lib/genai/client.ts` — `@google/genai` client + streaming helper + mock fallback
- [x] `lib/genai/mocks.ts` — deterministic input-matched offline payloads
- [x] `app/api/generate-script/route.ts` — refusal/boundary + grounding streaming (crisis bypass + scrub)
- [x] `app/api/caregiver-copilot/route.ts` — caregiver de-escalation streaming (crisis bypass + scrub)
- [x] `lib/prompts/refusal.ts`, `caregiver.ts`, `index.ts` — modular system prompts + user-turn builders

## [x] Phase 4: Recovery UI (Zero-Touch)
- [x] `lib/store/recovery.ts` — Zustand client state + streaming fetch
- [x] `lib/client/partialParse.ts` — tolerant incremental JSON reveal
- [x] `components/recovery/CravingDial.tsx` — 1-tap craving level
- [x] `components/recovery/SomaticSelector.tsx` — body/somatic map selector
- [x] `components/recovery/ScriptStream.tsx` — live streaming script display
- [x] `components/recovery/AudioGroundingButton.tsx` — Web Speech API grounding
- [x] `components/BoundaryCard.tsx` — high-contrast refusal cards
- [x] `components/EmergencyOverlay.tsx` — 988/911 zero-LLM overlay
- [x] `app/recovery/page.tsx`, `app/page.tsx` — persona landing + recovery dashboard
- [x] `app/caregiver/page.tsx` — placeholder (full UI in Phase 5)

### Verification (this pass)
- `npx tsc --noEmit` → 0 errors
- `npx next build` → succeeds, 6 routes emitted
- `npx vitest run` → **22/22 pass** (safety 17 + route integration 5)
- Live: `/recovery` 200; generate-script streams `x-haven-mode: mock`; emergency note returns `{crisis:true}` with **zero** model call

## [x] Phase 5: Caregiver Co-Pilot UI
- [x] `lib/store/caregiver.ts` — Zustand state + streaming fetch (crisis-aware)
- [x] `components/caregiver/SituationTags.tsx` — severity-coded one-tap situation buttons
- [x] `components/caregiver/CaregiverScriptStream.tsx` — word-for-word lines, tone/posture panels, avoid list, audio
- [x] `app/caregiver/page.tsx` — full co-pilot dashboard + EmergencyOverlay dispatch
- [x] Landing card flipped from "soon" to live

## [x] Phase 6: Automated Tests & a11y Verification
- [x] `tests/schemas.test.ts` — config integrity + request/response schema validation
- [x] `tests/partialParse.test.ts` — incremental streaming-reveal parser
- [x] `tests/components.test.tsx` — RTL: CravingDial, SituationTags, EmergencyOverlay, BoundaryCard
- [x] jest-axe automated a11y scans (0 violations) on interactive components
- [x] Route integration tests (Phase 3) cover crisis bypass + mock streaming

## [x] Phase 7: Production Hardening & Deployability
- [x] `lib/http/streamRoute.ts` — shared route handler; both routes deduped (rate-limit→parse→validate→**crisis bypass**→scrub→stream)
- [x] `lib/http/rateLimit.ts` — per-IP sliding-window limiter + `Retry-After`/`x-ratelimit-remaining`
- [x] `AbortController` in both stores — cancels in-flight/racing streams on re-tap & reset
- [x] `components/ErrorRetry.tsx` — fixes silent error state; one-tap retry (selections preserved)
- [x] `lib/client/useRovingRadio.ts` — WCAG arrow-key radiogroup nav (both dials)
- [x] `EmergencyOverlay` — focus trap, autofocus, Escape-to-dismiss, focus restore
- [x] `next.config.mjs` — `output: standalone`, CSP + HSTS + X-Frame-Options + nosniff + Permissions-Policy, `poweredByHeader: false`
- [x] `app/api/health/route.ts` — liveness probe (never leaks key)
- [x] `Dockerfile` (multi-stage, non-root, healthcheck) + `.dockerignore` + `public/robots.txt`
- [x] `.eslintrc.json` — `next lint` passes clean
- [x] `README.md` — architecture, env, deploy (Vercel + Docker)
- [x] Tests added: `rateLimit.test.ts`, `health.test.ts`, roving-radio keyboard nav → **55 tests**

## [x] Phase 8: Score-Hardening Polish
- [x] Groq SSE parser extracted to pure `parseSSELine` + `tests/sse.test.ts` (6 protocol tests) — the live path is now covered
- [x] `app/icon.svg` + `app/manifest.ts` — favicon + PWA manifest (no more `/favicon.ico` 404)
- [x] `tests/pages.a11y.test.tsx` — full-page axe scans on landing, `/recovery`, `/caregiver`
- [x] `.github/workflows/ci.yml` — CI: install → lint → typecheck → test → build on push/PR
- [x] `git init` + first commit (`.env.local` gitignored; only `.env.example` tracked)

## [x] Phase 9: Live-Only / Real-World (no mock)
- [x] Deleted `lib/genai/mocks.ts`; `client.ts` is live-only (Groq/Gemini), no silent fallback
- [x] `lib/env.ts` — requires a provider key; server fails fast if none set
- [x] `lib/http/streamRoute.ts` — peeks first chunk → honest **502** on provider failure + one bounded retry on transient errors; `x-haven-provider` header
- [x] Stores surface a real **error + retry** when nothing usable streams (no fake content)
- [x] Removed "offline demo mode" UI notes; docs updated (README, `.env.example`)
- [x] Route tests stub the provider SSE stream (real code path) + assert 502 on outage + provider-not-called on crisis

### Final verification
- `npx tsc --noEmit` → 0 errors
- `npx next lint` → **0 warnings/errors**
- `npx next build` → succeeds, standalone output
- `npx vitest run` → **65/65 pass** across 10 files
- Live: Groq streaming verified end-to-end (`provider:groq, mode:live`); crisis bypass still zero-LLM with a live key
- All 6 security headers present, `X-Powered-By` absent, `/api/health` ok, `x-ratelimit-remaining` emitted
- Browser: recovery + caregiver flows both work end-to-end

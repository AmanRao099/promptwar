/**
 * Lightweight in-memory sliding-window rate limiter. Per-instance only — good
 * enough as a first line of defense on a single server or per serverless
 * instance. For multi-region horizontal scale, back this with Redis/Upstash
 * (swap the Map for a shared store); the call sites stay identical.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

// Periodically drop stale buckets so the Map can't grow unbounded.
const SWEEP_EVERY = 60_000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_EVERY) return;
  lastSweep = now;
  for (const [key, w] of buckets) {
    if (w.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  limit: number;
}

export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0, limit };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
      limit,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSec: 0,
    limit,
  };
}

// Best-effort client identity from proxy headers. Falls back to a shared key.
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  return `${scope}:${ip}`;
}

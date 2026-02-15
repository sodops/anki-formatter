/**
 * Rate limiter for API routes
 * Uses Upstash Redis in production (serverless-compatible)
 * Falls back to in-memory store for development/testing
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ─── Types ───────────────────────────────────────────────────────────

interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSec: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// ─── Upstash Redis (production) ─────────────────────────────────────

const isRedisConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let redis: Redis | null = null;
const rateLimiters = new Map<string, Ratelimit>();

if (isRedisConfigured) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

/**
 * Get or create an Upstash rate limiter for a given config
 */
function getUpstashLimiter(config: RateLimitConfig): Ratelimit {
  const key = `${config.limit}:${config.windowSec}`;
  let limiter = rateLimiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSec} s`),
      analytics: true,
      prefix: "ankiflow:rl",
    });
    rateLimiters.set(key, limiter);
  }
  return limiter;
}

// ─── In-memory fallback (development / no Redis) ────────────────────

interface InMemoryEntry {
  count: number;
  resetAt: number;
}

const inMemoryStore = new Map<string, InMemoryEntry>();

// Cleanup stale entries every 5 minutes (only relevant in long-lived processes)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of inMemoryStore) {
        if (now > entry.resetAt) {
          inMemoryStore.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  );
}

function inMemoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSec * 1000;

  const entry = inMemoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: config.limit - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Check if a request is allowed under the rate limit.
 * Uses Upstash Redis in production, in-memory fallback otherwise.
 *
 * @param key - Unique identifier (e.g., "generate:127.0.0.1")
 * @param config - Rate limit configuration
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  if (isRedisConfigured && redis) {
    try {
      const limiter = getUpstashLimiter(config);
      const result = await limiter.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } catch (err) {
      // If Redis fails, fall back to in-memory to avoid blocking requests
      console.warn("[rate-limit] Upstash Redis error, falling back to in-memory:", err);
      return inMemoryRateLimit(key, config);
    }
  }

  // Development / no Redis configured
  return inMemoryRateLimit(key, config);
}

/**
 * Get client IP from request headers (works behind Vercel/Cloudflare proxies)
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

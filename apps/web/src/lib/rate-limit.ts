/**
 * In-memory rate limiter for API routes.
 * Uses a sliding window counter per IP address.
 *
 * For production at scale, replace with Redis-backed solution
 * (e.g., @upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.resetAt < now) store.delete(key);
    });
  }, 5 * 60 * 1000);
}

interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function rateLimit(
  ip: string,
  config: RateLimitConfig = { limit: 60, windowSeconds: 60 }
): RateLimitResult {
  const now = Date.now();
  const key = ip;
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return { success: true, limit: config.limit, remaining: config.limit - 1, reset: now + config.windowSeconds * 1000 };
  }

  entry.count++;
  const remaining = Math.max(0, config.limit - entry.count);

  if (entry.count > config.limit) {
    return { success: false, limit: config.limit, remaining: 0, reset: entry.resetAt };
  }

  return { success: true, limit: config.limit, remaining, reset: entry.resetAt };
}

/**
 * Higher-cost rate limit for AI/Claude endpoints.
 * 10 requests per minute to prevent cost abuse.
 */
export function rateLimitAI(ip: string): RateLimitResult {
  return rateLimit(`ai:${ip}`, { limit: 10, windowSeconds: 60 });
}

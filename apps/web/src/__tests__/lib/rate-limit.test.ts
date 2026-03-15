import { describe, it, expect } from 'vitest';
import { rateLimit, rateLimitAI } from '@/lib/rate-limit';

// The module-level store is shared across imports within the same test run.
// We use unique IPs per test to avoid cross-test contamination.
let ipCounter = 0;
function uniqueIP(): string {
  return `test-ip-${Date.now()}-${ipCounter++}`;
}

describe('rateLimit', () => {
  it('allows the first request', () => {
    const ip = uniqueIP();
    const result = rateLimit(ip);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(59); // 60 limit, first used
  });

  it('returns correct remaining count as requests increase', () => {
    const ip = uniqueIP();
    rateLimit(ip); // 1st
    rateLimit(ip); // 2nd
    const result = rateLimit(ip); // 3rd
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(57); // 60 - 3
  });

  it('allows up to the limit', () => {
    const ip = uniqueIP();
    const config = { limit: 5, windowSeconds: 60 };

    for (let i = 0; i < 5; i++) {
      const result = rateLimit(ip, config);
      expect(result.success).toBe(true);
    }
  });

  it('blocks requests over the limit', () => {
    const ip = uniqueIP();
    const config = { limit: 3, windowSeconds: 60 };

    rateLimit(ip, config); // 1
    rateLimit(ip, config); // 2
    rateLimit(ip, config); // 3
    const result = rateLimit(ip, config); // 4 — should be blocked

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('returns remaining 0 when exactly at limit', () => {
    const ip = uniqueIP();
    const config = { limit: 2, windowSeconds: 60 };

    rateLimit(ip, config); // 1
    const result = rateLimit(ip, config); // 2 — at limit

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('different IPs have separate limits', () => {
    const ip1 = uniqueIP();
    const ip2 = uniqueIP();
    const config = { limit: 2, windowSeconds: 60 };

    rateLimit(ip1, config); // ip1: 1
    rateLimit(ip1, config); // ip1: 2
    const blockedResult = rateLimit(ip1, config); // ip1: 3 — blocked
    expect(blockedResult.success).toBe(false);

    // ip2 should still be allowed
    const allowedResult = rateLimit(ip2, config);
    expect(allowedResult.success).toBe(true);
    expect(allowedResult.remaining).toBe(1);
  });

  it('uses default config of 60 requests per 60 seconds', () => {
    const ip = uniqueIP();
    const result = rateLimit(ip);
    expect(result.limit).toBe(60);
  });

  it('returns the reset timestamp', () => {
    const ip = uniqueIP();
    const before = Date.now();
    const result = rateLimit(ip);
    const after = Date.now();

    // reset should be ~60s in the future
    expect(result.reset).toBeGreaterThanOrEqual(before + 60000);
    expect(result.reset).toBeLessThanOrEqual(after + 60000 + 10); // small margin
  });
});

describe('rateLimitAI', () => {
  it('uses a stricter limit of 10 requests per minute', () => {
    const ip = uniqueIP();
    const result = rateLimitAI(ip);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(9);
  });

  it('blocks after 10 requests', () => {
    const ip = uniqueIP();

    for (let i = 0; i < 10; i++) {
      const result = rateLimitAI(ip);
      expect(result.success).toBe(true);
    }

    const blocked = rateLimitAI(ip);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('AI and general rate limits are independent', () => {
    const ip = uniqueIP();
    const config = { limit: 2, windowSeconds: 60 };

    // Exhaust general limit for this IP
    rateLimit(ip, config);
    rateLimit(ip, config);
    const generalBlocked = rateLimit(ip, config);
    expect(generalBlocked.success).toBe(false);

    // AI limit for same IP should still work (uses "ai:" prefix internally)
    const aiResult = rateLimitAI(ip);
    expect(aiResult.success).toBe(true);
  });
});

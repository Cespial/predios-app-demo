import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitAI } from './rate-limit';

/** Extract client IP from request headers */
export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Apply rate limiting and return error response if exceeded */
export function applyRateLimit(request: NextRequest, isAI = false): NextResponse | null {
  const ip = getClientIP(request);
  const result = isAI ? rateLimitAI(ip) : rateLimit(ip);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return null; // No error — proceed
}

/** Add cache headers to successful responses */
export function withCacheHeaders(
  data: unknown,
  maxAge = 300,
  status = 200
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=86400`,
    },
  });
}

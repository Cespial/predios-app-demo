import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // Check Supabase connectivity
  const dbStart = Date.now();
  try {
    const { error } = await supabase
      .from('ciudades')
      .select('id', { count: 'exact', head: true });
    checks.database = {
      status: error ? 'unhealthy' : 'healthy',
      latency_ms: Date.now() - dbStart,
      ...(error && { error: error.message }),
    };
  } catch (e) {
    checks.database = {
      status: 'unhealthy',
      latency_ms: Date.now() - dbStart,
      error: (e as Error).message,
    };
  }

  // Check env vars
  checks.env = {
    status:
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.ANTHROPIC_API_KEY
        ? 'healthy'
        : 'unhealthy',
  };

  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: allHealthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}

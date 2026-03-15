import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { applyRateLimit, withCacheHeaders } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  const [scoringRes, factoresRes] = await Promise.all([
    supabase
      .from('scoring_config')
      .select('*')
      .eq('activa', true)
      .single(),
    supabase
      .from('factores_demanda_parqueadero')
      .select('*')
      .order('tipo_generador'),
  ]);

  return withCacheHeaders({
    scoring: scoringRes.data ?? null,
    factores_demanda: factoresRes.data ?? [],
  }, 600);
}

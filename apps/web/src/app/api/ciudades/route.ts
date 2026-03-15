import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { applyRateLimit, withCacheHeaders } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  // Fetch all data in 3 parallel queries instead of N+1 per city
  const [ciudadesRes, prediosRes, generadoresRes, parqueaderosRes] = await Promise.all([
    supabase.from('ciudades').select('*'),
    supabase.from('predios').select('ciudad_id'),
    supabase.from('generadores_demanda').select('ciudad_id, aforo'),
    supabase.from('parqueaderos_existentes').select('ciudad_id, capacidad'),
  ]);

  if (ciudadesRes.error) {
    return NextResponse.json({ error: ciudadesRes.error.message }, { status: 500 });
  }

  // Build lookup maps by ciudad_id
  const prediosCounts = new Map<string, number>();
  for (const p of prediosRes.data ?? []) {
    prediosCounts.set(p.ciudad_id, (prediosCounts.get(p.ciudad_id) ?? 0) + 1);
  }

  const generadoresData = new Map<string, { count: number; aforo: number }>();
  for (const g of generadoresRes.data ?? []) {
    const prev = generadoresData.get(g.ciudad_id) ?? { count: 0, aforo: 0 };
    generadoresData.set(g.ciudad_id, {
      count: prev.count + 1,
      aforo: prev.aforo + (g.aforo ?? 0),
    });
  }

  const parqueaderosCapacidad = new Map<string, number>();
  for (const p of parqueaderosRes.data ?? []) {
    parqueaderosCapacidad.set(
      p.ciudad_id,
      (parqueaderosCapacidad.get(p.ciudad_id) ?? 0) + (p.capacidad ?? 0)
    );
  }

  const result = (ciudadesRes.data ?? []).map((ciudad) => {
    const genData = generadoresData.get(ciudad.id) ?? { count: 0, aforo: 0 };
    const capParqueaderos = parqueaderosCapacidad.get(ciudad.id) ?? 0;
    const deficit = Math.max(0, Math.round(genData.aforo * 0.15) - capParqueaderos);

    return {
      id: ciudad.id,
      nombre: ciudad.nombre,
      departamento: ciudad.departamento,
      poblacion: ciudad.poblacion,
      lat: ciudad.geom ? ciudad.geom.coordinates[1] : null,
      lng: ciudad.geom ? ciudad.geom.coordinates[0] : null,
      total_predios: prediosCounts.get(ciudad.id) ?? 0,
      total_generadores: genData.count,
      deficit_total_cajones: deficit,
    };
  });

  return withCacheHeaders(result, 300);
}

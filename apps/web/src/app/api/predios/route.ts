import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { applyRateLimit, withCacheHeaders } from '@/lib/api-helpers';
import { clampNumber, isValidPropietario, sanitizeString } from '@/lib/validate';

export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const ciudad = sanitizeString(params.get('ciudad'));
  const scoreMin = clampNumber(params.get('score_min'), 0, 100, 0);
  const areaMin = clampNumber(params.get('area_min'), 0, 1000000, 0);
  const sinRestricciones = params.get('sin_restricciones') === 'true';
  const page = Math.round(clampNumber(params.get('page'), 1, 1000, 1));
  const limit = Math.round(clampNumber(params.get('limit'), 1, 100, 20));
  const offset = (page - 1) * limit;

  const propietario = params.get('propietario');
  if (propietario && !isValidPropietario(propietario)) {
    return NextResponse.json(
      { error: 'Valor de propietario no válido' },
      { status: 400 }
    );
  }

  let query = supabase
    .from('predios')
    .select(
      `
      id, nombre, direccion, area_m2, propietario, tipo_propietario,
      score_total, score_accesibilidad, score_demanda, score_area, score_restricciones,
      cajones_estimados, tiene_restriccion_bic, tiene_restriccion_etnica, tiene_restriccion_forestal,
      centroide, ciudad_id,
      ciudades!inner(nombre)
    `,
      { count: 'exact' }
    )
    .gte('score_total', scoreMin)
    .gte('area_m2', areaMin)
    .order('score_total', { ascending: false })
    .range(offset, offset + limit - 1);

  if (ciudad) {
    query = query.eq('ciudades.nombre', ciudad);
  }

  if (propietario) {
    query = query.ilike('propietario', `%${propietario}%`);
  }

  if (sinRestricciones) {
    query = query
      .eq('tiene_restriccion_bic', false)
      .eq('tiene_restriccion_etnica', false)
      .eq('tiene_restriccion_forestal', false);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const predios = (data || []).map((p: any) => {
    const centroide = p.centroide as { coordinates: [number, number] } | null;
    return {
      ...p,
      centroide_lat: centroide?.coordinates?.[1] ?? null,
      centroide_lng: centroide?.coordinates?.[0] ?? null,
      ciudad_nombre: p.ciudades?.nombre ?? null,
      ciudades: undefined,
      centroide: undefined,
    };
  });

  const total = count || 0;
  return withCacheHeaders({
    predios,
    total,
    page,
    pages: Math.ceil(total / limit),
  }, 60);
}

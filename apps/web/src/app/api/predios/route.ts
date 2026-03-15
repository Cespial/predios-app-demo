import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const ciudad = params.get('ciudad');
  const scoreMin = Number(params.get('score_min') || 0);
  const propietario = params.get('propietario');
  const areaMin = Number(params.get('area_min') || 0);
  const sinRestricciones = params.get('sin_restricciones') === 'true';
  const page = Math.max(1, Number(params.get('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 20)));
  const offset = (page - 1) * limit;

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
  return NextResponse.json({
    predios,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { applyRateLimit, withCacheHeaders } from '@/lib/api-helpers';
import { sanitizeString } from '@/lib/validate';

export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const ciudad = sanitizeString(params.get('ciudad'));

  if (!ciudad) {
    return NextResponse.json({ error: 'ciudad es requerido' }, { status: 400 });
  }

  // Get ciudad ID
  const { data: ciudadData } = await supabase
    .from('ciudades')
    .select('id')
    .ilike('nombre', `%${ciudad}%`)
    .single();

  if (!ciudadData) {
    return NextResponse.json({ error: 'Ciudad no encontrada' }, { status: 404 });
  }

  const ciudadId = ciudadData.id;

  const [prediosRes, generadoresRes, parqueaderosRes] = await Promise.all([
    supabase
      .from('predios')
      .select('id, nombre, area_m2, score_total, cajones_estimados, propietario, geom, centroide')
      .eq('ciudad_id', ciudadId),
    supabase
      .from('generadores_demanda')
      .select('id, nombre, tipo, aforo, geom')
      .eq('ciudad_id', ciudadId),
    supabase
      .from('parqueaderos_existentes')
      .select('id, nombre, capacidad, geom')
      .eq('ciudad_id', ciudadId),
  ]);

  const prediosFeatures = (prediosRes.data || []).map((p) => ({
    type: 'Feature' as const,
    geometry: p.geom || p.centroide,
    properties: {
      id: p.id,
      nombre: p.nombre,
      area_m2: p.area_m2,
      score: p.score_total,
      cajones: p.cajones_estimados,
      propietario: p.propietario,
    },
  }));

  const generadoresFeatures = (generadoresRes.data || []).map((g) => ({
    type: 'Feature' as const,
    geometry: g.geom,
    properties: {
      id: g.id,
      nombre: g.nombre,
      tipo: g.tipo,
      aforo: g.aforo,
    },
  }));

  const parqueaderosFeatures = (parqueaderosRes.data || []).map((p) => ({
    type: 'Feature' as const,
    geometry: p.geom,
    properties: {
      id: p.id,
      nombre: p.nombre,
      capacidad: p.capacidad,
    },
  }));

  return withCacheHeaders({
    predios: {
      type: 'FeatureCollection',
      features: prediosFeatures,
    },
    generadores: {
      type: 'FeatureCollection',
      features: generadoresFeatures,
    },
    parqueaderos: {
      type: 'FeatureCollection',
      features: parqueaderosFeatures,
    },
  }, 120);
}

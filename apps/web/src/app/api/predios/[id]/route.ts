import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [predioRes, generadoresRes, parqueaderosRes, fichaRes, normativaRes] =
    await Promise.all([
      supabase
        .from('predios')
        .select('*, ciudades(nombre, departamento)')
        .eq('id', id)
        .single(),
      supabase
        .from('predios_generadores')
        .select('distancia_metros, tiempo_caminando_min, generadores_demanda(*)')
        .eq('predio_id', id)
        .order('distancia_metros', { ascending: true })
        .limit(5),
      supabase
        .from('parqueaderos_existentes')
        .select('*')
        .limit(5),
      supabase
        .from('fichas_tecnicas')
        .select('*')
        .eq('predio_id', id)
        .order('generado_en', { ascending: false })
        .limit(1),
      supabase
        .from('normativa_items')
        .select('*')
        .eq('predio_id', id),
    ]);

  if (predioRes.error || !predioRes.data) {
    return NextResponse.json(
      { error: 'Predio no encontrado' },
      { status: 404 }
    );
  }

  const predio = predioRes.data;
  const centroide = predio.centroide as { coordinates: [number, number] } | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generadores = (generadoresRes.data || []).map((pg: any) => ({
    ...pg.generadores_demanda,
    distancia_metros: pg.distancia_metros,
    tiempo_caminando_min: pg.tiempo_caminando_min,
  }));

  const ficha = fichaRes.data?.[0] || null;

  // Calculate deficit
  let deficit = { total_generadores: 0, aforo_total: 0, capacidad_parqueaderos: 0, cajones_deficit: 0 };
  if (centroide) {
    const { data: deficitData } = await supabase.rpc('deficit_parqueaderos', {
      lat: centroide.coordinates[1],
      lng: centroide.coordinates[0],
      radio_metros: 1000,
    });
    if (deficitData?.[0]) {
      deficit = deficitData[0];
    }
  }

  return NextResponse.json({
    ...predio,
    centroide_lat: centroide?.coordinates?.[1] ?? null,
    centroide_lng: centroide?.coordinates?.[0] ?? null,
    ciudad_nombre: (predio.ciudades as { nombre: string } | null)?.nombre ?? null,
    generadores_cercanos: generadores,
    parqueaderos_cercanos: parqueaderosRes.data || [],
    ficha,
    normativa: normativaRes.data || [],
    deficit,
    generando_ficha: !ficha,
  });
}

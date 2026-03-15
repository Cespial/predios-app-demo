import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { applyRateLimit } from '@/lib/api-helpers';
import { isValidUUID } from '@/lib/validate';
import { generatePDF } from '@/lib/pdf-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = applyRateLimit(request);
  if (limited) return limited;

  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'ID de predio no válido' },
      { status: 400 }
    );
  }

  // Fetch predio, ficha, generadores, and normativa in parallel
  const [predioRes, fichaRes, generadoresRes, normativaRes] =
    await Promise.all([
      supabase
        .from('predios')
        .select('*, ciudades(nombre)')
        .eq('id', id)
        .single(),
      supabase
        .from('fichas_tecnicas')
        .select('*')
        .eq('predio_id', id)
        .order('generado_en', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('predios_generadores')
        .select('distancia_metros, generadores_demanda(nombre, tipo, aforo)')
        .eq('predio_id', id)
        .order('distancia_metros', { ascending: true })
        .limit(10),
      supabase
        .from('normativa_items')
        .select('componente, norma, descripcion')
        .eq('predio_id', id),
    ]);

  if (!predioRes.data) {
    return NextResponse.json(
      { error: 'Predio no encontrado' },
      { status: 404 }
    );
  }

  const predio = predioRes.data;
  const ciudadNombre =
    (predio.ciudades as { nombre: string } | null)?.nombre || '';

  // Calculate deficit via RPC
  const centroide = predio.centroide as {
    coordinates: [number, number];
  } | null;
  let deficit = {
    capacidad_parqueaderos: 0,
    demanda_ponderada: 0,
    cajones_deficit: 0,
  };
  if (centroide) {
    const { data: deficitData } = await supabase.rpc(
      'deficit_parqueaderos_v2',
      {
        lat: centroide.coordinates[1],
        lng: centroide.coordinates[0],
        radio_metros: 1000,
      }
    );
    if (deficitData?.[0]) {
      deficit = {
        capacidad_parqueaderos: deficitData[0].capacidad_parqueaderos ?? 0,
        demanda_ponderada: deficitData[0].demanda_ponderada ?? 0,
        cajones_deficit: deficitData[0].cajones_deficit ?? 0,
      };
    }
  }

  // Shape generadores data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generadores = (generadoresRes.data || []).map((pg: any) => ({
    nombre: pg.generadores_demanda?.nombre ?? '',
    tipo: pg.generadores_demanda?.tipo ?? '',
    aforo: pg.generadores_demanda?.aforo ?? 0,
    distancia_metros: pg.distancia_metros ?? 0,
  }));

  // Shape ficha data
  const fichaRow = fichaRes.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fichaContent: any = fichaRow?.contenido_ia ?? null;
  const ficha = fichaContent
    ? {
        resumen_ejecutivo: fichaContent.resumen_ejecutivo ?? undefined,
        modelo_tarifario: fichaContent.modelo_tarifario ?? undefined,
        servicios_complementarios:
          fichaContent.servicios_complementarios ?? undefined,
        riesgos_principales: fichaContent.riesgos_principales ?? undefined,
        ingresos_estimados_mes:
          fichaContent.ingresos_estimados_mes ?? undefined,
      }
    : null;

  // Generate PDF buffer
  const pdfBuffer = await generatePDF({
    predio: {
      nombre: predio.nombre,
      direccion: predio.direccion,
      area_m2: predio.area_m2,
      propietario: predio.propietario,
      score_total: predio.score_total,
      score_area: predio.score_area,
      score_accesibilidad: predio.score_accesibilidad,
      score_demanda: predio.score_demanda,
      score_restricciones: predio.score_restricciones,
      ciudad: ciudadNombre,
      cajones_estimados: predio.cajones_estimados,
    },
    generadores,
    deficit,
    ficha,
    normativa: normativaRes.data || [],
  });

  // Sanitize filename
  const safeName = predio.nombre
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ficha-${safeName}.pdf"`,
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
    },
  });
}

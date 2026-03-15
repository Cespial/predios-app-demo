import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { applyRateLimit, withCacheHeaders } from '@/lib/api-helpers';
import { isValidUUID } from '@/lib/validate';

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

  // Get predio + ficha
  const [predioRes, fichaRes] = await Promise.all([
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
  ]);

  if (!predioRes.data || !fichaRes.data) {
    return NextResponse.json(
      { error: 'Predio o ficha no encontrada' },
      { status: 404 }
    );
  }

  // For the demo, return ficha data as JSON
  // In production, this would use @react-pdf/renderer to generate a PDF
  const predio = predioRes.data;
  const ficha = fichaRes.data;
  const ciudadNombre = (predio.ciudades as { nombre: string } | null)?.nombre || '';

  return withCacheHeaders({
    predio: {
      nombre: predio.nombre,
      direccion: predio.direccion,
      area_m2: predio.area_m2,
      propietario: predio.propietario,
      score_total: predio.score_total,
      ciudad: ciudadNombre,
    },
    ficha: ficha.contenido_ia,
    generado_en: ficha.generado_en,
    // TODO: Implement actual PDF generation with @react-pdf/renderer
    // For now, the frontend handles PDF rendering client-side
  }, 600);
}

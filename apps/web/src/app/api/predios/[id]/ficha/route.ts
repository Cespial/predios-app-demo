import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generarFichaTecnica } from '@/lib/claude';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: ficha } = await supabase
    .from('fichas_tecnicas')
    .select('*')
    .eq('predio_id', id)
    .order('generado_en', { ascending: false })
    .limit(1)
    .single();

  if (ficha) {
    const age = Date.now() - new Date(ficha.generado_en).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (age < sevenDays) {
      return NextResponse.json(ficha);
    }
  }

  // Generate new ficha
  const result = await generateFichaForPredio(id);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await generateFichaForPredio(id);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}

async function generateFichaForPredio(predioId: string) {
  const { data: predio, error: predioError } = await supabase
    .from('predios')
    .select('*, ciudades(nombre)')
    .eq('id', predioId)
    .single();

  if (predioError || !predio) {
    return { error: 'Predio no encontrado' };
  }

  const centroide = predio.centroide as { coordinates: [number, number] } | null;

  const [generadoresRes, parqueaderosRes] = await Promise.all([
    supabase
      .from('predios_generadores')
      .select('distancia_metros, generadores_demanda(nombre, tipo, aforo)')
      .eq('predio_id', predioId)
      .order('distancia_metros', { ascending: true })
      .limit(10),
    centroide
      ? supabase.rpc('predios_en_radio', {
          lat: centroide.coordinates[1],
          lng: centroide.coordinates[0],
          radio_metros: 1000,
        })
      : Promise.resolve({ data: [] }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generadores = (generadoresRes.data || []).map((pg: any) => ({
    ...pg.generadores_demanda,
    distancia_metros: pg.distancia_metros,
  }));

  const ciudadNombre = (predio.ciudades as { nombre: string } | null)?.nombre || 'Colombia';

  try {
    const contenido = await generarFichaTecnica(
      predio,
      generadores as { nombre: string; tipo: string; aforo: number; distancia_metros: number }[],
      (parqueaderosRes.data || []) as { nombre: string; capacidad: number; distancia_metros: number }[],
      ciudadNombre
    );

    const { data: ficha, error: insertError } = await supabase
      .from('fichas_tecnicas')
      .insert({
        predio_id: predioId,
        contenido_ia: contenido,
      })
      .select()
      .single();

    if (insertError) {
      return { error: insertError.message };
    }

    // Also insert normativa items
    if (contenido.normativa_aplicable) {
      const normativaRows = contenido.normativa_aplicable.map(
        (n: { componente: string; norma: string; descripcion: string }) => ({
          predio_id: predioId,
          componente: n.componente,
          norma: n.norma,
          descripcion: n.descripcion,
          aplica: true,
          fuente: 'Claude AI',
        })
      );
      await supabase.from('normativa_items').insert(normativaRows);
    }

    return ficha;
  } catch (error) {
    return { error: `Error generando ficha: ${(error as Error).message}` };
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data: ciudades, error } = await supabase
    .from('ciudades')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = await Promise.all(
    (ciudades || []).map(async (ciudad) => {
      const [prediosRes, generadoresRes, parqueaderosRes] = await Promise.all([
        supabase
          .from('predios')
          .select('id', { count: 'exact', head: true })
          .eq('ciudad_id', ciudad.id),
        supabase
          .from('generadores_demanda')
          .select('id, aforo', { count: 'exact' })
          .eq('ciudad_id', ciudad.id),
        supabase
          .from('parqueaderos_existentes')
          .select('id, capacidad')
          .eq('ciudad_id', ciudad.id),
      ]);

      const totalAforo = (generadoresRes.data || []).reduce(
        (sum, g) => sum + (g.aforo || 0),
        0
      );
      const totalCapacidad = (parqueaderosRes.data || []).reduce(
        (sum, p) => sum + (p.capacidad || 0),
        0
      );
      const deficit = Math.max(0, Math.round(totalAforo * 0.15) - totalCapacidad);

      return {
        id: ciudad.id,
        nombre: ciudad.nombre,
        departamento: ciudad.departamento,
        poblacion: ciudad.poblacion,
        lat: ciudad.geom ? ciudad.geom.coordinates[1] : null,
        lng: ciudad.geom ? ciudad.geom.coordinates[0] : null,
        total_predios: prediosRes.count || 0,
        total_generadores: generadoresRes.count || 0,
        deficit_total_cajones: deficit,
      };
    })
  );

  return NextResponse.json(result);
}

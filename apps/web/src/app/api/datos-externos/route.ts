import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, withCacheHeaders } from '@/lib/api-helpers';
import { sanitizeString } from '@/lib/validate';
import { queryDatosGov } from '@/lib/datos-gov';

/**
 * GET /api/datos-externos?ciudad=Medellín&tipo=inmuebles
 *
 * Fetches institutional property data from datos.gov.co.
 *
 * Query params:
 *   ciudad  – required, city name (e.g. "Medellín", "Bogotá")
 *   tipo    – optional, one of 'inmuebles' | 'equipamientos' (default: 'inmuebles')
 */

// --- Dataset IDs ---
const DATASET_INMUEBLES = 'f2nk-6fgh'; // Inventario bienes inmuebles del estado
const DATASET_EQUIPAMIENTOS = 'cg4i-x97b'; // Equipamientos urbanos

// --- City → department mapping for upstream filtering ---
const CIUDAD_DEPARTAMENTO: Record<string, string> = {
  'medellín': 'ANTIOQUIA',
  'medellin': 'ANTIOQUIA',
  'bogotá': 'BOGOTA',
  'bogota': 'BOGOTA',
  'cali': 'VALLE DEL CAUCA',
  'barranquilla': 'ATLANTICO',
  'cartagena': 'BOLIVAR',
  'bucaramanga': 'SANTANDER',
  'pereira': 'RISARALDA',
  'manizales': 'CALDAS',
  'santa marta': 'MAGDALENA',
  'ibagué': 'TOLIMA',
  'ibague': 'TOLIMA',
  'neiva': 'HUILA',
  'villavicencio': 'META',
  'pasto': 'NARIÑO',
  'montería': 'CORDOBA',
  'monteria': 'CORDOBA',
  'armenia': 'QUINDIO',
  'popayán': 'CAUCA',
  'popayan': 'CAUCA',
  'tunja': 'BOYACA',
  'cúcuta': 'NORTE DE SANTANDER',
  'cucuta': 'NORTE DE SANTANDER',
};

type TipoConsulta = 'inmuebles' | 'equipamientos';
const TIPOS_VALIDOS: TipoConsulta[] = ['inmuebles', 'equipamientos'];

export async function GET(request: NextRequest) {
  // Rate limit
  const limited = applyRateLimit(request);
  if (limited) return limited;

  // Parse & validate params
  const params = request.nextUrl.searchParams;
  const ciudadRaw = sanitizeString(params.get('ciudad'), 100);
  const tipoRaw = sanitizeString(params.get('tipo'), 30) || 'inmuebles';

  if (!ciudadRaw) {
    return NextResponse.json(
      { error: 'Parámetro "ciudad" es requerido.' },
      { status: 400 }
    );
  }

  const tipo = TIPOS_VALIDOS.includes(tipoRaw as TipoConsulta)
    ? (tipoRaw as TipoConsulta)
    : 'inmuebles';

  const ciudadLower = ciudadRaw.toLowerCase();
  const departamento = CIUDAD_DEPARTAMENTO[ciudadLower];
  const ciudadUpper = ciudadRaw.toUpperCase();

  try {
    if (tipo === 'inmuebles') {
      // Build SoQL $where clause – filter by department + municipality
      const whereClause = departamento
        ? `upper(departamento) like '%${departamento}%' AND upper(municipio) like '%${ciudadUpper}%'`
        : `upper(municipio) like '%${ciudadUpper}%'`;

      const data = await queryDatosGov(DATASET_INMUEBLES, {
        $where: whereClause,
        $select:
          'nombre_inmueble,direccion,area_terreno,entidad_propietaria,departamento,municipio',
        $limit: 50,
        $order: 'area_terreno DESC',
      });

      return withCacheHeaders(
        {
          fuente: 'datos.gov.co',
          dataset: DATASET_INMUEBLES,
          tipo,
          ciudad: ciudadRaw,
          total: data.length,
          registros: data,
        },
        86400 // 24-hour cache
      );
    }

    // tipo === 'equipamientos'
    const whereClause = departamento
      ? `upper(departamento) like '%${departamento}%' AND upper(municipio) like '%${ciudadUpper}%'`
      : `upper(municipio) like '%${ciudadUpper}%'`;

    const data = await queryDatosGov(DATASET_EQUIPAMIENTOS, {
      $where: whereClause,
      $limit: 50,
    });

    return withCacheHeaders(
      {
        fuente: 'datos.gov.co',
        dataset: DATASET_EQUIPAMIENTOS,
        tipo,
        ciudad: ciudadRaw,
        total: data.length,
        registros: data,
      },
      86400
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Error consultando datos.gov.co';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

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

// --- Dataset IDs (verified working on datos.gov.co) ---
const DATASET_INMUEBLES = 'sbzv-2tci'; // Inventario de parques urbanos / predios públicos Bogotá
const DATASET_EQUIPAMIENTOS = 'sbzv-2tci'; // Same dataset, filtered by uso_nivel_1

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
      // Use LIKE with % for flexible matching (handles accents, case)
      const whereClause = departamento
        ? `departamento like '%${departamento.slice(0, 4)}%'`
        : `ciudad_municipio like '%${ciudadUpper.slice(0, 4)}%'`;

      const data = await queryDatosGov(DATASET_INMUEBLES, {
        $where: whereClause,
        $select:
          'rupi,estado,destinacion,uso_nivel_1,uso_nivel_2,uso_especifico,nomenclatura_ubicacion,departamento,ciudad_municipio,localidades,barrios,area_certificada',
        $limit: 50,
        $order: 'area_certificada DESC',
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

    // tipo === 'equipamientos' — filter for recreational/institutional zones
    const whereClause = departamento
      ? `departamento like '%${departamento.slice(0, 4)}%' AND uso_nivel_1 in ('ZONAS RECREATIVAS','EQUIPAMIENTOS')`
      : `ciudad_municipio like '%${ciudadUpper.slice(0, 4)}%' AND uso_nivel_1 in ('ZONAS RECREATIVAS','EQUIPAMIENTOS')`;

    const data = await queryDatosGov(DATASET_EQUIPAMIENTOS, {
      $where: whereClause,
      $select: 'rupi,destinacion,uso_nivel_1,uso_nivel_2,uso_especifico,nomenclatura_ubicacion,localidades,barrios,area_certificada',
      $limit: 50,
      $order: 'area_certificada DESC',
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

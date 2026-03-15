/**
 * Server-only module for fetching datos.gov.co (Socrata) datasets.
 *
 * Usage:
 *   import { queryDatosGov } from '@/lib/datos-gov';
 *   const rows = await queryDatosGov('f2nk-6fgh', { $limit: 50 });
 */

const BASE_URL = 'https://www.datos.gov.co/resource';
// datos.gov.co app token (optional — increases rate limit from 1000 to unlimited/hr)
// Leave empty to use public access (sufficient for demo)
const APP_TOKEN = ''; // process.env.DATOS_GOV_APP_TOKEN || '';

interface SocrataQueryParams {
  $where?: string;
  $select?: string;
  $limit?: number;
  $offset?: number;
  $order?: string;
  $group?: string;
}

export async function queryDatosGov<T = Record<string, unknown>>(
  datasetId: string,
  params: SocrataQueryParams = {}
): Promise<T[]> {
  const url = new URL(`${BASE_URL}/${datasetId}.json`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (APP_TOKEN) {
    headers['X-App-Token'] = APP_TOKEN;
  }

  const res = await fetch(url.toString(), {
    headers,
    next: { revalidate: 86400 }, // Cache for 24 hours at CDN level
  });

  if (!res.ok) {
    throw new Error(`datos.gov.co error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

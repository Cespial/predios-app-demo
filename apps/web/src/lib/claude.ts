// use server — this module runs only on the server (API routes / server actions)

import Anthropic from '@anthropic-ai/sdk';
import * as Sentry from '@sentry/nextjs';

let client: Anthropic | null = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;

/** HTTP status codes that are safe to retry (transient failures). */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503]);

/** HTTP status codes that should never be retried (client errors). */
const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403]);

/**
 * Returns true when the error is transient and worth retrying.
 * Network errors (ECONNRESET, ETIMEDOUT, fetch failures) are retryable.
 * Anthropic SDK errors expose a `status` property we can inspect.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    if (NON_RETRYABLE_STATUS_CODES.has(error.status)) return false;
    if (RETRYABLE_STATUS_CODES.has(error.status)) return true;
    // Any other API error — default to not retrying
    return false;
  }

  // Network / system-level errors are retryable
  if (error instanceof TypeError) return true; // fetch failures
  if (
    error instanceof Error &&
    ('code' in error || error.message.includes('ETIMEDOUT') || error.message.includes('ECONNRESET'))
  ) {
    return true;
  }

  return false;
}

/**
 * Exponential backoff with jitter.
 * delay = 2^attempt * 1000  +  random(0 … 500) ms
 */
function backoffMs(attempt: number): number {
  return Math.pow(2, attempt) * 1000 + Math.random() * 500;
}

/**
 * Try to extract a JSON object from arbitrary text (handles markdown fences,
 * leading prose, etc.).  Returns the parsed object or null.
 */
function extractJson(text: string): Record<string, unknown> | null {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : text.trim();

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back: find the first top-level { … } block
    const braceStart = candidate.indexOf('{');
    const braceEnd = candidate.lastIndexOf('}');
    if (braceStart !== -1 && braceEnd > braceStart) {
      try {
        return JSON.parse(candidate.slice(braceStart, braceEnd + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Build a human-readable error message from whatever we caught.
 */
function describeError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    return `Anthropic API error ${error.status}: ${error.message}`;
  }
  if (error instanceof SyntaxError) {
    return `JSON parse error: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PredioData {
  nombre: string;
  direccion: string;
  area_m2: number;
  propietario: string;
  uso_actual: string;
  score_total: number;
  tiene_restriccion_bic: boolean;
  tiene_restriccion_etnica: boolean;
  tiene_restriccion_forestal: boolean;
}

interface GeneradorCercano {
  nombre: string;
  tipo: string;
  aforo: number;
  distancia_metros: number;
}

interface ParqueaderoCercano {
  nombre: string;
  capacidad: number;
  distancia_metros: number;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generarFichaTecnica(
  predio: PredioData,
  generadores: GeneradorCercano[],
  parqueaderos: ParqueaderoCercano[],
  ciudad: string
) {
  const anthropic = getClient();

  const restricciones = [
    predio.tiene_restriccion_bic && 'Bien de Interés Cultural (BIC)',
    predio.tiene_restriccion_etnica && 'Restricción étnica',
    predio.tiene_restriccion_forestal && 'Restricción forestal',
  ].filter(Boolean);

  const prompt = `Eres un experto en desarrollo urbano, parqueaderos y normativa colombiana.

Analiza el siguiente predio para determinar su viabilidad como parqueadero público en ${ciudad}, Colombia.

## Datos del Predio
- Nombre: ${predio.nombre}
- Dirección: ${predio.direccion}
- Área: ${predio.area_m2} m²
- Propietario: ${predio.propietario}
- Uso actual: ${predio.uso_actual || 'Sin uso definido'}
- Score de viabilidad: ${predio.score_total}/100
- Restricciones: ${restricciones.length > 0 ? restricciones.join(', ') : 'Ninguna'}

## Generadores de Demanda Cercanos
${generadores.map((g) => `- ${g.nombre} (${g.tipo}, aforo: ${g.aforo}, distancia: ${Math.round(g.distancia_metros)}m)`).join('\n')}

## Parqueaderos Existentes Cercanos
${parqueaderos.map((p) => `- ${p.nombre} (capacidad: ${p.capacidad}, distancia: ${Math.round(p.distancia_metros)}m)`).join('\n')}

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura exacta:
{
  "resumen_ejecutivo": "2-3 párrafos sobre el potencial del predio como parqueadero",
  "cajones_recomendados": <número entero>,
  "modelo_tarifario": {
    "tarifa_fraccion_30min": <número en COP>,
    "tarifa_hora": <número en COP>,
    "tarifa_dia": <número en COP>,
    "tarifa_mes": <número en COP>
  },
  "ingresos_estimados_mes": <número en COP>,
  "servicios_complementarios": ["servicio1", "servicio2", ...],
  "riesgos_principales": ["riesgo1", "riesgo2", ...],
  "vinculacion_plan_desarrollo": {
    "municipal": "texto sobre cómo se vincula con el Plan de Desarrollo Municipal",
    "departamental": "texto sobre vinculación departamental",
    "nacional": "texto sobre vinculación con políticas nacionales"
  },
  "normativa_aplicable": [
    {"componente": "arquitectonico", "norma": "NSR-10", "descripcion": "..."},
    {"componente": "estructural", "norma": "...", "descripcion": "..."},
    {"componente": "ambiental", "norma": "...", "descripcion": "..."},
    {"componente": "social", "norma": "...", "descripcion": "..."},
    {"componente": "trafico", "norma": "...", "descripcion": "..."}
  ]
}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // ---- 1. Call the Anthropic API ----
    let text: string;
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      text =
        message.content[0].type === 'text' ? message.content[0].text : '';
    } catch (error) {
      lastError = new Error(describeError(error));

      // Only retry on transient / rate-limit errors
      if (!isRetryable(error)) {
        Sentry.captureException(error, { extra: { predio: predio.nombre, attempt } });
        throw new Error(
          `Non-retryable API error for predio "${predio.nombre}": ${describeError(error)}`
        );
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = backoffMs(attempt);
        console.warn(
          `[claude] Attempt ${attempt + 1}/${MAX_RETRIES} failed (${describeError(error)}). Retrying in ${Math.round(delay)}ms…`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
      continue;
    }

    // ---- 2. Parse the response JSON (never retry on parse errors) ----
    try {
      return JSON.parse(text);
    } catch {
      // Direct parse failed — try to extract JSON from the text
      const extracted = extractJson(text);
      if (extracted) return extracted;

      // Cannot recover: throw immediately, no retry
      throw new Error(
        `Failed to parse Claude response as JSON for predio "${predio.nombre}". ` +
          `Response starts with: "${text.slice(0, 200)}…"`
      );
    }
  }

  // All retries exhausted
  throw new Error(
    `All ${MAX_RETRIES} attempts failed for predio "${predio.nombre}": ${lastError?.message ?? 'unknown error'}`
  );
}

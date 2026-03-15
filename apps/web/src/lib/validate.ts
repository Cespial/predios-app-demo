/**
 * Input validation helpers for API routes.
 */

/** Clamp a numeric value to a safe range, returning defaultVal for NaN */
export function clampNumber(
  raw: string | null,
  min: number,
  max: number,
  defaultVal: number
): number {
  if (raw === null || raw === '') return defaultVal;
  const n = Number(raw);
  if (isNaN(n) || !isFinite(n)) return defaultVal;
  return Math.max(min, Math.min(max, n));
}

/** Validate UUID format */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Sanitize string input: trim, limit length, remove control characters */
export function sanitizeString(raw: string | null, maxLength = 200): string | null {
  if (raw === null || raw === '') return null;
  return raw
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x1f\x7f]/g, ''); // Remove control characters
}

/** Known propietario values for whitelist filtering */
const PROPIETARIOS_VALIDOS = [
  'alcaldía', 'gobernación', 'metro', 'inder', 'hospital',
  'universidad', 'secretaría', 'alcaldia', 'gobernacion',
];

/** Check if propietario value is valid (partial match against whitelist) */
export function isValidPropietario(raw: string): boolean {
  const lower = raw.toLowerCase().trim();
  if (lower.length < 2 || lower.length > 100) return false;
  // Allow if it contains any known keyword
  return PROPIETARIOS_VALIDOS.some((p) => lower.includes(p)) || /^[a-záéíóúñü\s]+$/i.test(lower);
}

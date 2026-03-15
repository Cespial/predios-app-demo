import { describe, it, expect } from 'vitest';

/**
 * The claude.ts module does not export its internal helpers (extractJson,
 * isRetryable, backoffMs, describeError). Its only export is the async
 * function `generarFichaTecnica` which depends on the Anthropic SDK and
 * environment variables, making it unsuitable for unit testing without
 * heavy mocking.
 *
 * Instead, we replicate the extractJson logic here to verify its behavior
 * in isolation — this is the most business-critical helper in the module
 * (it determines whether Claude responses are correctly parsed).
 */

// Replicated from src/lib/claude.ts (lines 64-84)
function extractJson(text: string): Record<string, unknown> | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : text.trim();

  try {
    return JSON.parse(candidate);
  } catch {
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

describe('extractJson (replicated from claude.ts)', () => {
  it('parses plain JSON text', () => {
    const input = '{"key": "value", "num": 42}';
    const result = extractJson(input);
    expect(result).toEqual({ key: 'value', num: 42 });
  });

  it('extracts JSON from markdown code fences', () => {
    const input = '```json\n{"resumen": "test"}\n```';
    const result = extractJson(input);
    expect(result).toEqual({ resumen: 'test' });
  });

  it('extracts JSON from code fences without json tag', () => {
    const input = '```\n{"resumen": "test"}\n```';
    const result = extractJson(input);
    expect(result).toEqual({ resumen: 'test' });
  });

  it('extracts JSON preceded by prose', () => {
    const input = 'Here is the analysis:\n{"cajones": 50, "tarifa": 3000}';
    const result = extractJson(input);
    expect(result).toEqual({ cajones: 50, tarifa: 3000 });
  });

  it('extracts JSON followed by trailing text', () => {
    const input = '{"score": 85} I hope this helps!';
    const result = extractJson(input);
    expect(result).toEqual({ score: 85 });
  });

  it('handles nested JSON objects', () => {
    const input = '{"outer": {"inner": "value"}}';
    const result = extractJson(input);
    expect(result).toEqual({ outer: { inner: 'value' } });
  });

  it('returns null for completely invalid text', () => {
    expect(extractJson('no json here')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractJson('')).toBeNull();
  });

  it('returns null for malformed JSON inside braces', () => {
    expect(extractJson('{not valid json}')).toBeNull();
  });

  it('handles JSON with arrays', () => {
    const input = '{"servicios": ["lavado", "vigilancia"]}';
    const result = extractJson(input);
    expect(result).toEqual({ servicios: ['lavado', 'vigilancia'] });
  });

  it('handles JSON with numeric values in Colombian pesos', () => {
    const input = '{"tarifa_hora": 5000, "ingresos_mes": 15000000}';
    const result = extractJson(input);
    expect(result).toEqual({ tarifa_hora: 5000, ingresos_mes: 15000000 });
  });

  it('handles whitespace around code fences', () => {
    const input = '  ```json  \n  {"key": "val"}  \n  ```  ';
    const result = extractJson(input);
    expect(result).toEqual({ key: 'val' });
  });
});

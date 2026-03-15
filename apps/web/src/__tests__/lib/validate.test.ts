import { describe, it, expect } from 'vitest';
import {
  clampNumber,
  isValidUUID,
  sanitizeString,
  isValidPropietario,
} from '@/lib/validate';

// ---------------------------------------------------------------------------
// clampNumber
// ---------------------------------------------------------------------------
describe('clampNumber', () => {
  it('returns the parsed number when within range', () => {
    expect(clampNumber('50', 0, 100, 0)).toBe(50);
  });

  it('clamps to min when value is below range', () => {
    expect(clampNumber('-10', 0, 100, 0)).toBe(0);
  });

  it('clamps to max when value exceeds range', () => {
    expect(clampNumber('200', 0, 100, 0)).toBe(100);
  });

  it('returns defaultVal for NaN input', () => {
    expect(clampNumber('abc', 0, 100, 42)).toBe(42);
  });

  it('returns defaultVal for null input', () => {
    expect(clampNumber(null, 0, 100, 42)).toBe(42);
  });

  it('returns defaultVal for empty string', () => {
    expect(clampNumber('', 0, 100, 42)).toBe(42);
  });

  it('returns defaultVal for Infinity', () => {
    expect(clampNumber('Infinity', 0, 100, 42)).toBe(42);
  });

  it('returns defaultVal for -Infinity', () => {
    expect(clampNumber('-Infinity', 0, 100, 42)).toBe(42);
  });

  it('handles negative ranges correctly', () => {
    expect(clampNumber('-5', -10, -1, -5)).toBe(-5);
  });

  it('handles zero as a valid value', () => {
    expect(clampNumber('0', 0, 100, 50)).toBe(0);
  });

  it('handles decimal numbers', () => {
    expect(clampNumber('3.14', 0, 10, 0)).toBeCloseTo(3.14);
  });
});

// ---------------------------------------------------------------------------
// isValidUUID
// ---------------------------------------------------------------------------
describe('isValidUUID', () => {
  it('returns true for a valid lowercase UUID', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns true for a valid uppercase UUID', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('returns true for a valid mixed-case UUID', () => {
    expect(isValidUUID('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('returns false for a random string', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  it('returns false for a UUID missing dashes', () => {
    expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
  });

  it('returns false for SQL injection attempt', () => {
    expect(isValidUUID("'; DROP TABLE predios; --")).toBe(false);
  });

  it('returns false for a UUID with extra characters', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false);
  });

  it('returns false for a UUID with invalid hex characters', () => {
    expect(isValidUUID('550g8400-e29b-41d4-a716-446655440000')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sanitizeString
// ---------------------------------------------------------------------------
describe('sanitizeString', () => {
  it('returns trimmed string for normal input', () => {
    expect(sanitizeString('  hello world  ')).toBe('hello world');
  });

  it('returns null for null input', () => {
    expect(sanitizeString(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(sanitizeString('')).toBeNull();
  });

  it('strips control characters', () => {
    expect(sanitizeString('hello\x00world\x1f')).toBe('helloworld');
  });

  it('strips the DEL control character (0x7f)', () => {
    expect(sanitizeString('hello\x7fworld')).toBe('helloworld');
  });

  it('truncates to maxLength', () => {
    const long = 'a'.repeat(300);
    const result = sanitizeString(long, 200);
    expect(result).toHaveLength(200);
  });

  it('uses custom maxLength', () => {
    const result = sanitizeString('hello world', 5);
    expect(result).toBe('hello');
  });

  it('preserves unicode characters', () => {
    expect(sanitizeString('café résumé')).toBe('café résumé');
  });

  it('preserves accented characters common in Colombian Spanish', () => {
    expect(sanitizeString('Alcaldía de Medellín')).toBe('Alcaldía de Medellín');
  });
});

// ---------------------------------------------------------------------------
// isValidPropietario
// ---------------------------------------------------------------------------
describe('isValidPropietario', () => {
  it('returns true for "alcaldía"', () => {
    expect(isValidPropietario('alcaldía')).toBe(true);
  });

  it('returns true for "alcaldia" (without accent)', () => {
    expect(isValidPropietario('alcaldia')).toBe(true);
  });

  it('returns true for "gobernación"', () => {
    expect(isValidPropietario('gobernación')).toBe(true);
  });

  it('returns true for "gobernacion" (without accent)', () => {
    expect(isValidPropietario('gobernacion')).toBe(true);
  });

  it('returns true for "metro"', () => {
    expect(isValidPropietario('metro')).toBe(true);
  });

  it('returns true for "inder"', () => {
    expect(isValidPropietario('inder')).toBe(true);
  });

  it('returns true for "hospital"', () => {
    expect(isValidPropietario('hospital')).toBe(true);
  });

  it('returns true for "universidad"', () => {
    expect(isValidPropietario('universidad')).toBe(true);
  });

  it('returns true for "secretaría"', () => {
    expect(isValidPropietario('secretaría')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isValidPropietario('ALCALDÍA')).toBe(true);
    expect(isValidPropietario('Metro')).toBe(true);
  });

  it('returns true for a string containing a valid keyword', () => {
    expect(isValidPropietario('Alcaldía de Medellín')).toBe(true);
  });

  it('returns true for a plain alphabetical string (regex fallback)', () => {
    expect(isValidPropietario('Juan Pérez')).toBe(true);
  });

  it('returns false for too short strings (less than 2 chars)', () => {
    expect(isValidPropietario('a')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidPropietario('')).toBe(false);
  });

  it('returns false for SQL injection attempt', () => {
    expect(isValidPropietario("'; DROP TABLE predios; --")).toBe(false);
  });

  it('returns false for strings exceeding 100 chars', () => {
    const long = 'a'.repeat(101);
    expect(isValidPropietario(long)).toBe(false);
  });

  it('trims whitespace before validating', () => {
    expect(isValidPropietario('  metro  ')).toBe(true);
  });
});

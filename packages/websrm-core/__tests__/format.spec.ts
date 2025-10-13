/**
 * Tests for format.ts - Pure formatting utilities
 */

import {
  formatAmount,
  toQuebecLocalIso,
  validateAscii,
  sanitizeAscii,
  validateLineItemsCount,
  validateSoftwareVersion,
  calculateGST,
  calculateQST,
  validateAmountsSum,
} from '../src/format';

describe('formatAmount', () => {
  it('should convert dollars to cents', () => {
    expect(formatAmount(12.99)).toBe(1299);
    expect(formatAmount(100.00)).toBe(10000);
    expect(formatAmount(0.50)).toBe(50);
  });

  it('should handle rounding correctly', () => {
    expect(formatAmount(0.005)).toBe(1); // Rounds up
    expect(formatAmount(0.004)).toBe(0); // Rounds down
    expect(formatAmount(12.995)).toBe(1300); // Rounds up
  });

  it('should handle negative amounts', () => {
    expect(formatAmount(-5.50)).toBe(-550);
    expect(formatAmount(-0.01)).toBe(-1);
  });

  it('should throw on invalid input', () => {
    expect(() => formatAmount(NaN)).toThrow();
    expect(() => formatAmount(Infinity)).toThrow();
  });
});

describe('toQuebecLocalIso', () => {
  it('should convert UTC to local time with offset', () => {
    const utc = '2025-01-06T14:30:00.000Z';
    const local = toQuebecLocalIso(utc);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/);
    expect(local).toBe('2025-01-06T09:30:00-05:00'); // 14:30 UTC - 5h = 09:30 EST
  });

  it('should throw on invalid input', () => {
    expect(() => toQuebecLocalIso('')).toThrow();
    expect(() => toQuebecLocalIso('invalid-date')).toThrow();
  });
});

describe('validateAscii', () => {
  it('should validate ASCII-only strings', () => {
    expect(validateAscii('Hello World')).toBe(true);
    expect(validateAscii('Pizza 123')).toBe(true);
    expect(validateAscii('Special chars: !@#$%^&*()')).toBe(true);
  });

  it('should reject non-ASCII characters', () => {
    expect(validateAscii('Café')).toBe(false); // é is not ASCII
    expect(validateAscii('Montréal')).toBe(false); // é is not ASCII
    expect(validateAscii('Pizza 🍕')).toBe(false); // emoji is not ASCII
  });

  it('should handle edge cases', () => {
    expect(validateAscii('')).toBe(true); // Empty string is valid
    expect(validateAscii('A')).toBe(true); // Single char
  });
});

describe('sanitizeAscii', () => {
  it('should replace accented characters', () => {
    expect(sanitizeAscii('Café')).toBe('Cafe');
    expect(sanitizeAscii('Montréal')).toBe('Montreal');
    expect(sanitizeAscii('Naïve')).toBe('Naive');
  });

  it('should remove non-replaceable characters', () => {
    expect(sanitizeAscii('Pizza 🍕')).toBe('Pizza ');
    expect(sanitizeAscii('Test 中文')).toBe('Test ');
  });

  it('should truncate to max length', () => {
    const longText = 'A'.repeat(300);
    expect(sanitizeAscii(longText, 255)).toHaveLength(255);
    expect(sanitizeAscii(longText, 50)).toHaveLength(50);
  });

  it('should handle empty strings', () => {
    expect(sanitizeAscii('')).toBe('');
  });
});

describe('validateLineItemsCount', () => {
  it('should validate line items array', () => {
    expect(validateLineItemsCount([{}])).toBe(true);
    expect(validateLineItemsCount(Array(100).fill({}))).toBe(true);
  });

  it('should reject empty arrays', () => {
    expect(validateLineItemsCount([])).toBe(false);
  });

  it('should reject too many items', () => {
    expect(validateLineItemsCount(Array(1001).fill({}))).toBe(false);
  });

  it('should reject non-arrays', () => {
    expect(validateLineItemsCount({} as any)).toBe(false);
    expect(validateLineItemsCount(null as any)).toBe(false);
  });
});

describe('validateSoftwareVersion', () => {
  it('should validate semver format', () => {
    expect(validateSoftwareVersion('1.0.0')).toBe(true);
    expect(validateSoftwareVersion('2.3.14')).toBe(true);
    expect(validateSoftwareVersion('0.0.1')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(validateSoftwareVersion('1.0')).toBe(false);
    expect(validateSoftwareVersion('v1.0.0')).toBe(false);
    expect(validateSoftwareVersion('1.0.0-beta')).toBe(false);
    expect(validateSoftwareVersion('abc')).toBe(false);
  });
});

describe('calculateGST', () => {
  it('should calculate 5% GST', () => {
    expect(calculateGST(100)).toBe(500); // $5.00
    expect(calculateGST(12.99)).toBe(65); // $0.6495 → $0.65
  });

  it('should handle zero subtotal', () => {
    expect(calculateGST(0)).toBe(0);
  });

  it('should throw on invalid input', () => {
    expect(() => calculateGST(-1)).toThrow();
    expect(() => calculateGST(NaN)).toThrow();
  });
});

describe('calculateQST', () => {
  it('should calculate 9.975% QST', () => {
    expect(calculateQST(100)).toBe(998); // $9.975 → $9.98
    expect(calculateQST(12.99)).toBe(130); // $1.296 → $1.30
  });

  it('should handle zero subtotal', () => {
    expect(calculateQST(0)).toBe(0);
  });

  it('should throw on invalid input', () => {
    expect(() => calculateQST(-1)).toThrow();
    expect(() => calculateQST(NaN)).toThrow();
  });
});

describe('validateAmountsSum', () => {
  it('should validate correct sum', () => {
    expect(validateAmountsSum(10000, 500, 998, 11498)).toBe(true);
    expect(validateAmountsSum(1299, 65, 130, 1494)).toBe(true);
  });

  it('should allow 1 cent tolerance', () => {
    expect(validateAmountsSum(10000, 500, 998, 11497)).toBe(true); // Off by 1 cent
    expect(validateAmountsSum(10000, 500, 998, 11499)).toBe(true); // Off by 1 cent
  });

  it('should reject incorrect sums', () => {
    expect(validateAmountsSum(10000, 500, 998, 11500)).toBe(false); // Off by 2 cents
    expect(validateAmountsSum(10000, 500, 998, 11000)).toBe(false); // Way off
  });

  it('should reject non-integers', () => {
    expect(validateAmountsSum(10000.5, 500, 998, 11498.5)).toBe(false);
  });
});

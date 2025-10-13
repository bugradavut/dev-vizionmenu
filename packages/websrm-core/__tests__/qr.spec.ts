/**
 * Tests for qr.ts - QR code generation
 */

import {
  buildReceiptQr,
  validateQrData,
  extractTransactionId,
  formatQrDataForDisplay,
} from '../src/qr';
import type { TransactionRegistrationResponse } from '../src/dto';

describe('buildReceiptQr', () => {
  const mockResponse: TransactionRegistrationResponse = {
    idTrans: 'order-123',
    idTransSrm: 'srm-456',
    codeQR: 'https://websrm.revenuquebec.ca/verify/abc123',
    dtConfirmation: '2025-01-06T14:30:00-05:00',
  };

  it('should use API-provided URL if available', () => {
    const qr = buildReceiptQr(mockResponse, { format: 'url' });
    expect(qr).toBe('https://websrm.revenuquebec.ca/verify/abc123');
  });

  it('should build JSON format', () => {
    const qr = buildReceiptQr(mockResponse, { format: 'json' });
    const parsed = JSON.parse(qr);

    expect(parsed.type).toBe('websrm-receipt');
    expect(parsed.transactionId).toBe('order-123');
    expect(parsed.srmId).toBe('srm-456');
    expect(parsed.timestamp).toBe('2025-01-06T14:30:00-05:00');
  });

  it('should build custom format', () => {
    const qr = buildReceiptQr(mockResponse, { format: 'custom' });
    expect(qr).toBe('SRM|order-123|srm-456|2025-01-06T14:30:00-05:00');
  });

  it('should include metadata when requested', () => {
    const qr = buildReceiptQr(mockResponse, {
      format: 'json',
      includeMetadata: true,
    });
    const parsed = JSON.parse(qr);

    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata.source).toBe('vizionmenu');
  });

  it('should throw on invalid response', () => {
    expect(() => buildReceiptQr({} as any, { format: 'url' })).toThrow();
  });
});

describe('validateQrData', () => {
  it('should validate valid QR data', () => {
    expect(validateQrData('https://websrm.revenuquebec.ca/verify/abc123')).toBe(true);
    expect(validateQrData('SRM|order-123|srm-456')).toBe(true);
  });

  it('should reject empty strings', () => {
    expect(validateQrData('')).toBe(false);
  });

  it('should reject too long strings', () => {
    const longString = 'x'.repeat(3000);
    expect(validateQrData(longString)).toBe(false);
  });

  it('should allow custom max length', () => {
    const string100 = 'x'.repeat(100);
    expect(validateQrData(string100, 50)).toBe(false);
    expect(validateQrData(string100, 100)).toBe(true);
    expect(validateQrData(string100, 200)).toBe(true);
  });
});

describe('extractTransactionId', () => {
  it('should extract from URL format', () => {
    const id = extractTransactionId('https://websrm.revenuquebec.ca/verify/abc123');
    expect(id).toBe('abc123');
  });

  it('should extract from JSON format', () => {
    const json = '{"transactionId":"order-123","srmId":"srm-456"}';
    const id = extractTransactionId(json);
    expect(id).toBe('order-123');
  });

  it('should extract from custom format', () => {
    const id = extractTransactionId('SRM|order-123|srm-456|timestamp');
    expect(id).toBe('order-123');
  });

  it('should return null for invalid data', () => {
    expect(extractTransactionId('')).toBeNull();
    expect(extractTransactionId('invalid-data')).toBeNull();
    expect(extractTransactionId('{invalid-json')).toBeNull();
  });
});

describe('formatQrDataForDisplay', () => {
  it('should truncate long strings', () => {
    const longUrl = 'https://websrm.revenuquebec.ca/verify/very-long-transaction-id-here';
    const formatted = formatQrDataForDisplay(longUrl, 30);

    expect(formatted).toHaveLength(30);
    expect(formatted).toMatch(/\.\.\.$/);
  });

  it('should not truncate short strings', () => {
    const shortUrl = 'https://websrm.ca/abc';
    const formatted = formatQrDataForDisplay(shortUrl, 50);

    expect(formatted).toBe(shortUrl);
  });

  it('should handle empty strings', () => {
    expect(formatQrDataForDisplay('')).toBe('');
  });
});

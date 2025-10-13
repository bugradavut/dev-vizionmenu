/**
 * Tests for header-provider.ts - HTTP header construction
 */

import {
  buildHeaders,
  buildCertificationRequest,
  generateRequestId,
  validateHeaderOptions,
} from '../src/header-provider';

describe('buildHeaders', () => {
  const validOptions = {
    certificationCode: 'CERT-12345',
    deviceId: 'POS-001',
    softwareVersion: '1.0.0',
    signature: 'abc123def456',
  };

  it('should build valid headers', () => {
    const headers = buildHeaders(validOptions);

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
    expect(headers['Authorization']).toBe('Bearer CERT-12345');
    expect(headers['X-Device-ID']).toBe('POS-001');
    expect(headers['X-Software-Version']).toBe('1.0.0');
    expect(headers['X-Signature']).toBe('abc123def456');
  });

  it('should include optional request ID', () => {
    const headers = buildHeaders({
      ...validOptions,
      requestId: 'req-123',
    });

    expect(headers['X-Request-ID']).toBe('req-123');
  });

  it('should throw on missing required fields', () => {
    expect(() =>
      buildHeaders({ ...validOptions, certificationCode: '' })
    ).toThrow('certificationCode');

    expect(() =>
      buildHeaders({ ...validOptions, deviceId: '' })
    ).toThrow('deviceId');

    expect(() =>
      buildHeaders({ ...validOptions, signature: '' })
    ).toThrow('signature');
  });

  it('should throw on invalid software version', () => {
    expect(() =>
      buildHeaders({ ...validOptions, softwareVersion: '1.0' })
    ).toThrow('softwareVersion');
  });
});

describe('buildCertificationRequest', () => {
  it('should build valid certification request', () => {
    const req = buildCertificationRequest('CERT-12345', 'POS-001', '1.0.0');

    expect(req).toEqual({
      certif: 'CERT-12345',
      idDisp: 'POS-001',
      versLog: '1.0.0',
    });
  });

  it('should throw on missing fields', () => {
    expect(() => buildCertificationRequest('', 'POS-001', '1.0.0')).toThrow();
    expect(() => buildCertificationRequest('CERT-12345', '', '1.0.0')).toThrow();
  });

  it('should throw on invalid version', () => {
    expect(() => buildCertificationRequest('CERT-12345', 'POS-001', '1.0')).toThrow();
  });
});

describe('generateRequestId', () => {
  it('should generate unique request IDs', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();

    expect(id1).toMatch(/^req-\d+-[a-z0-9]+$/);
    expect(id2).toMatch(/^req-\d+-[a-z0-9]+$/);
    expect(id1).not.toBe(id2); // Should be unique
  });
});

describe('validateHeaderOptions', () => {
  const validOptions = {
    certificationCode: 'CERT-12345',
    deviceId: 'POS-001',
    softwareVersion: '1.0.0',
    signature: 'abc123',
  };

  it('should validate valid options', () => {
    const result = validateHeaderOptions(validOptions);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should detect missing fields', () => {
    const result = validateHeaderOptions({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('certificationCode is required');
    expect(result.errors).toContain('deviceId is required');
    expect(result.errors).toContain('softwareVersion is required');
    expect(result.errors).toContain('signature is required');
  });

  it('should detect invalid software version', () => {
    const result = validateHeaderOptions({
      ...validOptions,
      softwareVersion: '1.0',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('softwareVersion'))).toBe(true);
  });
});

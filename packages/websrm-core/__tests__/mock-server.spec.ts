/**
 * WEB-SRM Mock Server Tests - Phase 7
 *
 * Purpose: Test client + mapper + worker with mock server
 * Scenarios: OK, DUPLICATE, INVALID_SIGNATURE, SERVER_ERROR, TIMEOUT
 */

import { postTransaction } from '../../../apps/api/services/websrm-adapter/websrm-client';
import { mapWebSrmError } from '../../../apps/api/services/websrm-adapter/error-mapper';

// Mock fetch globally
global.fetch = jest.fn();

describe('[WEB-SRM] Mock Server Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('HTTP Client', () => {
    it('should handle successful response (200 OK)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            idTrans: 'SRM-123456',
            status: 'accepted',
          }),
        headers: new Map([['content-type', 'application/json']]),
      });

      const response = await postTransaction(
        { baseUrl: 'http://localhost:3001', env: 'DEV' },
        '/transaction',
        '{"test":"data"}',
        { 'IDAPPRL': 'POS-001' }
      );

      expect(response.success).toBe(true);
      expect(response.httpStatus).toBe(200);
      expect(response.body.idTrans).toBe('SRM-123456');
    });

    it('should handle 409 Conflict (duplicate)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: async () =>
          JSON.stringify({
            code: 'DUPLICATE_TRANSACTION',
            message: 'Transaction already processed',
          }),
        headers: new Map([['content-type', 'application/json']]),
      });

      const response = await postTransaction(
        { baseUrl: 'http://localhost:3001', env: 'DEV' },
        '/transaction',
        '{"test":"data"}',
        { 'IDAPPRL': 'POS-001' }
      );

      expect(response.success).toBe(false);
      expect(response.httpStatus).toBe(409);
      expect(response.body.code).toBe('DUPLICATE_TRANSACTION');
    });

    it('should handle 400 Bad Request (invalid signature)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            code: 'INVALID_SIGNATURE',
            message: 'Signature verification failed',
          }),
        headers: new Map([['content-type', 'application/json']]),
      });

      const response = await postTransaction(
        { baseUrl: 'http://localhost:3001', env: 'DEV' },
        '/transaction',
        '{"test":"data"}',
        { 'IDAPPRL': 'POS-001' }
      );

      expect(response.success).toBe(false);
      expect(response.httpStatus).toBe(400);
    });

    it('should handle 500 Server Error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
        headers: new Map([['content-type', 'text/plain']]),
      });

      const response = await postTransaction(
        { baseUrl: 'http://localhost:3001', env: 'DEV' },
        '/transaction',
        '{"test":"data"}',
        { 'IDAPPRL': 'POS-001' }
      );

      expect(response.success).toBe(false);
      expect(response.httpStatus).toBe(500);
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        await new Promise((_, reject) =>
          setTimeout(() => reject({ name: 'AbortError' }), 100)
        );
      });

      const response = await postTransaction(
        { baseUrl: 'http://localhost:3001', env: 'DEV', timeout: 50 },
        '/transaction',
        '{"test":"data"}',
        { 'IDAPPRL': 'POS-001' }
      );

      expect(response.success).toBe(false);
      expect(response.httpStatus).toBe(0);
      expect(response.error?.code).toBe('TIMEOUT');
    });

    it('should handle network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Connection refused')
      );

      const response = await postTransaction(
        { baseUrl: 'http://localhost:3001', env: 'DEV' },
        '/transaction',
        '{"test":"data"}',
        { 'IDAPPRL': 'POS-001' }
      );

      expect(response.success).toBe(false);
      expect(response.httpStatus).toBe(0);
      expect(response.error?.code).toBe('NETWORK_ERROR');
    });
  });

  describe('Error Mapper', () => {
    it('should map 200 OK to OK code', () => {
      const error = mapWebSrmError({
        success: true,
        httpStatus: 200,
        body: { idTrans: 'SRM-123' },
      });

      expect(error.code).toBe('OK');
      expect(error.retryable).toBe(false);
    });

    it('should map 409 to DUPLICATE (non-retryable)', () => {
      const error = mapWebSrmError({
        success: false,
        httpStatus: 409,
        body: { code: 'DUPLICATE' },
      });

      expect(error.code).toBe('DUPLICATE');
      expect(error.retryable).toBe(false);
    });

    it('should map signature error to INVALID_SIGNATURE', () => {
      const error = mapWebSrmError({
        success: false,
        httpStatus: 400,
        body: { code: 'INVALID_SIGNATURE', message: 'Signature failed' },
      });

      expect(error.code).toBe('INVALID_SIGNATURE');
      expect(error.retryable).toBe(false);
    });

    it('should map 500 to TEMP_UNAVAILABLE (retryable)', () => {
      const error = mapWebSrmError({
        success: false,
        httpStatus: 500,
        body: 'Server error',
      });

      expect(error.code).toBe('TEMP_UNAVAILABLE');
      expect(error.retryable).toBe(true);
    });

    it('should map timeout to TEMP_UNAVAILABLE (retryable)', () => {
      const error = mapWebSrmError({
        success: false,
        httpStatus: 0,
        error: { code: 'TIMEOUT', message: 'Request timeout' },
      });

      expect(error.code).toBe('TEMP_UNAVAILABLE');
      expect(error.retryable).toBe(true);
    });

    it('should map 429 to RATE_LIMIT (retryable)', () => {
      const error = mapWebSrmError({
        success: false,
        httpStatus: 429,
        body: { message: 'Too many requests' },
      });

      expect(error.code).toBe('RATE_LIMIT');
      expect(error.retryable).toBe(true);
    });
  });
});

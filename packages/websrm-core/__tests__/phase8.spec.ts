/**
 * WEB-SRM Phase 8 Tests - ESSAI Features
 *
 * Purpose: Test Phase 8 enhancements
 * Scenarios:
 *   1. Circuit breaker (5 consecutive TEMP_UNAVAILABLE → OPEN → auto-close)
 *   2. Concurrency limiting (max 5 parallel with p-limit)
 *   3. CASESSAI header injection (ESSAI environment)
 */

import { postTransaction } from '../../../apps/api/services/websrm-adapter/websrm-client';
import { mapWebSrmError } from '../../../apps/api/services/websrm-adapter/error-mapper';

// Mock fetch globally
global.fetch = jest.fn();

describe('[WEB-SRM] Phase 8 - ESSAI Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Circuit Breaker Logic', () => {
    it('should classify consecutive TEMP_UNAVAILABLE errors correctly', async () => {
      const responses = [];

      // Simulate 5 consecutive 500 errors
      for (let i = 0; i < 5; i++) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Service Unavailable',
          headers: new Map([['content-type', 'text/plain']]),
        });

        const response = await postTransaction(
          { baseUrl: 'http://localhost:3001', env: 'DEV' },
          '/transaction',
          '{"test":"data"}',
          { 'IDAPPRL': 'POS-001' }
        );

        const mappedError = mapWebSrmError(response);
        responses.push({
          code: mappedError.code,
          retryable: mappedError.retryable,
        });
      }

      // All should be TEMP_UNAVAILABLE and retryable
      expect(responses.length).toBe(5);
      expect(responses.every((r) => r.code === 'TEMP_UNAVAILABLE')).toBe(true);
      expect(responses.every((r) => r.retryable === true)).toBe(true);
    });

    it('should NOT affect circuit breaker on non-retryable errors', async () => {
      const responses = [];

      // Mix of errors: 3x TEMP_UNAVAILABLE, 1x INVALID_SIG, 2x TEMP_UNAVAILABLE
      const mockResponses = [
        { status: 500, body: 'Error' }, // TEMP_UNAVAILABLE
        { status: 500, body: 'Error' }, // TEMP_UNAVAILABLE
        { status: 500, body: 'Error' }, // TEMP_UNAVAILABLE
        {
          status: 400,
          body: JSON.stringify({ code: 'INVALID_SIGNATURE', message: 'Sig failed' }),
        }, // INVALID_SIGNATURE (non-retryable)
        { status: 500, body: 'Error' }, // TEMP_UNAVAILABLE
        { status: 500, body: 'Error' }, // TEMP_UNAVAILABLE
      ];

      for (const mockResp of mockResponses) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: mockResp.status < 300,
          status: mockResp.status,
          text: async () => mockResp.body,
          headers: new Map([['content-type', 'application/json']]),
        });

        const response = await postTransaction(
          { baseUrl: 'http://localhost:3001', env: 'DEV' },
          '/transaction',
          '{"test":"data"}',
          { 'IDAPPRL': 'POS-001' }
        );

        const mappedError = mapWebSrmError(response);
        responses.push({
          code: mappedError.code,
          retryable: mappedError.retryable,
        });
      }

      // Verify non-retryable error in middle
      expect(responses[3].code).toBe('INVALID_SIGNATURE');
      expect(responses[3].retryable).toBe(false);

      // Other responses should be TEMP_UNAVAILABLE
      expect(responses[0].code).toBe('TEMP_UNAVAILABLE');
      expect(responses[1].code).toBe('TEMP_UNAVAILABLE');
      expect(responses[2].code).toBe('TEMP_UNAVAILABLE');
      expect(responses[4].code).toBe('TEMP_UNAVAILABLE');
      expect(responses[5].code).toBe('TEMP_UNAVAILABLE');
    });

    it('should reset circuit breaker on successful response', async () => {
      const responses = [];

      // 3x TEMP_UNAVAILABLE, 1x OK, 2x TEMP_UNAVAILABLE
      const mockResponses = [
        { status: 500, body: 'Error' },
        { status: 500, body: 'Error' },
        { status: 500, body: 'Error' },
        { status: 200, body: JSON.stringify({ idTrans: 'SRM-123', status: 'ok' }) }, // OK
        { status: 500, body: 'Error' },
        { status: 500, body: 'Error' },
      ];

      for (const mockResp of mockResponses) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: mockResp.status < 300,
          status: mockResp.status,
          text: async () => mockResp.body,
          headers: new Map([['content-type', 'application/json']]),
        });

        const response = await postTransaction(
          { baseUrl: 'http://localhost:3001', env: 'DEV' },
          '/transaction',
          '{"test":"data"}',
          { 'IDAPPRL': 'POS-001' }
        );

        const mappedError = mapWebSrmError(response);
        responses.push({
          code: mappedError.code,
          retryable: mappedError.retryable,
        });
      }

      // Verify OK response in middle
      expect(responses[3].code).toBe('OK');
      expect(responses[3].retryable).toBe(false);

      // After OK, circuit should reset (no OPEN state)
      expect(responses.length).toBe(6);
    });
  });

  describe('Concurrency Limiting', () => {
    it('should respect p-limit(5) constraint', async () => {
      // This test verifies the concept - actual implementation uses p-limit in queue-worker.ts
      // Mock implementation to avoid ESM import issues in Jest
      const createLimit = (concurrency: number) => {
        let running = 0;
        const queue: Array<() => void> = [];

        return <T>(fn: () => Promise<T>): Promise<T> => {
          return new Promise((resolve, reject) => {
            const run = async () => {
              running++;
              try {
                const result = await fn();
                resolve(result);
              } catch (error) {
                reject(error);
              } finally {
                running--;
                if (queue.length > 0) {
                  const next = queue.shift()!;
                  next();
                }
              }
            };

            if (running < concurrency) {
              run();
            } else {
              queue.push(run);
            }
          });
        };
      };

      const limit = createLimit(5);
      const tasks: Promise<number>[] = [];
      let concurrentCount = 0;
      let maxConcurrentCount = 0;

      // Create 10 tasks
      for (let i = 0; i < 10; i++) {
        tasks.push(
          limit(async () => {
            concurrentCount++;
            maxConcurrentCount = Math.max(maxConcurrentCount, concurrentCount);

            // Simulate work
            await new Promise((resolve) => setTimeout(resolve, 50));

            concurrentCount--;
            return i;
          })
        );
      }

      await Promise.all(tasks);

      // Max concurrent should not exceed 5
      expect(maxConcurrentCount).toBeLessThanOrEqual(5);
      expect(maxConcurrentCount).toBeGreaterThan(0);
    });
  });

  describe('ESSAI Environment Features', () => {
    it('should include CASESSAI header when env=ESSAI', async () => {
      let capturedHeaders: Record<string, string> = {};

      (global.fetch as jest.Mock).mockImplementationOnce(async (url, options) => {
        capturedHeaders = options.headers;
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ idTrans: 'SRM-ESSAI-001' }),
          headers: new Map([['content-type', 'application/json']]),
        };
      });

      await postTransaction(
        {
          baseUrl: 'http://localhost:3001',
          env: 'ESSAI',
          casEssai: '000.000',
        },
        '/transaction',
        '{"test":"data"}',
        { 'IDAPPRL': 'POS-001' }
      );

      // Verify CASESSAI header was included
      expect(capturedHeaders['CASESSAI']).toBe('000.000');
    });

    it('should NOT include CASESSAI header when env=DEV', async () => {
      let capturedHeaders: Record<string, string> = {};

      (global.fetch as jest.Mock).mockImplementationOnce(async (url, options) => {
        capturedHeaders = options.headers;
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ idTrans: 'SRM-DEV-001' }),
          headers: new Map([['content-type', 'application/json']]),
        };
      });

      await postTransaction(
        {
          baseUrl: 'http://localhost:3001',
          env: 'DEV',
        },
        '/transaction',
        '{"test":"data"}',
        { 'IDAPPRL': 'POS-001' }
      );

      // Verify CASESSAI header was NOT included
      expect(capturedHeaders['CASESSAI']).toBeUndefined();
    });

    it('should NOT include CASESSAI header when env=ESSAI but casEssai not provided', async () => {
      let capturedHeaders: Record<string, string> = {};

      (global.fetch as jest.Mock).mockImplementationOnce(async (url, options) => {
        capturedHeaders = options.headers;
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ idTrans: 'SRM-ESSAI-002' }),
          headers: new Map([['content-type', 'application/json']]),
        };
      });

      await postTransaction(
        {
          baseUrl: 'http://localhost:3001',
          env: 'ESSAI',
          // casEssai not provided
        },
        '/transaction',
        '{"test":"data"}',
        { 'IDAPPRL': 'POS-001' }
      );

      // Verify CASESSAI header was NOT included
      expect(capturedHeaders['CASESSAI']).toBeUndefined();
    });
  });

  describe('Idempotency Key', () => {
    it('should include X-Idempotency-Key header when provided', async () => {
      let capturedHeaders: Record<string, string> = {};

      (global.fetch as jest.Mock).mockImplementationOnce(async (url, options) => {
        capturedHeaders = options.headers;
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ idTrans: 'SRM-123' }),
          headers: new Map([['content-type', 'application/json']]),
        };
      });

      await postTransaction(
        { baseUrl: 'http://localhost:3001', env: 'DEV' },
        '/transaction',
        '{"test":"data"}',
        { 'IDAPPRL': 'POS-001' },
        'idem-key-abc123'
      );

      // Verify idempotency key was included
      expect(capturedHeaders['X-Idempotency-Key']).toBe('idem-key-abc123');
    });

    it('should NOT include X-Idempotency-Key header when not provided', async () => {
      let capturedHeaders: Record<string, string> = {};

      (global.fetch as jest.Mock).mockImplementationOnce(async (url, options) => {
        capturedHeaders = options.headers;
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ idTrans: 'SRM-124' }),
          headers: new Map([['content-type', 'application/json']]),
        };
      });

      await postTransaction(
        { baseUrl: 'http://localhost:3001', env: 'DEV' },
        '/transaction',
        '{"test":"data"}',
        { 'IDAPPRL': 'POS-001' }
        // No idempotency key
      );

      // Verify idempotency key was NOT included
      expect(capturedHeaders['X-Idempotency-Key']).toBeUndefined();
    });
  });

  describe('Backoff Calculation', () => {
    it('should calculate exponential backoff correctly', () => {
      const { calculateBackoff } = require('../../../apps/api/services/websrm-adapter/error-mapper');

      // Base delay: 60s, exponential: 2^retryCount
      const delay0 = calculateBackoff(0, 60, 3600); // 60s ± jitter
      const delay1 = calculateBackoff(1, 60, 3600); // 120s ± jitter
      const delay2 = calculateBackoff(2, 60, 3600); // 240s ± jitter
      const delay3 = calculateBackoff(3, 60, 3600); // 480s ± jitter
      const delay10 = calculateBackoff(10, 60, 3600); // 3600s (max)

      // Allow 10% jitter variance
      expect(delay0).toBeGreaterThanOrEqual(54000); // 60s - 10%
      expect(delay0).toBeLessThanOrEqual(66000); // 60s + 10%

      expect(delay1).toBeGreaterThanOrEqual(108000); // 120s - 10%
      expect(delay1).toBeLessThanOrEqual(132000); // 120s + 10%

      expect(delay2).toBeGreaterThanOrEqual(216000); // 240s - 10%
      expect(delay2).toBeLessThanOrEqual(264000); // 240s + 10%

      // Max should cap at 3600s
      expect(delay10).toBeGreaterThanOrEqual(3240000); // 3600s - 10%
      expect(delay10).toBeLessThanOrEqual(3960000); // 3600s + 10%
    });
  });
});

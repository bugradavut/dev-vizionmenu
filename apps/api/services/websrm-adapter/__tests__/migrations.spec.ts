/**
 * WEB-SRM Migration Tests - Phase 5.5
 *
 * CRITICAL: Offline testing ONLY with pg-mem
 * - NO real database access
 * - Tests run against in-memory PostgreSQL
 * - Validates schema, constraints, and data integrity
 *
 * Security:
 * - DB_WRITE_BLOCK=true prevents accidental real DB access
 * - All tests use pg-mem (in-memory PostgreSQL)
 * - Migration file is tested but NOT applied to real database
 *
 * Tests:
 * - UP migration: Create tables, enums, functions, triggers
 * - DOWN migration: Clean up in reverse order
 * - Schema constraints: Validate regex patterns, check constraints
 * - Data validation: Test valid and invalid insertions
 * - Unique constraints: Verify multi-tenancy isolation
 */

import { newDb, IMemoryDb } from 'pg-mem';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('WEB-SRM Migration - Phase 5.5 (Offline)', () => {
  let db: IMemoryDb;

  beforeAll(() => {
    // Verify DB_WRITE_BLOCK is active (security check)
    if (process.env.DB_WRITE_BLOCK === 'true') {
      console.log('✅ [SECURITY] DB write block is ACTIVE - offline testing only');
    }
  });

  beforeEach(() => {
    // Create fresh in-memory database for each test
    db = newDb();
  });

  // Helper to run migration SQL
  const runMigration = (section: 'up' | 'down') => {
    const migrationPath = join(__dirname, '../../../../packages/db/migrations/20251007_websrm.sql');
    const migrationSql = readFileSync(migrationPath, 'utf8');

    // Extract UP or DOWN section
    const upMatch = migrationSql.match(/-- UP Migration\s*--\s*=+\s*([\s\S]*?)--\s*=+\s*-- DOWN Migration/);
    const downMatch = migrationSql.match(/-- DOWN Migration\s*--\s*=+\s*([\s\S]*?)--\s*=+\s*-- End of Migration/);

    if (section === 'up' && upMatch) {
      db.public.none(upMatch[1]);
    } else if (section === 'down' && downMatch) {
      db.public.none(downMatch[1]);
    } else {
      throw new Error(`Failed to extract ${section.toUpperCase()} migration section`);
    }
  };

  describe('UP Migration', () => {
    it('should create websrm_queue_status enum', () => {
      runMigration('up');

      const result = db.public.many(`
        SELECT enumlabel
        FROM pg_enum
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
        WHERE pg_type.typname = 'websrm_queue_status'
        ORDER BY enumlabel;
      `);

      expect(result).toHaveLength(5);
      expect(result.map((r: any) => r.enumlabel)).toEqual([
        'cancelled',
        'completed',
        'failed',
        'pending',
        'processing',
      ]);
    });

    it('should create set_updated_at() function', () => {
      runMigration('up');

      const result = db.public.one(`
        SELECT proname, prosrc
        FROM pg_proc
        WHERE proname = 'set_updated_at';
      `);

      expect(result.proname).toBe('set_updated_at');
      expect(result.prosrc).toContain('NEW.updated_at = NOW()');
    });

    it('should create receipts table with all columns', () => {
      runMigration('up');

      const columns = db.public.many(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'receipts'
        ORDER BY ordinal_position;
      `);

      expect(columns).toContainEqual(
        expect.objectContaining({ column_name: 'id', data_type: 'uuid' })
      );
      expect(columns).toContainEqual(
        expect.objectContaining({ column_name: 'tenant_id', data_type: 'uuid', is_nullable: 'NO' })
      );
      expect(columns).toContainEqual(
        expect.objectContaining({ column_name: 'order_id', data_type: 'uuid', is_nullable: 'NO' })
      );
      expect(columns).toContainEqual(
        expect.objectContaining({ column_name: 'signa_preced', data_type: 'text', is_nullable: 'NO' })
      );
      expect(columns).toContainEqual(
        expect.objectContaining({ column_name: 'signa_actu', data_type: 'text', is_nullable: 'NO' })
      );
      expect(columns).toContainEqual(
        expect.objectContaining({ column_name: 'payload_hash', data_type: 'text', is_nullable: 'NO' })
      );
    });

    it('should create websrm_transaction_queue table with queue_status enum', () => {
      runMigration('up');

      const statusColumn = db.public.one(`
        SELECT column_name, udt_name
        FROM information_schema.columns
        WHERE table_name = 'websrm_transaction_queue' AND column_name = 'status';
      `);

      expect(statusColumn.udt_name).toBe('websrm_queue_status');
    });

    it('should create websrm_audit_log table', () => {
      runMigration('up');

      const columns = db.public.many(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'websrm_audit_log'
        ORDER BY ordinal_position;
      `);

      expect(columns).toContainEqual(
        expect.objectContaining({ column_name: 'operation', data_type: 'text' })
      );
      expect(columns).toContainEqual(
        expect.objectContaining({ column_name: 'request_body_hash', data_type: 'text' })
      );
      expect(columns).toContainEqual(
        expect.objectContaining({ column_name: 'response_body_hash', data_type: 'text' })
      );
    });

    it('should create indexes for receipts table', () => {
      runMigration('up');

      const indexes = db.public.many(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'receipts';
      `);

      expect(indexes.map((i: any) => i.indexname)).toContain('idx_receipts_tenant_order');
      expect(indexes.map((i: any) => i.indexname)).toContain('idx_receipts_tenant_created');
      expect(indexes.map((i: any) => i.indexname)).toContain('idx_receipts_websrm_txn');
      expect(indexes.map((i: any) => i.indexname)).toContain('idx_receipts_tenant_timestamp');
    });
  });

  describe('Schema Constraints - receipts', () => {
    beforeEach(() => {
      runMigration('up');
    });

    it('should accept valid 88-character Base64 signature', () => {
      const validSignature = 'A'.repeat(86) + '=='; // 88 chars total
      const validHash = 'a'.repeat(64);

      expect(() => {
        db.public.none(`
          INSERT INTO receipts (
            tenant_id, order_id, transaction_timestamp, format, print_mode,
            signa_preced, signa_actu, payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), NOW(), 'fiscal', 'auto',
            '${validSignature}', '${validSignature}', '${validHash}'
          );
        `);
      }).not.toThrow();
    });

    it('should reject signature with 87 characters (too short)', () => {
      const invalidSignature = 'A'.repeat(87);

      expect(() => {
        db.public.none(`
          INSERT INTO receipts (
            tenant_id, order_id, transaction_timestamp, format, print_mode,
            signa_preced, signa_actu, payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), NOW(), 'fiscal', 'auto',
            $1, $2, $3
          );
        `, [invalidSignature, invalidSignature, 'a'.repeat(64)]);
      }).toThrow();
    });

    it('should reject signature with 89 characters (too long)', () => {
      const invalidSignature = 'A'.repeat(89);

      expect(() => {
        db.public.none(`
          INSERT INTO receipts (
            tenant_id, order_id, transaction_timestamp, format, print_mode,
            signa_preced, signa_actu, payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), NOW(), 'fiscal', 'auto',
            $1, $2, $3
          );
        `, [invalidSignature, invalidSignature, 'a'.repeat(64)]);
      }).toThrow();
    });

    it('should reject signature with invalid Base64 characters', () => {
      const invalidSignature = '@'.repeat(88); // @ is not valid Base64

      expect(() => {
        db.public.none(`
          INSERT INTO receipts (
            tenant_id, order_id, transaction_timestamp, format, print_mode,
            signa_preced, signa_actu, payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), NOW(), 'fiscal', 'auto',
            $1, $2, $3
          );
        `, [invalidSignature, invalidSignature, 'a'.repeat(64)]);
      }).toThrow();
    });

    it('should accept valid 64-character SHA-256 hash (lowercase hex)', () => {
      const validHash = 'a'.repeat(64);

      expect(() => {
        db.public.none(`
          INSERT INTO receipts (
            tenant_id, order_id, transaction_timestamp, format, print_mode,
            signa_preced, signa_actu, payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), NOW(), 'fiscal', 'auto',
            $1, $2, $3
          );
        `, ['A'.repeat(86) + '==', 'A'.repeat(86) + '==', validHash]);
      }).not.toThrow();
    });

    it('should reject hash with 63 characters (too short)', () => {
      const invalidHash = 'a'.repeat(63);

      expect(() => {
        db.public.none(`
          INSERT INTO receipts (
            tenant_id, order_id, transaction_timestamp, format, print_mode,
            signa_preced, signa_actu, payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), NOW(), 'fiscal', 'auto',
            $1, $2, $3
          );
        `, ['A'.repeat(86) + '==', 'A'.repeat(86) + '==', invalidHash]);
      }).toThrow();
    });

    it('should reject hash with uppercase hex (must be lowercase)', () => {
      const invalidHash = 'A'.repeat(64); // Uppercase not allowed

      expect(() => {
        db.public.none(`
          INSERT INTO receipts (
            tenant_id, order_id, transaction_timestamp, format, print_mode,
            signa_preced, signa_actu, payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), NOW(), 'fiscal', 'auto',
            $1, $2, $3
          );
        `, ['A'.repeat(86) + '==', 'A'.repeat(86) + '==', invalidHash]);
      }).toThrow();
    });

    it('should enforce unique constraint on (tenant_id, order_id, format, print_mode)', () => {
      const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const orderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

      // Insert first record
      db.public.none(`
        INSERT INTO receipts (
          tenant_id, order_id, transaction_timestamp, format, print_mode,
          signa_preced, signa_actu, payload_hash
        ) VALUES (
          $1, $2, NOW(), 'fiscal', 'auto',
          $3, $4, $5
        );
      `, [tenantId, orderId, 'A'.repeat(86) + '==', 'B'.repeat(86) + '==', 'a'.repeat(64)]);

      // Try to insert duplicate - should fail
      expect(() => {
        db.public.none(`
          INSERT INTO receipts (
            tenant_id, order_id, transaction_timestamp, format, print_mode,
            signa_preced, signa_actu, payload_hash
          ) VALUES (
            $1, $2, NOW(), 'fiscal', 'auto',
            $3, $4, $5
          );
        `, [tenantId, orderId, 'C'.repeat(86) + '==', 'D'.repeat(86) + '==', 'b'.repeat(64)]);
      }).toThrow(/unique|duplicate/i);
    });
  });

  describe('Schema Constraints - websrm_transaction_queue', () => {
    beforeEach(() => {
      runMigration('up');
    });

    it('should accept valid queue status enum value', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO websrm_transaction_queue (
            tenant_id, order_id, status, canonical_payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), 'pending', $1
          );
        `, ['a'.repeat(64)]);
      }).not.toThrow();
    });

    it('should reject invalid queue status enum value', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO websrm_transaction_queue (
            tenant_id, order_id, status, canonical_payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), 'invalid_status', $1
          );
        `, ['a'.repeat(64)]);
      }).toThrow();
    });

    it('should enforce retry_count between 0 and 20', () => {
      // Valid: retry_count = 0
      expect(() => {
        db.public.none(`
          INSERT INTO websrm_transaction_queue (
            tenant_id, order_id, retry_count, canonical_payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), 0, $1
          );
        `, ['a'.repeat(64)]);
      }).not.toThrow();

      // Valid: retry_count = 20
      expect(() => {
        db.public.none(`
          INSERT INTO websrm_transaction_queue (
            tenant_id, order_id, retry_count, canonical_payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), 20, $1
          );
        `, ['b'.repeat(64)]);
      }).not.toThrow();

      // Invalid: retry_count = 21
      expect(() => {
        db.public.none(`
          INSERT INTO websrm_transaction_queue (
            tenant_id, order_id, retry_count, canonical_payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), 21, $1
          );
        `, ['c'.repeat(64)]);
      }).toThrow(/check|constraint/i);

      // Invalid: retry_count = -1
      expect(() => {
        db.public.none(`
          INSERT INTO websrm_transaction_queue (
            tenant_id, order_id, retry_count, canonical_payload_hash
          ) VALUES (
            gen_random_uuid(), gen_random_uuid(), -1, $1
          );
        `, ['d'.repeat(64)]);
      }).toThrow(/check|constraint/i);
    });

    it('should enforce unique constraint on (tenant_id, order_id)', () => {
      const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const orderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

      // Insert first record
      db.public.none(`
        INSERT INTO websrm_transaction_queue (
          tenant_id, order_id, canonical_payload_hash
        ) VALUES (
          $1, $2, $3
        );
      `, [tenantId, orderId, 'a'.repeat(64)]);

      // Try to insert duplicate - should fail
      expect(() => {
        db.public.none(`
          INSERT INTO websrm_transaction_queue (
            tenant_id, order_id, canonical_payload_hash
          ) VALUES (
            $1, $2, $3
          );
        `, [tenantId, orderId, 'b'.repeat(64)]);
      }).toThrow(/unique|duplicate/i);
    });
  });

  describe('Schema Constraints - websrm_audit_log', () => {
    beforeEach(() => {
      runMigration('up');
    });

    it('should accept valid audit log entry with all fields', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO websrm_audit_log (
            tenant_id, operation, request_method, request_path,
            request_body_hash, request_signature,
            response_status, response_body_hash
          ) VALUES (
            gen_random_uuid(), 'transaction', 'POST', '/transaction',
            $1, $2, 200, $3
          );
        `, ['a'.repeat(64), 'A'.repeat(86) + '==', 'b'.repeat(64)]);
      }).not.toThrow();
    });

    it('should reject request_body_hash with invalid length', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO websrm_audit_log (
            tenant_id, operation, request_method, request_path,
            request_body_hash
          ) VALUES (
            gen_random_uuid(), 'transaction', 'POST', '/transaction',
            $1
          );
        `, ['a'.repeat(63)]); // Too short
      }).toThrow();
    });

    it('should allow NULL for optional fields', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO websrm_audit_log (
            tenant_id, operation, request_method, request_path
          ) VALUES (
            gen_random_uuid(), 'status_check', 'GET', '/status'
          );
        `);
      }).not.toThrow();
    });
  });

  describe('DOWN Migration', () => {
    beforeEach(() => {
      runMigration('up');
    });

    it('should drop all tables', () => {
      runMigration('down');

      const tables = db.public.many(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name IN ('receipts', 'websrm_transaction_queue', 'websrm_audit_log');
      `);

      expect(tables).toHaveLength(0);
    });

    it('should drop set_updated_at() function', () => {
      runMigration('down');

      const functions = db.public.many(`
        SELECT proname
        FROM pg_proc
        WHERE proname = 'set_updated_at';
      `);

      expect(functions).toHaveLength(0);
    });

    it('should drop websrm_queue_status enum', () => {
      runMigration('down');

      const enums = db.public.many(`
        SELECT typname
        FROM pg_type
        WHERE typname = 'websrm_queue_status';
      `);

      expect(enums).toHaveLength(0);
    });
  });

  describe('Integration - Multi-tenancy', () => {
    beforeEach(() => {
      runMigration('up');
    });

    it('should allow same order_id for different tenants in receipts', () => {
      const tenant1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const tenant2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      const orderId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

      // Insert for tenant1
      db.public.none(`
        INSERT INTO receipts (
          tenant_id, order_id, transaction_timestamp, format, print_mode,
          signa_preced, signa_actu, payload_hash
        ) VALUES (
          $1, $2, NOW(), 'fiscal', 'auto',
          $3, $4, $5
        );
      `, [tenant1, orderId, 'A'.repeat(86) + '==', 'B'.repeat(86) + '==', 'a'.repeat(64)]);

      // Insert for tenant2 (same order_id) - should succeed
      expect(() => {
        db.public.none(`
          INSERT INTO receipts (
            tenant_id, order_id, transaction_timestamp, format, print_mode,
            signa_preced, signa_actu, payload_hash
          ) VALUES (
            $1, $2, NOW(), 'fiscal', 'auto',
            $3, $4, $5
          );
        `, [tenant2, orderId, 'C'.repeat(86) + '==', 'D'.repeat(86) + '==', 'b'.repeat(64)]);
      }).not.toThrow();
    });
  });
});

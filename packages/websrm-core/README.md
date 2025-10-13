# @vizionmenu/websrm-core

Pure TypeScript library for Québec WEB-SRM fiscal compliance.

## Overview

This package provides type-safe enums, DTOs, and pure utility functions for integrating with Québec's WEB-SRM fiscal registry system (SW-73, SW-77, SW-78, SW-79).

**Key Features:**
- ✅ **Pure Functions**: No side effects, deterministic output
- ✅ **Zero Runtime Dependencies**: Standalone, no external libs
- ✅ **Type-Safe**: Full TypeScript support with strict types
- ✅ **Well-Tested**: Comprehensive test coverage
- ✅ **Stub-Ready**: Includes TODOs for runtime integration

## Installation

```bash
pnpm install
pnpm build
```

## Usage

```typescript
import {
  formatAmount,
  mapOrderToReqTrans,
  buildHeaders,
  ActionType,
  ServiceType,
} from '@vizionmenu/websrm-core';

// Convert dollars to cents
const cents = formatAmount(12.99); // => 1299

// Map order to WEB-SRM transaction request
const request = mapOrderToReqTrans(order, signature);

// Build HTTP headers
const headers = buildHeaders({
  certificationCode: 'CERT-12345',
  deviceId: 'POS-001',
  softwareVersion: '1.0.0',
  signature: 'abc123',
});
```

## Modules

### Enums (`enums.ts`)
- `ActionType`: ENR, ANN, MOD
- `ServiceType`: REST, LIV
- `TransactionType`: VEN, REM
- `PrintMode`: ELE, PAP, AUC
- `PaymentMode`: CARTE, COMPTANT, DEBIT, etc.
- `WEBSRM_CONSTANTS`: GST/QST rates, max lengths, etc.

### DTOs (`dto.ts`)
- `TransactionRequest`: Full WEB-SRM transaction payload
- `WebSrmResponse`: API response structure
- `OrderShape`: Internal order representation (to be customized)

### Format Utilities (`format.ts`)
- `formatAmount(amount)`: Convert dollars to cents
- `toQuebecLocalIso(utc)`: Convert UTC to local time with offset
- `sanitizeAscii(text)`: Remove non-ASCII characters
- `calculateGST(subtotal)`: Calculate 5% GST
- `calculateQST(subtotal)`: Calculate 9.975% QST

### Signature (`signature.ts`)
- `computeSignaTransm(payload, options)`: **STUB** - Digital signature generation
- `verifySignature(payload, signature, options)`: **STUB** - Signature verification

### Header Provider (`header-provider.ts`)
- `buildHeaders(options)`: Build HTTP headers for WEB-SRM API
- `buildCertificationRequest(...)`: Build certification payload

### QR Code (`qr.ts`)
- `buildReceiptQr(response, options)`: **STUB** - Generate QR code data
- `extractTransactionId(qrData)`: Extract transaction ID from QR

### Field Mapper (`field-mapper.ts`)
- `mapOrderToReqTrans(order, signature)`: **STUB** - Map order to WEB-SRM request

## Testing

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

## TODOs

### High Priority
- [ ] Wire in real HMAC-SHA256 signature in `signature.ts` (use Node.js `crypto` or Web Crypto API)
- [ ] Fix timezone conversion in `toQuebecLocalIso` to handle DST (use `moment-timezone` or `date-fns-tz`)
- [ ] Update `OrderShape` in `dto.ts` to match actual database schema

### Medium Priority
- [ ] Implement real QR code format based on WEB-SRM spec
- [ ] Add comprehensive validation in `field-mapper.ts` (amounts sum, line items)
- [ ] Add ECDSA signature support for future use

### Low Priority
- [ ] Add more test cases for edge cases
- [ ] Document canonical payload format for signatures
- [ ] Add examples for each module

## Contributing

This package is **pure code only** - no runtime imports, no network calls, no database access.

When adding new functions:
1. Keep them pure (no side effects)
2. Make them deterministic (same input → same output)
3. Add type definitions
4. Write tests
5. Add TODOs for runtime integration

## License

UNLICENSED - Private package for VizionMenu

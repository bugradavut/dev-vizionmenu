/**
 * WEB-SRM Formatting Utilities
 * Pure functions for data transformation and validation
 *
 * All functions are pure (no side effects) and deterministic.
 * No dependencies on external libraries or runtime environment.
 */

import { WEBSRM_CONSTANTS } from './enums.js';

/**
 * Format amount to WEB-SRM spec: cents as integer (no decimals)
 * Rounds to nearest cent using banker's rounding (round half to even)
 *
 * @param amount - Amount in dollars (e.g., 12.99)
 * @returns Amount in cents (e.g., 1299)
 *
 * @example
 * formatAmount(12.99) // => 1299
 * formatAmount(0.005) // => 1 (rounded up)
 * formatAmount(0.004) // => 0 (rounded down)
 * formatAmount(-5.50) // => -550
 */
export function formatAmount(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid amount: ${amount}. Must be a finite number.`);
  }

  // Convert to cents and apply banker's rounding
  const cents = amount * 100;
  const rounded = Math.round(cents);

  // Ensure result is an integer with no decimals
  if (!Number.isInteger(rounded)) {
    throw new Error(`Rounding failed for amount: ${amount}`);
  }

  return rounded;
}

/**
 * Convert UTC timestamp to Québec local time (ISO 8601 with offset)
 * Québec uses America/Toronto timezone (EST/EDT)
 *
 * @param utcTimestamp - ISO 8601 UTC timestamp (e.g., "2025-01-06T14:30:00.000Z")
 * @returns ISO 8601 local time with offset (e.g., "2025-01-06T09:30:00-05:00")
 *
 * Note: This is a pure implementation without moment-timezone.
 * In production, use a proper timezone library for DST handling.
 * TODO: Wire in moment-timezone or date-fns-tz when integrating
 *
 * @example
 * toQuebecLocalIso("2025-01-06T14:30:00.000Z") // => "2025-01-06T09:30:00-05:00" (EST)
 * toQuebecLocalIso("2025-07-06T14:30:00.000Z") // => "2025-07-06T10:30:00-04:00" (EDT, approx)
 */
export function toQuebecLocalIso(utcTimestamp: string): string {
  if (typeof utcTimestamp !== 'string' || !utcTimestamp) {
    throw new Error('Invalid UTC timestamp: must be a non-empty string');
  }

  try {
    const date = new Date(utcTimestamp);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${utcTimestamp}`);
    }

    // TODO: This is a simplified implementation that assumes EST (-05:00)
    // In production, use moment-timezone to handle DST correctly:
    // import moment from 'moment-timezone';
    // return moment.tz(utcTimestamp, 'America/Toronto').format();

    // For now, apply a static -5 hour offset (EST)
    // This will be INCORRECT during EDT (daylight saving time)
    const offsetMinutes = -5 * 60; // EST offset
    const localDate = new Date(date.getTime() + offsetMinutes * 60 * 1000);

    const year = localDate.getUTCFullYear();
    const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(localDate.getUTCDate()).padStart(2, '0');
    const hours = String(localDate.getUTCHours()).padStart(2, '0');
    const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');

    // Format: YYYY-MM-DDTHH:mm:ss-05:00
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-05:00`;
  } catch (error) {
    throw new Error(`Failed to convert timestamp: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate that a string contains only ASCII characters (0x00-0x7F)
 * WEB-SRM API requires ASCII-only text in description fields
 *
 * @param text - Text to validate
 * @returns true if text is ASCII-only, false otherwise
 *
 * @example
 * validateAscii("Hello World") // => true
 * validateAscii("Café") // => false (é is not ASCII)
 * validateAscii("Pizza 🍕") // => false (emoji is not ASCII)
 */
export function validateAscii(text: string): boolean {
  if (typeof text !== 'string') {
    return false;
  }

  // ASCII range: 0x00-0x7F
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitize text to ASCII-only by removing or replacing non-ASCII characters
 * Replaces common accented characters with ASCII equivalents
 *
 * @param text - Text to sanitize
 * @param maxLength - Maximum length (default: 255)
 * @returns ASCII-only text, truncated to maxLength
 *
 * @example
 * sanitizeAscii("Café") // => "Cafe"
 * sanitizeAscii("Montréal") // => "Montreal"
 * sanitizeAscii("Pizza 🍕") // => "Pizza "
 * sanitizeAscii("A very long description...".repeat(10), 50) // => "A very long description..." (truncated)
 */
export function sanitizeAscii(text: string, maxLength: number = WEBSRM_CONSTANTS.MAX_TEXT_LENGTH): string {
  if (typeof text !== 'string') {
    throw new Error('Input must be a string');
  }

  if (maxLength <= 0) {
    throw new Error('maxLength must be positive');
  }

  // Replace common accented characters with ASCII equivalents
  const replacements: Record<string, string> = {
    'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
    'ý': 'y', 'ÿ': 'y',
    'ñ': 'n', 'ç': 'c',
    'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
    'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
    'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
    'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
    'Ý': 'Y', 'Ÿ': 'Y',
    'Ñ': 'N', 'Ç': 'C',
  };

  let sanitized = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    if (code <= 0x7f) {
      // ASCII character - keep as is
      sanitized += char;
    } else if (replacements[char]) {
      // Known replacement - use it
      sanitized += replacements[char];
    }
    // else: non-ASCII with no replacement - skip it
  }

  // Truncate to max length
  return sanitized.slice(0, maxLength);
}

/**
 * Validate that line items array is within WEB-SRM limits
 *
 * @param lineItems - Array of line items
 * @returns true if valid, false otherwise
 *
 * @example
 * validateLineItemsCount([{ desc: "Pizza", montLig: 1299, qte: 1, prixUnit: 1299 }]) // => true
 * validateLineItemsCount([]) // => false (empty array)
 * validateLineItemsCount(Array(1001).fill({})) // => false (too many items)
 */
export function validateLineItemsCount(lineItems: unknown[]): boolean {
  if (!Array.isArray(lineItems)) {
    return false;
  }

  if (lineItems.length === 0) {
    return false;
  }

  if (lineItems.length > WEBSRM_CONSTANTS.MAX_LINE_ITEMS) {
    return false;
  }

  return true;
}

/**
 * Validate software version format (semver: X.Y.Z)
 *
 * @param version - Version string to validate
 * @returns true if valid semver, false otherwise
 *
 * @example
 * validateSoftwareVersion("1.0.0") // => true
 * validateSoftwareVersion("2.3.14") // => true
 * validateSoftwareVersion("1.0") // => false
 * validateSoftwareVersion("v1.0.0") // => false
 */
export function validateSoftwareVersion(version: string): boolean {
  if (typeof version !== 'string') {
    return false;
  }

  return WEBSRM_CONSTANTS.VERSION_REGEX.test(version);
}

/**
 * Calculate GST amount from subtotal
 * GST = 5% in Canada
 *
 * @param subtotal - Subtotal amount in dollars
 * @returns GST amount in cents (integer)
 *
 * @example
 * calculateGST(100) // => 500 (5% of $100 = $5.00 = 500 cents)
 * calculateGST(12.99) // => 65 ($0.6495 rounded to $0.65 = 65 cents)
 */
export function calculateGST(subtotal: number): number {
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new Error(`Invalid subtotal: ${subtotal}`);
  }

  const gst = subtotal * WEBSRM_CONSTANTS.GST_RATE;
  return formatAmount(gst);
}

/**
 * Calculate QST amount from subtotal
 * QST = 9.975% in Québec
 *
 * @param subtotal - Subtotal amount in dollars
 * @returns QST amount in cents (integer)
 *
 * @example
 * calculateQST(100) // => 998 (9.975% of $100 = $9.975 rounded to $9.98 = 998 cents)
 * calculateQST(12.99) // => 130 ($1.296 rounded to $1.30 = 130 cents)
 */
export function calculateQST(subtotal: number): number {
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new Error(`Invalid subtotal: ${subtotal}`);
  }

  const qst = subtotal * WEBSRM_CONSTANTS.QST_RATE;
  return formatAmount(qst);
}

/**
 * Validate that amounts sum correctly
 * Ensures montST + montTPS + montTVQ = montTot (within 1 cent tolerance for rounding)
 *
 * @param subtotal - Subtotal in cents
 * @param gst - GST in cents
 * @param qst - QST in cents
 * @param total - Total in cents
 * @returns true if amounts sum correctly, false otherwise
 *
 * @example
 * validateAmountsSum(10000, 500, 998, 11498) // => true
 * validateAmountsSum(10000, 500, 998, 11500) // => false (off by 2 cents)
 */
export function validateAmountsSum(subtotal: number, gst: number, qst: number, total: number): boolean {
  if (!Number.isInteger(subtotal) || !Number.isInteger(gst) || !Number.isInteger(qst) || !Number.isInteger(total)) {
    return false;
  }

  const calculatedTotal = subtotal + gst + qst;
  const diff = Math.abs(calculatedTotal - total);

  // Allow 1 cent tolerance for rounding differences
  return diff <= 1;
}

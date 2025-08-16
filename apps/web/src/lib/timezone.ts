/**
 * Timezone Utilities for Vision Menu - Canada Focused
 * Handles timezone conversions between UTC and Canada Eastern Time
 */

// Canada Eastern Time zone (Toronto) - handles EST/EDT automatically
const CANADA_TIMEZONE = 'America/Toronto';

/**
 * Convert UTC timestamp to Canada Eastern Time Date object
 * @param utcTimestamp - ISO string from backend (e.g., "2025-08-16T21:00:00+00:00")
 * @returns Date object in Canada Eastern Time
 */
export function utcToCanadaEastern(utcTimestamp: string): Date {
  // Parse the UTC timestamp
  const utcDate = new Date(utcTimestamp);
  
  // Create a new date with Canada Eastern time, preserving the intended local time
  // This approach ensures the user sees the time they originally selected
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CANADA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(utcDate);
  const partsObj = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as Record<string, string>);
  
  // Create local date object (without timezone offset)
  const canadaDate = new Date(
    parseInt(partsObj.year),
    parseInt(partsObj.month) - 1, // Month is 0-indexed
    parseInt(partsObj.day),
    parseInt(partsObj.hour),
    parseInt(partsObj.minute),
    parseInt(partsObj.second)
  );
  
  return canadaDate;
}

/**
 * Convert Canada Eastern Time Date object to UTC for backend storage
 * @param canadaDate - Local Date object representing Canada Eastern time
 * @returns ISO string in UTC format for backend
 */
export function canadaEasternToUtc(canadaDate: Date): string {
  // This date is already in the user's intended local time
  // Convert it to UTC for backend storage
  return canadaDate.toISOString();
}

/**
 * Convert UTC timestamp to Canada Eastern Time for display
 * @param utcTimestamp - ISO string from backend
 * @returns Formatted string for display in Canada Eastern time
 */
export function formatCanadaEasternTime(utcTimestamp: string): string {
  const utcDate = new Date(utcTimestamp);
  
  return utcDate.toLocaleString('en-CA', {
    timeZone: CANADA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Get current Canada Eastern Time
 * @returns Date object representing current time in Canada Eastern timezone
 */
export function getCurrentCanadaEasternTime(): Date {
  return utcToCanadaEastern(new Date().toISOString());
}

/**
 * Debug helper to log timezone conversions
 */
export function debugTimezoneConversion(label: string, utcTimestamp: string) {
  const utcDate = new Date(utcTimestamp);
  const canadaDate = utcToCanadaEastern(utcTimestamp);
  
  console.log(`🇨🇦 ${label}:`, {
    original: utcTimestamp,
    utcParsed: utcDate.toISOString(),
    utcTime: `${utcDate.getUTCHours()}:${utcDate.getUTCMinutes().toString().padStart(2, '0')}`,
    canadaConverted: canadaDate.toISOString(),
    canadaTime: `${canadaDate.getHours()}:${canadaDate.getMinutes().toString().padStart(2, '0')}`,
    canadaString: canadaDate.toLocaleString()
  });
  
  return canadaDate;
}
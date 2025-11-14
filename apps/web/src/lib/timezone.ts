/**
 * Timezone Utilities for Vision Menu - FO-129 Compliant
 * Supports dynamic timezone conversions for all Canadian branches
 */

/**
 * Convert UTC timestamp to specified timezone
 * @param utcTimestamp - ISO string from backend (e.g., "2025-08-16T21:00:00+00:00")
 * @param timezone - IANA timezone identifier (e.g., 'America/Toronto', 'America/Halifax')
 * @returns Date object in the specified timezone
 */
export function utcToTimezone(utcTimestamp: string, timezone: string = 'America/Toronto'): Date {
  const utcDate = new Date(utcTimestamp);

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
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
  const timezoneDate = new Date(
    parseInt(partsObj.year),
    parseInt(partsObj.month) - 1, // Month is 0-indexed
    parseInt(partsObj.day),
    parseInt(partsObj.hour),
    parseInt(partsObj.minute),
    parseInt(partsObj.second)
  );

  return timezoneDate;
}

/**
 * Convert local timezone Date object to UTC for backend storage
 * @param localDate - Local Date object representing time in specified timezone
 * @param timezone - IANA timezone identifier (optional, for validation)
 * @returns ISO string in UTC format for backend
 */
export function timezoneToUtc(localDate: Date, timezone?: string): string {
  // The date is already in the user's intended local time
  // Convert it to UTC for backend storage
  return localDate.toISOString();
}

/**
 * Get UTC offset for a given timezone
 * @param timezone - IANA timezone identifier
 * @returns UTC offset string (e.g., "UTC-5:00", "UTC-3:30")
 */
export function getTimezoneOffset(timezone: string = 'America/Toronto'): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset'
  });

  const parts = formatter.formatToParts(now);
  const offsetPart = parts.find(part => part.type === 'timeZoneName');

  if (offsetPart && offsetPart.value.startsWith('GMT')) {
    // Convert "GMT-5" to "UTC-5:00"
    const offset = offsetPart.value.replace('GMT', 'UTC');
    // Add :00 if only hour is present
    if (!offset.includes(':')) {
      return offset.includes('+') || offset.includes('-')
        ? offset.replace(/([+-]\d+)/, '$1:00')
        : offset;
    }
    return offset;
  }

  // Fallback: calculate offset manually
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const diff = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);

  const hours = Math.floor(Math.abs(diff));
  const minutes = Math.round((Math.abs(diff) - hours) * 60);
  const sign = diff >= 0 ? '+' : '-';

  return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Format date in specified timezone with flexible options
 * @param date - Date object or ISO string
 * @param timezone - IANA timezone identifier
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted string
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string = 'America/Toronto',
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options
  };

  return dateObj.toLocaleString('en-CA', defaultOptions);
}

/**
 * Format date only (YYYY-MM-DD) in specified timezone
 * @param date - Date object or ISO string
 * @param timezone - IANA timezone identifier
 * @returns Formatted date string (e.g., "2025-08-16")
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone: string = 'America/Toronto'
): string {
  return formatInTimezone(date, timezone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: undefined,
    minute: undefined,
    second: undefined
  });
}

/**
 * Format time only (HH:mm) in specified timezone
 * @param date - Date object or ISO string
 * @param timezone - IANA timezone identifier
 * @returns Formatted time string (e.g., "14:30")
 */
export function formatTimeInTimezone(
  date: Date | string,
  timezone: string = 'America/Toronto'
): string {
  return formatInTimezone(date, timezone, {
    year: undefined,
    month: undefined,
    day: undefined,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format date and time in specified timezone
 * @param date - Date object or ISO string
 * @param timezone - IANA timezone identifier
 * @returns Formatted datetime string (e.g., "2025-08-16, 14:30")
 */
export function formatDateTimeInTimezone(
  date: Date | string,
  timezone: string = 'America/Toronto'
): string {
  return formatInTimezone(date, timezone);
}

/**
 * Get current time in specified timezone
 * @param timezone - IANA timezone identifier
 * @returns Date object representing current time in specified timezone
 */
export function getCurrentTimeInTimezone(timezone: string = 'America/Toronto'): Date {
  return utcToTimezone(new Date().toISOString(), timezone);
}

// ============================================================================
// LEGACY FUNCTIONS - Deprecated but kept for backward compatibility
// ============================================================================

/**
 * @deprecated Use utcToTimezone(utcTimestamp, 'America/Toronto') instead
 * Convert UTC timestamp to Canada Eastern Time Date object
 */
export function utcToCanadaEastern(utcTimestamp: string): Date {
  return utcToTimezone(utcTimestamp, 'America/Toronto');
}

/**
 * @deprecated Use timezoneToUtc(canadaDate) instead
 * Convert Canada Eastern Time Date object to UTC for backend storage
 */
export function canadaEasternToUtc(canadaDate: Date): string {
  return timezoneToUtc(canadaDate, 'America/Toronto');
}

/**
 * @deprecated Use formatDateTimeInTimezone(utcTimestamp, 'America/Toronto') instead
 * Convert UTC timestamp to Canada Eastern Time for display
 */
export function formatCanadaEasternTime(utcTimestamp: string): string {
  return formatDateTimeInTimezone(utcTimestamp, 'America/Toronto');
}

/**
 * @deprecated Use getCurrentTimeInTimezone('America/Toronto') instead
 * Get current Canada Eastern Time
 */
export function getCurrentCanadaEasternTime(): Date {
  return getCurrentTimeInTimezone('America/Toronto');
}

/**
 * Debug helper to log timezone conversions
 * @param label - Debug label
 * @param utcTimestamp - ISO string
 * @param timezone - IANA timezone identifier
 */
export function debugTimezoneConversion(
  label: string,
  utcTimestamp: string,
  timezone: string = 'America/Toronto'
) {
  const utcDate = new Date(utcTimestamp);
  const tzDate = utcToTimezone(utcTimestamp, timezone);

  console.log(`🌍 ${label} [${timezone}]:`, {
    original: utcTimestamp,
    utcParsed: utcDate.toISOString(),
    utcTime: `${utcDate.getUTCHours()}:${utcDate.getUTCMinutes().toString().padStart(2, '0')}`,
    timezoneConverted: tzDate.toISOString(),
    timezoneTime: `${tzDate.getHours()}:${tzDate.getMinutes().toString().padStart(2, '0')}`,
    timezoneString: tzDate.toLocaleString(),
    utcOffset: getTimezoneOffset(timezone)
  });

  return tzDate;
}

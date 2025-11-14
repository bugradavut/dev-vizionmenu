/**
 * Canadian Timezone Definitions
 * IANA timezone identifiers for Canada's time zones
 */

export interface TimezoneOption {
  value: string; // IANA timezone identifier
  label: string; // Display name (English)
  labelFr: string; // Display name (French)
  utcOffset: string; // UTC offset notation (e.g., "UTC-5:00")
  abbreviation: string; // Common abbreviation (e.g., "EST/EDT")
}

/**
 * Canadian timezones from east to west
 * Covers all major time zones used in Canada
 */
export const CANADIAN_TIMEZONES: TimezoneOption[] = [
  {
    value: 'America/St_Johns',
    label: 'Newfoundland Time',
    labelFr: 'Heure de Terre-Neuve',
    utcOffset: 'UTC-3:30',
    abbreviation: 'NT/NDT'
  },
  {
    value: 'America/Halifax',
    label: 'Atlantic Time',
    labelFr: 'Heure de l\'Atlantique',
    utcOffset: 'UTC-4:00',
    abbreviation: 'AST/ADT'
  },
  {
    value: 'America/Toronto',
    label: 'Eastern Time',
    labelFr: 'Heure de l\'Est',
    utcOffset: 'UTC-5:00',
    abbreviation: 'EST/EDT'
  },
  {
    value: 'America/Winnipeg',
    label: 'Central Time',
    labelFr: 'Heure du Centre',
    utcOffset: 'UTC-6:00',
    abbreviation: 'CST/CDT'
  },
  {
    value: 'America/Edmonton',
    label: 'Mountain Time',
    labelFr: 'Heure des Rocheuses',
    utcOffset: 'UTC-7:00',
    abbreviation: 'MST/MDT'
  },
  {
    value: 'America/Vancouver',
    label: 'Pacific Time',
    labelFr: 'Heure du Pacifique',
    utcOffset: 'UTC-8:00',
    abbreviation: 'PST/PDT'
  }
];

/**
 * Get timezone option by IANA identifier
 */
export const getTimezoneByValue = (value: string): TimezoneOption | undefined => {
  return CANADIAN_TIMEZONES.find(tz => tz.value === value);
};

/**
 * Get UTC offset for a given timezone
 */
export const getTimezoneOffset = (timezone: string): string => {
  const tz = getTimezoneByValue(timezone);
  return tz?.utcOffset || 'UTC-5:00'; // Default to Eastern Time
};

/**
 * Get display label for a timezone (with language support)
 */
export const getTimezoneLabel = (timezone: string, language: 'en' | 'fr' = 'en'): string => {
  const tz = getTimezoneByValue(timezone);
  if (!tz) return timezone;
  return language === 'fr' ? tz.labelFr : tz.label;
};

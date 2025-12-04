/**
 * Restaurant Hours Utility Functions
 * Handles restaurant open/closed status calculation using Canada Eastern Time
 */

import { getCurrentCanadaEasternTime } from '@/lib/timezone';

export interface RestaurantHours {
  isOpen: boolean;
  mode: 'simple' | 'advanced';
  // Simple mode - same hours for all working days
  simpleSchedule: {
    workingDays: string[];
    defaultHours: {
      openTime: string; // HH:MM format (24-hour)
      closeTime: string; // HH:MM format (24-hour)
    };
  };
  // Advanced mode - custom hours per day
  advancedSchedule: {
    [day: string]: {
      enabled: boolean;
      openTime: string;
      closeTime: string;
    };
  };
  // Legacy support - will be migrated to new structure
  workingDays?: string[];
  defaultHours?: {
    openTime: string;
    closeTime: string;
  };
}

/**
 * Get restaurant hours for a specific day
 */
export function getRestaurantHoursForDay(restaurantHours: RestaurantHours, targetDay: string): { openTime: string; closeTime: string } | null {
  // Migrate legacy data if needed
  const migratedHours = migrateRestaurantHours(restaurantHours);

  if (migratedHours.mode === 'advanced') {
    // Advanced mode: check day-specific schedule
    const daySchedule = migratedHours.advancedSchedule[targetDay];
    return daySchedule?.enabled ? {
      openTime: daySchedule.openTime,
      closeTime: daySchedule.closeTime
    } : null;
  } else {
    // Simple mode: check working days and use default hours
    if (!migratedHours.simpleSchedule.workingDays.includes(targetDay)) {
      return null;
    }
    return migratedHours.simpleSchedule.defaultHours;
  }
}

/**
 * Check if restaurant is currently open based on hours and current time
 */
export function isRestaurantCurrentlyOpen(restaurantHours?: RestaurantHours): boolean {
  // If no restaurant hours data, assume closed for safety
  if (!restaurantHours) {
    return false;
  }

  // If restaurant is manually marked as closed
  if (!restaurantHours.isOpen) {
    return false;
  }

  // Get current day and time
  const now = getCurrentCanadaEasternTime();
  const currentDay = getDayOfWeek(now);
  const currentTime = getTimeString(now);

  // Get hours for current day
  const dayHours = getRestaurantHoursForDay(restaurantHours, currentDay);
  if (!dayHours) {
    return false;
  }

  // Check if current time is within open hours
  return isTimeWithinRange(currentTime, dayHours.openTime, dayHours.closeTime);
}

/**
 * Get restaurant status with detailed information
 */
export function getRestaurantStatus(restaurantHours?: RestaurantHours) {
  const isCurrentlyOpen = isRestaurantCurrentlyOpen(restaurantHours);

  if (!restaurantHours) {
    return {
      isOpen: false,
      status: 'unknown',
      message: 'Hours not available'
    };
  }

  if (!restaurantHours.isOpen) {
    return {
      isOpen: false,
      status: 'closed_manually',
      message: 'Currently closed'
    };
  }

  const now = getCurrentCanadaEasternTime();
  const currentDay = getDayOfWeek(now);

  // Get hours for current day
  const dayHours = getRestaurantHoursForDay(restaurantHours, currentDay);
  if (!dayHours) {
    return {
      isOpen: false,
      status: 'closed_today',
      message: 'Closed today'
    };
  }

  const currentTime = getTimeString(now);
  const { openTime, closeTime } = dayHours;

  if (isCurrentlyOpen) {
    return {
      isOpen: true,
      status: 'open',
      message: `Open until ${formatTime(closeTime)}`
    };
  } else if (currentTime < openTime) {
    return {
      isOpen: false,
      status: 'opens_later',
      message: `Opens at ${formatTime(openTime)}`
    };
  } else {
    return {
      isOpen: false,
      status: 'closed_for_day',
      message: 'Closed for today'
    };
  }
}

/**
 * Get day of week as string (mon, tue, wed, etc.)
 */
function getDayOfWeek(date: Date): string {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[date.getDay()];
}

/**
 * Get time string in HH:MM format (24-hour)
 */
function getTimeString(date: Date): string {
  return date.toTimeString().slice(0, 5); // "HH:MM"
}

/**
 * Check if time is within range (handles overnight ranges)
 */
function isTimeWithinRange(currentTime: string, openTime: string, closeTime: string): boolean {
  // Convert times to minutes for easier comparison
  const current = timeToMinutes(currentTime);
  const open = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);

  // Handle overnight hours (e.g., 22:00 to 02:00)
  if (close < open) {
    // Restaurant is open overnight
    return current >= open || current <= close;
  } else {
    // Normal hours (e.g., 09:00 to 22:00)
    return current >= open && current <= close;
  }
}

/**
 * Convert HH:MM time string to minutes since midnight
 */
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format time string for display (12-hour format)
 * @param timeString - Time in HH:MM format (24-hour)
 * @returns Formatted time string in 12-hour format (e.g., "9:00 AM", "10:30 PM")
 */
export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if restaurant should show as closed (for UI blocking)
 * More restrictive than isRestaurantCurrentlyOpen for better UX
 */
export function shouldBlockOrders(restaurantHours?: RestaurantHours): boolean {
  return !isRestaurantCurrentlyOpen(restaurantHours);
}

/**
 * Get user-friendly status message for restaurant
 */
export function getRestaurantStatusMessage(restaurantHours?: RestaurantHours, language: 'en' | 'fr' = 'en') {
  const status = getRestaurantStatus(restaurantHours);

  if (!restaurantHours) {
    return {
      isOpen: false,
      message: language === 'fr' ? 'Horaires non disponibles' : 'Hours not available',
      status: 'unknown'
    };
  }

  const now = getCurrentCanadaEasternTime();
  const currentDay = getDayOfWeek(now);
  const dayHours = getRestaurantHoursForDay(restaurantHours, currentDay);

  const messages = {
    en: {
      open: `Open until ${formatTime(dayHours?.closeTime || '22:00')}`,
      closed_manually: 'Currently closed',
      closed_today: 'Closed today',
      opens_later: `Opens at ${formatTime(dayHours?.openTime || '09:00')}`,
      closed_for_day: 'Closed for today',
      unknown: 'Hours not available'
    },
    fr: {
      open: `Ouvert jusqu'à ${formatTime(dayHours?.closeTime || '22:00')}`,
      closed_manually: 'Actuellement fermé',
      closed_today: 'Fermé aujourd\'hui',
      opens_later: `Ouvre à ${formatTime(dayHours?.openTime || '09:00')}`,
      closed_for_day: 'Fermé pour aujourd\'hui',
      unknown: 'Horaires non disponibles'
    }
  };

  return {
    isOpen: status.isOpen,
    message: messages[language][status.status as keyof typeof messages.en] || messages[language].unknown,
    status: status.status
  };
}

/**
 * Get next opening time for closed restaurants
 */
export function getNextOpeningTime(restaurantHours?: RestaurantHours): Date | null {
  if (!restaurantHours || isRestaurantCurrentlyOpen(restaurantHours)) {
    return null;
  }

  const now = getCurrentCanadaEasternTime();
  const currentDay = getDayOfWeek(now);

  // Check if opens later today
  const todayHours = getRestaurantHoursForDay(restaurantHours, currentDay);
  if (todayHours) {
    const [hours, minutes] = todayHours.openTime.split(':').map(Number);
    const todayOpening = new Date(now);
    todayOpening.setHours(hours, minutes, 0, 0);

    if (todayOpening > now) {
      return todayOpening;
    }
  }

  // Find next working day
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDayIndex = dayNames.indexOf(currentDay);

  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7;
    const nextDay = dayNames[nextDayIndex];

    const nextDayHours = getRestaurantHoursForDay(restaurantHours, nextDay);
    if (nextDayHours) {
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + i);
      const [hours, minutes] = nextDayHours.openTime.split(':').map(Number);
      nextDate.setHours(hours, minutes, 0, 0);
      return nextDate;
    }
  }

  return null;
}

/**
 * Migrate legacy restaurant hours to new structure
 */
export function migrateRestaurantHours(restaurantHours: RestaurantHours): RestaurantHours {
  // If already migrated, return as-is
  if (restaurantHours.mode && restaurantHours.simpleSchedule) {
    return restaurantHours;
  }

  // Legacy data migration
  const workingDays = restaurantHours.workingDays || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const defaultHours = restaurantHours.defaultHours || { openTime: '09:00', closeTime: '22:00' };

  return {
    isOpen: restaurantHours.isOpen,
    mode: 'simple',
    simpleSchedule: {
      workingDays,
      defaultHours
    },
    advancedSchedule: {}
  };
}

/**
 * Switch from simple to advanced mode
 */
export function switchToAdvancedMode(restaurantHours: RestaurantHours): RestaurantHours {
  const migrated = migrateRestaurantHours(restaurantHours);

  if (migrated.mode === 'advanced') {
    return migrated;
  }

  // Create advanced schedule from simple schedule
  const advancedSchedule: { [key: string]: { enabled: boolean; openTime: string; closeTime: string } } = {};
  const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  allDays.forEach(day => {
    const isEnabled = migrated.simpleSchedule.workingDays.includes(day);
    advancedSchedule[day] = {
      enabled: isEnabled,
      openTime: migrated.simpleSchedule.defaultHours.openTime,
      closeTime: migrated.simpleSchedule.defaultHours.closeTime
    };
  });

  return {
    ...migrated,
    mode: 'advanced',
    advancedSchedule
  };
}

/**
 * Switch from advanced to simple mode
 */
export function switchToSimpleMode(restaurantHours: RestaurantHours): RestaurantHours {
  const migrated = migrateRestaurantHours(restaurantHours);

  if (migrated.mode === 'simple') {
    return migrated;
  }

  // Find most common hours from advanced schedule
  const enabledDays = Object.entries(migrated.advancedSchedule)
    .filter(([, schedule]) => schedule.enabled)
    .map(([day]) => day);

  // Use first enabled day's hours as default, or fallback
  const firstEnabledDay = Object.values(migrated.advancedSchedule).find(schedule => schedule.enabled);
  const defaultHours = firstEnabledDay ? {
    openTime: firstEnabledDay.openTime,
    closeTime: firstEnabledDay.closeTime
  } : { openTime: '09:00', closeTime: '22:00' };

  return {
    ...migrated,
    mode: 'simple',
    simpleSchedule: {
      workingDays: enabledDays,
      defaultHours
    }
  };
}

/**
 * Check if restaurant is marked as busy (switch turned off manually)
 */
export function isRestaurantMarkedAsBusy(restaurantHours?: RestaurantHours): boolean {
  if (!restaurantHours) {
    return false;
  }

  // If restaurant is manually marked as closed (switch off)
  if (!restaurantHours.isOpen) {
    return true;
  }

  return false;
}

/**
 * Get all working days from restaurant hours (regardless of mode)
 */
export function getAllWorkingDays(restaurantHours: RestaurantHours): string[] {
  const migrated = migrateRestaurantHours(restaurantHours);

  if (migrated.mode === 'advanced') {
    return Object.entries(migrated.advancedSchedule)
      .filter(([, schedule]) => schedule.enabled)
      .map(([day]) => day);
  }

  return migrated.simpleSchedule.workingDays;
}

/**
 * Get working days display text
 */
export function getWorkingDaysText(workingDays: string[], language: 'en' | 'fr' = 'en'): string {
  const dayLabels = {
    en: {
      mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
      fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
    },
    fr: {
      mon: 'Lundi', tue: 'Mardi', wed: 'Mercredi', thu: 'Jeudi',
      fri: 'Vendredi', sat: 'Samedi', sun: 'Dimanche'
    }
  };

  const labels = dayLabels[language];

  if (workingDays.length === 7) {
    return language === 'fr' ? 'Tous les jours' : 'Every day';
  }

  if (workingDays.length === 0) {
    return language === 'fr' ? 'Fermé' : 'Closed';
  }

  const dayNames = workingDays.map(day => labels[day as keyof typeof labels]).filter(Boolean);

  if (dayNames.length <= 2) {
    return dayNames.join(language === 'fr' ? ' et ' : ' & ');
  }

  return `${dayNames.slice(0, -1).join(', ')}${language === 'fr' ? ' et ' : ' & '}${dayNames[dayNames.length - 1]}`;
}

/**
 * Get current day key considering Canada Eastern timezone
 * @returns Current day key (mon, tue, wed, thu, fri, sat, sun)
 */
export function getCurrentDay(): string {
  const now = getCurrentCanadaEasternTime();
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[now.getDay()];
}

/**
 * Get localized day label
 * @param day - Day key (mon, tue, wed, etc.)
 * @param language - Language code ('en' or 'fr')
 * @param format - Label format: 'full', 'short', or 'initial'
 * @returns Localized day name
 */
export function getDayLabel(
  day: string,
  language: 'en' | 'fr',
  format: 'full' | 'short' | 'initial' = 'full'
): string {
  const labels = {
    en: {
      full: { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' },
      short: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },
      initial: { mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S' }
    },
    fr: {
      full: { mon: 'Lundi', tue: 'Mardi', wed: 'Mercredi', thu: 'Jeudi', fri: 'Vendredi', sat: 'Samedi', sun: 'Dimanche' },
      short: { mon: 'Lun', tue: 'Mar', wed: 'Mer', thu: 'Jeu', fri: 'Ven', sat: 'Sam', sun: 'Dim' },
      initial: { mon: 'L', tue: 'M', wed: 'M', thu: 'J', fri: 'V', sat: 'S', sun: 'D' }
    }
  };

  return labels[language][format][day as keyof typeof labels.en.full] || day;
}

/**
 * Get full weekly schedule for display
 * Returns all 7 days with their hours or closed status
 * @param restaurantHours - Restaurant hours configuration
 * @returns Array of daily schedules with day name, open status, and hours
 */
export function getWeeklySchedule(restaurantHours: RestaurantHours): Array<{
  day: string;
  isOpen: boolean;
  hours: { openTime: string; closeTime: string } | null;
}> {
  const migrated = migrateRestaurantHours(restaurantHours);
  const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  return dayOrder.map(day => {
    const dayHours = getRestaurantHoursForDay(migrated, day);
    return {
      day,
      isOpen: dayHours !== null,
      hours: dayHours
    };
  });
}

/**
 * Check if delivery is currently available
 * Falls back to restaurant hours if deliveryHours is not set
 * @param deliveryHours - Optional delivery-specific hours
 * @param restaurantHours - General restaurant hours (fallback)
 * @returns True if delivery is available now
 */
export function isDeliveryCurrentlyAvailable(
  deliveryHours?: RestaurantHours,
  restaurantHours?: RestaurantHours
): boolean {
  // Use delivery hours if available, otherwise fallback to restaurant hours
  const hoursToCheck = deliveryHours || restaurantHours;
  return isRestaurantCurrentlyOpen(hoursToCheck);
}

/**
 * Check if pickup/takeaway is currently available
 * Falls back to restaurant hours if pickupHours is not set
 * @param pickupHours - Optional pickup-specific hours
 * @param restaurantHours - General restaurant hours (fallback)
 * @returns True if pickup is available now
 */
export function isPickupCurrentlyAvailable(
  pickupHours?: RestaurantHours,
  restaurantHours?: RestaurantHours
): boolean {
  // Use pickup hours if available, otherwise fallback to restaurant hours
  const hoursToCheck = pickupHours || restaurantHours;
  return isRestaurantCurrentlyOpen(hoursToCheck);
}

/**
 * Check if orders should be blocked based on order type
 * @param orderType - Type of order: 'delivery', 'pickup', or 'dinein'
 * @param deliveryHours - Optional delivery-specific hours
 * @param pickupHours - Optional pickup-specific hours
 * @param restaurantHours - General restaurant hours
 * @returns True if orders of this type should be blocked
 */
export function shouldBlockOrdersByType(
  orderType: 'delivery' | 'pickup' | 'dinein',
  deliveryHours?: RestaurantHours,
  pickupHours?: RestaurantHours,
  restaurantHours?: RestaurantHours
): boolean {
  switch (orderType) {
    case 'delivery':
      return !isDeliveryCurrentlyAvailable(deliveryHours, restaurantHours);
    case 'pickup':
      return !isPickupCurrentlyAvailable(pickupHours, restaurantHours);
    case 'dinein':
      // Dine-in always uses restaurant hours
      return !isRestaurantCurrentlyOpen(restaurantHours);
    default:
      // Default to blocking if order type is unknown
      return true;
  }
}

/**
 * Check if restaurant is open at a specific date/time
 * @param restaurantHours - Restaurant hours configuration
 * @param targetDateTime - Specific date/time to check (defaults to current time)
 * @returns True if restaurant is open at the target time
 */
export function isRestaurantOpenAtTime(
  restaurantHours: RestaurantHours | undefined,
  targetDateTime?: Date
): boolean {
  // If no restaurant hours data, assume closed for safety
  if (!restaurantHours) {
    return false;
  }

  // If restaurant is manually marked as closed
  if (!restaurantHours.isOpen) {
    return false;
  }

  // Use target time or current time
  const checkTime = targetDateTime || getCurrentCanadaEasternTime();
  const currentDay = getDayOfWeek(checkTime);
  const currentTime = getTimeString(checkTime);

  // Get hours for this specific day
  const dayHours = getRestaurantHoursForDay(restaurantHours, currentDay);

  // No hours means closed
  if (!dayHours) {
    return false;
  }

  // Check if current time is within operating hours
  return isTimeWithinRange(currentTime, dayHours.openTime, dayHours.closeTime);
}

/**
 * Check if orders should be blocked based on order type and specific time
 * @param orderType - Type of order: 'delivery', 'pickup', or 'dinein'
 * @param deliveryHours - Optional delivery-specific hours
 * @param pickupHours - Optional pickup-specific hours
 * @param restaurantHours - General restaurant hours
 * @param targetDateTime - Specific date/time to check (defaults to current time)
 * @returns True if orders of this type should be blocked at target time
 */
export function shouldBlockOrdersByTypeAtTime(
  orderType: 'delivery' | 'pickup' | 'dinein',
  deliveryHours?: RestaurantHours,
  pickupHours?: RestaurantHours,
  restaurantHours?: RestaurantHours,
  targetDateTime?: Date
): boolean {
  switch (orderType) {
    case 'delivery':
      const deliveryToCheck = deliveryHours || restaurantHours;
      return !isRestaurantOpenAtTime(deliveryToCheck, targetDateTime);
    case 'pickup':
      const pickupToCheck = pickupHours || restaurantHours;
      return !isRestaurantOpenAtTime(pickupToCheck, targetDateTime);
    case 'dinein':
      return !isRestaurantOpenAtTime(restaurantHours, targetDateTime);
    default:
      return true;
  }
}

/**
 * Get availability status for a specific service type
 * @param orderType - Type of service: 'delivery', 'pickup', or 'dinein'
 * @param deliveryHours - Optional delivery-specific hours
 * @param pickupHours - Optional pickup-specific hours
 * @param restaurantHours - General restaurant hours
 * @param language - Language for status messages
 * @returns Service availability status with message
 */
export function getServiceAvailabilityStatus(
  orderType: 'delivery' | 'pickup' | 'dinein',
  deliveryHours?: RestaurantHours,
  pickupHours?: RestaurantHours,
  restaurantHours?: RestaurantHours,
  language: 'en' | 'fr' = 'en'
) {
  let hoursToCheck: RestaurantHours | undefined;
  let serviceLabel: string;

  switch (orderType) {
    case 'delivery':
      hoursToCheck = deliveryHours || restaurantHours;
      serviceLabel = language === 'fr' ? 'Livraison' : 'Delivery';
      break;
    case 'pickup':
      hoursToCheck = pickupHours || restaurantHours;
      serviceLabel = language === 'fr' ? 'Ramassage' : 'Pickup';
      break;
    case 'dinein':
      hoursToCheck = restaurantHours;
      serviceLabel = language === 'fr' ? 'Sur place' : 'Dine-in';
      break;
    default:
      serviceLabel = language === 'fr' ? 'Service' : 'Service';
      return {
        isAvailable: false,
        status: 'unknown',
        message: language === 'fr' ? 'Service inconnu' : 'Unknown service',
        serviceLabel
      };
  }

  const isAvailable = isRestaurantCurrentlyOpen(hoursToCheck);
  const statusInfo = getRestaurantStatus(hoursToCheck);

  return {
    isAvailable,
    status: statusInfo.status,
    message: statusInfo.message,
    serviceLabel,
    hours: hoursToCheck
  };
}
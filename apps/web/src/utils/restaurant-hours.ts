/**
 * Restaurant Hours Utility Functions
 * Handles restaurant open/closed status calculation
 */

export interface RestaurantHours {
  isOpen: boolean;
  workingDays: string[];
  defaultHours: {
    openTime: string; // HH:MM format (24-hour)
    closeTime: string; // HH:MM format (24-hour)
  };
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
  const now = new Date();
  const currentDay = getDayOfWeek(now);
  const currentTime = getTimeString(now);

  // Check if current day is in working days
  if (!restaurantHours.workingDays.includes(currentDay)) {
    return false;
  }

  // Check if current time is within open hours
  const { openTime, closeTime } = restaurantHours.defaultHours;

  return isTimeWithinRange(currentTime, openTime, closeTime);
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

  const now = new Date();
  const currentDay = getDayOfWeek(now);

  if (!restaurantHours.workingDays.includes(currentDay)) {
    return {
      isOpen: false,
      status: 'closed_today',
      message: 'Closed today'
    };
  }

  const currentTime = getTimeString(now);
  const { openTime, closeTime } = restaurantHours.defaultHours;

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
 */
function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
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
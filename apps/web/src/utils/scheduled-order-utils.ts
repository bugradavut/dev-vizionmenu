/**
 * Scheduled Order Utilities
 * Handles date/time slot generation with restaurant hours validation
 */

import { isToday } from 'date-fns'
import {
  getRestaurantHoursForDay,
  type RestaurantHours
} from './restaurant-hours'
import { getCurrentCanadaEasternTime } from '@/lib/timezone'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert HH:MM time string to minutes since midnight
 */
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to HH:MM format
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Get day of week as string (mon, tue, wed, etc.)
 */
function getDayOfWeek(date: Date): string {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return days[date.getDay()]
}

/**
 * Convert 12-hour time string to 24-hour HH:MM format
 * @param timeString - Time in 12-hour format (e.g., "7:30 PM", "11:00 AM")
 * @returns Time in 24-hour HH:MM format
 */
export function convertTo24Hour(timeString: string): string {
  const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) {
    // If already in 24-hour format or invalid, return as-is
    return timeString
  }

  let hours = parseInt(match[1])
  const minutes = match[2]
  const period = match[3].toUpperCase()

  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`
}

/**
 * Convert 24-hour HH:MM to 12-hour formatted string
 * @param time24 - Time in HH:MM format (24-hour)
 * @param language - Language for formatting
 * @returns Formatted time string (e.g., "7:30 PM", "19 h 30")
 */
export function formatTimeSlot(time24: string, language: 'en' | 'fr' = 'en'): string {
  const [hours, minutes] = time24.split(':').map(Number)

  if (language === 'fr') {
    // French: 24-hour format "19 h 30"
    return `${hours} h ${minutes.toString().padStart(2, '0')}`
  } else {
    // English: 12-hour format "7:30 PM"
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }
}

// ============================================================================
// CORE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a specific date is a working day
 * @param date - Date to check
 * @param restaurantHours - Restaurant hours configuration
 * @returns boolean indicating if restaurant is open that day
 */
export function isDateWorkingDay(
  date: Date,
  restaurantHours: RestaurantHours | null | undefined
): boolean {
  // If restaurant is manually closed, no days are working
  if (restaurantHours && !restaurantHours.isOpen) {
    return false
  }

  // If no hours configured, allow all days (fallback to defaults)
  if (!restaurantHours) {
    return true
  }

  const dayString = getDayOfWeek(date)
  const dayHours = getRestaurantHoursForDay(restaurantHours, dayString)

  return dayHours !== null
}

/**
 * Get restaurant hours for a specific date
 * @param date - Target date
 * @param restaurantHours - Restaurant hours configuration
 * @returns { openTime, closeTime } or null if closed
 */
export function getHoursForDate(
  date: Date,
  restaurantHours: RestaurantHours | null | undefined
): { openTime: string; closeTime: string } | null {
  if (!restaurantHours || !restaurantHours.isOpen) {
    return null
  }

  const dayString = getDayOfWeek(date)
  return getRestaurantHoursForDay(restaurantHours, dayString)
}

/**
 * Check if a time slot is in the past (for same-day orders)
 * @param date - Selected date
 * @param timeSlot - Time slot in HH:MM format (24-hour)
 * @returns boolean indicating if slot is in the past
 */
export function isTimeSlotPast(date: Date, timeSlot: string): boolean {
  // Only check if it's today
  if (!isToday(date)) {
    return false
  }

  const now = getCurrentCanadaEasternTime()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const slotMinutes = timeToMinutes(timeSlot)

  return slotMinutes <= currentMinutes
}

// ============================================================================
// TIME SLOT GENERATION
// ============================================================================

/**
 * Generate available time slots for a specific date
 * @param date - Selected date
 * @param restaurantHours - Restaurant hours configuration
 * @param intervalMinutes - Time slot interval (default: 15)
 * @param bufferMinutes - Buffer before closing (default: 30)
 * @param language - Language for formatting (default: 'en')
 * @returns Array of time slot objects { value, label, disabled }
 */
export function generateTimeSlotsForDate(
  date: Date,
  restaurantHours: RestaurantHours | null | undefined,
  intervalMinutes: number = 15,
  bufferMinutes: number = 30,
  language: 'en' | 'fr' = 'en'
): Array<{ value: string; label: string; disabled: boolean }> {
  // Get hours for the selected date
  const dayHours = getHoursForDate(date, restaurantHours)

  // If no hours configured, use defaults
  const DEFAULT_HOURS = {
    openTime: '11:00',
    closeTime: '22:00'
  }

  const { openTime, closeTime } = dayHours || DEFAULT_HOURS

  // Convert to minutes
  let openMinutes = timeToMinutes(openTime)
  let closeMinutes = timeToMinutes(closeTime)

  // Handle cross-midnight hours (e.g., 22:00 - 02:00)
  // For same day, cap at midnight
  if (closeMinutes < openMinutes) {
    closeMinutes = 23 * 60 + 59 // Cap at 23:59
  }

  // Apply buffer time (subtract from closing)
  const effectiveCloseMinutes = closeMinutes - bufferMinutes

  // Ensure we have valid range
  if (effectiveCloseMinutes <= openMinutes) {
    return [] // No valid slots
  }

  // Generate time slots
  const slots: Array<{ value: string; label: string; disabled: boolean }> = []
  const isTodayDate = isToday(date)
  const now = getCurrentCanadaEasternTime()
  const currentMinutes = isTodayDate ? now.getHours() * 60 + now.getMinutes() : -1

  for (let minutes = openMinutes; minutes <= effectiveCloseMinutes; minutes += intervalMinutes) {
    const timeString = minutesToTime(minutes)
    const isPast = isTodayDate && minutes <= currentMinutes

    slots.push({
      value: formatTimeSlot(timeString, 'en'), // Always store in 12-hour format for consistency
      label: formatTimeSlot(timeString, language),
      disabled: isPast
    })
  }

  return slots
}

/**
 * Validation utility functions
 */

/**
 * Validates a time string in HHMM format (24-hour)
 */
export function isValidTime(timeStr: string): boolean {
  if (!timeStr || !/^\d{4}$/.test(timeStr)) return false
  const hours = parseInt(timeStr.substring(0, 2))
  const minutes = parseInt(timeStr.substring(2, 4))
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates a date is within a given range
 */
export function isDateInRange(date: Date, minDate: Date, maxDate: Date): boolean {
  return date >= minDate && date <= maxDate
}

/**
 * Validates a date is not in the past
 */
export function isDateNotPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date >= today
}

/**
 * Validates a string is not empty after trimming
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0
}

/**
 * Validates a number is within a range
 */
export function isNumberInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}


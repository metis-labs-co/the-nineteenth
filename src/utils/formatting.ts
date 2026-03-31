/**
 * Centralized formatting utilities for the GolfApp
 *
 * Contains all date, time, and display formatting functions
 * to ensure consistent formatting across the application.
 */

import { format, parse, isValid } from 'date-fns';

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse DD/MM/YYYY string to Date object
 *
 * @param dateString - Date string in DD/MM/YYYY format
 * @returns Date object or null if invalid/empty
 *
 * @example
 * parseAustralianDate('15/01/2025') // Date object for Jan 15, 2025
 * parseAustralianDate('') // null
 * parseAustralianDate('invalid') // null
 */
export function parseAustralianDate(dateString: string): Date | null {
  if (!dateString) return null;
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
}

/**
 * Parse ISO date string to Date object
 *
 * @param dateString - ISO date string (YYYY-MM-DD or full ISO) or null
 * @returns Date object or null if invalid/empty
 *
 * @example
 * parseISODate('2025-01-15') // Date object for Jan 15, 2025
 * parseISODate('2025-01-15T10:30:00Z') // Date object with time
 * parseISODate(null) // null
 */
export function parseISODate(dateString: string | null): Date | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isValid(date) ? date : null;
}

/**
 * Parse HH:MM time string to Date object (today's date with parsed time)
 *
 * @param timeString - Time string in HH:MM format
 * @returns Date object with parsed time or null if invalid/empty
 *
 * @example
 * parseTime('09:30') // Date object with 9:30 AM today
 * parseTime('14:00') // Date object with 2:00 PM today
 * parseTime('') // null
 */
export function parseTime(timeString: string): Date | null {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// ============================================================================
// DATE FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format date to Australian format (DD/MM/YYYY)
 *
 * Accepts either a Date object or ISO date string.
 *
 * @param date - Date object, ISO date string (YYYY-MM-DD), or null
 * @returns Formatted date string or 'Date TBD' if null/invalid
 *
 * @example
 * formatDateAustralian(new Date(2025, 0, 15)) // '15/01/2025'
 * formatDateAustralian('2025-01-15') // '15/01/2025'
 * formatDateAustralian(null) // 'Date TBD'
 */
export function formatDateAustralian(date: Date | string | null): string {
  if (!date) return 'Date TBD';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(dateObj)) return 'Date TBD';
  return format(dateObj, 'dd/MM/yyyy');
}

// ============================================================================
// TIME FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format time for display (e.g., "9:30 AM")
 *
 * @param timeString - Time string in HH:MM:SS or HH:MM format, or null
 * @returns Formatted time string or null if input is null
 *
 * @example
 * formatTime('09:30:00') // '9:30 AM'
 * formatTime('14:00') // '2:00 PM'
 * formatTime(null) // null
 */
export function formatTime(timeString: string | null): string | null {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format Date object to 24-hour time string (HH:MM)
 *
 * Used for form field values where time is stored as "HH:MM" string.
 *
 * @param date - Date object
 * @returns Time string in HH:MM format
 *
 * @example
 * formatTimeHHMM(new Date(2025, 0, 15, 9, 30)) // '09:30'
 * formatTimeHHMM(new Date(2025, 0, 15, 14, 0)) // '14:00'
 */
export function formatTimeHHMM(date: Date): string {
  return format(date, 'HH:mm');
}

/**
 * Format date range for display
 *
 * @param startDate - Start date in ISO format
 * @param endDate - End date in ISO format (optional)
 * @returns Single date or date range string
 *
 * @example
 * formatDateRange('2025-01-15') // '15/01/2025'
 * formatDateRange('2025-01-15', '2025-02-15') // '15/01/2025 - 15/02/2025'
 * formatDateRange('2025-01-15', '2025-01-15') // '15/01/2025'
 */
export function formatDateRange(startDate: string, endDate?: string | null): string {
  const formattedStart = formatDateAustralian(startDate);
  if (!endDate || startDate === endDate) {
    return formattedStart;
  }
  const formattedEnd = formatDateAustralian(endDate);
  return `${formattedStart} - ${formattedEnd}`;
}

/**
 * Format position with ordinal suffix (1st, 2nd, 3rd, etc.)
 *
 * @param position - Position number
 * @returns Position with ordinal suffix
 *
 * @example
 * formatPosition(1) // '1st'
 * formatPosition(2) // '2nd'
 * formatPosition(3) // '3rd'
 * formatPosition(4) // '4th'
 * formatPosition(11) // '11th'
 * formatPosition(21) // '21st'
 */
export function formatPosition(position: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = position % 100;
  return position + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

/**
 * Format relative score to par (e.g., "+2", "-1", "E")
 *
 * @param score - Score relative to par
 * @returns Formatted string
 *
 * @example
 * formatRelativeToPar(2) // '+2'
 * formatRelativeToPar(-1) // '-1'
 * formatRelativeToPar(0) // 'E'
 */
export function formatRelativeToPar(score: number): string {
  if (score === 0) return 'E';
  if (score > 0) return `+${score}`;
  return `${score}`;
}

/**
 * Format player count with proper pluralization
 *
 * @param count - Number of players
 * @returns Formatted string with correct plural form
 *
 * @example
 * formatPlayerCount(1) // '1 player'
 * formatPlayerCount(5) // '5 players'
 */
export function formatPlayerCount(count: number): string {
  return `${count} ${count === 1 ? 'player' : 'players'}`;
}

/**
 * Format rounds count with proper pluralization
 *
 * @param count - Number of rounds
 * @returns Formatted string with correct plural form
 *
 * @example
 * formatRoundsCount(1) // '1 round'
 * formatRoundsCount(5) // '5 rounds'
 */
export function formatRoundsCount(count: number): string {
  return `${count} ${count === 1 ? 'round' : 'rounds'}`;
}

/**
 * Mask an email address for privacy display
 *
 * @param email - Full email address
 * @returns Masked email with only first character of local part visible
 *
 * @example
 * maskEmail('sam@example.com')       // 's**@example.com'
 * maskEmail('alexander@example.com') // 'a*****@example.com'
 * maskEmail('s@example.com')         // 's@example.com'
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || local.length <= 1) return email;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`;
}

/**
 * Format date with weekday for round display
 *
 * @param dateString - ISO date string (YYYY-MM-DD) or null
 * @returns Formatted date string with weekday or 'TBD' if null
 *
 * @example
 * formatDateWithWeekday('2025-01-15') // 'Wed, 15 Jan 2025'
 * formatDateWithWeekday(null) // 'TBD'
 */
export function formatDateWithWeekday(dateString: string | null): string {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format tee time for display (e.g., "9:30 AM")
 *
 * @param timeString - Time string in HH:MM:SS format, or null
 * @returns Formatted time string or 'TBD' if null
 *
 * @example
 * formatTeeTime('09:30:00') // '9:30 AM'
 * formatTeeTime('14:00:00') // '2:00 PM'
 * formatTeeTime(null) // 'TBD'
 */
export function formatTeeTime(timeString: string | null): string {
  if (!timeString) return 'TBD';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

// ============================================================================
// CURRENCY FORMATTING (shared utilities)
// ============================================================================

export { formatCurrency, formatNetResult } from './currency';

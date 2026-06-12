/**
 * Centralized formatting utilities for the GolfApp
 *
 * Contains all date, time, and display formatting functions
 * to ensure consistent formatting across the application.
 */

import { format, parse, isValid, startOfWeek, endOfWeek } from 'date-fns';

// ============================================================================
// TIMEZONE-SAFE DATE HELPERS
// ============================================================================

/**
 * Get a YYYY-MM-DD string in the device's local timezone.
 *
 * Unlike `new Date().toISOString().split('T')[0]`, this does NOT convert
 * to UTC first, so it returns the correct calendar date for the user.
 *
 * @param date - Date object (defaults to now)
 * @returns Date string in YYYY-MM-DD format (local timezone)
 *
 * @example
 * // At 8am AEST on April 5 (which is April 4 in UTC):
 * getLocalDateString() // '2025-04-05' (correct!)
 * new Date().toISOString().split('T')[0] // '2025-04-04' (wrong!)
 */
export function getLocalDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse a YYYY-MM-DD date string as a local date (not UTC).
 *
 * `new Date('2025-04-05')` interprets the string as UTC midnight, which
 * can shift the displayed date in non-UTC timezones. This function creates
 * a Date at local midnight instead.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object at local midnight
 *
 * @example
 * parseLocalDateString('2025-04-05') // April 5, 00:00 local time
 * new Date('2025-04-05')            // April 5, 00:00 UTC (April 4 in UTC- zones)
 */
export function parseLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the Monday–Sunday range of the week containing `date`, as local
 * YYYY-MM-DD strings (inclusive). Used to filter "this week" content
 * against `rounds.date` (a local calendar date string).
 *
 * @param date - Date object (defaults to now)
 * @returns Object with `start` and `end` as YYYY-MM-DD strings (local timezone)
 *
 * @example
 * // On Thursday 11 June 2026:
 * getWeekRange(new Date(2026, 5, 11)) // { start: '2026-06-08', end: '2026-06-14' }
 * getWeekRange()                      // same as above when called on that day
 */
export function getWeekRange(date: Date = new Date()): { start: string; end: string } {
  return {
    start: format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  };
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse DD/MM/YYYY string to Date object.
 *
 * This is the internal date format used by the DatePicker component and forms.
 * Users never type this format directly — they use native date pickers.
 *
 * @param dateString - Date string in DD/MM/YYYY format
 * @returns Date object or null if invalid/empty
 *
 * @example
 * parseDateInput('15/01/2025') // Date object for Jan 15, 2025
 * parseDateInput('') // null
 */
export function parseDateInput(dateString: string): Date | null {
  if (!dateString) return null;
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
}

/** @deprecated Use `parseDateInput` instead */
export const parseAustralianDate = parseDateInput;

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
  // Date-only strings (YYYY-MM-DD) are interpreted as UTC by new Date(),
  // which shifts the date in non-UTC timezones. Parse them as local instead.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ? parseLocalDateString(dateString)
    : new Date(dateString);
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
 * Format date for user-visible display using the device's locale.
 *
 * Accepts either a Date object or ISO date string.
 *
 * @param date - Date object, ISO date string (YYYY-MM-DD), or null
 * @param options - Intl.DateTimeFormatOptions (defaults to short numeric date)
 * @returns Locale-formatted date string or 'Date TBD' if null/invalid
 *
 * @example
 * // On an Australian device:
 * formatDateDisplay(new Date(2025, 0, 15)) // '15/01/2025'
 * // On a US device:
 * formatDateDisplay(new Date(2025, 0, 15)) // '1/15/2025'
 */
export function formatDateDisplay(
  date: Date | string | null,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  if (!date) return 'Date TBD';
  const dateObj = typeof date === 'string'
    ? (/^\d{4}-\d{2}-\d{2}$/.test(date) ? parseLocalDateString(date) : new Date(date))
    : date;
  if (!isValid(dateObj)) return 'Date TBD';
  return dateObj.toLocaleDateString(undefined, options);
}

/** @deprecated Use `formatDateDisplay` instead */
export const formatDateAustralian = formatDateDisplay;

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
  const formattedStart = formatDateDisplay(startDate);
  if (!endDate || startDate === endDate) {
    return formattedStart;
  }
  const formattedEnd = formatDateDisplay(endDate);
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
 * Medal emoji for a 1-based rank, falling back to "{rank}." beyond third place.
 *
 * @example
 * getRankMedal(1) // '🥇'
 * getRankMedal(4) // '4.'
 */
export function getRankMedal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}.`;
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
 * Format a date as e.g. "Fri, 23rd April, 2026" (long form with ordinal day).
 *
 * @example
 * formatDateLong('2026-04-23') // 'Thu, 23rd April, 2026'
 */
export function formatDateLong(dateString: string | null): string {
  if (!dateString) return 'TBD';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ? parseLocalDateString(dateString)
    : new Date(dateString);
  if (!isValid(date)) return 'TBD';
  return format(date, "eee, do MMMM, yyyy");
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
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ? parseLocalDateString(dateString)
    : new Date(dateString);
  return date.toLocaleDateString(undefined, {
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
  return formatTime(timeString) ?? 'TBD';
}

/**
 * Format a timestamp as a compact relative age, e.g. "now", "5m", "3h",
 * "2d", "2w", "2y". Used by the activity feed ("played a round · 2d").
 *
 * @param isoString - ISO timestamp (e.g. row's activity_at)
 * @param now - Reference time, injectable for tests (defaults to now)
 * @returns Compact age string, or '' for null/invalid input
 */
export function formatTimeAgo(isoString: string | null, now: Date = new Date()): string {
  if (!isoString) return '';
  const then = new Date(isoString);
  if (isNaN(then.getTime())) return '';

  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 365)}y`;
}

// ============================================================================
// CURRENCY FORMATTING (shared utilities)
// ============================================================================

export { formatCurrency, formatNetResult } from './currency';

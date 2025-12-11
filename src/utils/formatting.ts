/**
 * Centralized formatting utilities for the GolfApp
 *
 * Contains all date, time, and display formatting functions
 * to ensure consistent formatting across the application.
 */

/**
 * Format date to Australian format (DD/MM/YYYY)
 *
 * @param dateString - ISO date string (YYYY-MM-DD) or null
 * @returns Formatted date string or 'Date TBD' if null
 *
 * @example
 * formatDateAustralian('2025-01-15') // '15/01/2025'
 * formatDateAustralian(null) // 'Date TBD'
 */
export function formatDateAustralian(dateString: string | null): string {
  if (!dateString) return 'Date TBD';
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

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

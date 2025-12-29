/**
 * Date helper functions for EditCompetitionScreen
 */

import { format, parse, isValid } from 'date-fns';

/**
 * Parse DD/MM/YYYY string to Date object
 */
export function parseAustralianDate(dateString: string): Date | null {
  if (!dateString) return null;
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
}

/**
 * Format Date to DD/MM/YYYY string (Australian format)
 */
export function formatAustralianDate(date: Date | null): string {
  if (!date) return '';
  return format(date, 'dd/MM/yyyy');
}

/**
 * Parse ISO date string to Date object
 */
export function parseISODate(dateString: string | null): Date | null {
  if (!dateString) return null;
  return new Date(dateString);
}

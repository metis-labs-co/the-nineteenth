/**
 * Date and time helper functions for EditRoundScreen
 */

import { format, parse, isValid } from 'date-fns';

/**
 * Parse DD/MM/YYYY string to Date object
 */
export const parseAustralianDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
};

/**
 * Format Date to DD/MM/YYYY string
 */
export const formatAustralianDate = (date: Date): string => {
  return format(date, 'dd/MM/yyyy');
};

/**
 * Format time for display (HH:MM)
 */
export const formatTime = (date: Date): string => {
  return format(date, 'HH:mm');
};

/**
 * Parse HH:MM string to Date object
 */
export const parseTime = (timeString: string): Date | null => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/**
 * Parse ISO date string to Date object
 */
export const parseISODate = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  return new Date(dateString);
};

/**
 * API Helpers
 * Utility functions for API operations
 */

import { format } from 'date-fns';

/**
 * Generate a random 6-character invite code
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Simulate network delay (for development)
 */
export function delay(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format Date to ISO date string (YYYY-MM-DD) for Supabase
 */
export function formatDateForDB(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format time to HH:MM:SS for Supabase
 */
export function formatTimeForDB(time: string): string | null {
  if (!time) return null;
  // If already in HH:MM format, add seconds
  if (time.match(/^\d{2}:\d{2}$/)) {
    return `${time}:00`;
  }
  return time;
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

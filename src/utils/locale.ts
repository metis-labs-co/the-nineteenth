/**
 * Locale-aware date formatting utilities
 *
 * Uses the device's locale (via Intl) for all user-visible date formatting.
 * No hardcoded 'en-AU' — dates display in whatever format the user's device expects.
 */

import * as Localization from 'expo-localization';

/**
 * Get the device's locale string (e.g., 'en-AU', 'en-US', 'de-DE').
 * Falls back to 'en' if Intl is unavailable.
 */
export function getDeviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return 'en';
  }
}

/**
 * Get the device's country as an ISO-3166 alpha-2 code (e.g., 'AU', 'GB', 'US').
 *
 * Reads the device region from expo-localization (no permission required).
 * Falls back to 'AU' if region can't be determined, since the app currently
 * skews heavily Australian.
 */
export function getDeviceCountry(): string {
  try {
    const region = Localization.getLocales()[0]?.regionCode;
    if (region && /^[A-Z]{2}$/.test(region)) {
      return region;
    }
  } catch {
    // fall through
  }
  return 'AU';
}

/**
 * Format a Date for user-visible display using the device's locale.
 *
 * This replaces all hardcoded `toLocaleDateString('en-AU', ...)` calls.
 *
 * @param date - Date object to format
 * @param options - Intl.DateTimeFormatOptions (defaults to day + short month + year)
 * @returns Locale-formatted date string
 *
 * @example
 * // On an Australian device:
 * formatDisplayDate(new Date(2025, 3, 5)) // '5 Apr 2025'
 *
 * // On a US device:
 * formatDisplayDate(new Date(2025, 3, 5)) // 'Apr 5, 2025'
 */
export function formatDisplayDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  return date.toLocaleDateString(undefined, options);
}

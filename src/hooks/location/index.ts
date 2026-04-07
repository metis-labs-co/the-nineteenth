/**
 * Location Hooks - Module Index
 *
 * Hooks for device location, country detection, GPS coordinate backfill,
 * and country mismatch prompts.
 *
 * @example
 * ```tsx
 * import { useUserLocation, useUserCountry, useCoordinateBackfill } from '@/hooks/location';
 * ```
 */

// Re-export user location hook and types
export { useUserLocation } from './userLocation';
export type {
  LocationPermissionStatus,
  UserLocation as DeviceUserLocation,
  UseUserLocationReturn,
} from './userLocation';

// Re-export user country hook and types
export { useUserCountry, normalizeSupportedCountry } from './userCountry';
export type { UseUserCountryReturn } from './userCountry';

// Re-export country mismatch prompt hook and types
export { useCountryMismatchPrompt } from './countryMismatch';
export type { UseCountryMismatchPromptReturn } from './countryMismatch';

// Re-export coordinate backfill hook and types
export { useCoordinateBackfill } from './coordinateBackfill';
export type { UseCoordinateBackfillResult } from './coordinateBackfill';

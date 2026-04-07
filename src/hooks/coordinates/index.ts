/**
 * Coordinates Hooks - Module Index
 *
 * TanStack Query hooks for GPS coordinate data.
 * Used for GPS features like distance-to-pin, course flyovers, shot tracking.
 *
 * This module is organized into:
 * - types.ts: Type definitions
 * - queries.ts: Query hooks for fetching coordinate data
 * - utilities.ts: Computed/utility hooks for distance calculations
 *
 * Added January 2026 for GolfAPI.io integration
 *
 * @example
 * ```tsx
 * // Import from the coordinates module
 * import { useHoleCoordinates, useDistanceToGreen } from '@/hooks/coordinates';
 *
 * // Or import the entire module
 * import * as coordinates from '@/hooks/coordinates';
 * ```
 */

// Re-export types
export type {
  HoleCoordinateSet,
  CoordinatesByHole,
  UserLocation,
  DistanceResult,
  HoleCoordinateSummary,
} from './types';

// Re-export query hooks
export {
  useHoleCoordinates,
  useHoleCoordinatesByHole,
  useGreenCoordinate,
  useTeeCoordinate,
  useCoordinateSummary,
  useHasCoordinates,
  useHasCompleteCoordinates,
} from './queries';

// Re-export utility hooks
export {
  useDistanceToGreen,
  useHoleDistance,
  useAllHoleDistances,
} from './utilities';

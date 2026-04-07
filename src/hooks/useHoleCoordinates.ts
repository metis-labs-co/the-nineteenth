/**
 * useHoleCoordinates - Hooks for GPS coordinate data
 *
 * @deprecated Import directly from '@/hooks/coordinates' instead.
 *
 * This file re-exports everything from the coordinates module for backward compatibility.
 * The module has been split into focused files:
 * - coordinates/types.ts: Type definitions (HoleCoordinateSet, CoordinatesByHole, etc.)
 * - coordinates/queries.ts: Query hooks (useHoleCoordinates, useGreenCoordinate, etc.)
 * - coordinates/utilities.ts: Utility hooks (useDistanceToGreen, useHoleDistance, etc.)
 *
 * @example
 * // Preferred import (new)
 * import { useHoleCoordinates, useDistanceToGreen } from '@/hooks/coordinates';
 *
 * // Legacy import (still works)
 * import { useHoleCoordinates, useDistanceToGreen } from '@/hooks/useHoleCoordinates';
 */

// Re-export everything from the coordinates module
export * from './coordinates';

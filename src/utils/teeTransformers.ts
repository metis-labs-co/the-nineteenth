/**
 * Tee Transformation Utilities
 *
 * Functions for converting between Tee (normalized database table) and TeeBox (legacy JSONB format).
 * This provides backward compatibility for components that expect the TeeBox format.
 */

import type { Tee, TeeBox } from '@/types/database.types';

/**
 * Transform a Tee (from normalized tees table) to TeeBox (legacy JSONB format)
 *
 * @param tee - Tee record from the tees table
 * @returns TeeBox in the legacy format for backward compatibility
 *
 * @example
 * const tee = await fetchTeeFromDatabase(teeId);
 * const teeBox = teeToTeeBox(tee);
 * // teeBox can now be used with legacy components expecting TeeBox[]
 */
export function teeToTeeBox(tee: Tee): TeeBox {
  return {
    name: tee.name,
    color: tee.color ?? tee.name.toLowerCase(),
    totalYardage: tee.total_length ?? null,
    courseRating: tee.course_rating ?? undefined,
    slopeRating: tee.slope ?? undefined,
  };
}

/**
 * Transform an array of Tees to TeeBox array
 *
 * @param tees - Array of Tee records from the tees table
 * @returns Array of TeeBox in the legacy format
 *
 * @example
 * const tees = await fetchTeesForCourse(courseId);
 * const teeBoxes = teesToTeeBoxes(tees);
 */
export function teesToTeeBoxes(tees: Tee[]): TeeBox[] {
  return tees.map(teeToTeeBox);
}

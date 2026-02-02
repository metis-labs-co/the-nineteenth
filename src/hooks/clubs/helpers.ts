/**
 * Club Hooks - Helper Functions
 *
 * Utility functions for club and course data transformations.
 */

import { teeToTeeBox } from '@/utils/teeTransformers';
import type { Course } from '@/types/database.types';
import type { SupabaseCourseWithTees, ClubWithCourses, SearchResultItem } from './types';

/**
 * Merge tees from the tees table into the course's tees field
 * Prioritizes tees from the table over legacy JSONB tees
 */
export function mergeTees(course: SupabaseCourseWithTees): Course {
  const teesFromTable = course.tees_from_table ?? [];
  const legacyTees = course.tees ?? [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tees_from_table, ...courseWithoutTeesFromTable } = course;

  return {
    ...courseWithoutTeesFromTable,
    // Prefer tees from table, fallback to legacy JSONB tees
    tees: teesFromTable.length > 0 ? teesFromTable.map(teeToTeeBox) : legacyTees,
  };
}

/**
 * Type guard to check if a search result is from local DB
 */
export function isLocalClub(item: SearchResultItem): item is ClubWithCourses {
  return !('source' in item) || item.source !== 'golfapi';
}

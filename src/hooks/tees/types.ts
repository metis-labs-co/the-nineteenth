/**
 * Tee Hook Types
 *
 * Type definitions for tee data fetching and mutations.
 */

import type { Tee, Course } from '@/types/database.types';

/**
 * Tee with parent course info
 */
export interface TeeWithCourse extends Tee {
  course: Course;
}

/**
 * Input for creating a new tee
 */
export interface CreateTeeInput {
  course_id: string;
  name: string;
  color?: string | null;
  golfapi_tee_id?: string | null;
  slope?: number | null;
  course_rating?: number | null;
  slope_front9?: number | null;
  slope_back9?: number | null;
  course_rating_front9?: number | null;
  course_rating_back9?: number | null;
  slope_women?: number | null;
  course_rating_women?: number | null;
  slope_women_front9?: number | null;
  slope_women_back9?: number | null;
  course_rating_women_front9?: number | null;
  course_rating_women_back9?: number | null;
  measure_unit?: string | null;
}

/**
 * Input for updating a tee
 */
export interface UpdateTeeInput {
  id: string;
  name?: string;
  color?: string | null;
  slope?: number | null;
  course_rating?: number | null;
  slope_front9?: number | null;
  slope_back9?: number | null;
  course_rating_front9?: number | null;
  course_rating_back9?: number | null;
  slope_women?: number | null;
  course_rating_women?: number | null;
  slope_women_front9?: number | null;
  slope_women_back9?: number | null;
  course_rating_women_front9?: number | null;
  course_rating_women_back9?: number | null;
  measure_unit?: string | null;
}

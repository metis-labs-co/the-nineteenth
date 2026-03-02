/**
 * Club Hooks - Type Definitions
 *
 * Types for club and course data structures.
 */

import type { Club, Course, Tee, RegionFilter } from '@/types/database.types';
import type { GolfApiSearchResultItem } from '@/hooks/useGolfApiSearch';

// =====================================================
// SUPABASE RESPONSE TYPES (internal)
// =====================================================

/**
 * Course with tees from the tees table join
 */
export interface SupabaseCourseWithTees extends Course {
  tees_from_table?: Tee[] | null;
}

/**
 * Club with courses from Supabase join
 */
export interface SupabaseClubWithCourses extends Club {
  courses: Course[];
}

/**
 * Player with home club ID
 */
export interface SupabasePlayerHomeClub {
  home_club_id: string | null;
}

/**
 * Favorite course with course and club data
 */
export interface SupabaseFavoriteCourseWithClub {
  course_id: string;
  courses: Course & { club: Club };
}

// =====================================================
// EXPORTED TYPES
// =====================================================

/**
 * Course with favorite status
 */
export interface CourseWithFavoriteStatus extends Course {
  is_favorite: boolean;
}

/**
 * Club with its courses and metadata for UI display
 */
export interface ClubWithCourses extends Club {
  courses: CourseWithFavoriteStatus[];
  course_count: number;
  is_multi_course: boolean; // true if club has 2+ courses
  is_home: boolean; // true if this is user's home club
}

/**
 * Display item for hybrid list - either a single course or an expandable club group
 */
export interface ClubCourseDisplayItem {
  type: 'single-course' | 'multi-course-club';
  club: Club;
  venue: Club; // @deprecated - use club. Kept for backwards compatibility
  courses: CourseWithFavoriteStatus[];
  is_home?: boolean; // true if this club is the user's home club, defaults to false
  // For single-course clubs, this is the one course
  // For multi-course clubs, these are all courses at the club
}

/**
 * Input for creating a new club
 */
export interface CreateClubInput {
  name: string;
  state?: RegionFilter | null;
  city?: string | null;
  address?: string | null;
  total_holes?: number | null;
}

/**
 * Input for creating a course at a club
 */
export interface CreateClubCourseInput {
  club_id: string;
  name: string;
  description?: string | null;
  holes?: Course['holes'];
  tees?: Course['tees'];
  slope_rating?: number | null;
  course_rating?: number | null;
}

/**
 * Favorite course with both club and venue (deprecated) fields for backwards compatibility
 */
export type FavoriteCourseWithClub = CourseWithFavoriteStatus & { club: Club; venue: Club };

// =====================================================
// SEARCH RESULT TYPES (for API fallback)
// =====================================================

/**
 * Union type for search results - can be local DB result or GolfAPI.io result
 */
export type SearchResultItem = ClubWithCourses | GolfApiSearchResultItem;

/**
 * Course Database Types
 * Clubs, courses, tees, holes, coordinates, and favorite courses
 *
 * Updated for GolfAPI.io integration (January 2026):
 * - Renamed Venue → Club to match GolfAPI.io terminology
 * - Added separate Tee table (normalized from JSONB)
 * - Added HoleCoordinate table for GPS data
 * - Updated Course with new GolfAPI.io fields
 */

import type { RegionFilter, CourseSource, PoiType, MeasureUnit } from './enums';
import type { GeoPoint, Hole, TeeBox } from './base';

// =====================================================
// CLUB (formerly Venue)
// =====================================================

/**
 * Physical golf club location
 * A club can have one or more playable courses
 * e.g., The Eastern Golf Club has 27 holes = 3 course combinations
 *
 * Renamed from Venue to match GolfAPI.io terminology (January 2026)
 */
export interface Club {
  id: string; // UUID
  source: CourseSource;
  golfapi_club_id: string | null; // ClubID from GolfAPI.io (renamed from api_id)

  // Basic Info
  name: string; // e.g., "The Eastern Golf Club"
  address: string | null;
  city: string | null;
  postal_code: string | null; // From GolfAPI.io
  state: RegionFilter | null;
  country: string; // Defaults to 'Australia'
  continent: string | null; // From GolfAPI.io

  // Contact
  phone: string | null;
  email: string | null;
  website: string | null;

  // GPS coordinates (parsed from location for convenience)
  latitude: number | null;
  longitude: number | null;

  // Location (PostGIS GEOGRAPHY type stored as GeoJSON)
  location: GeoPoint | null;

  // Club Details
  total_holes: number | null; // 18, 27, 36, etc.
  is_featured: boolean; // Featured clubs appear in default course list

  // Metadata
  last_synced: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * @deprecated Use Club instead - Venue was renamed to Club in January 2026
 * Keeping for backwards compatibility during migration
 */
export type Venue = Club;

// =====================================================
// COURSE
// =====================================================

/**
 * Playable 18-hole course configuration at a club
 * A club with 27 holes (3 nines) would have 3 course records
 * e.g., "East/West Course", "North/East Course", "East/South Course"
 */
export interface Course {
  id: string; // UUID
  club_id: string; // UUID, references clubs(id) - renamed from venue_id

  // GolfAPI.io identifiers
  golfapi_course_id: string | null; // CourseID from GolfAPI.io
  golfapi_long_course_id: string | null; // LongCourseID from GolfAPI.io

  // Course Info
  name: string; // e.g., "East/West Course" or "Championship"
  description: string | null; // Optional description of this configuration
  num_holes: number; // 9 or 18

  // Distance measurement
  measure_unit: MeasureUnit | null; // 'm' (meters) or 'y' (yards)

  // Hole data (JSONB arrays)
  holes: Hole[]; // Men's par and stroke indexes
  holes_women: Hole[] | null; // Women's par and stroke indexes (if different)
  match_play_indexes: number[] | null; // Match play stroke indexes per hole

  // Legacy tees JSONB - deprecated, use Tee table instead
  tees: TeeBox[] | null;
  tees_migrated: boolean | null; // True if tees were migrated to separate table

  // Course ratings (legacy - use Tee table for per-tee ratings)
  slope_rating: number | null; // NUMERIC(4,1)
  course_rating: number | null; // NUMERIC(4,1)

  // Display offset for combo / cross-nine courses. 1 (default) = standard
  // 1..18. 10 = combo starts at facility hole 10 (e.g. Valley/Lake at a
  // 27-hole facility, signed 10..27). Internal hole.number stays 1..18 —
  // see displayHoleNumber() in src/utils/holeTransformers.ts.
  start_hole: number;

  // API lock
  api_locked: boolean; // When true, prevents API sync from overwriting this course

  // Metadata
  golfapi_updated_at: string | null; // Last update from GolfAPI.io
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// =====================================================
// TEE (new normalized table)
// =====================================================

/**
 * Golf course tee with ratings and per-hole distances
 * Normalized from the legacy Course.tees JSONB array
 *
 * Added January 2026 for GolfAPI.io integration
 */
export interface Tee {
  id: string; // UUID
  course_id: string; // UUID, references courses(id)
  golfapi_tee_id: string | null; // TeeID from GolfAPI.io

  // Tee identification
  name: string; // e.g., "Blue", "White", "Red", "68"
  color: string | null; // Hex color e.g., "#FFFFFF", "#00CCFF"

  // Men's ratings
  slope: number | null;
  slope_front9: number | null;
  slope_back9: number | null;
  course_rating: number | null;
  course_rating_front9: number | null;
  course_rating_back9: number | null;

  // Women's ratings
  slope_women: number | null;
  slope_women_front9: number | null;
  slope_women_back9: number | null;
  course_rating_women: number | null;
  course_rating_women_front9: number | null;
  course_rating_women_back9: number | null;

  // Distance unit
  measure_unit: MeasureUnit | null; // 'm' (meters) or 'y' (yards)

  // Per-hole distances
  length_hole_1: number | null;
  length_hole_2: number | null;
  length_hole_3: number | null;
  length_hole_4: number | null;
  length_hole_5: number | null;
  length_hole_6: number | null;
  length_hole_7: number | null;
  length_hole_8: number | null;
  length_hole_9: number | null;
  length_hole_10: number | null;
  length_hole_11: number | null;
  length_hole_12: number | null;
  length_hole_13: number | null;
  length_hole_14: number | null;
  length_hole_15: number | null;
  length_hole_16: number | null;
  length_hole_17: number | null;
  length_hole_18: number | null;

  // Computed totals (generated columns in database)
  total_length: number | null;
  front9_length: number | null;
  back9_length: number | null;

  // Metadata
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Helper to get hole length from a Tee object
 */
export function getTeeHoleLength(tee: Tee, holeNumber: number): number | null {
  const key = `length_hole_${holeNumber}` as keyof Tee;
  return tee[key] as number | null;
}

/**
 * Helper to get all hole lengths as an array
 */
export function getTeeHoleLengths(tee: Tee): (number | null)[] {
  return Array.from({ length: 18 }, (_, i) => getTeeHoleLength(tee, i + 1));
}

// =====================================================
// HOLE COORDINATES (new GPS table)
// =====================================================

/**
 * GPS coordinates for tee boxes and greens per hole
 * Enables distance-to-pin, course flyovers, shot tracking
 *
 * Added January 2026 for GolfAPI.io integration
 */
export interface HoleCoordinate {
  id: string; // UUID
  course_id: string; // UUID, references courses(id)
  hole_number: number; // 1-18

  // Point of interest type
  poi_type: PoiType; // tee_front, tee_back, green_front, green_center, green_back

  // GPS coordinates
  latitude: number;
  longitude: number;

  // Optional metadata
  side_of_fairway: string | null; // From GolfAPI.io SideOfFairway field

  // Metadata
  created_at: string; // ISO timestamp
}

// =====================================================
// FAVORITE COURSES
// =====================================================

/**
 * Favorite course relationship between a player and a course
 */
export interface FavoriteCourse {
  id: string; // UUID
  player_id: string; // UUID, references players(id)
  course_id: string; // UUID, references courses(id)
  created_at: string; // ISO timestamp
}

// =====================================================
// COMPOSITE TYPES
// =====================================================

/**
 * Club with its courses
 */
export interface ClubWithCourses extends Club {
  courses: Course[];
}

/**
 * Course with club details (for display purposes)
 */
export interface CourseWithClub extends Course {
  club: Club;
}

/**
 * Course with its tees from the normalized tees table
 */
export interface CourseWithTees extends Course {
  tees_list: Tee[]; // Named differently to avoid conflict with legacy 'tees' JSONB
  club?: Club;
}

/**
 * Course with GPS coordinates for all holes
 */
export interface CourseWithCoordinates extends Course {
  coordinates: HoleCoordinate[];
}

/**
 * Full course data with club, tees, and coordinates
 */
export interface CourseWithFullData extends Course {
  club: Club;
  tees_list: Tee[];
  coordinates: HoleCoordinate[];
}

// =====================================================
// DEPRECATED TYPES (for backwards compatibility)
// =====================================================

/**
 * @deprecated Use Club instead - Course no longer has location fields
 * Keeping for backwards compatibility during migration
 */
export interface LegacyCourse {
  id: string;
  source: CourseSource;
  api_id: string | null;
  name: string;
  state: RegionFilter | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  location: GeoPoint | null;
  holes: Hole[] | null;
  tees: TeeBox[] | null;
  slope_rating: number | null;
  course_rating: number | null;
  last_synced: string | null;
  created_at: string;
  updated_at: string;
}

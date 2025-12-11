/**
 * Course Database Types
 * Venues, courses, holes, and favorite courses
 */

import type { AustralianState, CourseSource } from './enums';
import type { GeoPoint, Hole, TeeBox } from './base';

/**
 * Physical golf club/venue location
 * A venue can have one or more playable courses
 * e.g., The Eastern Golf Club has 27 holes = 3 course combinations
 */
export interface Venue {
  id: string; // UUID
  source: CourseSource;
  api_id: string | null; // External API identifier

  // Basic Info
  name: string; // e.g., "The Eastern Golf Club"
  state: AustralianState | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;

  // Location (PostGIS GEOGRAPHY type stored as GeoJSON)
  location: GeoPoint | null;

  // Venue Details
  total_holes: number | null; // 18, 27, 36, etc.

  // Metadata
  last_synced: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Playable 18-hole course configuration at a venue
 * A venue with 27 holes (3 nines) would have 3 course records
 * e.g., "East/West Course", "North/East Course", "East/South Course"
 */
export interface Course {
  id: string; // UUID
  venue_id: string; // UUID, references venues(id)

  // Course Info
  name: string; // e.g., "East/West Course" or "Championship"
  description: string | null; // Optional description of this configuration

  // Course Details (18 holes for this configuration)
  holes: Hole[]; // JSONB array - 18 holes
  tees: TeeBox[] | null; // JSONB array - tee boxes with ratings for this course
  slope_rating: number | null; // NUMERIC(4,1) - for this configuration
  course_rating: number | null; // NUMERIC(4,1) - for this configuration

  // Metadata
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Course with venue details (for display purposes)
 */
export interface CourseWithVenue extends Course {
  venue: Venue;
}

/**
 * @deprecated Use Venue instead - Course no longer has location fields
 * Keeping for backwards compatibility during migration
 */
export interface LegacyCourse {
  id: string;
  source: CourseSource;
  api_id: string | null;
  name: string;
  state: AustralianState | null;
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

/**
 * Favorite course relationship between a player and a course
 */
export interface FavoriteCourse {
  id: string; // UUID
  player_id: string; // UUID, references players(id)
  course_id: string; // UUID, references courses(id)
  created_at: string; // ISO timestamp
}

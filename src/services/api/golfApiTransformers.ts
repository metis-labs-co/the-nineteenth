/**
 * GolfAPI.io Data Transformers
 *
 * Transform GolfAPI.io API responses to app domain types.
 * These transformers handle the mapping between external API
 * data structures and our internal Course, Hole, TeeBox types.
 */

import type {
  GolfApiClubResponse,
  GolfApiCourseDetail,
  GolfApiHole,
  GolfApiTee,
} from './golfApiTypes';
import type {
  LegacyCourse,
  Hole,
  TeeBox,
  GeoPoint,
  AustralianState,
} from '@/types/database.types';

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Valid Australian state codes
 */
const VALID_STATES: AustralianState[] = [
  'NSW',
  'VIC',
  'QLD',
  'SA',
  'WA',
  'TAS',
  'NT',
  'ACT',
];

/**
 * Valid par values
 */
const VALID_PARS: (3 | 4 | 5)[] = [3, 4, 5];

/**
 * Valid hole numbers
 */
type HoleNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Validate and normalize Australian state code
 */
function normalizeState(state?: string | null): AustralianState | null {
  if (!state) return null;

  const upperState = state.toUpperCase().trim();

  // Handle full state names
  const stateMap: Record<string, AustralianState> = {
    'NEW SOUTH WALES': 'NSW',
    'VICTORIA': 'VIC',
    'QUEENSLAND': 'QLD',
    'SOUTH AUSTRALIA': 'SA',
    'WESTERN AUSTRALIA': 'WA',
    'TASMANIA': 'TAS',
    'NORTHERN TERRITORY': 'NT',
    'AUSTRALIAN CAPITAL TERRITORY': 'ACT',
  };

  if (stateMap[upperState]) {
    return stateMap[upperState];
  }

  // Check if already a valid state code
  if (VALID_STATES.includes(upperState as AustralianState)) {
    return upperState as AustralianState;
  }

  return null;
}

/**
 * Validate and normalize par value
 */
function normalizePar(par?: number | null): 3 | 4 | 5 {
  if (par && VALID_PARS.includes(par as 3 | 4 | 5)) {
    return par as 3 | 4 | 5;
  }
  return 4; // Default to par 4 if invalid
}

/**
 * Validate hole number
 */
function isValidHoleNumber(num: number): num is HoleNumber {
  return Number.isInteger(num) && num >= 1 && num <= 18;
}

/**
 * Validate stroke index
 */
function normalizeStrokeIndex(strokeIndex?: number | null, holeNumber?: number): number {
  if (strokeIndex && Number.isInteger(strokeIndex) && strokeIndex >= 1 && strokeIndex <= 18) {
    return strokeIndex;
  }
  // Default to hole number if not provided
  return holeNumber || 1;
}

/**
 * Transform coordinates to GeoPoint
 */
function transformCoordinates(
  coords?: { latitude: number; longitude: number } | null
): GeoPoint | null {
  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    return null;
  }

  return {
    type: 'Point',
    coordinates: [coords.longitude, coords.latitude], // GeoJSON uses [lng, lat]
  };
}

// =====================================================
// MAIN TRANSFORMERS
// =====================================================

/**
 * Transform GolfAPI.io club response to partial Course
 * Used for search results (basic info only, no holes/tees)
 */
export function transformClubToCourse(club: GolfApiClubResponse): Partial<LegacyCourse> {
  return {
    source: 'api',
    api_id: club.id,
    name: club.name,
    state: normalizeState(club.state),
    city: club.city || null,
    address: club.address || null,
    phone: club.phone || null,
    email: club.email || null,
    website: club.website || null,
    location: transformCoordinates(club.coordinates),
    // holes and tees not included in basic search
    holes: null,
    tees: null,
    slope_rating: null,
    course_rating: null,
  };
}

/**
 * Transform GolfAPI.io hole data to app Hole type
 */
export function transformHole(apiHole: GolfApiHole): Hole {
  // Validate hole number
  const holeNumber = isValidHoleNumber(apiHole.number)
    ? apiHole.number
    : (Math.min(Math.max(apiHole.number, 1), 18) as HoleNumber);

  // Build yardages object from API yardages
  const yardages: Record<string, number> = {};
  if (apiHole.yardages && Array.isArray(apiHole.yardages)) {
    apiHole.yardages.forEach((y) => {
      // Use tee name/color as key
      const key = y.teeName?.toLowerCase() || y.teeId;
      if (key && typeof y.yards === 'number') {
        yardages[key] = y.yards;
      }
    });
  }

  return {
    number: holeNumber,
    par: normalizePar(apiHole.par),
    strokeIndex: normalizeStrokeIndex(apiHole.strokeIndex, apiHole.number),
    yardages: Object.keys(yardages).length > 0 ? yardages : undefined,
  };
}

/**
 * Transform GolfAPI.io tee data to app TeeBox type
 */
export function transformTee(apiTee: GolfApiTee): TeeBox {
  return {
    name: apiTee.name || apiTee.color || 'Unknown',
    color: apiTee.color || 'white',
    totalYardage: apiTee.totalYardage || 0,
    courseRating: apiTee.courseRating,
    slopeRating: apiTee.slopeRating,
  };
}

/**
 * Transform GolfAPI.io course detail to full Course
 * Used after fetching detailed course data
 */
export function transformCourseDetail(
  club: GolfApiClubResponse,
  course: GolfApiCourseDetail
): Partial<LegacyCourse> {
  // Transform holes
  const holes: Hole[] | null =
    course.holes && course.holes.length > 0
      ? course.holes
          .map(transformHole)
          .sort((a, b) => a.number - b.number)
      : null;

  // Transform tees
  const tees: TeeBox[] | null =
    course.tees && course.tees.length > 0
      ? course.tees.map(transformTee)
      : null;

  // Get primary tee ratings (first tee, or default)
  const primaryTee = course.tees?.[0];

  return {
    source: 'api',
    api_id: course.id, // Use course ID, not club ID
    name: course.name || club.name,
    state: normalizeState(club.state),
    city: club.city || null,
    address: club.address || null,
    phone: club.phone || null,
    email: club.email || null,
    website: club.website || null,
    location: transformCoordinates(club.coordinates),
    holes,
    tees,
    slope_rating: course.slopeRating ?? primaryTee?.slopeRating ?? null,
    course_rating: course.courseRating ?? primaryTee?.courseRating ?? null,
    last_synced: new Date().toISOString(),
  };
}

/**
 * Transform multiple club search results
 */
export function transformClubSearchResults(
  clubs: GolfApiClubResponse[]
): Partial<LegacyCourse>[] {
  return clubs.map(transformClubToCourse);
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

/**
 * Check if transformed course has valid required fields
 */
export function isValidTransformedCourse(course: Partial<LegacyCourse>): boolean {
  return Boolean(course.name && course.api_id);
}

/**
 * Check if course has detailed hole data
 */
export function hasHoleData(course: Partial<LegacyCourse>): boolean {
  return Boolean(course.holes && course.holes.length > 0);
}

/**
 * Check if course has tee data
 */
export function hasTeeData(course: Partial<LegacyCourse>): boolean {
  return Boolean(course.tees && course.tees.length > 0);
}

/**
 * Get total par for course from holes
 */
export function calculateTotalPar(holes: Hole[]): number {
  return holes.reduce((sum, hole) => sum + hole.par, 0);
}

/**
 * Get course status summary
 */
export function getCourseDataStatus(course: Partial<LegacyCourse>): {
  hasBasicInfo: boolean;
  hasHoles: boolean;
  hasTees: boolean;
  hasRatings: boolean;
  hasLocation: boolean;
  completeness: number;
} {
  const hasBasicInfo = Boolean(course.name);
  const hasHoles = hasHoleData(course);
  const hasTees = hasTeeData(course);
  const hasRatings = Boolean(course.course_rating && course.slope_rating);
  const hasLocation = Boolean(course.location);

  // Calculate completeness percentage
  const fields = [hasBasicInfo, hasHoles, hasTees, hasRatings, hasLocation];
  const completeness = Math.round(
    (fields.filter(Boolean).length / fields.length) * 100
  );

  return {
    hasBasicInfo,
    hasHoles,
    hasTees,
    hasRatings,
    hasLocation,
    completeness,
  };
}

/**
 * GolfAPI.io Data Transformers (v2.3)
 *
 * Transform GolfAPI.io v2.3 API responses to app domain types.
 * These transformers handle the mapping between external API
 * data structures and our internal Club, Course, Tee, HoleCoordinate types.
 *
 * Key differences in v2.3 API:
 * - Uses camelCase field names (clubID, courseName, etc.)
 * - Nested data (courses in clubs, tees in courses)
 * - Par/index as arrays (parsMen[], indexesMen[])
 * - Numeric POI codes for coordinates (1=Tee, 11=GreenFront, 12=GreenCenter)
 * - String lat/long for clubs (need parseFloat)
 * - Some fields return empty string "" instead of null
 *
 * Updated January 2026 for GolfAPI.io v2.3 integration
 */

import type {
  GolfApiClubResponse,
  GolfApiClubSearchResult,
  GolfApiCourseResponse,
  GolfApiTee,
  GolfApiCoordinate,
  GolfApiCoordinatesResponse,
} from './golfApiTypes';
import {
  parseRating,
  parseClubLatLong,
  STATE_NAME_TO_CODE,
  ESSENTIAL_POI_TYPES,
} from './golfApiTypes';
import type {
  Club,
  Course,
  Tee,
  HoleCoordinate,
  AustralianState,
  PoiType,
  MeasureUnit,
  Hole,
  GeoPoint,
} from '@/types/database';
import { calculateDistance } from '@/utils/gpsCalculations';

// Max plausible distance between green_front/green_back and green_center.
// Real greens are 25–40m deep; we allow up to 50m to absorb GPS noise.
// Beyond that, the upstream POI is almost certainly mislabelled — e.g.
// GolfAPI returns yardage markers as `green_front` for The Eastern Golf
// Club at 60–125m from green_center. Mirrors the runtime guard in
// useHoleMapMarkers.ts so bad rows never reach the DB in the first place.
const MAX_GREEN_POI_DISTANCE_FROM_CENTER_M = 50;

// =====================================================
// STATE NORMALIZATION
// =====================================================

/**
 * Normalize Australian state names to standard codes
 * Handles full names ('Victoria' → 'VIC') and passes through codes
 *
 * @param state - State name or code
 * @returns Normalized state code, or original value if not Australian
 */
export function normalizeAustralianState(state: string | undefined | null): string | null {
  if (!state) return null;

  const trimmed = state.trim();
  if (!trimmed) return null;

  // Check case-insensitive match for full state names
  const normalizedKey = Object.keys(STATE_NAME_TO_CODE).find(
    key => key.toLowerCase() === trimmed.toLowerCase()
  );

  if (normalizedKey) {
    return STATE_NAME_TO_CODE[normalizedKey];
  }

  // Return as-is if not a recognized Australian state (e.g., US states like 'CA', 'NY')
  return trimmed;
}

/**
 * Check if a state code is a valid Australian state
 */
export function isAustralianState(state: string | null): state is AustralianState {
  if (!state) return false;
  return ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].includes(state);
}

// =====================================================
// CLUB TRANSFORMERS
// =====================================================

/**
 * Transform GolfAPI.io club response to partial Club type
 * Used for search results and club details
 *
 * @param apiClub - Raw club response from GolfAPI.io v2.3
 * @returns Partial Club object for database insertion
 */
export function transformApiClubResponse(apiClub: GolfApiClubResponse): Partial<Club> {
  // Parse string lat/long to numbers
  const coords = parseClubLatLong(apiClub.latitude, apiClub.longitude);

  // Create GeoPoint for PostGIS
  const location: GeoPoint | null = coords
    ? { type: 'Point', coordinates: [coords.longitude, coords.latitude] }
    : null;

  // Normalize state code
  const normalizedState = normalizeAustralianState(apiClub.state);

  return {
    golfapi_club_id: apiClub.clubID,
    name: apiClub.clubName,
    address: apiClub.address || null,
    city: apiClub.city || null,
    postal_code: apiClub.postalCode || null,
    state: isAustralianState(normalizedState) ? normalizedState : null,
    country: apiClub.country || 'AUS',
    continent: null, // Not provided in API response
    phone: apiClub.telephone || null,
    email: null, // Not provided in API response
    website: apiClub.website || null,
    location,
    total_holes: apiClub.courses?.reduce((sum, c) => sum + c.numHoles, 0) || null,
    source: 'api' as const,
    last_synced: new Date().toISOString(),
  };
}

/**
 * Transform GolfAPI.io club search result to partial Club type
 * Search results have fewer fields than full club response
 */
export function transformApiClubSearchResult(result: GolfApiClubSearchResult): Partial<Club> {
  const coords = parseClubLatLong(result.latitude, result.longitude);
  const location: GeoPoint | null = coords
    ? { type: 'Point', coordinates: [coords.longitude, coords.latitude] }
    : null;

  const normalizedState = normalizeAustralianState(result.state);

  return {
    golfapi_club_id: result.clubID,
    name: result.clubName,
    city: result.city || null,
    state: isAustralianState(normalizedState) ? normalizedState : null,
    country: result.country || 'AUS',
    location,
    total_holes: result.courses?.reduce((sum, c) => sum + c.numHoles, 0) || null,
    source: 'api' as const,
    last_synced: new Date().toISOString(),
  };
}

// =====================================================
// HOLE TRANSFORMERS
// =====================================================

/**
 * Transform par and stroke index arrays to Hole objects
 * GolfAPI.io returns parsMen[] and indexesMen[] arrays
 *
 * @param pars - Array of par values (e.g., [4, 5, 4, 4, 3, 5, 3, 4, 4, ...])
 * @param indexes - Array of stroke index values (e.g., [6, 10, 12, 16, 14, 2, 18, 4, 8, ...])
 * @param numHoles - Number of holes (9 or 18)
 * @returns Array of Hole objects
 */
export function transformHolesFromArrays(
  pars: number[],
  indexes: number[],
  numHoles: number
): Hole[] {
  const holes: Hole[] = [];

  for (let i = 0; i < numHoles; i++) {
    const par = pars[i];
    // Validate par is 3, 4, or 5 - default to 4 if invalid
    const validPar = par === 3 || par === 4 || par === 5 ? par : 4;

    const strokeIndex = indexes[i];
    // Validate stroke index is 1-18 - default to hole number if invalid
    const validStrokeIndex =
      strokeIndex && Number.isInteger(strokeIndex) && strokeIndex >= 1 && strokeIndex <= 18
        ? strokeIndex
        : i + 1;

    holes.push({
      number: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18,
      par: validPar as 3 | 4 | 5,
      strokeIndex: validStrokeIndex,
    });
  }

  return holes;
}

// =====================================================
// TEE TRANSFORMERS
// =====================================================

/**
 * Transform GolfAPI.io tee data to partial Tee type
 * Handles empty string "" ratings (converts to undefined/null)
 *
 * @param apiTee - Raw tee data from GolfAPI.io v2.3
 * @param measureUnit - Distance unit ('m' or 'y') from course
 * @returns Partial Tee object for database insertion
 */
export function transformApiTee(
  apiTee: GolfApiTee,
  measureUnit: MeasureUnit = 'y'
): Partial<Tee> {
  return {
    golfapi_tee_id: apiTee.teeID,
    name: apiTee.teeName || 'Unknown',
    color: apiTee.teeColor || null,

    // Men's ratings (handle empty string "")
    slope: parseRating(apiTee.slopeMen) ?? null,
    slope_front9: parseRating(apiTee.slopeMenFront9) ?? null,
    slope_back9: parseRating(apiTee.slopeMenBack9) ?? null,
    course_rating: parseRating(apiTee.courseRatingMen) ?? null,
    course_rating_front9: parseRating(apiTee.courseRatingMenFront9) ?? null,
    course_rating_back9: parseRating(apiTee.courseRatingMenBack9) ?? null,

    // Women's ratings
    slope_women: parseRating(apiTee.slopeWomen) ?? null,
    slope_women_front9: parseRating(apiTee.slopeWomenFront9) ?? null,
    slope_women_back9: parseRating(apiTee.slopeWomenBack9) ?? null,
    course_rating_women: parseRating(apiTee.courseRatingWomen) ?? null,
    course_rating_women_front9: parseRating(apiTee.courseRatingWomenFront9) ?? null,
    course_rating_women_back9: parseRating(apiTee.courseRatingWomenBack9) ?? null,

    // Distance unit
    measure_unit: measureUnit,

    // Per-hole lengths (length1-length18 → length_hole_1-length_hole_18)
    length_hole_1: apiTee.length1 || null,
    length_hole_2: apiTee.length2 || null,
    length_hole_3: apiTee.length3 || null,
    length_hole_4: apiTee.length4 || null,
    length_hole_5: apiTee.length5 || null,
    length_hole_6: apiTee.length6 || null,
    length_hole_7: apiTee.length7 || null,
    length_hole_8: apiTee.length8 || null,
    length_hole_9: apiTee.length9 || null,
    length_hole_10: apiTee.length10 || null,
    length_hole_11: apiTee.length11 || null,
    length_hole_12: apiTee.length12 || null,
    length_hole_13: apiTee.length13 || null,
    length_hole_14: apiTee.length14 || null,
    length_hole_15: apiTee.length15 || null,
    length_hole_16: apiTee.length16 || null,
    length_hole_17: apiTee.length17 || null,
    length_hole_18: apiTee.length18 || null,
  };
}

/**
 * Transform multiple tees from course response
 */
export function transformApiTees(
  apiTees: GolfApiTee[],
  measureUnit: MeasureUnit = 'y'
): Partial<Tee>[] {
  return apiTees.map((tee) => transformApiTee(tee, measureUnit));
}

// =====================================================
// COURSE TRANSFORMERS
// =====================================================

/**
 * Transform result from transformApiCourseResponse
 */
export interface TransformedCourseData {
  course: Partial<Course>;
  tees: Partial<Tee>[];
  club: Partial<Club>;
}

/**
 * Transform GolfAPI.io course response to Course, Tee[], and Club
 * The course response includes club info and nested tees
 *
 * @param apiCourse - Raw course response from GolfAPI.io v2.3
 * @returns Object containing partial Course, Tee[], and Club
 */
export function transformApiCourseResponse(
  apiCourse: GolfApiCourseResponse
): TransformedCourseData {
  const numHoles = parseInt(apiCourse.numHoles, 10) || 18;
  const measureUnit: MeasureUnit = apiCourse.measure === 'm' ? 'm' : 'y';

  // Transform holes from par/index arrays
  const holes = transformHolesFromArrays(apiCourse.parsMen, apiCourse.indexesMen, numHoles);

  // Transform women's holes if different
  const holesWomen =
    apiCourse.parsWomen?.length > 0
      ? transformHolesFromArrays(apiCourse.parsWomen, apiCourse.indexesWomen, numHoles)
      : null;

  // Transform nested tees
  const tees = transformApiTees(apiCourse.tees || [], measureUnit);

  // Extract club info from course response
  const coords = parseClubLatLong(apiCourse.latitude, apiCourse.longitude);
  const location: GeoPoint | null = coords
    ? { type: 'Point', coordinates: [coords.longitude, coords.latitude] }
    : null;
  const normalizedState = normalizeAustralianState(apiCourse.state);

  const club: Partial<Club> = {
    golfapi_club_id: apiCourse.clubID,
    name: apiCourse.clubName,
    address: apiCourse.address || null,
    city: apiCourse.city || null,
    postal_code: apiCourse.postalCode || null,
    state: isAustralianState(normalizedState) ? normalizedState : null,
    country: apiCourse.country || 'AUS',
    phone: apiCourse.telephone || null,
    website: apiCourse.website || null,
    location,
    source: 'api' as const,
  };

  // Get default ratings from first tee if available
  const primaryTee = tees[0];
  const slopeRating = primaryTee?.slope ?? null;
  const courseRating = primaryTee?.course_rating ?? null;

  const course: Partial<Course> = {
    golfapi_course_id: apiCourse.courseID,
    golfapi_long_course_id: null, // Not provided in standard response
    name: apiCourse.courseName || 'Main Course',
    description: null,
    num_holes: numHoles,
    measure_unit: measureUnit,
    holes,
    holes_women: holesWomen,
    match_play_indexes: null, // Would need separate API call or CSV data
    slope_rating: slopeRating,
    course_rating: courseRating,
    golfapi_updated_at: apiCourse.timestampUpdated
      ? new Date(parseInt(apiCourse.timestampUpdated, 10) * 1000).toISOString()
      : null,
  };

  return { course, tees, club };
}

// =====================================================
// COORDINATE TRANSFORMERS
// =====================================================

/**
 * Map GolfAPI.io numeric POI code to our PoiType string
 * Returns null for non-essential POI types (fairway markers, hazards)
 *
 * POI codes:
 * - 1 = Tee (use location 1=front, 3=back)
 * - 11 = Green front
 * - 12 = Green center
 */
export function mapPoiToPoiType(
  poi: number,
  location: number
): PoiType | null {
  // GolfAPI.io's poi codes were originally implemented assuming poi=1 was
  // the tee box and poi=11/12 were green positions, but on-course testing
  // showed every coordinate landing on the wrong end of the hole. The poi
  // codes are actually inverted from the labels in their docs:
  //   poi=1   → green positions (3 entries per hole = front/center/back)
  //   poi=11  → tee front
  //   poi=12  → tee back
  // Verified against multiple Australian courses + the Tee table's hole
  // length data. The historic enum names (GolfApiPoiType.Tee = 1 etc.) are
  // kept for backwards compatibility but read as misleading.

  // Green positions (poi=1 has 3 sub-positions per the API's `location` field)
  if (poi === 1) {
    if (location === 1) return 'green_front';
    if (location === 2) return 'green_center';
    if (location === 3) return 'green_back';
    return null;
  }

  // Tee positions
  if (poi === 11) return 'tee_front';
  if (poi === 12) return 'tee_back';

  // Non-essential POIs (fairway markers, hazards, etc.) - skip
  return null;
}

/**
 * Transform GolfAPI.io coordinate to partial HoleCoordinate
 * Returns null for non-essential POI types
 *
 * @param apiCoord - Raw coordinate from GolfAPI.io
 * @returns Partial HoleCoordinate or null if not essential
 */
export function transformApiCoordinate(
  apiCoord: GolfApiCoordinate
): Partial<HoleCoordinate> | null {
  const poiType = mapPoiToPoiType(apiCoord.poi, apiCoord.location);

  // Skip non-essential coordinates (fairway markers, hazards, etc.)
  if (!poiType) return null;

  return {
    hole_number: apiCoord.hole,
    poi_type: poiType,
    latitude: apiCoord.latitude,
    longitude: apiCoord.longitude,
    side_of_fairway: apiCoord.sideFW ? String(apiCoord.sideFW) : null,
  };
}

/**
 * Transform all coordinates from a course, filtering to essential POIs
 * and dropping implausibly-placed green_front / green_back markers
 * (see MAX_GREEN_POI_DISTANCE_FROM_CENTER_M).
 *
 * @param apiResponse - Full coordinates response from GolfAPI.io
 * @returns Array of partial HoleCoordinate objects
 */
export function transformApiCoordinates(
  apiResponse: GolfApiCoordinatesResponse
): Partial<HoleCoordinate>[] {
  const coordinates: Partial<HoleCoordinate>[] = [];

  for (const coord of apiResponse.coordinates) {
    const transformed = transformApiCoordinate(coord);
    if (transformed) {
      coordinates.push(transformed);
    }
  }

  return dropImplausibleGreenPois(coordinates);
}

/**
 * Drop green_front / green_back rows that are too far from green_center
 * to be the actual front / back of the same green. Some upstream feeds
 * (e.g. The Eastern Golf Club from GolfAPI.io) tag fairway yardage
 * markers as green_front; keeping them would put a green-coloured
 * marker on the fairway 100m short of the actual green.
 */
function dropImplausibleGreenPois(
  coords: Partial<HoleCoordinate>[]
): Partial<HoleCoordinate>[] {
  const byHole = new Map<number, Partial<HoleCoordinate>[]>();
  for (const c of coords) {
    if (c.hole_number == null) continue;
    const list = byHole.get(c.hole_number);
    if (list) list.push(c);
    else byHole.set(c.hole_number, [c]);
  }

  const out: Partial<HoleCoordinate>[] = [];
  for (const holeCoords of byHole.values()) {
    const center = holeCoords.find((c) => c.poi_type === 'green_center');
    for (const c of holeCoords) {
      const isPeripheralGreen =
        c.poi_type === 'green_front' || c.poi_type === 'green_back';
      if (
        isPeripheralGreen &&
        center?.latitude != null &&
        center.longitude != null &&
        c.latitude != null &&
        c.longitude != null
      ) {
        const meters = calculateDistance(
          center.latitude,
          center.longitude,
          c.latitude,
          c.longitude
        );
        if (meters > MAX_GREEN_POI_DISTANCE_FROM_CENTER_M) continue;
      }
      out.push(c);
    }
  }
  return out;
}

/**
 * Filter coordinates to only essential POI types
 */
export function filterEssentialCoordinates(
  coords: GolfApiCoordinate[]
): GolfApiCoordinate[] {
  return coords.filter((c) =>
    ESSENTIAL_POI_TYPES.includes(c.poi as (typeof ESSENTIAL_POI_TYPES)[number])
  );
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

/**
 * Check if transformed course has valid required fields
 */
export function isValidTransformedCourse(course: Partial<Course>): boolean {
  return Boolean(course.name && (course.golfapi_course_id || course.club_id));
}

/**
 * Check if course has detailed hole data
 * Accepts both Course and LegacyCourse types
 */
export function hasHoleData(course: { holes?: Hole[] | null }): boolean {
  return Boolean(course.holes && course.holes.length > 0);
}

/**
 * Check if hole data is complete (has all required holes)
 */
export function hasCompleteHoleData(holes: Hole[] | null | undefined): boolean {
  if (!Array.isArray(holes) || holes.length === 0) return false;

  // Check that we have 9 or 18 holes with valid pars
  const validHoles = holes.filter(
    (h) => h.number >= 1 && h.number <= 18 && [3, 4, 5].includes(h.par)
  );

  return validHoles.length === 9 || validHoles.length === 18;
}

/**
 * Check if course has tee data
 */
export function hasTeeData(tees: Partial<Tee>[] | null | undefined): boolean {
  return Boolean(tees && tees.length > 0);
}

/**
 * Check if course has coordinate data
 */
export function hasCoordinateData(
  coordinates: Partial<HoleCoordinate>[] | null | undefined
): boolean {
  return Boolean(coordinates && coordinates.length > 0);
}

/**
 * Get total par for course from holes
 */
export function calculateTotalPar(holes: Hole[]): number {
  if (!Array.isArray(holes)) return 0;
  return holes.reduce((sum, hole) => sum + hole.par, 0);
}

/**
 * Check if a club response is valid
 */
export function isValidClubResponse(club: Partial<Club>): boolean {
  return Boolean(club.name && club.golfapi_club_id);
}

// =====================================================
// TIMESTAMP HELPERS
// =====================================================

/**
 * Parse Unix timestamp (seconds or milliseconds) to ISO string
 */
export function parseApiTimestamp(timestamp: string | number): string | null {
  if (!timestamp) return null;

  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(ts)) return null;

  // If timestamp is in seconds (10 digits), convert to milliseconds
  const msTimestamp = ts < 10000000000 ? ts * 1000 : ts;

  try {
    return new Date(msTimestamp).toISOString();
  } catch {
    return null;
  }
}

// =====================================================
// COURSE DATA STATUS
// =====================================================

/**
 * Get comprehensive course data status
 */
export function getCourseDataStatus(
  course: Partial<Course>,
  tees?: Partial<Tee>[],
  coordinates?: Partial<HoleCoordinate>[]
): {
  hasBasicInfo: boolean;
  hasHoles: boolean;
  hasCompleteHoles: boolean;
  hasTees: boolean;
  hasCoordinates: boolean;
  hasRatings: boolean;
  hasLocation: boolean;
  completeness: number;
} {
  const hasBasicInfo = Boolean(course.name);
  const hasHoles = hasHoleData(course);
  const hasCompleteHoles = hasCompleteHoleData(course.holes);
  const hasTees_ = hasTeeData(tees);
  const hasCoordinates_ = hasCoordinateData(coordinates);
  const hasRatings = Boolean(course.course_rating && course.slope_rating);
  const hasLocation = Boolean(course.club_id); // Course has location via club

  // Calculate completeness percentage (weighted)
  const weights = {
    basicInfo: 20,
    holes: 25,
    tees: 25,
    coordinates: 15,
    ratings: 15,
  };

  let score = 0;
  if (hasBasicInfo) score += weights.basicInfo;
  if (hasCompleteHoles) score += weights.holes;
  if (hasTees_) score += weights.tees;
  if (hasCoordinates_) score += weights.coordinates;
  if (hasRatings) score += weights.ratings;

  return {
    hasBasicInfo,
    hasHoles,
    hasCompleteHoles,
    hasTees: hasTees_,
    hasCoordinates: hasCoordinates_,
    hasRatings,
    hasLocation,
    completeness: score,
  };
}

// =====================================================
// SEARCH RESULT HELPERS
// =====================================================

/**
 * Transform multiple club search results
 */
export function transformClubSearchResults(
  results: GolfApiClubSearchResult[]
): Partial<Club>[] {
  return results.map(transformApiClubSearchResult);
}

/**
 * Sort search results by distance (if available)
 */
export function sortByDistance(results: Partial<Club>[]): Partial<Club>[] {
  // Results from geo search have distance in original API response
  // This is a passthrough since distance isn't stored in Club type
  return results;
}


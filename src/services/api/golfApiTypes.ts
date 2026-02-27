/**
 * GolfAPI.io Type Definitions
 *
 * TypeScript interfaces for the GolfAPI.io REST API v2.3
 * Base URL: https://www.golfapi.io/api/v2.3
 *
 * IMPORTANT: These types are based on ACTUAL API responses from v2.3 testing,
 * not documentation or CSV exports. Key differences from expected structure:
 * - Uses camelCase field names (clubID, courseName, etc.)
 * - Nested data (courses in clubs, tees in courses)
 * - Par/index as arrays, not individual fields
 * - Numeric POI codes for coordinates
 * - String lat/long for clubs (need parseFloat)
 * - Some fields return empty string "" instead of null
 */

// =====================================================
// API CONFIGURATION
// =====================================================

/**
 * GolfAPI.io v2.3 base URL
 */
export const GOLFAPI_BASE_URL = 'https://www.golfapi.io/api/v2.3';

/**
 * Default country for Australian golf app
 * Note: GolfAPI.io v2.3 uses full country names, not ISO codes
 */
export const DEFAULT_COUNTRY = 'Australia';

/**
 * Australian states for filtering
 */
export const AUSTRALIAN_STATES = [
  'NSW',
  'VIC',
  'QLD',
  'SA',
  'WA',
  'TAS',
  'NT',
  'ACT',
] as const;

export type AustralianState = (typeof AUSTRALIAN_STATES)[number];

// =====================================================
// REQUEST TYPES
// =====================================================

/**
 * Search parameters for club/course search
 */
export interface GolfApiSearchParams {
  /** Search query (club/course name) */
  query?: string;
  /** Country code (e.g., 'AUS' for Australia) */
  country?: string;
  /** State/region (e.g., 'VIC', 'NSW') */
  state?: string;
  /** Latitude for location-based search */
  latitude?: number;
  /** Longitude for location-based search */
  longitude?: number;
  /** Search radius in kilometers (for location search) */
  radius?: number;
}

// =====================================================
// CLUB RESPONSE TYPES
// =====================================================

/**
 * Nested course summary in club response
 * Returned as part of GET /clubs/{clubId}
 */
export interface GolfApiCourseSummary {
  /** Unique course identifier */
  courseID: string;
  /** Course name (empty string for single-course clubs) */
  courseName: string;
  /** Number of holes (9 or 18) */
  numHoles: number;
  /** Unix timestamp of last update */
  timestampUpdated: string;
  /** Whether GPS coordinates are available (0 or 1) */
  hasGPS: number;
}

/**
 * Club response from GET /clubs/{clubId}
 * Note: Courses are NESTED in this response
 */
export interface GolfApiClubResponse {
  /** Unique club identifier */
  clubID: string;
  /** Club name */
  clubName: string;
  /** Street address */
  address?: string;
  /** City */
  city?: string;
  /** Postal/ZIP code */
  postalCode?: string;
  /** State/province (full name or abbreviation) */
  state?: string;
  /** Country code (AUS, USA, etc.) */
  country: string;
  /** Latitude as STRING (needs parseFloat!) */
  latitude: string;
  /** Longitude as STRING (needs parseFloat!) */
  longitude: string;
  /** Website URL */
  website?: string;
  /** Phone number */
  telephone?: string;
  /** Unix timestamp of last update */
  timestampUpdated: string;
  /** Distance in km (for geo searches, empty string otherwise) */
  distance?: string;
  /** Nested courses array - included in club response! */
  courses: GolfApiCourseSummary[];
  /** Remaining API requests for this key */
  apiRequestsLeft: string;
}

/**
 * Club search result (similar to ClubResponse but may have fewer fields)
 */
export interface GolfApiClubSearchResult {
  clubID: string;
  clubName: string;
  city?: string;
  state?: string;
  country: string;
  latitude: string;
  longitude: string;
  distance?: string;
  courses?: GolfApiCourseSummary[];
}

// =====================================================
// COURSE RESPONSE TYPES
// =====================================================

/**
 * Tee data nested in course response
 * Note: Ratings can be number OR empty string ""
 */
export interface GolfApiTee {
  /** Unique tee identifier */
  teeID: string;
  /** Tee name (e.g., "Blue", "White", "68") */
  teeName: string;
  /** Hex color (e.g., "#FFFFFF", "#00CCFF") */
  teeColor: string;

  /** Per-hole lengths (yards or meters based on course.measure) */
  length1: number;
  length2: number;
  length3: number;
  length4: number;
  length5: number;
  length6: number;
  length7: number;
  length8: number;
  length9: number;
  length10: number;
  length11: number;
  length12: number;
  length13: number;
  length14: number;
  length15: number;
  length16: number;
  length17: number;
  length18: number;

  /** Men's course rating - can be number or empty string "" */
  courseRatingMen: number | string;
  /** Men's slope rating - can be number or empty string "" */
  slopeMen: number | string;
  /** Men's front 9 course rating */
  courseRatingMenFront9: number | string;
  /** Men's back 9 course rating */
  courseRatingMenBack9: number | string;
  /** Men's front 9 slope rating */
  slopeMenFront9: number | string;
  /** Men's back 9 slope rating */
  slopeMenBack9: number | string;

  /** Women's course rating - can be number or empty string "" */
  courseRatingWomen: number | string;
  /** Women's slope rating - can be number or empty string "" */
  slopeWomen: number | string;
  /** Women's front 9 course rating */
  courseRatingWomenFront9: number | string;
  /** Women's back 9 course rating */
  courseRatingWomenBack9: number | string;
  /** Women's front 9 slope rating */
  slopeWomenFront9: number | string;
  /** Women's back 9 slope rating */
  slopeWomenBack9: number | string;
}

/**
 * Full course response from GET /courses/{courseId}
 * Note: Includes club info, tees array, and par/index as ARRAYS
 */
export interface GolfApiCourseResponse {
  // Club info (included in course response!)
  /** Club identifier */
  clubID: string;
  /** Club name */
  clubName: string;
  /** Club address */
  address?: string;
  /** Postal code */
  postalCode?: string;
  /** City */
  city?: string;
  /** State */
  state?: string;
  /** Country code */
  country: string;
  /** Club latitude as STRING */
  latitude: string;
  /** Club longitude as STRING */
  longitude: string;
  /** Club website */
  website?: string;
  /** Club phone */
  telephone?: string;

  // Course info
  /** Unique course identifier */
  courseID: string;
  /** Course name (empty string for single-course clubs) */
  courseName: string;
  /** Number of holes as STRING (needs parseInt!) */
  numHoles: string;
  /** Unix timestamp of last update */
  timestampUpdated: string;
  /** Whether GPS coordinates available as STRING ("0" or "1") */
  hasGPS: string;
  /** Distance unit: 'y' (yards) or 'm' (meters) */
  measure: 'y' | 'm';

  /** Men's par per hole as ARRAY (not Par1, Par2...) */
  parsMen: number[];
  /** Men's stroke index per hole as ARRAY */
  indexesMen: number[];
  /** Women's par per hole as ARRAY */
  parsWomen: number[];
  /** Women's stroke index per hole as ARRAY */
  indexesWomen: number[];

  /** Number of tees available */
  numTees: number;
  /** Nested tees array - included in course response! */
  tees: GolfApiTee[];

  /** Number of GPS coordinates available */
  numCoordinates: number;
  /** Legacy course IDs (for redirects) */
  oldCourseIDs?: string[];

  /** Remaining API requests */
  apiRequestsLeft: string;
}

// =====================================================
// COORDINATE RESPONSE TYPES
// =====================================================

/**
 * POI type codes from GolfAPI.io
 * These are NUMERIC codes, not strings!
 */
export enum GolfApiPoiType {
  /** Tee box positions */
  Tee = 1,
  /** Left side fairway markers */
  FairwayLeft = 2,
  /** Right side fairway markers */
  FairwayRight = 3,
  /** Hazards/bunkers */
  Hazard = 4,
  /** Layup points */
  Layup = 5,
  /** Fairway crossing */
  Crossing = 6,
  /** Dogleg aiming points */
  DoglegAim = 9,
  /** Front of green */
  GreenFront = 11,
  /** Center of green / pin position */
  GreenCenter = 12,
}

/**
 * Location codes for tee positions
 */
export enum GolfApiLocation {
  /** Front of tee box */
  Front = 1,
  /** Center of tee box */
  Center = 2,
  /** Back of tee box */
  Back = 3,
}

/**
 * Side of fairway codes
 */
export enum GolfApiSideFW {
  Left = 1,
  Center = 2,
  Right = 3,
}

/**
 * Individual coordinate from coordinates endpoint
 * Note: Uses NUMERIC codes for poi, location, sideFW
 */
export interface GolfApiCoordinate {
  /** Point of interest type (see GolfApiPoiType enum) */
  poi: number;
  /** Location modifier (see GolfApiLocation enum) */
  location: number;
  /** Side of fairway (see GolfApiSideFW enum) */
  sideFW: number;
  /** Hole number (1-18) */
  hole: number;
  /** GPS latitude (NOTE: Already a number, unlike club lat/long!) */
  latitude: number;
  /** GPS longitude */
  longitude: number;
}

/**
 * Coordinates response from GET /coordinates/{courseId}
 */
export interface GolfApiCoordinatesResponse {
  /** Course identifier */
  courseID: string;
  /** Number of coordinates in response */
  numCoordinates: number;
  /** Array of coordinate points */
  coordinates: GolfApiCoordinate[];
  /** Remaining API requests */
  apiRequestsLeft: string;
}

// =====================================================
// ERROR TYPES
// =====================================================

/**
 * API error response
 */
export interface GolfApiError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Rate limit error with retry information
 */
export interface GolfApiRateLimitError extends GolfApiError {
  code: 'RATE_LIMIT_EXCEEDED';
  /** Seconds until rate limit resets */
  retryAfter: number;
  /** Requests remaining (usually 0) */
  remaining: number;
  /** Rate limit ceiling */
  limit: number;
}

// =====================================================
// CLIENT CONFIGURATION
// =====================================================

/**
 * GolfAPI.io client configuration
 */
export interface GolfApiClientConfig {
  /** Base URL for the API (default: GOLFAPI_BASE_URL) */
  baseUrl?: string;
  /** API key for authentication (Bearer token) */
  apiKey: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

// =====================================================
// TYPE GUARDS & HELPERS
// =====================================================

/**
 * Check if a rating value is valid (not empty string)
 * Ratings can be number or empty string "" in API responses
 */
export function isValidRating(value: number | string): value is number {
  if (typeof value === 'number') return true;
  if (typeof value === 'string' && value !== '') {
    const parsed = parseFloat(value);
    return !isNaN(parsed);
  }
  return false;
}

/**
 * Parse a rating value, returning undefined for empty strings
 */
export function parseRating(value: number | string): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(
  error: unknown
): error is GolfApiRateLimitError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as GolfApiError).code === 'RATE_LIMIT_EXCEEDED'
  );
}

/**
 * Check if error is a GolfAPI error
 */
export function isGolfApiError(error: unknown): error is GolfApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'status' in error
  );
}

/**
 * Parse string latitude/longitude from club response
 */
export function parseClubLatLong(
  lat: string,
  long: string
): { latitude: number; longitude: number } | null {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(long);
  if (isNaN(latitude) || isNaN(longitude)) return null;
  return { latitude, longitude };
}

/**
 * Get tee length for a specific hole
 */
export function getTeeHoleLength(tee: GolfApiTee, holeNumber: number): number {
  const key = `length${holeNumber}` as keyof GolfApiTee;
  const value = tee[key];
  return typeof value === 'number' ? value : 0;
}

/**
 * Get all hole lengths for a tee as an array
 */
export function getTeeHoleLengths(tee: GolfApiTee, numHoles: number): number[] {
  const lengths: number[] = [];
  for (let i = 1; i <= numHoles; i++) {
    lengths.push(getTeeHoleLength(tee, i));
  }
  return lengths;
}

/**
 * Calculate total length for a tee
 */
export function calculateTeeTotalLength(
  tee: GolfApiTee,
  numHoles: number
): number {
  return getTeeHoleLengths(tee, numHoles).reduce((sum, len) => sum + len, 0);
}

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Default search limit
 */
export const DEFAULT_SEARCH_LIMIT = 20;

/**
 * Maximum search limit
 */
export const MAX_SEARCH_LIMIT = 100;

/**
 * Essential POI types for our app (tees and greens)
 */
export const ESSENTIAL_POI_TYPES = [
  GolfApiPoiType.Tee,
  GolfApiPoiType.GreenFront,
  GolfApiPoiType.GreenCenter,
] as const;

/**
 * Map GolfAPI.io country codes to display names
 */
export const COUNTRY_CODE_MAP: Record<string, string> = {
  AUS: 'Australia',
  NZL: 'New Zealand',
  USA: 'United States',
  GBR: 'United Kingdom',
  CAN: 'Canada',
  // Add more as needed
};

/**
 * State name to code mapping (for normalization)
 */
export const STATE_NAME_TO_CODE: Record<string, string> = {
  // Australian states
  Victoria: 'VIC',
  'New South Wales': 'NSW',
  Queensland: 'QLD',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  Tasmania: 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT',
  // Already codes - pass through
  VIC: 'VIC',
  NSW: 'NSW',
  QLD: 'QLD',
  SA: 'SA',
  WA: 'WA',
  TAS: 'TAS',
  NT: 'NT',
  ACT: 'ACT',
  // US states
  California: 'CA',
  Florida: 'FL',
  Texas: 'TX',
  Arizona: 'AZ',
  'South Carolina': 'SC',
  Georgia: 'GA',
  Hawaii: 'HI',
  'North Carolina': 'NC',
  Nevada: 'NV',
  'New York': 'NY',
  CA: 'CA',
  FL: 'FL',
  TX: 'TX',
  AZ: 'AZ',
  SC: 'SC',
  GA: 'GA',
  HI: 'HI',
  NC: 'NC',
  NV: 'NV',
  NY: 'NY',
};

// =====================================================
// DEPRECATED TYPES (for backward compatibility)
// These will be removed after golfApiTransformers.ts is updated in Step 2.3
// =====================================================

/**
 * @deprecated Use GolfApiCourseResponse instead.
 * This type is kept for backward compatibility with golfApiTransformers.ts
 * TODO: Remove after Step 2.3 updates transformers
 */
export interface GolfApiCourseDetail {
  id: string;
  clubId: string;
  name: string;
  description?: string;
  holesCount: number;
  par: number;
  designer?: string;
  yearOpened?: number;
  holes: GolfApiHole[];
  tees: GolfApiOldTee[];
  courseRating?: number;
  slopeRating?: number;
  style?: string;
  grassTypes?: {
    fairways?: string;
    greens?: string;
  };
  facilities?: string[];
  updatedAt?: string;
}

/**
 * @deprecated Use transformHolesFromArrays instead.
 * This type is kept for backward compatibility with golfApiTransformers.ts
 * TODO: Remove after Step 2.3 updates transformers
 */
export interface GolfApiHole {
  number: number;
  par: 3 | 4 | 5;
  strokeIndex: number;
  yardages: GolfApiHoleYardage[];
  description?: string;
  coordinates?: {
    tee?: { latitude: number; longitude: number };
    green?: { latitude: number; longitude: number };
  };
  imageUrl?: string;
}

/**
 * @deprecated Use transformers to build yardages from tee lengths
 * TODO: Remove after Step 2.3 updates transformers
 */
export interface GolfApiHoleYardage {
  teeId: string;
  teeName: string;
  yards: number;
  meters?: number;
}

/**
 * @deprecated Use GolfApiTee instead (v2.3 structure)
 * TODO: Remove after Step 2.3 updates transformers
 */
export interface GolfApiOldTee {
  id: string;
  name: string;
  color: string;
  courseRating?: number;
  slopeRating?: number;
  totalYardage: number;
  totalMeters?: number;
  par?: number;
  gender?: 'men' | 'women' | 'unisex';
}

/**
 * @deprecated Paginated responses are not used in v2.3 API
 * TODO: Remove after all usages are updated
 */
export interface GolfApiPaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * @deprecated Use GolfApiClubResponse with proper field mapping
 * Legacy club response interface for backward compatibility with transformers.
 * TODO: Remove after Step 2.3 updates transformers
 */
export interface GolfApiLegacyClubResponse {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  holesCount?: number;
  courses?: GolfApiCourseBasic[];
  type?: 'public' | 'private' | 'resort' | 'semi-private' | 'municipal';
  imageUrl?: string;
}

/**
 * @deprecated Basic course info for legacy club response
 * TODO: Remove after Step 2.3 updates transformers
 */
export interface GolfApiCourseBasic {
  id: string;
  name: string;
  holes: number;
  par?: number;
}

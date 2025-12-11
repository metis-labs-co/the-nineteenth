/**
 * GolfAPI.io Type Definitions
 *
 * TypeScript interfaces for the GolfAPI.io external API
 * Documentation: https://api.golfapi.io/docs
 *
 * Note: These types are based on expected API responses.
 * Update once actual API documentation is available.
 */

// =====================================================
// REQUEST TYPES
// =====================================================

/**
 * Search parameters for club/course search
 */
export interface GolfApiSearchParams {
  /** Search query (club/course name) */
  query?: string;
  /** Country code (e.g., 'AU' for Australia) */
  country?: string;
  /** State/region (e.g., 'VIC', 'NSW') */
  state?: string;
  /** City name */
  city?: string;
  /** Latitude for location-based search */
  latitude?: number;
  /** Longitude for location-based search */
  longitude?: number;
  /** Search radius in kilometers (for location search) */
  radius?: number;
  /** Number of results to return (default: 20) */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

// =====================================================
// RESPONSE TYPES
// =====================================================

/**
 * Paginated response wrapper
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
 * Club/course response from search endpoint
 */
export interface GolfApiClubResponse {
  /** Unique club identifier */
  id: string;
  /** Club name */
  name: string;
  /** Full address */
  address?: string;
  /** City */
  city?: string;
  /** State/province/region */
  state?: string;
  /** Country code (ISO 3166-1 alpha-2) */
  country: string;
  /** Postal/ZIP code */
  postalCode?: string;
  /** Phone number */
  phone?: string;
  /** Email address */
  email?: string;
  /** Website URL */
  website?: string;
  /** Geographic coordinates */
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  /** Number of holes (9, 18, 27, 36) */
  holesCount?: number;
  /** List of courses at this club */
  courses?: GolfApiCourseBasic[];
  /** Club type (public, private, resort, etc.) */
  type?: 'public' | 'private' | 'resort' | 'semi-private' | 'municipal';
  /** URL to club logo/image */
  imageUrl?: string;
}

/**
 * Basic course info (in club response)
 */
export interface GolfApiCourseBasic {
  /** Course identifier */
  id: string;
  /** Course name (e.g., "Championship Course", "North Course") */
  name: string;
  /** Number of holes on this course */
  holes: number;
  /** Total par for the course */
  par?: number;
}

/**
 * Detailed course response with hole-by-hole data
 */
export interface GolfApiCourseDetail {
  /** Course identifier */
  id: string;
  /** Parent club identifier */
  clubId: string;
  /** Course name */
  name: string;
  /** Course description */
  description?: string;
  /** Number of holes */
  holesCount: number;
  /** Total par for the course */
  par: number;
  /** Course designer/architect */
  designer?: string;
  /** Year opened */
  yearOpened?: number;
  /** Hole data */
  holes: GolfApiHole[];
  /** Tee box options */
  tees: GolfApiTee[];
  /** Course rating (from tee) */
  courseRating?: number;
  /** Slope rating (from tee) */
  slopeRating?: number;
  /** Course style (links, parkland, etc.) */
  style?: string;
  /** Grass types */
  grassTypes?: {
    fairways?: string;
    greens?: string;
  };
  /** Course facilities */
  facilities?: string[];
  /** Last updated timestamp */
  updatedAt?: string;
}

/**
 * Individual hole data
 */
export interface GolfApiHole {
  /** Hole number (1-18) */
  number: number;
  /** Par for this hole */
  par: 3 | 4 | 5;
  /** Stroke index (1-18 for handicap calculation) */
  strokeIndex: number;
  /** Yardages by tee color/name */
  yardages: GolfApiHoleYardage[];
  /** Hole description/notes */
  description?: string;
  /** Hole coordinates (tee box) */
  coordinates?: {
    tee?: { latitude: number; longitude: number };
    green?: { latitude: number; longitude: number };
  };
  /** Hole image/layout URL */
  imageUrl?: string;
}

/**
 * Yardage for a specific tee
 */
export interface GolfApiHoleYardage {
  /** Tee identifier */
  teeId: string;
  /** Tee name/color */
  teeName: string;
  /** Distance in yards */
  yards: number;
  /** Distance in meters */
  meters?: number;
}

/**
 * Tee box information
 */
export interface GolfApiTee {
  /** Tee identifier */
  id: string;
  /** Tee name (e.g., "Championship", "Men's", "Ladies") */
  name: string;
  /** Tee color */
  color: string;
  /** Course rating from this tee */
  courseRating?: number;
  /** Slope rating from this tee */
  slopeRating?: number;
  /** Total yardage from this tee */
  totalYardage: number;
  /** Total meters from this tee */
  totalMeters?: number;
  /** Par for this tee (usually same for all tees) */
  par?: number;
  /** Gender this tee is typically for */
  gender?: 'men' | 'women' | 'unisex';
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
  /** Base URL for the API */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is GolfApiRateLimitError {
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

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Default country for Australian golf app
 */
export const DEFAULT_COUNTRY = 'AU';

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

/**
 * Default search limit
 */
export const DEFAULT_SEARCH_LIMIT = 20;

/**
 * Maximum search limit
 */
export const MAX_SEARCH_LIMIT = 100;

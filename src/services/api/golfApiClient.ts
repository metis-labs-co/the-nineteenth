/**
 * GolfAPI.io HTTP Client
 *
 * Client for the GolfAPI.io REST API v2.3. Requests are NOT sent to GolfAPI
 * directly: they go through the `golfapi-proxy` Supabase edge function, which
 * attaches the API key server-side (Supabase secret `GOLFAPI_IO_KEY`) and
 * only allows the endpoints this client uses. No API key ships in the app.
 *
 * Features:
 * - Authenticated via the user's Supabase session (supabase.functions.invoke)
 * - Configurable timeout
 * - Error handling with custom error classes
 * - Rate limit detection (429 responses)
 * - Not found handling (404 responses)
 * - Auth error handling (401, 403 responses)
 * - API quota tracking (apiRequestsLeft)
 * - Development logging
 *
 * Updated January 2026 for GolfAPI.io v2.3 integration
 */

import { supabase } from '@/services/supabase/client';
import type {
  GolfApiSearchParams,
  GolfApiClubResponse,
  GolfApiClubSearchResult,
  GolfApiCourseResponse,
  GolfApiCoordinatesResponse,
  GolfApiError,
  GolfApiRateLimitError,
  GolfApiClientConfig,
} from './golfApiTypes';
import { DEFAULT_COUNTRY } from './golfApiTypes';
import {
  GolfApiClientError,
  RateLimitError,
  NotFoundError,
  AuthenticationError,
  NetworkError,
} from './golfApiErrors';

// Re-export error classes for consumers that import from this file
export {
  GolfApiClientError,
  RateLimitError,
  NotFoundError,
  AuthenticationError,
  NetworkError,
} from './golfApiErrors';

// =====================================================
// COUNTRY MAPPING
// =====================================================

/**
 * Map app country names to Golf API country names where they differ.
 * Verified against Golf API v2.3 — all other supported countries match as-is.
 */
const GOLFAPI_COUNTRY_MAP: Record<string, string> = {
  'United Kingdom': 'UK',
  'United States': 'USA',
};

// =====================================================
// CLIENT CONFIGURATION
// =====================================================

const DEFAULT_TIMEOUT = 20000; // 20 seconds

/** Supabase edge function that proxies GolfAPI.io requests */
export const GOLFAPI_PROXY_FUNCTION = 'golfapi-proxy';

/** Minimal shape of the supabase-js Functions errors we inspect */
interface FunctionsInvokeError {
  name?: string;
  message?: string;
  context?: unknown;
}

/** Duck-typed check for a fetch Response (FunctionsHttpError.context) */
function isResponseLike(value: unknown): value is Response {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Response).status === 'number' &&
    typeof (value as Response).headers?.get === 'function'
  );
}

// =====================================================
// HTTP CLIENT
// =====================================================

/**
 * GolfAPI.io HTTP Client
 */
class GolfApiClient {
  private config: GolfApiClientConfig;

  /** Last known API requests remaining */
  private _apiRequestsLeft: number | null = null;

  /** Last request timestamp */
  private _lastRequestTime: Date | null = null;

  constructor() {
    this.config = {
      timeout: DEFAULT_TIMEOUT,
      debug: __DEV__,
    };
  }

  /**
   * Get the last known API requests remaining
   */
  get apiRequestsLeft(): number | null {
    return this._apiRequestsLeft;
  }

  /**
   * Get the last request timestamp
   */
  get lastRequestTime(): Date | null {
    return this._lastRequestTime;
  }

  /**
   * Check if API is configured and available.
   *
   * The key now lives server-side in the `golfapi-proxy` edge function, so the
   * client is always "configured"; a missing server secret surfaces as a
   * GolfApiClientError (503 PROXY_NOT_CONFIGURED) on the first request.
   */
  public isAvailable(): boolean {
    return true;
  }

  /**
   * Log debug messages (development only)
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[GolfAPI] ${message}`, data ?? '');
    }
  }

  /**
   * Drop empty query params and stringify the rest (mirrors the old URL builder)
   */
  private cleanParams(
    params?: Record<string, unknown>
  ): Record<string, string> | undefined {
    if (!params) return undefined;
    const cleaned: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = String(value);
      }
    });
    return cleaned;
  }

  /**
   * Parse error response body
   */
  private async parseErrorResponse(response: Response): Promise<GolfApiError> {
    try {
      const data = await response.json();
      return {
        code: data.code || `HTTP_${response.status}`,
        message: data.message || data.error || response.statusText,
        status: response.status,
        details: data.details,
      };
    } catch {
      return {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Unknown error',
        status: response.status,
      };
    }
  }

  /**
   * Update API quota tracking from response
   */
  private updateQuotaFromResponse(data: unknown): void {
    if (
      typeof data === 'object' &&
      data !== null &&
      'apiRequestsLeft' in data
    ) {
      const remaining = parseInt(
        String((data as Record<string, unknown>).apiRequestsLeft),
        10
      );
      if (!isNaN(remaining)) {
        this._apiRequestsLeft = remaining;
        this._lastRequestTime = new Date();

        // Log quota warning when running low
        if (remaining < 100 && this.config.debug) {
          console.warn(`[GolfAPI] Low quota warning: ${remaining} requests remaining`);
        }
      }
    }
  }

  /**
   * Convert a non-2xx proxy/GolfAPI response into the matching client error
   */
  private async errorFromResponse(
    response: Response,
    endpoint: string,
    resourceInfo?: { type: 'club' | 'course' | 'coordinates' | 'unknown'; id?: string }
  ): Promise<Error> {
    // Handle authentication errors (401, 403)
    if (response.status === 401 || response.status === 403) {
      const error = await this.parseErrorResponse(response);
      console.error(`[GolfAPI] AUTH ERROR ${response.status}: ${error.message}`);
      return new AuthenticationError(response.status as 401 | 403, error.message);
    }

    // Handle not found (404)
    if (response.status === 404) {
      console.error(`[GolfAPI] NOT FOUND: ${endpoint}`);
      return new NotFoundError(
        resourceInfo?.type || 'unknown',
        resourceInfo?.id,
        `Resource not found: ${endpoint}`
      );
    }

    // Handle rate limiting (429)
    if (response.status === 429) {
      const retryAfter = parseInt(
        response.headers.get('Retry-After') || '60',
        10
      );
      const rateLimitError: GolfApiRateLimitError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'API rate limit exceeded. Please try again later.',
        status: 429,
        retryAfter,
        remaining: 0,
        limit: parseInt(
          response.headers.get('X-RateLimit-Limit') || '100',
          10
        ),
      };
      this._apiRequestsLeft = 0;
      console.error(`[GolfAPI] RATE LIMITED: retry after ${retryAfter}s`);
      return new RateLimitError(rateLimitError);
    }

    // Handle other errors (incl. proxy 400 / 503 / 502 / 504)
    const error = await this.parseErrorResponse(response);
    console.error(`[GolfAPI] ERROR ${response.status}: ${error.message}`);
    return new GolfApiClientError(error);
  }

  /**
   * Make an authenticated GET request via the golfapi-proxy edge function
   */
  private async request<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    resourceInfo?: { type: 'club' | 'course' | 'coordinates' | 'unknown'; id?: string }
  ): Promise<T> {
    const path = `/${endpoint.replace(/^\//, '')}`;
    const query = this.cleanParams(params);
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;

    console.log(`[GolfAPI] GET ${path} (via ${GOLFAPI_PROXY_FUNCTION})`);
    this.log(`Params:`, query);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const { data, error } = await supabase.functions.invoke(
        GOLFAPI_PROXY_FUNCTION,
        {
          method: 'POST',
          body: { path, params: query },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (error) {
        const fnError = error as FunctionsInvokeError;

        // Non-2xx from the proxy (proxy error or passed-through GolfAPI status)
        if (isResponseLike(fnError.context)) {
          console.log(`[GolfAPI] Response: ${fnError.context.status} ${fnError.context.statusText ?? ''}`);
          throw await this.errorFromResponse(fnError.context, endpoint, resourceInfo);
        }

        // Aborted by our timeout (FunctionsFetchError wrapping an AbortError)
        const cause = fnError.context as { name?: string } | undefined;
        if (cause?.name === 'AbortError' || controller.signal.aborted) {
          throw new NetworkError(`Request timed out after ${timeout}ms`);
        }

        // Fetch / relay failure
        throw new NetworkError(
          'Network request failed. Please check your connection.',
          error instanceof Error ? error : undefined
        );
      }

      this.log(`Response:`, data);

      // Update quota tracking
      this.updateQuotaFromResponse(data);

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Re-throw our custom errors
      if (
        error instanceof GolfApiClientError ||
        error instanceof RateLimitError ||
        error instanceof NotFoundError ||
        error instanceof AuthenticationError ||
        error instanceof NetworkError
      ) {
        throw error;
      }

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(`Request timed out after ${timeout}ms`, error);
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new NetworkError(
          'Network request failed. Please check your connection.',
          error
        );
      }

      // Unknown error
      throw new NetworkError(
        `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  // =====================================================
  // API METHODS
  // =====================================================

  /**
   * Search for golf clubs
   *
   * @param params - Search parameters
   * @returns Array of club search results
   *
   * Note: GolfAPI.io v2.3 uses GET /clubs with query parameters:
   * - name: Club name search term
   * - country: Country code (e.g., 'AUS')
   * - state: State/region filter
   * - city: City filter
   * Results include nested courses summaries.
   */
  async searchClubs(
    params: GolfApiSearchParams
  ): Promise<GolfApiClubSearchResult[]> {
    const rawCountry = params.country || DEFAULT_COUNTRY;
    const apiCountry = GOLFAPI_COUNTRY_MAP[rawCountry] ?? rawCountry;

    const searchParams: Record<string, unknown> = {
      country: apiCountry,
    };

    // GolfAPI.io uses 'name' parameter for club name search
    if (params.query) {
      searchParams.name = params.query;
    }

    // Add optional filters
    if (params.state) {
      searchParams.state = params.state;
    }

    // Location-based search parameters
    if (params.latitude !== undefined) {
      searchParams.latitude = params.latitude;
    }
    if (params.longitude !== undefined) {
      searchParams.longitude = params.longitude;
    }
    if (params.radius !== undefined) {
      searchParams.radius = params.radius;
    }

    // Use GET /clubs endpoint (v2.3)
    // Response format: { apiRequestsLeft, numClubs, numAllClubs, clubs: [...] }
    const response = await this.request<{ clubs: GolfApiClubSearchResult[] }>(
      '/clubs',
      searchParams,
      { type: 'club' }
    );

    const clubs = response.clubs || [];
    console.log(`[GolfAPI] searchClubs: ${clubs.length} clubs found for query="${searchParams.name}", country="${searchParams.country}"`);
    return clubs;
  }

  /**
   * Get single club details
   *
   * @param clubId - Club identifier (e.g., "141520610397251566")
   * @returns Club details with nested courses list
   */
  async getClub(clubId: string): Promise<GolfApiClubResponse> {
    if (!clubId) {
      throw new Error('Club ID is required');
    }

    return this.request<GolfApiClubResponse>(
      `/clubs/${clubId}`,
      undefined,
      { type: 'club', id: clubId }
    );
  }

  /**
   * Get detailed course information with hole-by-hole data
   *
   * @param courseId - Course identifier (e.g., "012141520658891108829")
   * @returns Full course details including:
   *   - Club info (nested in response)
   *   - Par/stroke index arrays for men and women
   *   - Tees array with per-hole lengths and ratings
   */
  async getCourse(courseId: string): Promise<GolfApiCourseResponse> {
    if (!courseId) {
      throw new Error('Course ID is required');
    }

    return this.request<GolfApiCourseResponse>(
      `/courses/${courseId}`,
      undefined,
      { type: 'course', id: courseId }
    );
  }

  /**
   * Get GPS coordinates for a course
   *
   * @param courseId - Course identifier
   * @returns Coordinates for tees, greens, and other POIs
   *
   * Note: Coordinates use numeric POI codes (1=Tee, 11=GreenFront, 12=GreenCenter, etc.)
   * Not all courses have GPS coordinates available.
   */
  async getCoordinates(courseId: string): Promise<GolfApiCoordinatesResponse> {
    if (!courseId) {
      throw new Error('Course ID is required');
    }

    return this.request<GolfApiCoordinatesResponse>(
      `/coordinates/${courseId}`,
      undefined,
      { type: 'coordinates', id: courseId }
    );
  }

  /**
   * Search courses near a location
   *
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param radiusKm - Search radius in kilometers (default: 50)
   * @returns Array of nearby clubs with distance
   */
  async searchNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 50
  ): Promise<GolfApiClubSearchResult[]> {
    return this.searchClubs({
      latitude,
      longitude,
      radius: radiusKm,
    });
  }

  /**
   * Search courses by state (Australia)
   *
   * @param state - Australian state code (e.g., 'VIC', 'NSW')
   * @param query - Optional name search query
   * @returns Array of clubs in state
   */
  async searchByState(
    state: string,
    query?: string
  ): Promise<GolfApiClubSearchResult[]> {
    return this.searchClubs({
      country: DEFAULT_COUNTRY,
      state,
      query,
    });
  }

  /**
   * Get remaining API requests for current key
   *
   * Returns the cached value from the last API response.
   * To get a fresh value, make any API call or use checkQuota().
   *
   * @returns Number of remaining API requests, or null if unknown
   */
  getRemainingRequests(): number | null {
    return this._apiRequestsLeft;
  }

  /**
   * Check current API quota by making a minimal request
   *
   * @returns Number of remaining API requests, or null if check failed
   */
  async checkQuota(): Promise<number | null> {
    try {
      // Use a known club ID to check quota with minimal data transfer
      // Kingston Heath Golf Club - a well-known Australian course
      await this.getClub('141520610397251566');
      return this._apiRequestsLeft;
    } catch {
      return null;
    }
  }

  /**
   * Check if we have sufficient API quota
   *
   * @param required - Number of requests needed (default: 1)
   * @returns True if quota is sufficient or unknown
   */
  hasQuota(required: number = 1): boolean {
    // If we don't know quota, assume we have it
    if (this._apiRequestsLeft === null) {
      return true;
    }
    return this._apiRequestsLeft >= required;
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Singleton GolfAPI.io client instance
 */
export const golfApiClient = new GolfApiClient();

/**
 * Export client class for testing
 */
export { GolfApiClient };

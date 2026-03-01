/**
 * GolfAPI.io HTTP Client
 *
 * HTTP client for interacting with the GolfAPI.io REST API v2.3.
 * Base URL: https://www.golfapi.io/api/v2.3
 *
 * Features:
 * - Bearer token authentication
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
import {
  GOLFAPI_BASE_URL,
  DEFAULT_COUNTRY,
} from './golfApiTypes';

// =====================================================
// ERROR CLASSES
// =====================================================

/**
 * Base error class for GolfAPI errors
 */
export class GolfApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(error: GolfApiError) {
    super(error.message);
    this.name = 'GolfApiClientError';
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }
}

/**
 * Rate limit error with retry information
 */
export class RateLimitError extends GolfApiClientError {
  public readonly retryAfter: number;
  public readonly remaining: number;
  public readonly limit: number;

  constructor(error: GolfApiRateLimitError) {
    super(error);
    this.name = 'RateLimitError';
    this.retryAfter = error.retryAfter;
    this.remaining = error.remaining;
    this.limit = error.limit;
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends GolfApiClientError {
  public readonly resourceType: 'club' | 'course' | 'coordinates' | 'unknown';
  public readonly resourceId?: string;

  constructor(
    resourceType: 'club' | 'course' | 'coordinates' | 'unknown',
    resourceId?: string,
    message?: string
  ) {
    super({
      code: 'NOT_FOUND',
      message: message || `${resourceType} not found${resourceId ? `: ${resourceId}` : ''}`,
      status: 404,
    });
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Authentication error (401, 403)
 */
export class AuthenticationError extends GolfApiClientError {
  constructor(status: 401 | 403, message?: string) {
    super({
      code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
      message:
        message ||
        (status === 401
          ? 'Invalid or missing API key. Please check your EXPO_PUBLIC_GOLFAPI_IO_KEY.'
          : 'Access denied. Your API key may not have permission for this resource.'),
      status,
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Network/timeout error
 */
export class NetworkError extends Error {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}

// =====================================================
// CLIENT CONFIGURATION
// =====================================================

const DEFAULT_TIMEOUT = 20000; // 20 seconds

/**
 * Get configuration from environment variables
 */
function getConfig(): GolfApiClientConfig {
  const baseUrl =
    process.env.EXPO_PUBLIC_GOLFAPI_IO_URL || GOLFAPI_BASE_URL;
  const apiKey = process.env.EXPO_PUBLIC_GOLFAPI_IO_KEY;

  if (!apiKey) {
    throw new Error(
      'EXPO_PUBLIC_GOLFAPI_IO_KEY environment variable is not set'
    );
  }

  return {
    baseUrl,
    apiKey,
    timeout: DEFAULT_TIMEOUT,
    debug: __DEV__,
  };
}

// =====================================================
// HTTP CLIENT
// =====================================================

/**
 * GolfAPI.io HTTP Client
 */
class GolfApiClient {
  private config: GolfApiClientConfig;
  private isConfigured: boolean = false;

  /** Last known API requests remaining */
  private _apiRequestsLeft: number | null = null;

  /** Last request timestamp */
  private _lastRequestTime: Date | null = null;

  constructor() {
    // Defer configuration to first use
    this.config = {
      baseUrl: GOLFAPI_BASE_URL,
      apiKey: '',
      timeout: DEFAULT_TIMEOUT,
      debug: false,
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
   * Ensure client is configured before making requests
   */
  private ensureConfigured(): void {
    if (!this.isConfigured) {
      try {
        this.config = getConfig();
        this.isConfigured = true;
      } catch (error) {
        // In development, allow operation without API key
        if (__DEV__) {
          console.warn(
            '[GolfAPI] API not configured:',
            (error as Error).message
          );
          console.warn('[GolfAPI] Running in mock mode');
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Check if API is configured and available
   */
  public isAvailable(): boolean {
    try {
      this.ensureConfigured();
      return Boolean(this.config.apiKey && this.config.baseUrl);
    } catch {
      return false;
    }
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
   * Build URL with query parameters
   */
  private buildUrl(
    endpoint: string,
    params?: Record<string, unknown>
  ): string {
    // Ensure baseUrl ends without slash and endpoint starts without slash
    const baseUrl = (this.config.baseUrl ?? '').replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    const fullUrl = `${baseUrl}/${cleanEndpoint}`;

    const url = new URL(fullUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<GolfApiError> {
    try {
      const data = await response.json();
      return {
        code: data.code || `HTTP_${response.status}`,
        message: data.message || response.statusText,
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
   * Make authenticated HTTP request
   */
  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    params?: Record<string, unknown>,
    resourceInfo?: { type: 'club' | 'course' | 'coordinates' | 'unknown'; id?: string }
  ): Promise<T> {
    this.ensureConfigured();

    // Check if API is configured
    if (!this.config.apiKey) {
      throw new Error(
        'GolfAPI.io is not configured. Please set EXPO_PUBLIC_GOLFAPI_IO_KEY'
      );
    }

    const url = this.buildUrl(endpoint, method === 'GET' ? params : undefined);

    this.log(`${method} ${endpoint}`, params);
    this.log(`Base URL: ${this.config.baseUrl}`);
    this.log(`Full URL: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout || DEFAULT_TIMEOUT
    );

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: method === 'POST' ? JSON.stringify(params) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle authentication errors (401, 403)
      if (response.status === 401 || response.status === 403) {
        const error = await this.parseErrorResponse(response);
        throw new AuthenticationError(
          response.status as 401 | 403,
          error.message
        );
      }

      // Handle not found (404)
      if (response.status === 404) {
        throw new NotFoundError(
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
        throw new RateLimitError(rateLimitError);
      }

      // Handle other errors
      if (!response.ok) {
        const error = await this.parseErrorResponse(response);
        throw new GolfApiClientError(error);
      }

      const data = await response.json();
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
        error instanceof AuthenticationError
      ) {
        throw error;
      }

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(
          `Request timed out after ${this.config.timeout}ms`,
          error
        );
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
    // Map 'query' to 'name' for the API (GolfAPI.io uses 'name' param)
    const searchParams: Record<string, unknown> = {
      country: params.country || DEFAULT_COUNTRY,
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
      'GET',
      '/clubs',
      searchParams,
      { type: 'club' }
    );

    return response.clubs || [];
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
      'GET',
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
      'GET',
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
      'GET',
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

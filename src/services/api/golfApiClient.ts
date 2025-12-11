/**
 * GolfAPI.io HTTP Client
 *
 * HTTP client for interacting with the GolfAPI.io external API.
 * Features:
 * - Bearer token authentication
 * - Configurable timeout
 * - Error handling with custom error classes
 * - Rate limit detection (429 responses)
 * - Development logging
 */

import type {
  GolfApiSearchParams,
  GolfApiClubResponse,
  GolfApiCourseDetail,
  GolfApiPaginatedResponse,
  GolfApiError,
  GolfApiRateLimitError,
  GolfApiClientConfig,
} from './golfApiTypes';
import {
  DEFAULT_COUNTRY,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
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

const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Get configuration from environment variables
 */
function getConfig(): GolfApiClientConfig {
  const baseUrl = process.env.EXPO_PUBLIC_GOLFAPI_IO_URL;
  const apiKey = process.env.EXPO_PUBLIC_GOLFAPI_IO_KEY;

  if (!baseUrl) {
    throw new Error(
      'EXPO_PUBLIC_GOLFAPI_IO_URL environment variable is not set'
    );
  }

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

  constructor() {
    // Defer configuration to first use
    this.config = {
      baseUrl: '',
      apiKey: '',
      timeout: DEFAULT_TIMEOUT,
      debug: false,
    };
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
          console.warn('[GolfAPI] API not configured:', (error as Error).message);
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
  private buildUrl(endpoint: string, params?: Record<string, unknown>): string {
    const url = new URL(endpoint, this.config.baseUrl);

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
   * Make authenticated HTTP request
   */
  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    this.ensureConfigured();

    // Check if API is configured
    if (!this.config.apiKey) {
      throw new Error('GolfAPI.io is not configured. Please set EXPO_PUBLIC_GOLFAPI_IO_KEY');
    }

    const url = this.buildUrl(endpoint, method === 'GET' ? params : undefined);

    this.log(`${method} ${endpoint}`, params);

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

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        const rateLimitError: GolfApiRateLimitError = {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'API rate limit exceeded. Please try again later.',
          status: 429,
          retryAfter,
          remaining: 0,
          limit: parseInt(response.headers.get('X-RateLimit-Limit') || '100', 10),
        };
        throw new RateLimitError(rateLimitError);
      }

      // Handle other errors
      if (!response.ok) {
        const error = await this.parseErrorResponse(response);
        throw new GolfApiClientError(error);
      }

      const data = await response.json();
      this.log(`Response:`, data);

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Re-throw our custom errors
      if (error instanceof GolfApiClientError || error instanceof RateLimitError) {
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
        throw new NetworkError('Network request failed. Please check your connection.', error);
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
   * Search for golf clubs/courses
   *
   * @param params - Search parameters
   * @returns Paginated list of clubs
   */
  async searchClubs(
    params: GolfApiSearchParams
  ): Promise<GolfApiPaginatedResponse<GolfApiClubResponse>> {
    const searchParams = {
      ...params,
      country: params.country || DEFAULT_COUNTRY,
      limit: Math.min(params.limit || DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT),
      offset: params.offset || 0,
    };

    return this.request<GolfApiPaginatedResponse<GolfApiClubResponse>>(
      'GET',
      '/clubs/search',
      searchParams
    );
  }

  /**
   * Get single club details
   *
   * @param clubId - Club identifier
   * @returns Club details with courses list
   */
  async getClub(clubId: string): Promise<GolfApiClubResponse> {
    if (!clubId) {
      throw new Error('Club ID is required');
    }

    return this.request<GolfApiClubResponse>('GET', `/clubs/${clubId}`);
  }

  /**
   * Get detailed course information with hole-by-hole data
   *
   * @param courseId - Course identifier
   * @returns Full course details including holes and tees
   */
  async getCourseDetails(courseId: string): Promise<GolfApiCourseDetail> {
    if (!courseId) {
      throw new Error('Course ID is required');
    }

    return this.request<GolfApiCourseDetail>('GET', `/courses/${courseId}`);
  }

  /**
   * Search courses near a location
   *
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param radiusKm - Search radius in kilometers (default: 50)
   * @param limit - Maximum results to return
   * @returns Paginated list of nearby clubs
   */
  async searchNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    limit: number = DEFAULT_SEARCH_LIMIT
  ): Promise<GolfApiPaginatedResponse<GolfApiClubResponse>> {
    return this.searchClubs({
      latitude,
      longitude,
      radius: radiusKm,
      limit,
    });
  }

  /**
   * Search courses by state (Australia)
   *
   * @param state - Australian state code (e.g., 'VIC', 'NSW')
   * @param query - Optional name search query
   * @param limit - Maximum results to return
   * @returns Paginated list of clubs in state
   */
  async searchByState(
    state: string,
    query?: string,
    limit: number = DEFAULT_SEARCH_LIMIT
  ): Promise<GolfApiPaginatedResponse<GolfApiClubResponse>> {
    return this.searchClubs({
      country: DEFAULT_COUNTRY,
      state,
      query,
      limit,
    });
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

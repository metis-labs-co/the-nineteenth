/**
 * GolfAPI.io Error Classes
 *
 * Custom error classes for GolfAPI.io HTTP client error handling.
 * - GolfApiClientError — Base error for API responses
 * - RateLimitError — Rate limit exceeded (429)
 * - NotFoundError — Resource not found (404)
 * - AuthenticationError — Auth failures (401, 403)
 * - NetworkError — Network/timeout errors
 */

import type {
  GolfApiError,
  GolfApiRateLimitError,
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

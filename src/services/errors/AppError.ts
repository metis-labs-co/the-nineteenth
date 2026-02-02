/**
 * Application Error Class
 *
 * Standardized error class for consistent error handling across services.
 * Provides typed error codes and preserves original error context.
 *
 * @example
 * ```tsx
 * // Throwing errors
 * throw new AppError('User not found', 'NOT_FOUND');
 * throw AppError.fromError(dbError, 'DATABASE');
 *
 * // Catching errors
 * try {
 *   await fetchUser(id);
 * } catch (error) {
 *   if (isAppError(error) && error.code === 'NOT_FOUND') {
 *     // Handle not found
 *   }
 * }
 * ```
 */

/**
 * Standard error codes used across the application
 */
export type ErrorCode =
  | 'NOT_FOUND' // Resource not found
  | 'VALIDATION' // Invalid input or data
  | 'DATABASE' // Database operation failed
  | 'PERMISSION' // Access denied / RLS policy violation
  | 'NETWORK' // Network connectivity issue
  | 'TIMEOUT' // Operation timed out
  | 'CONFLICT' // Resource conflict (duplicate, race condition)
  | 'RATE_LIMIT' // Rate limit exceeded
  | 'AUTH' // Authentication failure
  | 'UNKNOWN'; // Unclassified error

/**
 * Application Error class with typed error codes
 *
 * Extends the standard Error class with:
 * - Typed error code for programmatic handling
 * - Original error preservation for debugging
 * - Static factory method for converting unknown errors
 */
export class AppError extends Error {
  /** Error code for programmatic handling */
  readonly code: ErrorCode;

  /** Original error if this was converted from another error */
  readonly originalError?: Error;

  /** Additional context data for debugging */
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    options?: { originalError?: Error; context?: Record<string, unknown> }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.originalError = options?.originalError;
    this.context = options?.context;

    // Maintains proper stack trace in V8 environments (Node, Chrome)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Create an AppError from an unknown error value
   *
   * Useful for catch blocks where the error type is unknown.
   * Preserves the original error for debugging.
   *
   * @param error - The unknown error value
   * @param code - Error code to assign (defaults to 'UNKNOWN')
   * @param context - Additional context for debugging
   */
  static fromError(
    error: unknown,
    code: ErrorCode = 'UNKNOWN',
    context?: Record<string, unknown>
  ): AppError {
    // Already an AppError - return as-is
    if (error instanceof AppError) {
      return error;
    }

    // Standard Error - wrap with context
    if (error instanceof Error) {
      return new AppError(error.message, code, {
        originalError: error,
        context,
      });
    }

    // String error
    if (typeof error === 'string') {
      return new AppError(error, code, { context });
    }

    // Unknown error type
    return new AppError(String(error), code, { context });
  }

  /**
   * Create an AppError from a Supabase error
   *
   * Maps common Supabase error codes to AppError codes.
   *
   * @param error - Supabase error object
   * @param fallbackCode - Code to use if no mapping found
   */
  static fromSupabaseError(
    error: { code?: string; message: string; details?: string; hint?: string },
    fallbackCode: ErrorCode = 'DATABASE'
  ): AppError {
    // Map Supabase error codes to AppError codes
    let code: ErrorCode = fallbackCode;

    if (error.code) {
      switch (error.code) {
        case 'PGRST116': // No rows found
          code = 'NOT_FOUND';
          break;
        case '42501': // RLS policy violation
        case 'PGRST301': // Permission denied
          code = 'PERMISSION';
          break;
        case '23505': // Unique constraint violation
        case '23503': // Foreign key violation
          code = 'CONFLICT';
          break;
        case '23502': // Not null violation
        case '22P02': // Invalid input syntax
          code = 'VALIDATION';
          break;
        case 'PGRST504': // Timeout
          code = 'TIMEOUT';
          break;
        default:
          code = fallbackCode;
      }
    }

    return new AppError(error.message, code, {
      context: {
        supabaseCode: error.code,
        details: error.details,
        hint: error.hint,
      },
    });
  }

  /**
   * Convert to a plain object for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
          }
        : undefined,
    };
  }
}

/**
 * Type guard to check if an error is an AppError
 *
 * @param error - Value to check
 * @returns True if the error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Create an AppError with the given message and code
 *
 * Convenience function for creating errors inline.
 *
 * @param message - Error message
 * @param code - Error code
 * @param context - Additional context
 */
export function createError(
  message: string,
  code: ErrorCode,
  context?: Record<string, unknown>
): AppError {
  return new AppError(message, code, { context });
}

/**
 * Assert a condition and throw an AppError if false
 *
 * @param condition - Condition to check
 * @param message - Error message if condition is false
 * @param code - Error code (defaults to 'VALIDATION')
 */
export function assertCondition(
  condition: unknown,
  message: string,
  code: ErrorCode = 'VALIDATION'
): asserts condition {
  if (!condition) {
    throw new AppError(message, code);
  }
}

/**
 * Assert a value is not null/undefined and throw if it is
 *
 * @param value - Value to check
 * @param message - Error message if value is null/undefined
 * @param code - Error code (defaults to 'NOT_FOUND')
 */
export function assertNotNull<T>(
  value: T | null | undefined,
  message: string,
  code: ErrorCode = 'NOT_FOUND'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new AppError(message, code);
  }
}

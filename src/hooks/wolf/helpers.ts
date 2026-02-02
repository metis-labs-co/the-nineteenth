/**
 * Wolf Hooks - Helper Functions
 *
 * Shared helper functions for Wolf hooks.
 */

import type { WolfServiceError, WolfServiceErrorCode } from '@/types/database/wolf.types';

/**
 * Creates a typed WolfServiceError
 */
export function createError(
  message: string,
  code: WolfServiceErrorCode
): WolfServiceError & Error {
  const error = new Error(message) as WolfServiceError & Error;
  error.code = code;
  return error;
}

/**
 * Type guard to check if an error is a WolfServiceError
 */
export function isWolfServiceError(error: unknown): error is WolfServiceError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    typeof (error as WolfServiceError).code === 'string' &&
    ['NOT_FOUND', 'VALIDATION', 'DATABASE', 'PERMISSION', 'TIE', 'UNKNOWN'].includes(
      (error as WolfServiceError).code
    )
  );
}

/**
 * Get a user-friendly error message from a WolfServiceError
 */
export function getWolfErrorMessage(error: unknown): string {
  if (isWolfServiceError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

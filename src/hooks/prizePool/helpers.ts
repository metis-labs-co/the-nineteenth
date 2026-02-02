/**
 * Prize Pool Hooks - Helper Functions
 *
 * Shared helper functions for prize pool hooks.
 */

import type { PrizePoolServiceError } from './types';

/**
 * Creates a typed PrizePoolServiceError
 */
export function createError(
  message: string,
  code: PrizePoolServiceError['code']
): PrizePoolServiceError {
  const error = new Error(message) as PrizePoolServiceError;
  error.code = code;
  return error;
}

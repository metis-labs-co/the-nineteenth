/**
 * Skins Hooks - Helper Functions
 *
 * Shared helper functions for skins hooks.
 */

import type { SkinsServiceError } from './types';

/**
 * Creates a typed SkinsServiceError
 */
export function createError(
  message: string,
  code: SkinsServiceError['code']
): SkinsServiceError {
  const error = new Error(message) as SkinsServiceError;
  error.code = code;
  return error;
}

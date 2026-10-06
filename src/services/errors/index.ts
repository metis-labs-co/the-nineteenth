/**
 * Error Handling Module
 *
 * Provides standardized error handling for the application.
 *
 * @example
 * ```tsx
 * import { AppError, isAppError, createError } from '@/services/errors';
 *
 * // Throwing errors
 * throw new AppError('User not found', 'NOT_FOUND');
 * throw createError('Invalid input', 'VALIDATION');
 *
 * // Converting unknown errors
 * try {
 *   await someOperation();
 * } catch (error) {
 *   throw AppError.fromError(error, 'DATABASE');
 * }
 *
 * // Type-safe error handling
 * if (isAppError(error)) {
 *   switch (error.code) {
 *     case 'NOT_FOUND':
 *       // Handle not found
 *       break;
 *     case 'PERMISSION':
 *       // Handle permission denied
 *       break;
 *   }
 * }
 * ```
 */

export {
  // Main error class
  AppError,
  // Type guard
  isAppError,
  // Factory functions
  createError,
  // Assertion helpers
  assertCondition,
  assertNotNull,
  assertNoDbError,
  // Types
  type ErrorCode,
} from './AppError';

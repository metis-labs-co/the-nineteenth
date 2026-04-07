/**
 * Score Mismatch Hooks - Type Definitions
 *
 * Types specific to the score mismatch module.
 */

/**
 * Resolution result type
 */
export interface ResolveMismatchResult {
  alreadyResolved: boolean;
  resolvedBy?: string;
}

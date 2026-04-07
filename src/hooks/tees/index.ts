/**
 * Tee Hooks - Module Index
 *
 * TanStack Query hooks for tee data fetching and mutations.
 * Tees are stored in a separate table (not JSONB in courses).
 *
 * ### Query Hooks
 * - `useTeesByCourse(courseId)` - Get all tees for a course
 * - `useTeeById(teeId)` - Get single tee by ID
 * - `useTeesWithCourse(courseId)` - Get tees with parent course info
 * - `useDefaultTee(courseId)` - Get default/recommended tee for a course
 * - `useTeesByGender(courseId, gender)` - Get tees filtered by gender
 *
 * ### Mutation Hooks
 * - `useCreateTee()` - Create a new tee
 * - `useUpdateTee()` - Update an existing tee
 * - `useDeleteTee()` - Delete a tee
 * - `useBulkCreateTees()` - Bulk create tees for a course (API import)
 *
 * @example
 * ```tsx
 * // Import from the tees module
 * import { useTeesByCourse, useCreateTee } from '@/hooks/tees';
 *
 * // Or import the entire module
 * import * as tees from '@/hooks/tees';
 * ```
 *
 * Added January 2026 for GolfAPI.io integration
 */

// Re-export types
export type {
  TeeWithCourse,
  CreateTeeInput,
  UpdateTeeInput,
} from './types';

// Re-export query hooks
export {
  useTeesByCourse,
  useTeeById,
  useTeesWithCourse,
  useDefaultTee,
  useTeesByGender,
} from './queries';

// Re-export mutation hooks
export {
  useCreateTee,
  useUpdateTee,
  useDeleteTee,
  useBulkCreateTees,
} from './mutations';

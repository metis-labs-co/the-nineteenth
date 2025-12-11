/**
 * AddCourseModal - Re-export for backward compatibility
 *
 * The implementation has been refactored into:
 * - ./AddCourseModal/index.tsx - Main entry point
 * - ./AddCourseModal/types.ts - Shared types and constants
 * - ./AddCourseModal/hooks/useAddCourseWizard.ts - Wizard state management
 * - ./AddCourseModal/hooks/useTeeManagement.ts - Tee box editing state
 * - ./AddCourseModal/steps/VenueDetailsStep.tsx - Step 1
 * - ./AddCourseModal/steps/CourseTeesStep.tsx - Step 2
 * - ./AddCourseModal/steps/HoleDataStep.tsx - Step 3
 */

export { AddCourseModal, type AddCourseModalProps } from './AddCourseModal/index';

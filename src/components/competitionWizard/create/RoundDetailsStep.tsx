/**
 * RoundDetailsStep - Re-export for backward compatibility
 *
 * The implementation has been refactored into:
 * - ./RoundDetailsStep/index.tsx - Main entry point
 * - ./RoundDetailsStep/types.ts - Shared types and constants
 * - ./RoundDetailsStep/hooks/useRoundDetailsForm.ts - Form state management
 * - ./RoundDetailsStep/components/RoundCard.tsx - Individual round card
 * - ./RoundDetailsStep/components/MatchTypeModal.tsx - Match type selection modal
 * - ./RoundDetailsStep/components/CourseSelectionModal.tsx - Course selection modal
 * - ./RoundDetailsStep/components/TeeSelectionModal.tsx - Tee selection modal
 */

export { default } from './RoundDetailsStep/index';
export type { RoundDetailsStepProps } from './RoundDetailsStep/index';

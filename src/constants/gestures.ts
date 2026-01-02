/**
 * Swipe gesture configuration constants
 * Used by useSwipeToDelete hook for consistent swipe-to-delete behavior
 */
export const SWIPE_GESTURE = {
  /** Width of the delete button revealed on swipe */
  DELETE_BUTTON_WIDTH: 80,
  /** Minimum swipe distance before triggering open/close */
  SWIPE_THRESHOLD: 40,
  /** Spring animation tension */
  ANIMATION_TENSION: 40,
  /** Spring animation friction */
  ANIMATION_FRICTION: 8,
  /** Minimum horizontal movement to trigger gesture */
  MIN_MOVEMENT: 10,
  /** Overscroll resistance factor (0-1, lower = more resistance) */
  OVERSCROLL_RESISTANCE: 0.2,
  /** Velocity threshold for flick gesture detection */
  VELOCITY_THRESHOLD: 0.3,
} as const;

export type SwipeGestureConfig = typeof SWIPE_GESTURE;

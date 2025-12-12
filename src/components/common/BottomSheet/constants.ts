/**
 * BottomSheet Constants
 *
 * Animation defaults and dimension constants for the BottomSheet component.
 */

import { Dimensions } from 'react-native';

// Screen dimensions
export const SCREEN_HEIGHT = Dimensions.get('window').height;
export const SCREEN_WIDTH = Dimensions.get('window').width;

// Default sheet heights
export const DEFAULT_SHEET_HEIGHT_RATIO = 0.8; // 80% of screen
export const FULL_SCREEN_HEIGHT_RATIO = 1; // 100% of screen

// Animation defaults
export const DEFAULT_ANIMATION_CONFIG = {
  damping: 20,
  stiffness: 150,
  backdropOpenDuration: 200,
  backdropCloseDuration: 150,
} as const;

// Gesture defaults
export const DEFAULT_SWIPE_THRESHOLD = 0.3; // 30% of sheet height
export const SWIPE_VELOCITY_THRESHOLD = 500; // Pixels per second

// Visual constants
export const HANDLE_WIDTH = 40;
export const HANDLE_HEIGHT = 4;
export const HEADER_HEIGHT = 56;
export const CLOSE_BUTTON_SIZE = 44; // Accessibility minimum

// Backdrop
export const BACKDROP_OPACITY = 0.5;

// Border radius
export const SHEET_BORDER_RADIUS = 20;

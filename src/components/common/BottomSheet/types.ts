/**
 * BottomSheet Component Types
 *
 * Unified bottom sheet component supporting both full-screen and partial modes
 * with consistent spring animations and swipe-to-dismiss gestures.
 */

import type { ReactNode } from 'react';
import type { ViewStyle, StyleProp } from 'react-native';

/**
 * Height configuration for BottomSheet
 * - 'full': 100% screen coverage
 * - number: Percentage of screen (0.8 = 80%)
 */
export type BottomSheetHeight = 'full' | number;

/**
 * Animation configuration for BottomSheet
 */
export interface BottomSheetAnimationConfig {
  /** Spring damping for open/close. Default: 20 */
  damping?: number;
  /** Spring stiffness for open/close. Default: 150 */
  stiffness?: number;
  /** Backdrop fade-in duration in ms. Default: 200 */
  backdropOpenDuration?: number;
  /** Backdrop fade-out duration in ms. Default: 150 */
  backdropCloseDuration?: number;
}

/**
 * Props for the BottomSheet component
 */
export interface BottomSheetProps {
  // === Core Props ===

  /** Controls visibility of the bottom sheet */
  visible: boolean;

  /** Callback when sheet is dismissed (backdrop tap, swipe, close button) */
  onClose: () => void;

  /** Content to render inside the sheet */
  children: ReactNode;

  // === Height Configuration ===

  /**
   * Sheet height configuration
   * - 'full': Full screen (100%)
   * - number: Percentage of screen (0.8 = 80%)
   * @default 0.8
   */
  height?: BottomSheetHeight;

  // === Handle & Header ===

  /**
   * Show draggable handle bar at top
   * @default true (for partial) / false (for full)
   */
  showHandle?: boolean;

  /**
   * Title for the header
   */
  title?: string;

  /**
   * Show close button (X) in header
   * @default true
   */
  showCloseButton?: boolean;

  /**
   * Left header content (e.g., back button)
   */
  headerLeft?: ReactNode;

  /**
   * Right header content (e.g., action button)
   * Note: If showCloseButton is true, this is placed before the close button
   */
  headerRight?: ReactNode;

  /**
   * Custom header component (replaces default header entirely)
   */
  customHeader?: ReactNode;

  // === Backdrop Configuration ===

  /**
   * Show backdrop overlay
   * @default true
   */
  showBackdrop?: boolean;

  /**
   * Close sheet when backdrop is tapped
   * @default true
   */
  closeOnBackdropPress?: boolean;

  // === Gestures ===

  /**
   * Enable swipe down to dismiss gesture
   * @default true
   */
  enableSwipeToDismiss?: boolean;

  /**
   * Threshold for swipe dismiss (percentage of sheet height)
   * @default 0.3
   */
  swipeThreshold?: number;

  // === Keyboard Handling ===

  /**
   * Behavior for keyboard avoidance
   * @default 'padding' on iOS, 'height' on Android
   */
  keyboardBehavior?: 'padding' | 'height' | 'position' | 'none';

  // === Safe Area ===

  /**
   * Include safe area inset at bottom
   * @default true
   */
  safeAreaBottom?: boolean;

  /**
   * Include safe area inset at top (for full-screen)
   * @default false (for partial) / true (for full)
   */
  safeAreaTop?: boolean;

  // === Animation ===

  /**
   * Custom animation configuration
   */
  animationConfig?: BottomSheetAnimationConfig;

  // === Styling ===

  /**
   * Style for the sheet container
   */
  containerStyle?: StyleProp<ViewStyle>;

  /**
   * Style for the content area (below header)
   */
  contentStyle?: StyleProp<ViewStyle>;

  /**
   * Test ID for testing
   */
  testID?: string;

  /**
   * Render inside a React Native Modal for proper positioning
   * when nested inside another BottomSheet or absolute container.
   * @default false
   */
  useModal?: boolean;
}

/**
 * Props for the BottomSheetHeader component
 */
export interface BottomSheetHeaderProps {
  /** Title text */
  title?: string;

  /** Show close button */
  showCloseButton?: boolean;

  /** Close button handler */
  onClose: () => void;

  /** Left side content */
  headerLeft?: ReactNode;

  /** Right side content (before close button) */
  headerRight?: ReactNode;

  /** Show the handle bar above the header */
  showHandle?: boolean;
}

/**
 * Return type for useBottomSheet hook
 */
export interface UseBottomSheetReturn {
  /** Open the bottom sheet */
  open: () => void;
  /** Close the bottom sheet */
  close: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Current visibility state */
  isOpen: boolean;
}

/**
 * Options for useBottomSheetAnimation hook
 */
export interface UseBottomSheetAnimationOptions {
  /** Controls visibility of the bottom sheet */
  visible: boolean;
  /** Height of the sheet in pixels */
  sheetHeight: number;
  /** Animation configuration */
  animationConfig?: BottomSheetAnimationConfig;
  /** Callback when close animation completes */
  onCloseComplete?: () => void;
}

/**
 * Options for useBottomSheetGestures hook
 */
export interface UseBottomSheetGesturesOptions {
  /** Current translateY animated value */
  translateY: import('react-native').Animated.Value;
  /** Height of the sheet in pixels */
  sheetHeight: number;
  /** Enable/disable gestures */
  enabled: boolean;
  /** Swipe threshold (0-1) */
  swipeThreshold: number;
  /** Callback when swipe dismisses the sheet */
  onDismiss: () => void;
  /** Animation configuration for snap-back */
  animationConfig?: BottomSheetAnimationConfig;
}

/**
 * useSwipeToDelete - Shared hook for swipe-to-delete gesture functionality
 *
 * Provides PanResponder and Animated logic for swipe-to-delete behavior
 * with consistent animations and overscroll resistance.
 *
 * @example
 * ```tsx
 * const { translateX, panResponder, isSwipeOpen, closeSwipe } = useSwipeToDelete({
 *   enabled: true,
 * });
 *
 * return (
 *   <View style={styles.swipeContainer}>
 *     <DeleteButton onPress={handleDelete} />
 *     <Animated.View
 *       style={[{ transform: [{ translateX }] }]}
 *       {...panResponder.panHandlers}
 *     >
 *       <CardContent />
 *     </Animated.View>
 *   </View>
 * );
 * ```
 */

import { useRef, useCallback } from 'react';
import { Animated, PanResponder, PanResponderInstance } from 'react-native';
import { SWIPE_GESTURE } from '@/constants/gestures';

export interface UseSwipeToDeleteOptions {
  /** Whether swipe gesture is enabled (default: true) */
  enabled?: boolean;
  /** Custom delete button width (default: 80) */
  deleteButtonWidth?: number;
}

export interface UseSwipeToDeleteReturn {
  /** Animated value for translateX transform */
  translateX: Animated.Value;
  /** PanResponder to spread onto Animated.View */
  panResponder: PanResponderInstance;
  /** Ref indicating if swipe is currently open */
  isSwipeOpen: React.MutableRefObject<boolean>;
  /** Function to close the swipe programmatically */
  closeSwipe: () => void;
  /** Function to open the swipe programmatically */
  openSwipe: () => void;
}

/**
 * Hook for swipe-to-delete gesture functionality
 * Handles PanResponder and Animated logic for swipe-to-delete
 */
export function useSwipeToDelete(
  options: UseSwipeToDeleteOptions = {}
): UseSwipeToDeleteReturn {
  const {
    enabled = true,
    deleteButtonWidth = SWIPE_GESTURE.DELETE_BUTTON_WIDTH,
  } = options;

  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipeOpen = useRef(false);

  const closeSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: SWIPE_GESTURE.ANIMATION_TENSION,
      friction: SWIPE_GESTURE.ANIMATION_FRICTION,
    }).start(() => {
      isSwipeOpen.current = false;
    });
  }, [translateX]);

  const openSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: -deleteButtonWidth,
      useNativeDriver: true,
      tension: SWIPE_GESTURE.ANIMATION_TENSION,
      friction: SWIPE_GESTURE.ANIMATION_FRICTION,
    }).start(() => {
      isSwipeOpen.current = true;
    });
  }, [translateX, deleteButtonWidth]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!enabled) return false;
        // Only respond to horizontal swipes
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMovedEnough = Math.abs(gestureState.dx) > SWIPE_GESTURE.MIN_MOVEMENT;
        return isHorizontal && hasMovedEnough;
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new position based on current open state
        const basePosition = isSwipeOpen.current ? -deleteButtonWidth : 0;
        let newValue = basePosition + gestureState.dx;

        // Clamp with overscroll resistance
        if (newValue > 0) {
          // Resistance when swiping right past 0
          newValue = newValue * SWIPE_GESTURE.OVERSCROLL_RESISTANCE;
        } else if (newValue < -deleteButtonWidth) {
          // Resistance when overscrolling left
          const overscroll = newValue + deleteButtonWidth;
          newValue = -deleteButtonWidth + overscroll * SWIPE_GESTURE.OVERSCROLL_RESISTANCE;
        }

        translateX.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const basePosition = isSwipeOpen.current ? -deleteButtonWidth : 0;
        const finalPosition = basePosition + gestureState.dx;

        // Determine if we should open or close based on threshold and velocity
        const shouldOpen =
          finalPosition < -SWIPE_GESTURE.SWIPE_THRESHOLD ||
          gestureState.vx < -SWIPE_GESTURE.VELOCITY_THRESHOLD;
        const shouldClose =
          finalPosition > -SWIPE_GESTURE.SWIPE_THRESHOLD ||
          gestureState.vx > SWIPE_GESTURE.VELOCITY_THRESHOLD;

        if (isSwipeOpen.current) {
          // Currently open - check if we should close
          if (shouldClose) {
            closeSwipe();
          } else {
            openSwipe();
          }
        } else {
          // Currently closed - check if we should open
          if (shouldOpen) {
            openSwipe();
          } else {
            closeSwipe();
          }
        }
      },
      onPanResponderTerminate: () => {
        // Reset to appropriate position
        if (isSwipeOpen.current) {
          openSwipe();
        } else {
          closeSwipe();
        }
      },
    })
  ).current;

  return {
    translateX,
    panResponder,
    isSwipeOpen,
    closeSwipe,
    openSwipe,
  };
}

export { SWIPE_GESTURE };

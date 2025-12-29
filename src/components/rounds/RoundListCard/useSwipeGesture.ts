// src/components/rounds/RoundListCard/useSwipeGesture.ts

import { useRef, useCallback } from 'react';
import { Animated, PanResponder, PanResponderInstance } from 'react-native';

const DELETE_BUTTON_WIDTH = 80;
const SWIPE_THRESHOLD = 40;

export interface UseSwipeGestureResult {
  translateX: Animated.Value;
  panResponder: PanResponderInstance;
  isSwipeOpen: React.MutableRefObject<boolean>;
  closeSwipe: () => void;
  openSwipe: () => void;
}

/**
 * Custom hook for swipe gesture functionality
 * Handles PanResponder and Animated logic for swipe-to-delete
 */
export function useSwipeGesture(enabled: boolean): UseSwipeGestureResult {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipeOpen = useRef(false);

  const closeSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start(() => {
      isSwipeOpen.current = false;
    });
  }, [translateX]);

  const openSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: -DELETE_BUTTON_WIDTH,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start(() => {
      isSwipeOpen.current = true;
    });
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!enabled) return false;
        // Only respond to horizontal left swipes
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMovedEnough = Math.abs(gestureState.dx) > 10;
        return isHorizontal && hasMovedEnough;
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new position based on current open state
        const basePosition = isSwipeOpen.current ? -DELETE_BUTTON_WIDTH : 0;
        let newValue = basePosition + gestureState.dx;

        // Clamp between -DELETE_BUTTON_WIDTH and 0 (with slight overscroll resistance)
        if (newValue > 0) {
          newValue = newValue * 0.2; // Resistance when swiping right past 0
        } else if (newValue < -DELETE_BUTTON_WIDTH) {
          const overscroll = newValue + DELETE_BUTTON_WIDTH;
          newValue = -DELETE_BUTTON_WIDTH + overscroll * 0.2; // Resistance when overscrolling left
        }

        translateX.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const basePosition = isSwipeOpen.current ? -DELETE_BUTTON_WIDTH : 0;
        const finalPosition = basePosition + gestureState.dx;

        // Determine if we should open or close based on threshold and velocity
        const shouldOpen = finalPosition < -SWIPE_THRESHOLD || gestureState.vx < -0.3;
        const shouldClose = finalPosition > -SWIPE_THRESHOLD || gestureState.vx > 0.3;

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

export { DELETE_BUTTON_WIDTH };

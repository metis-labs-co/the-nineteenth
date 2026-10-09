/**
 * useBottomSheetGestures - Gesture handling for swipe-to-dismiss
 *
 * Manages:
 * - Pan gesture tracking
 * - Velocity-based and distance-based dismissal
 * - Snap-back animation when gesture doesn't meet threshold
 */

import { useRef, useCallback, useMemo, useEffect } from 'react';
import { Animated, PanResponder, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';
import { DEFAULT_ANIMATION_CONFIG, SWIPE_VELOCITY_THRESHOLD } from '../constants';
import type { UseBottomSheetGesturesOptions } from '../types';

interface UseBottomSheetGesturesReturn {
  /** PanResponder handlers to spread on the gesture target */
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  /** Whether a gesture is currently active */
  isGestureActive: React.MutableRefObject<boolean>;
}

export function useBottomSheetGestures({
  translateY,
  sheetHeight,
  enabled,
  swipeThreshold,
  onDismiss,
  animationConfig,
}: UseBottomSheetGesturesOptions): UseBottomSheetGesturesReturn {
  const isGestureActive = useRef(false);
  const gestureStartY = useRef(0);

  const config = useMemo(() => ({
    ...DEFAULT_ANIMATION_CONFIG,
    ...animationConfig,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animationConfig is stable from parent props
  }), []);

  // Determine if the swipe should dismiss the sheet
  const shouldDismiss = useCallback(
    (velocity: number, distance: number): boolean => {
      // High velocity swipe down = dismiss
      if (velocity > SWIPE_VELOCITY_THRESHOLD) {
        return true;
      }
      // Distance exceeds threshold = dismiss
      if (distance > sheetHeight * swipeThreshold) {
        return true;
      }
      return false;
    },
    [sheetHeight, swipeThreshold]
  );

  // Snap back to open position
  const snapBack = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: config.damping,
      stiffness: config.stiffness,
    }).start();
  }, [translateY, config]);

  // PanResponder is retained across renders; its callbacks must read current props.
  const latest = useRef({ enabled, translateY, shouldDismiss, onDismiss, snapBack });
  latest.current = { enabled, translateY, shouldDismiss, onDismiss, snapBack };

  useEffect(() => {
    if (!enabled && isGestureActive.current) {
      isGestureActive.current = false;
      translateY.flattenOffset();
      snapBack();
    }
  }, [enabled, translateY, snapBack]);

  // Create pan responder
  const panResponder = useRef(
    PanResponder.create({
      // Only respond if gestures are enabled and it's a downward swipe
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (
        _event: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        // Only capture if enabled and user is swiping down
        return latest.current.enabled && gestureState.dy > 10;
      },
      onMoveShouldSetPanResponderCapture: () => false,

      onPanResponderGrant: (_event, gestureState) => {
        if (!latest.current.enabled) return;
        isGestureActive.current = true;
        gestureStartY.current = gestureState.y0;
        // Extract current offset from animated value
        latest.current.translateY.extractOffset();
      },

      onPanResponderMove: (_event, gestureState) => {
        if (!latest.current.enabled || !isGestureActive.current) return;
        // Only allow downward movement (positive dy)
        const newValue = Math.max(0, gestureState.dy);
        latest.current.translateY.setValue(newValue);
      },

      onPanResponderRelease: (_event, gestureState) => {
        if (!isGestureActive.current) return;
        isGestureActive.current = false;
        const current = latest.current;
        current.translateY.flattenOffset();

        const velocity = gestureState.vy;
        const distance = gestureState.dy;

        if (current.enabled && current.shouldDismiss(velocity, distance)) {
          current.onDismiss();
        } else {
          current.snapBack();
        }
      },

      onPanResponderTerminate: () => {
        if (!isGestureActive.current) return;
        isGestureActive.current = false;
        latest.current.translateY.flattenOffset();
        latest.current.snapBack();
      },
    })
  ).current;

  return {
    panHandlers: enabled ? panResponder.panHandlers : {},
    isGestureActive,
  };
}

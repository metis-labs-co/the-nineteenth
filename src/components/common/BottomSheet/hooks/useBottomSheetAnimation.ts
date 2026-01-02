/**
 * useBottomSheetAnimation - Animation logic for the bottom sheet
 *
 * Manages:
 * - Sheet slide up/down animation with spring physics
 * - Backdrop fade animation
 * - Supports dynamic height configuration
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Animated } from 'react-native';
import { DEFAULT_ANIMATION_CONFIG } from '../constants';
import type { UseBottomSheetAnimationOptions } from '../types';

interface UseBottomSheetAnimationReturn {
  /** Animated value for Y translation */
  translateY: Animated.Value;
  /** Animated value for backdrop opacity */
  backdropOpacity: Animated.Value;
  /** Animate to open position */
  animateOpen: () => void;
  /** Animate to closed position */
  animateClose: (callback?: () => void) => void;
  /** Reset animation values without animating */
  resetAnimation: () => void;
}

export function useBottomSheetAnimation({
  visible,
  sheetHeight,
  animationConfig,
  onCloseComplete,
}: UseBottomSheetAnimationOptions): UseBottomSheetAnimationReturn {
  // Merge with defaults - memoize to avoid dependency changes
  const config = useMemo(() => ({
    ...DEFAULT_ANIMATION_CONFIG,
    ...animationConfig,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animationConfig is stable from parent props
  }), []);

  // Animation values - start off-screen
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Track if component is mounted
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Animate to open position
  const animateOpen = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: config.damping,
        stiffness: config.stiffness,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: config.backdropOpenDuration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, backdropOpacity, config]);

  // Animate to closed position
  const animateClose = useCallback(
    (callback?: () => void) => {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: sheetHeight,
          useNativeDriver: true,
          damping: config.damping,
          stiffness: config.stiffness,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: config.backdropCloseDuration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted.current) {
          // Call callback first (e.g., navigation.goBack)
          // Only call onCloseComplete if no callback was provided,
          // as navigation will handle unmounting when a callback navigates away
          if (callback) {
            callback();
          } else {
            onCloseComplete?.();
          }
        }
      });
    },
    [translateY, backdropOpacity, sheetHeight, config, onCloseComplete]
  );

  // Reset without animation
  const resetAnimation = useCallback(() => {
    translateY.setValue(sheetHeight);
    backdropOpacity.setValue(0);
  }, [translateY, backdropOpacity, sheetHeight]);

  // Respond to visibility changes
  useEffect(() => {
    if (visible) {
      animateOpen();
    } else {
      // Animate close when visible becomes false
      // This ensures the backdrop properly fades out even when close is triggered
      // by setting visible=false directly (e.g., from custom headers)
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: sheetHeight,
          useNativeDriver: true,
          damping: config.damping,
          stiffness: config.stiffness,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: config.backdropCloseDuration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted.current) {
          onCloseComplete?.();
        }
      });
    }
  }, [visible, animateOpen, translateY, backdropOpacity, sheetHeight, config, onCloseComplete]);

  // Update sheet height if it changes while open
  useEffect(() => {
    if (!visible) {
      translateY.setValue(sheetHeight);
    }
  }, [sheetHeight, visible, translateY]);

  return {
    translateY,
    backdropOpacity,
    animateOpen,
    animateClose,
    resetAnimation,
  };
}

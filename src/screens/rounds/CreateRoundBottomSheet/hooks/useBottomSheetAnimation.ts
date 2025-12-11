/**
 * useBottomSheetAnimation - Animation logic for the bottom sheet
 *
 * Manages:
 * - Sheet slide up/down animation
 * - Backdrop fade animation
 */

import { useRef, useEffect } from 'react';
import { Animated, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
export const SHEET_HEIGHT = SCREEN_HEIGHT * 0.8;

interface UseBottomSheetAnimationOptions {
  visible: boolean;
}

interface UseBottomSheetAnimationReturn {
  translateY: Animated.Value;
  backdropOpacity: Animated.Value;
  sheetHeight: number;
}

export function useBottomSheetAnimation({
  visible,
}: UseBottomSheetAnimationOptions): UseBottomSheetAnimationReturn {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Open animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 150,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: SHEET_HEIGHT,
          useNativeDriver: true,
          damping: 20,
          stiffness: 150,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  return {
    translateY,
    backdropOpacity,
    sheetHeight: SHEET_HEIGHT,
  };
}

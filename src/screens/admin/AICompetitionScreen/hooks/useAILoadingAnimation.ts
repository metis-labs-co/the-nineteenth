/**
 * useAILoadingAnimation - Manages loading animations for AI generation
 *
 * Handles spin animation, dot animations, and loading step progression
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

interface UseAILoadingAnimationReturn {
  spinValue: Animated.Value;
  dotOpacity1: Animated.Value;
  dotOpacity2: Animated.Value;
  dotOpacity3: Animated.Value;
  loadingStep: number;
  spin: Animated.AnimatedInterpolation<string>;
}

export function useAILoadingAnimation(isLoading: boolean): UseAILoadingAnimationReturn {
  const spinValue = useRef(new Animated.Value(0)).current;
  const dotOpacity1 = useRef(new Animated.Value(1)).current;
  const dotOpacity2 = useRef(new Animated.Value(0.3)).current;
  const dotOpacity3 = useRef(new Animated.Value(0.3)).current;
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (isLoading) {
      // Reset loading step
      setLoadingStep(0);

      // Spin animation for the progress circle
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();

      // Dots animation
      const dotsAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dotOpacity1, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity2, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity3, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(dotOpacity1, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity2, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(dotOpacity2, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity3, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      dotsAnimation.start();

      // Progress through loading steps
      const stepTimers = [
        setTimeout(() => setLoadingStep(1), 1500),
        setTimeout(() => setLoadingStep(2), 3500),
      ];

      return () => {
        spinAnimation.stop();
        dotsAnimation.stop();
        stepTimers.forEach(clearTimeout);
        spinValue.setValue(0);
      };
    }
  }, [isLoading, spinValue, dotOpacity1, dotOpacity2, dotOpacity3]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return {
    spinValue,
    dotOpacity1,
    dotOpacity2,
    dotOpacity3,
    loadingStep,
    spin,
  };
}

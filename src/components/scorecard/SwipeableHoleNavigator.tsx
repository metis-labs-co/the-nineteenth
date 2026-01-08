/**
 * SwipeableHoleNavigator
 *
 * A wrapper component that enables swipe gesture navigation between holes.
 * Uses React Native's built-in PanResponder + Animated API.
 *
 * Features:
 * - Swipe left to go to next hole
 * - Swipe right to go to previous hole
 * - Carousel-style slide transitions showing incoming hole content
 * - Rubber band effect at boundaries (hole 1 and 18)
 * - Does not interfere with vertical ScrollView scrolling
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  View,
  Easing,
} from 'react-native';
import { SWIPE_GESTURE } from '@/constants/gestures';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.15; // 15% of screen width to trigger
const VELOCITY_THRESHOLD = 0.25; // PanResponder velocity units

// Animation configuration - faster, snappier transitions
const SLIDE_DURATION = 250; // ms for the full slide transition

interface SwipeableHoleNavigatorProps {
  /** Current hole number (1-18) */
  currentHole: number;
  /** Total number of holes (typically 18) */
  totalHoles: number;
  /** Callback when hole changes */
  onHoleChange: (newHole: number) => void;
  /** Render function to render content for any hole number */
  renderHole: (holeNumber: number) => React.ReactNode;
  /** Whether swipe gestures are enabled (default: true) */
  enabled?: boolean;
}

export function SwipeableHoleNavigator({
  currentHole,
  totalHoles,
  onHoleChange,
  renderHole,
  enabled = true,
}: SwipeableHoleNavigatorProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const currentHoleRef = useRef(currentHole);
  // Track animation progress synchronously for smooth continuation
  const currentProgressRef = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Track target hole during transition to render incoming content
  const [transitionTarget, setTransitionTarget] = useState<{
    hole: number;
    direction: 'left' | 'right';
  } | null>(null);

  // Refs to avoid stale closures in PanResponder
  const enabledRef = useRef(enabled);
  const isAnimatingRef = useRef(isAnimating);
  const totalHolesRef = useRef(totalHoles);
  // These will be assigned after the callbacks are defined
  const animateToHoleRef = useRef<((targetHole: number, direction: 'left' | 'right', startFromCurrentPosition?: boolean) => void) | null>(null);
  const springBackRef = useRef<(() => void) | null>(null);
  const setTransitionTargetRef = useRef(setTransitionTarget);

  // Keep refs in sync with props/state for use in PanResponder callbacks
  useEffect(() => {
    currentHoleRef.current = currentHole;
  }, [currentHole]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  useEffect(() => {
    totalHolesRef.current = totalHoles;
  }, [totalHoles]);

  useEffect(() => {
    setTransitionTargetRef.current = setTransitionTarget;
  }, []);

  // Reset animation when hole changes externally (not from our transition)
  useEffect(() => {
    if (!transitionTarget) {
      slideAnim.setValue(0);
    }
  }, [currentHole, transitionTarget, slideAnim]);

  const animateToHole = useCallback((targetHole: number, direction: 'left' | 'right', startFromCurrentPosition = false) => {
    if (isAnimating) return;
    setIsAnimating(true);

    // Set target to render incoming hole content
    setTransitionTarget({ hole: targetHole, direction });

    // Target value: -1 for left (next hole), 1 for right (previous hole)
    const targetValue = direction === 'left' ? -1 : 1;

    // Calculate remaining progress (progress is now signed)
    const currentProgress = startFromCurrentPosition ? currentProgressRef.current : 0;
    const remainingProgress = 1 - Math.abs(currentProgress);

    // Slide animation with both panels moving together
    Animated.timing(slideAnim, {
      toValue: targetValue,
      duration: SLIDE_DURATION * remainingProgress,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start(() => {
      // Update hole, reset position, clear transition
      onHoleChange(targetHole);
      slideAnim.setValue(0);
      currentProgressRef.current = 0;
      setTransitionTarget(null);
      setIsAnimating(false);
    });
  }, [isAnimating, slideAnim, onHoleChange]);

  const springBack = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: SWIPE_GESTURE.ANIMATION_TENSION,
      friction: SWIPE_GESTURE.ANIMATION_FRICTION,
    }).start(() => {
      currentProgressRef.current = 0;
      setTransitionTarget(null);
      setIsAnimating(false);
    });
  }, [slideAnim]);

  // Keep callback refs in sync (defined after callbacks to avoid "used before declaration" error)
  useEffect(() => {
    animateToHoleRef.current = animateToHole;
  }, [animateToHole]);

  useEffect(() => {
    springBackRef.current = springBack;
  }, [springBack]);

  const panResponder = useRef(
    PanResponder.create({
      // Only become responder if horizontal gesture detected
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Use refs to avoid stale closures
        if (!enabledRef.current || isAnimatingRef.current) return false;
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMovedEnough = Math.abs(gestureState.dx) > 10;
        return isHorizontal && hasMovedEnough;
      },

      onMoveShouldSetPanResponderCapture: () => false,

      onPanResponderGrant: () => {
        slideAnim.stopAnimation();
      },

      onPanResponderMove: (_, gestureState) => {
        // Use refs to avoid stale closures
        if (isAnimatingRef.current) return;

        const hole = currentHoleRef.current;
        const totalHolesValue = totalHolesRef.current;
        let dx = gestureState.dx;

        // Determine direction and target hole
        const direction: 'left' | 'right' = dx > 0 ? 'right' : 'left';
        const potentialTarget = direction === 'right' ? hole - 1 : hole + 1;

        // Apply rubber band at boundaries
        const isAtBound = potentialTarget < 1 || potentialTarget > totalHolesValue;
        if (isAtBound) {
          dx = dx * 0.3;
        }

        // Update transition target to show incoming hole content
        // Only show if we have a valid target and have moved enough
        if (!isAtBound && Math.abs(dx) > 15) {
          setTransitionTargetRef.current({ hole: potentialTarget, direction });
        } else if (Math.abs(dx) <= 15) {
          setTransitionTargetRef.current(null);
        }

        // Convert dx to animation progress (-0.6 to 0.6 range during drag)
        const maxProgress = 0.6;
        const progress = Math.max(-maxProgress, Math.min(dx / SCREEN_WIDTH, maxProgress));
        currentProgressRef.current = progress;
        slideAnim.setValue(progress);
      },

      onPanResponderRelease: (_, gestureState) => {
        // Use refs to avoid stale closures
        if (isAnimatingRef.current) return;

        const hole = currentHoleRef.current;
        const totalHolesValue = totalHolesRef.current;
        const swipeDistance = Math.abs(gestureState.dx);
        const swipeVelocity = Math.abs(gestureState.vx);

        const shouldNavigate =
          swipeDistance > SWIPE_THRESHOLD || swipeVelocity > VELOCITY_THRESHOLD;

        if (shouldNavigate) {
          const swipeDirection = gestureState.dx > 0 ? 'right' : 'left';
          const targetHole = swipeDirection === 'right' ? hole - 1 : hole + 1;

          if (targetHole >= 1 && targetHole <= totalHolesValue) {
            // Continue animation from current position - use ref for latest callback
            animateToHoleRef.current?.(targetHole, swipeDirection, true);
          } else {
            springBackRef.current?.();
          }
        } else {
          springBackRef.current?.();
        }
      },

      onPanResponderTerminate: () => {
        springBackRef.current?.();
      },
    })
  ).current;

  // Calculate transforms for current content
  // slideAnim uses SIGNED values: negative = swipe left, positive = swipe right
  const currentTranslateX = slideAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
  });

  // Calculate transforms for incoming content
  // When swiping left (to next hole): incoming starts at +SCREEN_WIDTH, ends at 0
  // When swiping right (to prev hole): incoming starts at -SCREEN_WIDTH, ends at 0
  const incomingTranslateX = slideAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [
      0, // When current is fully left, incoming is at center
      transitionTarget?.direction === 'left' ? SCREEN_WIDTH : -SCREEN_WIDTH, // Starting position
      0, // When current is fully right, incoming is at center
    ],
  });

  const handleAccessibilityAction = (actionName: string) => {
    if (isAnimating) return;

    if (actionName === 'increment') {
      const nextHole = Math.min(currentHole + 1, totalHoles);
      if (nextHole !== currentHole) {
        animateToHole(nextHole, 'left');
      }
    } else if (actionName === 'decrement') {
      const prevHole = Math.max(currentHole - 1, 1);
      if (prevHole !== currentHole) {
        animateToHole(prevHole, 'right');
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Incoming hole content - slides in from the side */}
      {transitionTarget && (
        <Animated.View
          style={[
            styles.incomingContainer,
            {
              transform: [{ translateX: incomingTranslateX }],
            },
          ]}
          pointerEvents="none"
        >
          {renderHole(transitionTarget.hole)}
        </Animated.View>
      )}

      {/* Current hole content - slides out */}
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            transform: [{ translateX: currentTranslateX }],
          },
        ]}
        {...panResponder.panHandlers}
        accessible={true}
        accessibilityRole="adjustable"
        accessibilityHint="Swipe left for next hole, right for previous hole"
        accessibilityActions={[
          { name: 'increment', label: 'Next hole' },
          { name: 'decrement', label: 'Previous hole' },
        ]}
        onAccessibilityAction={(event) => {
          handleAccessibilityAction(event.nativeEvent.actionName);
        }}
      >
        {renderHole(currentHole)}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  animatedContainer: {
    flex: 1,
  },
  incomingContainer: {
    ...StyleSheet.absoluteFillObject,
  },
});

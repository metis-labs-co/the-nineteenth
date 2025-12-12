/**
 * SwipeableHoleNavigator
 *
 * A wrapper component that enables swipe gesture navigation between holes.
 * Uses React Native's built-in PanResponder + Animated API.
 *
 * Features:
 * - Swipe left to go to next hole
 * - Swipe right to go to previous hole
 * - Carousel-style slide-in/slide-out transitions
 * - Shows incoming hole number preview during transition
 * - Rubber band effect at boundaries (hole 1 and 18)
 * - Visual feedback during swipe (opacity fade + scale)
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
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.15; // 15% of screen width to trigger
const VELOCITY_THRESHOLD = 0.25; // PanResponder velocity units

// Animation configuration - smooth, visible transitions
const SLIDE_DURATION = 450; // ms for the full slide transition

interface SwipeableHoleNavigatorProps {
  /** Current hole number (1-18) */
  currentHole: number;
  /** Total number of holes (typically 18) */
  totalHoles: number;
  /** Callback when hole changes */
  onHoleChange: (newHole: number) => void;
  /** Content to wrap */
  children: React.ReactNode;
  /** Whether swipe gestures are enabled (default: true) */
  enabled?: boolean;
  /** Number of players to show in skeleton preview (default: 1) */
  playerCount?: number;
}

// Duration for the brief fade when swapping hole data
const CONTENT_FADE_DURATION = 200;

export function SwipeableHoleNavigator({
  currentHole,
  totalHoles,
  onHoleChange,
  children,
  enabled = true,
  playerCount = 1,
}: SwipeableHoleNavigatorProps) {
  const colors = useThemeColors();
  const slideAnim = useRef(new Animated.Value(0)).current;
  // Separate opacity for content fade during data swap
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const currentHoleRef = useRef(currentHole);
  // Track animation progress synchronously for smooth continuation
  const currentProgressRef = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionState, setTransitionState] = useState<{
    fromHole: number;
    toHole: number;
    direction: 'left' | 'right';
  } | null>(null);

  // Keep ref in sync with prop for use in PanResponder callbacks
  useEffect(() => {
    currentHoleRef.current = currentHole;
  }, [currentHole]);

  // Reset animation when hole changes externally without transition state
  useEffect(() => {
    if (!transitionState) {
      slideAnim.setValue(0);
    }
  }, [currentHole, transitionState, slideAnim]);

  const animateToHole = useCallback((targetHole: number, direction: 'left' | 'right', startFromCurrentPosition = false) => {
    if (isAnimating) return;
    setIsAnimating(true);

    const fromHole = currentHoleRef.current;

    // Set up transition state to show both holes
    setTransitionState({
      fromHole,
      toHole: targetHole,
      direction,
    });

    // Use the synchronously tracked progress from ref instead of async callback
    const startProgress = startFromCurrentPosition ? currentProgressRef.current : 0;

    // Animate to fully showing the new hole from current position
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: SLIDE_DURATION * (1 - startProgress), // Adjust duration based on progress
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start(() => {
      // Slide complete - now fade out content, swap data, fade back in
      // This hides the brief flash of old data
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: CONTENT_FADE_DURATION,
        useNativeDriver: true,
      }).start(() => {
        // Small delay to ensure opacity is visually at 0 before data swap
        // This prevents the flash where React re-renders before animation completes visually
        setTimeout(() => {
          // Data swap happens here while content is invisible
          onHoleChange(targetHole);
          setTransitionState(null);
          slideAnim.setValue(0);
          currentProgressRef.current = 0;

          // Small delay to let React re-render with new data while still invisible
          setTimeout(() => {
            // Fade content back in with new data
            Animated.timing(contentOpacity, {
              toValue: 1,
              duration: CONTENT_FADE_DURATION,
              useNativeDriver: true,
            }).start(() => {
              setIsAnimating(false);
            });
          }, 50);
        }, 20);
      });
    });
  }, [isAnimating, slideAnim, contentOpacity, onHoleChange]);

  const springBack = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start(() => {
      setTransitionState(null);
      currentProgressRef.current = 0;
      setIsAnimating(false);
    });
  }, [slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      // Only become responder if horizontal gesture detected
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!enabled || isAnimating) return false;
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMovedEnough = Math.abs(gestureState.dx) > 10;
        return isHorizontal && hasMovedEnough;
      },

      onMoveShouldSetPanResponderCapture: () => false,

      onPanResponderGrant: () => {
        slideAnim.stopAnimation();
      },

      onPanResponderMove: (_, gestureState) => {
        if (isAnimating) return;

        const hole = currentHoleRef.current;
        let dx = gestureState.dx;

        // Determine potential direction and target
        const direction = dx > 0 ? 'right' : 'left';
        const potentialTarget = direction === 'right' ? hole - 1 : hole + 1;

        // Apply rubber band at boundaries
        const isAtBound = potentialTarget < 1 || potentialTarget > totalHoles;
        if (isAtBound) {
          dx = dx * 0.3;
        }

        // Set up transition state if we're moving toward a valid hole
        if (!isAtBound && Math.abs(dx) > 15) {
          setTransitionState({
            fromHole: hole,
            toHole: potentialTarget,
            direction,
          });
        } else if (Math.abs(dx) <= 15) {
          setTransitionState(null);
        }

        // Convert dx to animation progress (0 to ~0.6 range during drag)
        const progress = Math.min(Math.abs(dx) / SCREEN_WIDTH, 0.6);
        // Track progress synchronously for smooth animation continuation
        currentProgressRef.current = progress;
        slideAnim.setValue(progress);
      },

      onPanResponderRelease: (_, gestureState) => {
        if (isAnimating) return;

        const hole = currentHoleRef.current;
        const swipeDistance = Math.abs(gestureState.dx);
        const swipeVelocity = Math.abs(gestureState.vx);

        const shouldNavigate =
          swipeDistance > SWIPE_THRESHOLD || swipeVelocity > VELOCITY_THRESHOLD;

        if (shouldNavigate) {
          const swipeDirection = gestureState.dx > 0 ? 'right' : 'left';
          const targetHole = swipeDirection === 'right' ? hole - 1 : hole + 1;

          if (targetHole >= 1 && targetHole <= totalHoles) {
            // Continue animation from current position
            animateToHole(targetHole, swipeDirection, true);
          } else {
            springBack();
          }
        } else {
          springBack();
        }
      },

      onPanResponderTerminate: () => {
        springBack();
      },
    })
  ).current;

  // Calculate transforms for current content
  const currentTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, transitionState?.direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH],
  });

  const currentOpacity = slideAnim.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [1, 0.9, 0.7, 0.4],
    extrapolate: 'clamp',
  });

  const currentScale = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
    extrapolate: 'clamp',
  });

  // Calculate transforms for incoming hole preview
  const incomingTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [transitionState?.direction === 'left' ? SCREEN_WIDTH : -SCREEN_WIDTH, 0],
  });

  const incomingOpacity = slideAnim.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [0.3, 0.5, 0.8, 1],
    extrapolate: 'clamp',
  });

  const incomingScale = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
    extrapolate: 'clamp',
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

  // Render skeleton player card placeholder
  const renderSkeletonPlayerCard = (index: number) => (
    <View key={index} style={[styles.skeletonCard, { backgroundColor: colors.gray100 }]}>
      {/* Header row: name placeholder and stats */}
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonPlayerInfo}>
          <View style={[styles.skeletonBar, styles.skeletonName, { backgroundColor: colors.gray300 }]} />
          <View style={[styles.skeletonBar, styles.skeletonHandicap, { backgroundColor: colors.gray200 }]} />
        </View>
        <View style={styles.skeletonStats}>
          <View style={[styles.skeletonStatBox, { backgroundColor: colors.gray200 }]} />
          <View style={[styles.skeletonStatBox, { backgroundColor: colors.gray200 }]} />
        </View>
      </View>
      {/* Divider */}
      <View style={[styles.skeletonDivider, { backgroundColor: colors.border }]} />
      {/* Controls row */}
      <View style={styles.skeletonControls}>
        <View style={[styles.skeletonButton, { backgroundColor: colors.gray200 }]} />
        <View style={styles.skeletonStepper}>
          <View style={[styles.skeletonButton, { backgroundColor: colors.gray200 }]} />
          <View style={[styles.skeletonScoreDisplay, { backgroundColor: colors.gray100 }]} />
          <View style={[styles.skeletonButton, { backgroundColor: colors.gray200 }]} />
        </View>
        <View style={[styles.skeletonButton, { backgroundColor: colors.gray200 }]} />
      </View>
    </View>
  );

  // Render the incoming hole preview during transition
  const renderIncomingPreview = () => {
    if (!transitionState) return null;

    return (
      <Animated.View
        style={[
          styles.previewContainer,
          {
            backgroundColor: colors.background,
            transform: [
              { translateX: incomingTranslateX },
              { scale: incomingScale },
            ],
            opacity: incomingOpacity,
          },
        ]}
        pointerEvents="none"
      >
        {/* Skeleton HoleHeader */}
        <View style={[styles.skeletonHoleHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {/* Left chevron placeholder */}
          <View style={styles.skeletonChevron} />
          {/* Hole number section */}
          <View style={styles.skeletonHoleSection}>
            <Text style={[styles.skeletonHoleLabel, { color: colors.textSecondary }]}>HOLE</Text>
            <Text style={[styles.skeletonHoleNumber, { color: colors.textPrimary }]}>{transitionState.toHole}</Text>
          </View>
          {/* Right chevron placeholder */}
          <View style={styles.skeletonChevron} />
          {/* Divider */}
          <View style={[styles.skeletonHeaderDivider, { backgroundColor: colors.border }]} />
          {/* Details placeholders */}
          <View style={styles.skeletonDetailsContainer}>
            <View style={[styles.skeletonParBadge, { backgroundColor: colors.gray300 }]} />
            <View style={[styles.skeletonDetailItem, { backgroundColor: colors.gray200 }]} />
          </View>
        </View>

        {/* Skeleton Player Cards */}
        <View style={styles.skeletonCardsContainer}>
          {Array.from({ length: playerCount }, (_, i) => renderSkeletonPlayerCard(i))}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Incoming hole preview (slides in from side) */}
      {renderIncomingPreview()}

      {/* Current content */}
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            transform: [
              { translateX: currentTranslateX },
              { scale: currentScale },
            ],
            opacity: currentOpacity,
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
        {/* Inner wrapper for content fade during data swap */}
        <Animated.View style={[styles.contentWrapper, { opacity: contentOpacity }]}>
          {children}
        </Animated.View>
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
  contentWrapper: {
    flex: 1,
  },
  previewContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  // Skeleton HoleHeader styles
  skeletonHoleHeader: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  skeletonChevron: {
    width: 44,
    height: 44,
  },
  skeletonHoleSection: {
    alignItems: 'center',
    minWidth: 56,
  },
  skeletonHoleLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  skeletonHoleNumber: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
  },
  skeletonHeaderDivider: {
    width: 1,
    height: 40,
    marginHorizontal: spacing.md,
  },
  skeletonDetailsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.lg,
  },
  skeletonParBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  skeletonDetailItem: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  // Skeleton cards container
  skeletonCardsContainer: {
    padding: spacing.lg,
  },
  // Skeleton PlayerCard styles
  skeletonCard: {
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  skeletonPlayerInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  skeletonBar: {
    borderRadius: 4,
  },
  skeletonName: {
    width: 120,
    height: 20,
    marginBottom: spacing.xs,
  },
  skeletonHandicap: {
    width: 60,
    height: 16,
  },
  skeletonStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  skeletonStatBox: {
    width: 40,
    height: 48,
    borderRadius: 4,
  },
  skeletonDivider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  skeletonControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonButton: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  skeletonStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  skeletonScoreDisplay: {
    width: 56,
    height: 64,
  },
});

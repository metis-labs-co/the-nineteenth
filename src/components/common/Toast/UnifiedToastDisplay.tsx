/**
 * UnifiedToastDisplay - Animated toast container with variant dispatch
 *
 * Renders the currently visible toast from ToastContext with consistent
 * slide-down animation. Dispatches to the appropriate variant card
 * (notification, achievement, success/error/info).
 *
 * Mount once in App.tsx — handles all toast rendering.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '@/context/ToastContext';
import type { ToastItem } from '@/context/ToastContext';
import { navigate } from '@/navigation/navigationRef';
import { spacing, zIndex, animations } from '@/constants/theme';
import { NotificationToastCard } from './variants/NotificationToastCard';
import { AchievementToastCard } from './variants/AchievementToastCard';
import { SimpleToastCard } from './variants/SimpleToastCard';

// ============================================================================
// CONSTANTS
// ============================================================================

const TOAST_OFFSET_Y = -150; // Start position above screen

// ============================================================================
// COMPONENT
// ============================================================================

export function UnifiedToastDisplay() {
  const { currentToast, isVisible, dismissToast } = useToast();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(TOAST_OFFSET_Y)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible && currentToast) {
      // Animate in with spring for bounce effect
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: animations.normal,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: TOAST_OFFSET_Y,
          duration: animations.normal,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: animations.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, currentToast, translateY, opacity]);

  if (!currentToast) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + spacing.md,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      {renderVariant(currentToast, dismissToast)}
    </Animated.View>
  );
}

// ============================================================================
// VARIANT DISPATCH
// ============================================================================

function renderVariant(toast: ToastItem, dismissToast: () => void) {
  switch (toast.variant) {
    case 'notification':
      return (
        <NotificationToastCard
          notification={toast.notification}
          onPress={toast.onPress}
        />
      );

    case 'achievement':
      return (
        <AchievementToastCard
          achievement={toast.achievement}
          cosmetic={toast.cosmetic}
          onDismiss={dismissToast}
          onViewAll={() => {
            dismissToast();
            navigate('Achievements');
          }}
        />
      );

    case 'success':
    case 'error':
    case 'info':
      return (
        <SimpleToastCard
          variant={toast.variant}
          title={toast.title}
          message={toast.message}
          icon={toast.icon}
          action={toast.action}
          onDismiss={dismissToast}
        />
      );
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: zIndex.toast,
  },
});

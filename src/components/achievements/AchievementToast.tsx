/**
 * AchievementToast - Celebration toast for achievement unlocks
 *
 * A slide-down toast that appears when achievements are unlocked.
 * Shows the achievement icon, name, points earned, and optional
 * cosmetic unlock information. Auto-dismisses after 5 seconds.
 *
 * Features:
 * - Slide-down entrance animation with spring bounce
 * - Fade in/out transitions
 * - Auto-dismiss timer (5 seconds)
 * - Optional cosmetic unlock display
 * - "Dismiss" and "View All" action buttons
 *
 * @example
 * ```tsx
 * <AchievementToast
 *   achievement={birdieHunterAchievement}
 *   cosmetic={goldFrameCosmetic}
 *   visible={showToast}
 *   onDismiss={() => setShowToast(false)}
 *   onViewAll={() => navigateToAchievements()}
 * />
 * ```
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Animated, TouchableOpacity, Platform } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows, zIndex, animations } from '@/constants/theme';
import type { AchievementDefinition } from '@/types/database/achievement.types';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';
import { RARITY_COLORS } from '@/types/database/achievement.types';

// ============================================================================
// TYPES
// ============================================================================

export interface AchievementToastProps {
  /**
   * The achievement that was unlocked
   */
  achievement: AchievementDefinition;

  /**
   * Optional cosmetic that was unlocked with this achievement
   */
  cosmetic?: CosmeticDefinition | null;

  /**
   * Whether the toast is visible
   */
  visible: boolean;

  /**
   * Callback when the toast is dismissed
   */
  onDismiss: () => void;

  /**
   * Callback to navigate to achievements screen
   */
  onViewAll: () => void;

  /**
   * Test ID for testing
   */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TOAST_OFFSET_Y = -150; // Start position above screen
const AUTO_DISMISS_DELAY = 5000; // 5 seconds

// ============================================================================
// COMPONENT
// ============================================================================

export const AchievementToast = React.memo(function AchievementToast({
  achievement,
  cosmetic,
  visible,
  onDismiss,
  onViewAll,
  testID,
}: AchievementToastProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // Animation values
  const translateY = useRef(new Animated.Value(TOAST_OFFSET_Y)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Auto-dismiss timer
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get rarity color for the achievement icon
  const rarityColor = RARITY_COLORS[achievement.rarity];

  // Handle dismiss with animation
  const handleDismiss = useCallback(() => {
    // Clear timer
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    // Animate out then call callback
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
    ]).start(() => {
      onDismiss();
    });
  }, [translateY, opacity, onDismiss]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      // Clear any existing timer
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

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

      // Set auto-dismiss timer
      dismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, AUTO_DISMISS_DELAY);
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
  }, [visible, translateY, opacity, handleDismiss]);

  // Handle view all with dismiss
  const handleViewAll = () => {
    // Clear timer
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    // Dismiss first, then navigate
    handleDismiss();
    onViewAll();
  };

  // Build accessibility label
  const accessibilityLabel = cosmetic
    ? `Achievement unlocked! ${achievement.name}. Plus ${achievement.points} points. New reward unlocked: ${cosmetic.name}. Double tap to dismiss or navigate to view all achievements.`
    : `Achievement unlocked! ${achievement.name}. Plus ${achievement.points} points. Double tap to dismiss or navigate to view all achievements.`;

  if (!visible) {
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
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <View
        style={[
          styles.toast,
          { backgroundColor: colors.surface },
          Platform.OS === 'ios' ? shadows.lg : { elevation: 8 },
        ]}
      >
        {/* Header: Confetti icon + Title */}
        <View style={styles.header}>
          <Icon source="party-popper" size={24} color={colors.warning} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Achievement Unlocked!
          </Text>
        </View>

        {/* Achievement info */}
        <View style={styles.achievementRow}>
          {/* Achievement icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: rarityColor },
            ]}
          >
            <Icon
              source={achievement.icon}
              size={28}
              color={colors.white}
            />
          </View>

          {/* Achievement details */}
          <View style={styles.achievementInfo}>
            <Text
              style={[styles.achievementName, { color: colors.textPrimary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {achievement.name}
            </Text>
            <Text style={[styles.points, { color: colors.success }]}>
              +{achievement.points} points
            </Text>
          </View>
        </View>

        {/* Cosmetic unlock (if present) */}
        {cosmetic && (
          <View style={[styles.cosmeticRow, { borderTopColor: colors.border }]}>
            <Icon source="gift" size={18} color={colors.primary} />
            <Text style={[styles.cosmeticText, { color: colors.textSecondary }]}>
              New reward unlocked:{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                {cosmetic.name}
              </Text>
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={handleDismiss}
            style={[styles.button, styles.dismissButton, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            accessibilityHint="Dismisses the achievement notification"
          >
            <Text style={[styles.dismissButtonText, { color: colors.textSecondary }]}>
              Dismiss
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleViewAll}
            style={[styles.button, styles.viewAllButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="View All"
            accessibilityHint="Navigates to the achievements screen"
          >
            <Text style={[styles.viewAllButtonText, { color: colors.white }]}>
              View All
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: zIndex.toast,
  },
  toast: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.bodyBold,
  },

  // Achievement row
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  achievementName: {
    ...typography.h4,
  },
  points: {
    ...typography.smallBold,
  },

  // Cosmetic row
  cosmeticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  cosmeticText: {
    ...typography.small,
    flex: 1,
  },

  // Button row
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  dismissButtonText: {
    ...typography.smallBold,
  },
  viewAllButton: {},
  viewAllButtonText: {
    ...typography.smallBold,
  },
});

export default AchievementToast;

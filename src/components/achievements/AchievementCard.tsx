/**
 * AchievementCard - Card display with progress bar for achievements
 *
 * Displays an achievement as a card with horizontal layout - icon on left,
 * content on right. Shows progress bar for unearned achievements and
 * earned date for completed ones. Includes points and rarity display.
 *
 * @example
 * ```tsx
 * // Unearned achievement with progress
 * <AchievementCard
 *   achievement={{
 *     ...achievementDef,
 *     earned: false,
 *     earned_at: null,
 *     current_progress: 18,
 *     next_tier: null,
 *   }}
 *   onPress={() => console.log('Tapped')}
 * />
 *
 * // Earned achievement
 * <AchievementCard
 *   achievement={{
 *     ...achievementDef,
 *     earned: true,
 *     earned_at: '2025-01-15T10:30:00Z',
 *     current_progress: 25,
 *     next_tier: null,
 *   }}
 * />
 * ```
 */

import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { format } from 'date-fns';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { AchievementWithProgress, AchievementRarity } from '@/types/database/achievement.types';
import { RARITY_COLORS } from '@/types/database/achievement.types';

// ============================================================================
// TYPES
// ============================================================================

export interface AchievementCardProps {
  /**
   * The achievement with progress data to display
   */
  achievement: AchievementWithProgress;

  /**
   * Optional press handler for the card
   */
  onPress?: () => void;

  /**
   * Test ID for testing
   */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ICON_SIZE = 64;
const PROGRESS_BAR_HEIGHT = 8;

// Locked state colors now use theme tokens (textDisabled and surfaceVariant)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get rarity display name
 */
const getRarityDisplayName = (rarity: AchievementRarity): string => {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
};

/**
 * Calculate progress percentage (0-100)
 */
const calculateProgressPercentage = (current: number, threshold: number): number => {
  if (threshold <= 0) return 100;
  return Math.min(100, Math.max(0, (current / threshold) * 100));
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AchievementCard = React.memo(function AchievementCard({
  achievement,
  onPress,
  testID,
}: AchievementCardProps) {
  const colors = useThemeColors();

  const {
    name,
    description,
    icon,
    points,
    rarity,
    threshold,
    earned,
    earned_at,
    current_progress,
  } = achievement;

  // Get rarity color
  const rarityColor = RARITY_COLORS[rarity];

  // Calculate progress percentage for the bar
  const progressPercentage = calculateProgressPercentage(current_progress, threshold);

  // Format earned date if available
  const earnedDateFormatted = earned_at
    ? new Date(earned_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  // Build accessibility label
  const accessibilityLabel = earned
    ? `${name} achievement, earned on ${earnedDateFormatted}. ${description}. ${points} points, ${rarity} rarity.`
    : `${name} achievement, not yet earned. ${description}. Progress: ${current_progress} of ${threshold}. ${points} points, ${rarity} rarity.`;

  const cardContent = (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
        earned && { borderColor: colors.success, backgroundColor: colors.success + '08' },
      ]}
    >
      {/* Icon Section */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: earned ? rarityColor : colors.surfaceVariant,
          },
        ]}
      >
        <Icon
          source={icon}
          size={32}
          color={earned ? colors.white : colors.textDisabled}
        />
        {!earned && (
          <View
            style={[
              styles.lockOverlay,
              { backgroundColor: colors.surface },
            ]}
          >
            <Icon source="lock" size={14} color={colors.textDisabled} />
          </View>
        )}
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        {/* Name */}
        <Text
          style={[styles.name, { color: colors.textPrimary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {name}
        </Text>

        {/* Description */}
        <Text
          style={[styles.description, { color: colors.textSecondary }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {description}
        </Text>

        {/* Progress bar or Earned date */}
        {earned ? (
          <View style={styles.earnedContainer}>
            <Icon source="check-circle" size={14} color={colors.success} />
            <Text style={[styles.earnedText, { color: colors.success }]}>
              Earned: {earnedDateFormatted}
            </Text>
          </View>
        ) : (
          <View style={styles.progressContainer}>
            {/* Progress Bar */}
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: rarityColor,
                    width: `${progressPercentage}%`,
                  },
                ]}
              />
            </View>
            {/* Progress Label */}
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              {current_progress}/{threshold}
            </Text>
          </View>
        )}

        {/* Bottom row: Points + Rarity */}
        <View style={styles.bottomRow}>
          <Text style={[styles.points, { color: colors.textSecondary }]}>
            +{points} points
          </Text>
          <View
            style={[
              styles.rarityPill,
              { backgroundColor: rarityColor + '20', borderColor: rarityColor },
            ]}
          >
            <Text style={[styles.rarityText, { color: rarityColor }]}>
              {getRarityDisplayName(rarity)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to view achievement details"
        style={({ pressed }) => [pressed && styles.pressed]}
        testID={testID}
      >
        {cardContent}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      testID={testID}
    >
      {cardContent}
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },

  // Icon section
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },

  // Content section
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...typography.bodyBold,
  },
  description: {
    ...typography.small,
    lineHeight: 18,
  },

  // Earned state
  earnedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  earnedText: {
    ...typography.small,
    fontWeight: '500',
  },

  // Progress bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: PROGRESS_BAR_HEIGHT,
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
  },
  progressLabel: {
    ...typography.caption,
    minWidth: 40,
    textAlign: 'right',
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  points: {
    ...typography.caption,
  },
  rarityPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  rarityText: {
    ...typography.caption,
    fontWeight: '600',
  },
});

export default AchievementCard;

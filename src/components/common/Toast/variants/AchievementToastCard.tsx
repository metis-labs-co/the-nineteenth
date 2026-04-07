/**
 * AchievementToastCard - Card content for achievement unlock toasts
 *
 * Shows party-popper header, achievement icon/name/points, optional
 * cosmetic unlock, and Dismiss/View All buttons. Animation and positioning
 * are handled by UnifiedToastDisplay.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { AchievementDefinition } from '@/types/database/achievement.types';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';
import { RARITY_COLORS } from '@/types/database/achievement.types';

interface AchievementToastCardProps {
  achievement: AchievementDefinition;
  cosmetic?: CosmeticDefinition | null;
  onDismiss: () => void;
  onViewAll: () => void;
}

export const AchievementToastCard = React.memo(function AchievementToastCard({
  achievement,
  cosmetic,
  onDismiss,
  onViewAll,
}: AchievementToastCardProps) {
  const colors = useThemeColors();
  const rarityColor = RARITY_COLORS[achievement.rarity];

  const accessibilityLabel = cosmetic
    ? `Achievement unlocked! ${achievement.name}. Plus ${achievement.points} points. New reward unlocked: ${cosmetic.name}. Double tap to dismiss or navigate to view all achievements.`
    : `Achievement unlocked! ${achievement.name}. Plus ${achievement.points} points. Double tap to dismiss or navigate to view all achievements.`;

  return (
    <View
      style={[
        styles.toast,
        { backgroundColor: colors.surface },
        Platform.OS === 'ios' ? shadows.lg : { elevation: 8 },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {/* Header: Confetti icon + Title */}
      <View style={styles.header}>
        <Icon source="party-popper" size={24} color={colors.warning} />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Achievement Unlocked!
        </Text>
      </View>

      {/* Achievement info */}
      <View style={styles.achievementRow}>
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
          onPress={onDismiss}
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
          onPress={onViewAll}
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
  );
});

const styles = StyleSheet.create({
  toast: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.bodyBold,
  },
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

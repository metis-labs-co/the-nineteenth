/**
 * HandicapUpsellRow — compact Home-screen stand-in for the Social Handicap
 * Index card on tiers without handicap history.
 *
 * The full card (big index, description, trend chart) carries no information
 * for a locked user, so instead of dimming it behind an overlay we swap in a
 * single row: what the feature is, the tier it needs, and a close button that
 * hides it for good. Tapping the row opens the upgrade screen.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { formatTierName } from '@/components/subscription/tierConfig';
import type { SubscriptionTier } from '@/types/subscription.types';

interface HandicapUpsellRowProps {
  /** Tier the feature requires; omitted when the gate doesn't name one. */
  requiredTier?: SubscriptionTier;
  onUpgradePress: () => void;
  onDismiss: () => void;
  testID?: string;
}

export const HandicapUpsellRow = React.memo(function HandicapUpsellRow({
  requiredTier,
  onUpgradePress,
  onDismiss,
  testID,
}: HandicapUpsellRowProps) {
  const colors = useThemeColors();

  const tierLabel = requiredTier ? formatTierName(requiredTier) : 'Upgrade';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        shadows.sm,
      ]}
    >
      <TouchableOpacity
        testID={testID}
        onPress={onUpgradePress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Social Handicap Index requires ${tierLabel}. Tap to upgrade.`}
        style={styles.row}
      >
        <View
          style={[styles.iconCircle, { backgroundColor: colors.primaryBackground }]}
        >
          <Icon source="chart-line" size={18} color={colors.primary} />
        </View>

        <View style={styles.textColumn}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            Social Handicap Index
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            Track your index — upgrade to unlock
          </Text>
        </View>

        <View style={[styles.pill, { backgroundColor: colors.primaryBackground }]}>
          <Icon source="lock-outline" size={12} color={colors.primary} />
          <Text style={[styles.pillText, { color: colors.primary }]}>{tierLabel}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Hide handicap index"
        hitSlop={8}
        style={styles.closeButton}
      >
        <Icon source="close" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    marginBottom: spacing.lg,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textColumn: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  pillText: {
    ...typography.smallBold,
  },
  closeButton: {
    padding: spacing.sm,
  },
});

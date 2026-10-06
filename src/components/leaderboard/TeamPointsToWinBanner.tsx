/**
 * TeamPointsToWinBanner
 *
 * Compact overview shown above the team standings for per-round team competitions:
 * the points target ("first to N wins") and total points available. Pure — the
 * caller computes total/toWin via summarizeCompetition.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

export interface TeamPointsToWinBannerProps {
  total: number;
  toWin: number;
}

export function TeamPointsToWinBanner({ total, toWin }: TeamPointsToWinBannerProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`First to ${toWin} points wins. ${total} points available.`}
    >
      <Icon source="flag-checkered" size={22} color={colors.primary} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          First to {toWin} points wins
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {total} points available
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  textContainer: { flex: 1 },
  title: { ...typography.bodyBold },
  subtitle: { ...typography.small },
});

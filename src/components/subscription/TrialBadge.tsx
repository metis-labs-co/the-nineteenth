/**
 * TrialBadge - Displays trial days remaining badge
 *
 * Shows a warning-styled badge indicating how many days remain in the user's trial.
 * Used primarily in the subscription screen and anywhere trial status needs visibility.
 *
 * @example
 * ```tsx
 * <TrialBadge daysRemaining={5} />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

export interface TrialBadgeProps {
  /** Number of days remaining in trial */
  daysRemaining: number;
  /** Optional testID for testing */
  testID?: string;
}

export const TrialBadge = React.memo(function TrialBadge({
  daysRemaining,
  testID,
}: TrialBadgeProps) {
  const colors = useThemeColors();

  const dayText = daysRemaining === 1 ? 'day' : 'days';

  return (
    <View
      style={[styles.container, { backgroundColor: colors.warningBackground }]}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`${daysRemaining} ${dayText} left in trial`}
    >
      <Icon source="clock-outline" size={16} color={colors.warning} />
      <Text style={[styles.text, { color: colors.warning }]}>
        {daysRemaining} {dayText} left in trial
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  text: {
    ...typography.small,
    fontWeight: '600',
  },
});

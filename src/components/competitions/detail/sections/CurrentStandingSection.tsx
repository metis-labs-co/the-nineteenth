/**
 * CurrentStandingSection - Shows player's current standing in the competition
 *
 * Displays:
 * - Position (with ordinal suffix)
 * - Points total
 *
 * Only shown for non-organizers who have a standing.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { formatPosition } from '@/utils/formatting';
import type { CurrentStandingSectionProps } from './types';

export function CurrentStandingSection({ standing }: CurrentStandingSectionProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.standingCard, { backgroundColor: colors.primaryLighter }]}
      testID="current-standing-card"
    >
      <Text style={[styles.standingLabel, { color: colors.primaryDark }]}>Your Current Standing</Text>
      <View style={styles.standingRow}>
        <View style={styles.standingItem}>
          <Text style={[styles.standingPosition, { color: colors.primaryDark }]}>
            {formatPosition(standing.position)}
          </Text>
          <Text style={[styles.standingItemLabel, { color: colors.primaryDark }]}>Position</Text>
        </View>
        <View style={[styles.standingDivider, { backgroundColor: colors.primary }]} />
        <View style={styles.standingItem}>
          <Text style={[styles.standingPoints, { color: colors.primaryDark }]}>{standing.points}</Text>
          <Text style={[styles.standingItemLabel, { color: colors.primaryDark }]}>Points</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  standingCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  standingLabel: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  standingItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  standingDivider: {
    width: 1,
    height: 40,
    opacity: 0.3,
  },
  standingPosition: {
    ...typography.display,
  },
  standingPoints: {
    ...typography.display,
  },
  standingItemLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
});

export default CurrentStandingSection;

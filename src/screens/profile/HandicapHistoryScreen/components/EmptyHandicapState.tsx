/**
 * EmptyHandicapState - Empty state when player has no handicap history
 *
 * Shown when the player hasn't completed any rounds with
 * handicap differentials calculated.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

export function EmptyHandicapState() {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Icon source="chart-timeline-variant" size={64} color={colors.textTertiary} />

      <Text style={[styles.title, { color: colors.textPrimary }]}>
        No Handicap History
      </Text>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Complete rounds to start tracking your handicap
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
  },
});

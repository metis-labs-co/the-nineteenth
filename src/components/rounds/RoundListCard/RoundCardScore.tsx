// src/components/rounds/RoundListCard/RoundCardScore.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { RoundListCardData, getUserScoreDisplay } from './types';

interface RoundCardScoreProps {
  round: RoundListCardData;
}

/**
 * RoundCardScore - Prominent, vertically centred score for the logged-in user
 * on the right side of a completed round card
 */
export const RoundCardScore = React.memo(function RoundCardScore({
  round,
}: RoundCardScoreProps) {
  const colors = useThemeColors();

  if (round.status !== 'completed') return null;

  const display = getUserScoreDisplay(round.gameType, round.userScore);
  if (!display) return null;

  const toneColor =
    display.tone === 'success'
      ? colors.success
      : display.tone === 'error'
        ? colors.error
        : colors.primary;

  const dailyHandicap = round.userScore?.dailyHandicap;
  const differential = round.userScore?.differential;

  return (
    <View style={styles.container} testID="round-card-score">
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: toneColor }]}>{display.value}</Text>
        {display.label && (
          <Text style={[styles.label, { color: colors.textSecondary }]}>{display.label}</Text>
        )}
      </View>
      {dailyHandicap != null && (
        <Text style={[styles.meta, { color: colors.textSecondary }]} testID="round-card-handicap">
          HC {dailyHandicap}
        </Text>
      )}
      {differential != null && (
        <Text style={[styles.meta, { color: colors.textSecondary }]} testID="round-card-differential">
          Diff {differential.toFixed(1)}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  value: {
    ...typography.h2,
    fontWeight: '700',
  },
  label: {
    ...typography.caption,
  },
  meta: {
    ...typography.caption,
    marginTop: 2,
    textAlign: 'right',
  },
});

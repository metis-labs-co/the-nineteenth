/**
 * HandicapHomeCard - Home-screen card surfacing the player's Social Handicap
 * Index with a compact trend graph. Taps through to the full HandicapHistory
 * screen. Empty (no qualifying rounds) state still renders, prompting play.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { formatHandicapIndex } from '@/utils/displayHelpers';
import { HandicapTrendChart } from '@/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart';
import type { HandicapSummary } from '@/types/handicap.types';

interface HandicapHomeCardProps {
  summary: HandicapSummary | null;
  onPress: () => void;
  testID?: string;
}

export function HandicapHomeCard({ summary, onPress, testID }: HandicapHomeCardProps) {
  const colors = useThemeColors();

  const hasData = !!summary && summary.totalRounds > 0;
  const showChart = hasData && summary!.rounds.length >= 2;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="View handicap history"
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Social Handicap Index
          </Text>
          <Text style={[styles.indexValue, { color: colors.textPrimary }]}>
            {hasData ? formatHandicapIndex(summary!.handicapIndex) : '—'}
          </Text>
          {hasData ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Best {summary!.qualifyingRoundsCount} of {summary!.totalRounds}
            </Text>
          ) : (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Play rounds to establish your index
            </Text>
          )}
        </View>
        <Icon source="chevron-right" size={24} color={colors.textTertiary} />
      </View>

      {showChart ? (
        <View style={styles.chartWrapper}>
          <HandicapTrendChart rounds={summary!.rounds} variant="compact" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  label: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xxs,
  },
  indexValue: {
    ...typography.display,
    fontSize: 40,
    lineHeight: 46,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  chartWrapper: {
    marginTop: spacing.md,
  },
});

/**
 * StatsTab - Competition-wide "best of" stats grouped by category.
 *
 * Shows top performers for counting stats (most birdies, most 1-putts)
 * and rate stats (best FIR%, best GIR%). Categories only render when at
 * least one player has data for them.
 *
 * A Gross/Net toggle is shown when the competition has a handicap-based
 * format and only affects the Scoring category group.
 *
 * Scramble rounds are excluded from individual aggregation (no individual
 * hole scores). When all rounds in the competition are scramble, this tab
 * is hidden at the CompetitionDetailScreen level.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useCompetitionStatistics } from '@/hooks/competitionStatistics';
import { StatCategoryGroup } from './StatCategoryGroup';
import { GrossNetToggle } from './GrossNetToggle';

export interface StatsTabProps {
  competitionId: string;
}

export function StatsTab({ competitionId }: StatsTabProps) {
  const colors = useThemeColors();
  const { data, mode, setMode, isLoading, isError, error } =
    useCompetitionStatistics(competitionId);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <LoadingSpinner size="md" message="Loading stats..." />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Icon source="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Unable to load stats
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {error?.message ?? 'Something went wrong'}
        </Text>
      </View>
    );
  }

  if (!data || !data.hasAnyData) {
    return (
      <View style={styles.centered}>
        <Icon source="chart-box-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          No stats yet
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Stats will appear once players submit scores for this competition.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {data.hasHandicapRound && (
        <GrossNetToggle value={mode} onChange={setMode} />
      )}

      {data.groups.map((group) => (
        <StatCategoryGroup key={group.key} group={group} />
      ))}

      {data.excludedScrambleRoundCount > 0 && (
        <Text style={[styles.footnote, { color: colors.textTertiary }]}>
          Scramble rounds are excluded from individual stats.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h4,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
  footnote: {
    fontSize: 11.5,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
});

export default StatsTab;

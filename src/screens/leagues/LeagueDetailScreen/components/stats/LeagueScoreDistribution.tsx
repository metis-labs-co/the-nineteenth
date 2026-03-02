/**
 * LeagueScoreDistribution - Section D: Score distribution across all league rounds
 *
 * Horizontal bars: Eagles, Birdies, Pars, Bogeys, Doubles, Triple+
 * Reuses ScoreDistributionBar component.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ScoreDistributionBar } from '@/components/statistics';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { ScoreDistribution } from '@/hooks/playerStatistics/types';

interface LeagueScoreDistributionProps {
  distribution: ScoreDistribution;
}

export const LeagueScoreDistribution = React.memo(function LeagueScoreDistribution({
  distribution,
}: LeagueScoreDistributionProps) {
  const colors = useThemeColors();

  const total =
    distribution.eagles +
    distribution.birdies +
    distribution.pars +
    distribution.bogeys +
    distribution.doubleBogeys +
    distribution.triplePlus;

  if (total === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Score Distribution" icon="chart-bar" />
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
        <ScoreDistributionBar
          label="Eagles"
          count={distribution.eagles}
          total={total}
          color={colors.eagle}
        />
        <ScoreDistributionBar
          label="Birdies"
          count={distribution.birdies}
          total={total}
          color={colors.birdie}
        />
        <ScoreDistributionBar
          label="Pars"
          count={distribution.pars}
          total={total}
          color={colors.par}
        />
        <ScoreDistributionBar
          label="Bogeys"
          count={distribution.bogeys}
          total={total}
          color={colors.bogey}
        />
        <ScoreDistributionBar
          label="Doubles"
          count={distribution.doubleBogeys}
          total={total}
          color={colors.doubleBogey}
        />
        <ScoreDistributionBar
          label="Triple+"
          count={distribution.triplePlus}
          total={total}
          color={colors.error}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
});

export default LeagueScoreDistribution;

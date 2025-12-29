/**
 * ScoreDistributionSection - Score distribution breakdown (Social+ tier feature)
 *
 * Displays visual breakdown of scores:
 * - Eagles, Birdies, Pars, Bogeys, Double Bogeys, Triple+
 * - Uses FeatureLock for tier gating
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows, borderRadius } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import { ScoreDistributionBar } from '@/components/statistics';
import { FeatureLock } from '@/components/subscription';
import type { PlayerStatistics } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

interface ScoreDistributionSectionProps {
  stats: PlayerStatistics;
  onUpgradePress: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export const ScoreDistributionSection = React.memo(function ScoreDistributionSection({
  stats,
  onUpgradePress,
}: ScoreDistributionSectionProps) {
  const colors = useThemeColors();
  const cardBg = colors.surface;

  return (
    <>
      <View style={styles.sectionGap} />
      <SectionHeader title="Score Distribution" icon="chart-bar" />
      <FeatureLock
        feature="score_distribution"
        onUpgradePress={onUpgradePress}
        lockedMessage="Unlock to see your score breakdown"
      >
        <View style={[styles.card, { backgroundColor: cardBg }, shadows.sm]}>
          <ScoreDistributionBar
            label="Eagles"
            count={stats.scoreDistribution.eagles}
            total={stats.totalScoreDistribution}
            color={colors.eagle}
          />
          <ScoreDistributionBar
            label="Birdies"
            count={stats.scoreDistribution.birdies}
            total={stats.totalScoreDistribution}
            color={colors.birdie}
          />
          <ScoreDistributionBar
            label="Pars"
            count={stats.scoreDistribution.pars}
            total={stats.totalScoreDistribution}
            color={colors.par}
          />
          <ScoreDistributionBar
            label="Bogeys"
            count={stats.scoreDistribution.bogeys}
            total={stats.totalScoreDistribution}
            color={colors.bogey}
          />
          <ScoreDistributionBar
            label="Double Bogeys"
            count={stats.scoreDistribution.doubleBogeys}
            total={stats.totalScoreDistribution}
            color={colors.doubleBogey}
          />
          <ScoreDistributionBar
            label="Triple+"
            count={stats.scoreDistribution.triplePlus}
            total={stats.totalScoreDistribution}
            color={colors.error}
          />
        </View>
      </FeatureLock>
    </>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  sectionGap: {
    marginTop: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
});

export default ScoreDistributionSection;

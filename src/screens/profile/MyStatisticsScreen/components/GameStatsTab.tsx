/**
 * GameStatsTab - Game Stats tab content for My Statistics
 *
 * Displays:
 * - Driving (FIR tracking, Social+ tier)
 * - Approach (GIR tracking, Social+ tier)
 * - Short Game (Social+ tier)
 * - Putting Analysis (Social+ tier)
 * - Bunker Stats (Premium tier)
 * - Hazard Stats (Premium tier)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/constants/theme';
import {
  DrivingSection,
  ApproachSection,
  ShortGameSection,
  PuttingAnalysisSection,
  BunkerStatsSection,
  HazardStatsSection,
} from '@/components/statistics';
import { FeatureLock } from '@/components/subscription';
import type { PlayerStatistics } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

interface GameStatsTabProps {
  stats: PlayerStatistics;
  onUpgradePress: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export const GameStatsTab = React.memo(function GameStatsTab({
  stats,
  onUpgradePress,
}: GameStatsTabProps) {
  return (
    <>
      {/* Driving - Social+ tier */}
      <FeatureLock feature="fir_gir_tracking" onUpgradePress={onUpgradePress}>
        <DrivingSection stats={stats} />
      </FeatureLock>

      {/* Approach - Social+ tier */}
      <View style={styles.sectionGap} />
      <FeatureLock feature="fir_gir_tracking" onUpgradePress={onUpgradePress}>
        <ApproachSection stats={stats} />
      </FeatureLock>

      {/* Short Game - Social+ tier */}
      <View style={styles.sectionGap} />
      <FeatureLock feature="detailed_stats" onUpgradePress={onUpgradePress}>
        <ShortGameSection shortGame={stats.shortGame} />
      </FeatureLock>

      {/* Putting Analysis - Social+ tier */}
      <View style={styles.sectionGap} />
      <FeatureLock feature="detailed_stats" onUpgradePress={onUpgradePress}>
        <PuttingAnalysisSection
          puttingDepth={stats.puttingDepth}
          averagePuttsPerHole={stats.averagePuttsPerHole}
          totalPuttsPerRound={stats.averagePuttsPerRound}
        />
      </FeatureLock>

      {/* Bunker Stats - Premium tier */}
      <View style={styles.sectionGap} />
      <FeatureLock feature="advanced_stats" onUpgradePress={onUpgradePress}>
        <BunkerStatsSection bunkerStats={stats.bunkerStats} />
      </FeatureLock>

      {/* Hazard Stats - Premium tier */}
      <View style={styles.sectionGap} />
      <FeatureLock feature="advanced_stats" onUpgradePress={onUpgradePress}>
        <HazardStatsSection hazardStats={stats.hazardStats} />
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
});

export default GameStatsTab;

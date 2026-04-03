/**
 * GameStatsTab - Game Stats tab content for My Statistics
 *
 * Displays:
 * - Driving: FIR% (Social+ tier), miss direction diagram (Premium tier)
 * - Approach: GIR% (Social+ tier), miss direction diagram (Premium tier)
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
      {/* Driving - FIR% is Social+, miss direction diagram is Premium */}
      <DrivingSection stats={stats} onUpgradePress={onUpgradePress} />

      {/* Approach - GIR% is Social+, miss direction diagram is Premium */}
      <ApproachSection stats={stats} onUpgradePress={onUpgradePress} />

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

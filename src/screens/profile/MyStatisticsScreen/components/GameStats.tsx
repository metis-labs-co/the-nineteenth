/**
 * GameStats - Putting, Fairway, and GIR statistics section
 *
 * Displays stats based on user settings visibility:
 * - Putting: Total putts, average per hole
 * - Fairways Hit: Percentage and count
 * - Greens in Regulation: Percentage and count
 *
 * Shows "no data" messages when tracking is enabled but no data recorded.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EmptyState } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import { StatCard } from '@/components/statistics';
import type { PlayerStatistics } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

interface GameStatsProps {
  stats: PlayerStatistics;
  showPutts: boolean;
  showFairwayHit: boolean;
  showGreenInRegulation: boolean;
}

// =====================================================
// COMPONENT
// =====================================================

export const GameStats = React.memo(function GameStats({
  stats,
  showPutts,
  showFairwayHit,
  showGreenInRegulation,
}: GameStatsProps) {
  const colors = useThemeColors();

  // Don't render if no settings are enabled
  if (!showPutts && !showFairwayHit && !showGreenInRegulation) {
    return null;
  }

  // Check if there's any data to show
  const hasPuttingData = showPutts && stats.holesWithPuttsRecorded > 0;
  const hasFairwayData = showFairwayHit && stats.fairwayOpportunities > 0;
  const hasGirData = showGreenInRegulation && stats.girOpportunities > 0;
  const hasAnyData = hasPuttingData || hasFairwayData || hasGirData;

  return (
    <>
      <View style={styles.sectionGap} />
      <SectionHeader title="Game Stats" icon="golf" />

      {hasAnyData && (
        <View style={styles.statsGrid}>
          {/* Putting Stats */}
          {hasPuttingData && (
            <>
              <StatCard
                title="Total Putts"
                value={stats.totalPutts ?? '-'}
                subtitle={`${stats.holesWithPuttsRecorded} holes`}
                icon="golf"
                iconColor={colors.primary}
              />
              <StatCard
                title="Avg Putts"
                value={stats.averagePuttsPerHole?.toFixed(2) ?? '-'}
                subtitle="per hole"
                icon="target"
                iconColor={colors.info}
              />
            </>
          )}

          {/* FIR Stats */}
          {hasFairwayData && (
            <StatCard
              title="Fairways Hit"
              value={`${stats.fairwayPercentage ?? 0}%`}
              subtitle={`${stats.fairwaysHit ?? 0}/${stats.fairwayOpportunities}`}
              icon="arrow-right-bold"
              iconColor={colors.success}
            />
          )}

          {/* GIR Stats */}
          {hasGirData && (
            <StatCard
              title="Greens in Reg"
              value={`${stats.girPercentage ?? 0}%`}
              subtitle={`${stats.greensInRegulation ?? 0}/${stats.girOpportunities}`}
              icon="flag-checkered"
              iconColor={colors.birdie}
            />
          )}
        </View>
      )}

      {/* Show messages for enabled settings with no data */}
      {showPutts && stats.holesWithPuttsRecorded === 0 && (
        <EmptyState
          title="No putting data"
          message="Start tracking putts during your rounds!"
          icon="golf"
          compact
        />
      )}
      {showFairwayHit && stats.fairwayOpportunities === 0 && (
        <EmptyState
          title="No fairway data"
          message="Start tracking fairways hit during your rounds!"
          icon="arrow-right-bold"
          compact
        />
      )}
      {showGreenInRegulation && stats.girOpportunities === 0 && (
        <EmptyState
          title="No GIR data"
          message="Start tracking greens in regulation during your rounds!"
          icon="flag-checkered"
          compact
        />
      )}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
});

export default GameStats;

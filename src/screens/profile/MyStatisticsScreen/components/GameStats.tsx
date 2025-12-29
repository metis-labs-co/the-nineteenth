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
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
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
// NO DATA CARD COMPONENT
// =====================================================

interface NoDataCardProps {
  message: string;
}

const NoDataCard = React.memo(function NoDataCard({ message }: NoDataCardProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.noDataCard, { backgroundColor: colors.gray100 }]}>
      <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
        {message}
      </Text>
    </View>
  );
});

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
        <NoDataCard message="No putting data recorded yet. Start tracking putts during your rounds!" />
      )}
      {showFairwayHit && stats.fairwayOpportunities === 0 && (
        <NoDataCard message="No fairway data recorded yet. Start tracking fairways hit during your rounds!" />
      )}
      {showGreenInRegulation && stats.girOpportunities === 0 && (
        <NoDataCard message="No GIR data recorded yet. Start tracking greens in regulation during your rounds!" />
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
  noDataCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  noDataText: {
    ...typography.small,
    textAlign: 'center',
  },
});

export default GameStats;

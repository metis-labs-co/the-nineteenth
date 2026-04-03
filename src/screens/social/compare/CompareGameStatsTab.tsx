/**
 * CompareGameStatsTab - Game Stats tab for Compare Stats screen
 *
 * Displays advanced stats side-by-side:
 * - Driving (FIR% + fairway miss direction diagrams)
 * - Approach (GIR% + green miss direction diagrams)
 * - Short Game (Scrambling, Bogey Avoidance, Double+ Rate)
 * - Putting (Avg Putts/Hole, One-Putt%, Three-Putt%)
 * - Bunkers (Total Shots, Avg/Round, Holes w/ Bunker)
 * - Hazards (Water, Out of Bounds, Avg/Round)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { ComparisonRow, SectionHeader } from '@/components/social/comparison';
import {
  FairwayMissDirectionDiagram,
  GreenMissDirectionDiagram,
} from '@/components/statistics';
import type { PlayerStatistics } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

interface CompareGameStatsTabProps {
  stats1: PlayerStatistics;
  stats2: PlayerStatistics;
  player1Name: string;
  player2Name: string;
  showPutts: boolean;
  showFairwayHit: boolean;
  showGreenInRegulation: boolean;
}

// =====================================================
// COMPONENT
// =====================================================

export const CompareGameStatsTab = React.memo(function CompareGameStatsTab({
  stats1,
  stats2,
  player1Name,
  player2Name,
  showPutts,
  showFairwayHit,
  showGreenInRegulation,
}: CompareGameStatsTabProps) {
  const colors = useThemeColors();

  const hasBunkerData =
    stats1.bunkerStats.totalHolesTracked > 0 || stats2.bunkerStats.totalHolesTracked > 0;
  const hasHazardData =
    stats1.hazardStats.totalHolesTracked > 0 || stats2.hazardStats.totalHolesTracked > 0;

  return (
    <>
      {/* Driving Section */}
      {showFairwayHit && (
        <>
          <SectionHeader title="Driving" icon="flag-variant" primaryIcon={false} style={styles.sectionHeader} />
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <ComparisonRow
              label="Fairways Hit"
              value1={stats1.fairwayPercentage !== null ? `${stats1.fairwayPercentage}` : '-'}
              value2={stats2.fairwayPercentage !== null ? `${stats2.fairwayPercentage}` : '-'}
              diff={
                stats1.fairwayPercentage !== null && stats2.fairwayPercentage !== null
                  ? stats1.fairwayPercentage - stats2.fairwayPercentage
                  : undefined
              }
              higherIsBetter
              suffix="%"
              decimals={1}
            />
          </View>
          <View style={styles.diagramRow}>
            <View style={styles.diagramColumn}>
              <Text style={[styles.diagramLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {player1Name}
              </Text>
              <FairwayMissDirectionDiagram stats={stats1.fairwayMissDirection} compact />
            </View>
            <View style={styles.diagramColumn}>
              <Text style={[styles.diagramLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {player2Name}
              </Text>
              <FairwayMissDirectionDiagram stats={stats2.fairwayMissDirection} compact />
            </View>
          </View>
        </>
      )}

      {/* Approach Section */}
      {showGreenInRegulation && (
        <>
          <SectionHeader title="Approach" icon="golf" primaryIcon={false} style={styles.sectionHeader} />
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <ComparisonRow
              label="Greens in Reg"
              value1={stats1.girPercentage !== null ? `${stats1.girPercentage}` : '-'}
              value2={stats2.girPercentage !== null ? `${stats2.girPercentage}` : '-'}
              diff={
                stats1.girPercentage !== null && stats2.girPercentage !== null
                  ? stats1.girPercentage - stats2.girPercentage
                  : undefined
              }
              higherIsBetter
              suffix="%"
              decimals={1}
            />
          </View>
          <View style={styles.diagramRow}>
            <View style={styles.diagramColumn}>
              <Text style={[styles.diagramLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {player1Name}
              </Text>
              <GreenMissDirectionDiagram stats={stats1.greenMissDirection} compact />
            </View>
            <View style={styles.diagramColumn}>
              <Text style={[styles.diagramLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {player2Name}
              </Text>
              <GreenMissDirectionDiagram stats={stats2.greenMissDirection} compact />
            </View>
          </View>
        </>
      )}

      {/* Short Game Section */}
      <SectionHeader title="Short Game" icon="golf" primaryIcon={false} style={styles.sectionHeader} />
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <ComparisonRow
          label="Scrambling"
          value1={
            stats1.shortGame.scramblingPercentage !== null
              ? `${stats1.shortGame.scramblingPercentage}`
              : '-'
          }
          value2={
            stats2.shortGame.scramblingPercentage !== null
              ? `${stats2.shortGame.scramblingPercentage}`
              : '-'
          }
          diff={
            stats1.shortGame.scramblingPercentage !== null &&
            stats2.shortGame.scramblingPercentage !== null
              ? stats1.shortGame.scramblingPercentage - stats2.shortGame.scramblingPercentage
              : undefined
          }
          higherIsBetter
          suffix="%"
          decimals={1}
        />
        <ComparisonRow
          label="Bogey Avoidance"
          value1={`${stats1.shortGame.bogeyAvoidanceRate}`}
          value2={`${stats2.shortGame.bogeyAvoidanceRate}`}
          diff={stats1.shortGame.bogeyAvoidanceRate - stats2.shortGame.bogeyAvoidanceRate}
          higherIsBetter
          suffix="%"
          decimals={1}
        />
        <ComparisonRow
          label="Double+ Rate"
          value1={`${stats1.shortGame.doubleBogeyOrWorseRate}`}
          value2={`${stats2.shortGame.doubleBogeyOrWorseRate}`}
          diff={stats1.shortGame.doubleBogeyOrWorseRate - stats2.shortGame.doubleBogeyOrWorseRate}
          higherIsBetter={false}
          suffix="%"
          decimals={1}
        />
      </View>

      {/* Putting Section */}
      {showPutts && (
        <>
          <SectionHeader title="Putting" icon="golf" primaryIcon={false} style={styles.sectionHeader} />
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <ComparisonRow
              label="Avg Putts/Hole"
              value1={stats1.averagePuttsPerHole?.toFixed(2) ?? '-'}
              value2={stats2.averagePuttsPerHole?.toFixed(2) ?? '-'}
              diff={
                stats1.averagePuttsPerHole !== null && stats2.averagePuttsPerHole !== null
                  ? stats1.averagePuttsPerHole - stats2.averagePuttsPerHole
                  : undefined
              }
              higherIsBetter={false}
              decimals={2}
            />
            <ComparisonRow
              label="One-Putt %"
              value1={
                stats1.puttingDepth.onePuttPercentage !== null
                  ? `${stats1.puttingDepth.onePuttPercentage}`
                  : '-'
              }
              value2={
                stats2.puttingDepth.onePuttPercentage !== null
                  ? `${stats2.puttingDepth.onePuttPercentage}`
                  : '-'
              }
              diff={
                stats1.puttingDepth.onePuttPercentage !== null &&
                stats2.puttingDepth.onePuttPercentage !== null
                  ? stats1.puttingDepth.onePuttPercentage - stats2.puttingDepth.onePuttPercentage
                  : undefined
              }
              higherIsBetter
              suffix="%"
              decimals={1}
            />
            <ComparisonRow
              label="Three-Putt %"
              value1={
                stats1.puttingDepth.threePuttPercentage !== null
                  ? `${stats1.puttingDepth.threePuttPercentage}`
                  : '-'
              }
              value2={
                stats2.puttingDepth.threePuttPercentage !== null
                  ? `${stats2.puttingDepth.threePuttPercentage}`
                  : '-'
              }
              diff={
                stats1.puttingDepth.threePuttPercentage !== null &&
                stats2.puttingDepth.threePuttPercentage !== null
                  ? stats1.puttingDepth.threePuttPercentage -
                    stats2.puttingDepth.threePuttPercentage
                  : undefined
              }
              higherIsBetter={false}
              suffix="%"
              decimals={1}
            />
          </View>
        </>
      )}

      {/* Bunkers Section */}
      {hasBunkerData && (
        <>
          <SectionHeader title="Bunkers" icon="golf" primaryIcon={false} style={styles.sectionHeader} />
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <ComparisonRow
              label="Total Shots"
              value1={stats1.bunkerStats.totalBunkerShots}
              value2={stats2.bunkerStats.totalBunkerShots}
              diff={stats1.bunkerStats.totalBunkerShots - stats2.bunkerStats.totalBunkerShots}
              higherIsBetter={false}
            />
            <ComparisonRow
              label="Avg/Round"
              value1={
                stats1.bunkerStats.averageBunkerShotsPerRound !== null
                  ? stats1.bunkerStats.averageBunkerShotsPerRound.toFixed(1)
                  : '-'
              }
              value2={
                stats2.bunkerStats.averageBunkerShotsPerRound !== null
                  ? stats2.bunkerStats.averageBunkerShotsPerRound.toFixed(1)
                  : '-'
              }
              diff={
                stats1.bunkerStats.averageBunkerShotsPerRound !== null &&
                stats2.bunkerStats.averageBunkerShotsPerRound !== null
                  ? stats1.bunkerStats.averageBunkerShotsPerRound -
                    stats2.bunkerStats.averageBunkerShotsPerRound
                  : undefined
              }
              higherIsBetter={false}
              decimals={1}
            />
            <ComparisonRow
              label="Holes w/ Bunker"
              value1={stats1.bunkerStats.holesWithBunkers}
              value2={stats2.bunkerStats.holesWithBunkers}
              diff={stats1.bunkerStats.holesWithBunkers - stats2.bunkerStats.holesWithBunkers}
              higherIsBetter={false}
            />
          </View>
        </>
      )}

      {/* Hazards Section */}
      {hasHazardData && (
        <>
          <SectionHeader title="Hazards" icon="alert" primaryIcon={false} style={styles.sectionHeader} />
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <ComparisonRow
              label="Water"
              value1={stats1.hazardStats.waterCount}
              value2={stats2.hazardStats.waterCount}
              diff={stats1.hazardStats.waterCount - stats2.hazardStats.waterCount}
              higherIsBetter={false}
            />
            <ComparisonRow
              label="Out of Bounds"
              value1={stats1.hazardStats.obCount}
              value2={stats2.hazardStats.obCount}
              diff={stats1.hazardStats.obCount - stats2.hazardStats.obCount}
              higherIsBetter={false}
            />
            <ComparisonRow
              label="Avg/Round"
              value1={
                stats1.hazardStats.averageHazardsPerRound !== null
                  ? stats1.hazardStats.averageHazardsPerRound.toFixed(1)
                  : '-'
              }
              value2={
                stats2.hazardStats.averageHazardsPerRound !== null
                  ? stats2.hazardStats.averageHazardsPerRound.toFixed(1)
                  : '-'
              }
              diff={
                stats1.hazardStats.averageHazardsPerRound !== null &&
                stats2.hazardStats.averageHazardsPerRound !== null
                  ? stats1.hazardStats.averageHazardsPerRound -
                    stats2.hazardStats.averageHazardsPerRound
                  : undefined
              }
              higherIsBetter={false}
              decimals={1}
            />
          </View>
        </>
      )}
    </>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  sectionHeader: {
    marginTop: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  diagramRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  diagramColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  diagramLabel: {
    ...typography.small,
    textAlign: 'center',
  },
});

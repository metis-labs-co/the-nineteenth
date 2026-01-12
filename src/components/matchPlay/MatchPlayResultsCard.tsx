/**
 * MatchPlayResultsCard - Match play results summary and hole-by-hole breakdown
 *
 * Displays the match result with:
 * - Final result header (e.g., "Player A wins 3 & 2")
 * - Hole-by-hole results grid (Won/Lost/Halved)
 * - Match statistics (holes won, lost, halved per player)
 *
 * @example
 * ```tsx
 * <MatchPlayResultsCard
 *   player1={{ id: '1', name: 'John', handicap: 10 }}
 *   player2={{ id: '2', name: 'Jane', handicap: 15 }}
 *   holeResults={holeResults}
 *   matchStatus={matchStatus}
 * />
 * ```
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import type {
  MatchStatus,
  HoleResult,
  MatchPlayer,
} from '@/screens/scoring/MatchPlayScoringScreen/types';
import {
  getMatchStatusText,
  getPlayerMatchStatus,
} from '@/screens/scoring/MatchPlayScoringScreen/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface MatchPlayResultsCardProps {
  /** Player 1 data */
  player1: MatchPlayer;
  /** Player 2 data */
  player2: MatchPlayer;
  /** Hole-by-hole results */
  holeResults: Record<number, HoleResult>;
  /** Calculated match status */
  matchStatus: MatchStatus;
  /** Test ID for testing */
  testID?: string;
}

interface MatchStats {
  player1Wins: number;
  player2Wins: number;
  halved: number;
  holesPlayed: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const MatchPlayResultsCard = React.memo(function MatchPlayResultsCard({
  player1,
  player2,
  holeResults,
  matchStatus,
  testID,
}: MatchPlayResultsCardProps) {
  const colors = useThemeColors();

  // Calculate match statistics
  const stats = useMemo<MatchStats>(() => {
    let p1Wins = 0;
    let p2Wins = 0;
    let halved = 0;
    let played = 0;

    for (let hole = 1; hole <= 18; hole++) {
      const result = holeResults[hole];
      if (result?.winner) {
        played++;
        if (result.winner === 'player1') p1Wins++;
        else if (result.winner === 'player2') p2Wins++;
        else if (result.winner === 'halved') halved++;
      }
    }

    return {
      player1Wins: p1Wins,
      player2Wins: p2Wins,
      halved,
      holesPlayed: played,
    };
  }, [holeResults]);

  // Get match status text
  const matchResultText = useMemo(
    () => getMatchStatusText(matchStatus, player1.name, player2.name),
    [matchStatus, player1.name, player2.name]
  );

  // Get per-player status
  const player1Status = useMemo(
    () => getPlayerMatchStatus(matchStatus, 'player1'),
    [matchStatus]
  );
  const player2Status = useMemo(
    () => getPlayerMatchStatus(matchStatus, 'player2'),
    [matchStatus]
  );

  // Determine result colors
  const getResultBadgeStyle = () => {
    if (matchStatus.status !== 'complete') {
      return { backgroundColor: colors.warning };
    }
    if (matchStatus.winner === 'halved') {
      return { backgroundColor: colors.warning };
    }
    return { backgroundColor: colors.success };
  };

  // Get hole result indicator color
  const getHoleColor = (hole: number): string => {
    const result = holeResults[hole];
    if (!result?.winner) return colors.surfaceVariant;
    if (result.winner === 'player1') return colors.success;
    if (result.winner === 'player2') return colors.error;
    return colors.warning; // halved
  };

  // Get hole result text
  const getHoleText = (hole: number): string => {
    const result = holeResults[hole];
    if (!result?.winner) return '-';
    if (result.winner === 'player1') return 'W';
    if (result.winner === 'player2') return 'L';
    return 'H'; // halved
  };

  // Render hole grid (9 holes per row)
  const renderHoleGrid = (startHole: number, endHole: number, label: string) => (
    <View style={styles.nineSection}>
      <Text style={[styles.nineLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.holeGrid}>
        {Array.from({ length: endHole - startHole + 1 }, (_, i) => {
          const hole = startHole + i;
          const holeColor = getHoleColor(hole);
          const holeText = getHoleText(hole);
          const isPlayed = holeResults[hole]?.winner !== undefined && holeResults[hole]?.winner !== null;

          return (
            <View
              key={hole}
              style={[
                styles.holeCell,
                { backgroundColor: holeColor, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.holeNumber,
                  { color: isPlayed ? colors.white : colors.textSecondary },
                ]}
              >
                {hole}
              </Text>
              {isPlayed && (
                <Text style={[styles.holeResult, { color: colors.white }]}>
                  {holeText}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}
      testID={testID}
    >
      {/* Card Header */}
      <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.titleContainer}>
          <Icon source="sword-cross" size={24} color={colors.primary} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            MATCH PLAY RESULT
          </Text>
        </View>
      </View>

      {/* Match Result Banner */}
      <View style={[styles.resultBanner, getResultBadgeStyle()]}>
        <Text style={[styles.resultText, { color: colors.white }]}>
          {matchResultText}
        </Text>
        {matchStatus.status === 'complete' && (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={[styles.statusBadgeText, { color: colors.white }]}>
              {matchStatus.winner === 'halved' ? 'HALVED' : 'FINAL'}
            </Text>
          </View>
        )}
      </View>

      {/* Player Status Cards */}
      <View style={styles.playersRow}>
        {/* Player 1 */}
        <View style={[styles.playerCard, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
            {player1.name}
          </Text>
          <View
            style={[
              styles.playerStatusBadge,
              {
                backgroundColor:
                  player1Status.type === 'up' || player1Status.type === 'win'
                    ? colors.success
                    : player1Status.type === 'down' || player1Status.type === 'loss'
                      ? colors.error
                      : colors.warning,
              },
            ]}
          >
            <Text style={[styles.playerStatusText, { color: colors.white }]}>
              {player1Status.text}
            </Text>
          </View>
          <Text style={[styles.playerStat, { color: colors.textSecondary }]}>
            {stats.player1Wins} holes won
          </Text>
        </View>

        {/* VS Divider */}
        <View style={styles.vsDivider}>
          <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
        </View>

        {/* Player 2 */}
        <View style={[styles.playerCard, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
            {player2.name}
          </Text>
          <View
            style={[
              styles.playerStatusBadge,
              {
                backgroundColor:
                  player2Status.type === 'up' || player2Status.type === 'win'
                    ? colors.success
                    : player2Status.type === 'down' || player2Status.type === 'loss'
                      ? colors.error
                      : colors.warning,
              },
            ]}
          >
            <Text style={[styles.playerStatusText, { color: colors.white }]}>
              {player2Status.text}
            </Text>
          </View>
          <Text style={[styles.playerStat, { color: colors.textSecondary }]}>
            {stats.player2Wins} holes won
          </Text>
        </View>
      </View>

      {/* Hole-by-Hole Grid */}
      <View style={[styles.gridSection, { borderTopColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Hole-by-Hole Results
        </Text>
        {renderHoleGrid(1, 9, 'FRONT 9')}
        {renderHoleGrid(10, 18, 'BACK 9')}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            {player1.name} wins
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            {player2.name} wins
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Halved</Text>
        </View>
      </View>

      {/* Match Statistics Footer */}
      <View style={[styles.statsFooter, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.holesPlayed}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Played</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {stats.player1Wins}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {player1.name.split(' ')[0]} W
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.error }]}>
            {stats.player2Wins}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {player2.name.split(' ')[0]} W
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{stats.halved}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Halved</Text>
        </View>
      </View>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h4,
  },

  // Result Banner
  resultBanner: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultText: {
    ...typography.h3,
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    ...typography.captionBold,
    letterSpacing: 1,
  },

  // Players Row
  playersRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  playerCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  playerName: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  playerStatusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 56,
    alignItems: 'center',
  },
  playerStatusText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
  },
  playerStat: {
    ...typography.small,
  },
  vsDivider: {
    paddingHorizontal: spacing.xs,
  },
  vsText: {
    ...typography.small,
    fontWeight: '600',
  },

  // Hole Grid
  gridSection: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  sectionTitle: {
    ...typography.smallBold,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  nineSection: {
    marginBottom: spacing.md,
  },
  nineLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  holeGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  holeCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    maxWidth: 36,
  },
  holeNumber: {
    ...typography.caption,
    fontWeight: '600',
  },
  holeResult: {
    ...typography.captionBold,
    marginTop: -2,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.caption,
  },

  // Stats Footer
  statsFooter: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h4,
  },
  statLabel: {
    ...typography.caption,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'transparent',
  },
});

export default MatchPlayResultsCard;

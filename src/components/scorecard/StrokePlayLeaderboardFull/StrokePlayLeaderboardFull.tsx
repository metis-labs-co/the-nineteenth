/**
 * StrokePlayLeaderboardFull Component
 *
 * A full-screen leaderboard component for stroke play rounds, designed for
 * the Review Scorecard screen's Leaderboard tab. Unlike the collapsible
 * StrokePlayLeaderboard, this component is always expanded and optimized
 * for a dedicated tab view.
 *
 * Features:
 * - Full-screen layout with header and table view
 * - Sort toggle between gross and net scores
 * - Position badges with medal colors for top 3
 * - Current user highlighting
 * - Score breakdown showing gross, net, and thru hole
 * - Empty state handling
 */

import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { EmptyState } from '@/components/common';
import {
  spacing,
  typography,
  borderRadius,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';
import { getStrokesReceived, getEffectiveGrossStrokes } from '@/utils/scoring';

/** Props for the StrokePlayLeaderboardFull component */
export interface StrokePlayLeaderboardFullProps {
  /** List of players in the round */
  players: Player[];
  /** Function to get a player's score for a specific hole */
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  /** All holes in the course */
  holes: Hole[];
  /** Current user's ID for highlighting */
  currentUserId?: string;
  /**
   * Map of playerId → daily (playing) handicap for the round. When present it is
   * used as the strokes-received basis so the leaderboard's net matches the
   * scorecard, which scores off the round's daily handicap (`daily_handicap_used`)
   * rather than the raw profile index. Falls back to the player's raw `handicap`
   * when a player is missing from the map.
   */
  dailyHandicaps?: Record<string, number>;
  /** When provided, each player row becomes tappable and calls this with the
   *  player's id (used to open that player's individual scorecard). */
  onPlayerPress?: (playerId: string) => void;
  /** Optional test ID for testing */
  testID?: string;
}

/** Internal type for leaderboard row data */
interface LeaderboardRow {
  playerId: string;
  playerName: string;
  handicap: number;
  position: number;
  gross: number;
  grossRelativeToPar: number;
  net: number;
  netRelativeToPar: number;
  holesCompleted: number;
  isCurrentUser: boolean;
}

/** Sort options for the leaderboard */
type SortOption = 'net' | 'gross';

/**
 * Medal colors for top 3 positions
 */
const MEDAL_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

/**
 * StrokePlayLeaderboardFull - Full-screen leaderboard for stroke play rounds
 */
export const StrokePlayLeaderboardFull = React.memo(function StrokePlayLeaderboardFull({
  players,
  getPlayerScore,
  holes,
  currentUserId,
  dailyHandicaps,
  onPlayerPress,
  testID,
}: StrokePlayLeaderboardFullProps) {
  const colors = useThemeColors();
  const [sortBy, setSortBy] = useState<SortOption>('net');

  // Calculate totals and standings for all players
  const leaderboardData = useMemo((): LeaderboardRow[] => {
    const playerScores = players.map((player) => {
      // Net is computed off the round's daily (playing) handicap — matching the
      // scorecard. Fall back to the raw profile index only when no daily
      // handicap is known.
      const dailyHandicap = dailyHandicaps?.[player.id] ?? player.handicap ?? 0;
      let gross = 0;
      let net = 0;
      let coursePar = 0;
      let holesCompleted = 0;

      // Iterate the round's actual holes so back-9 rounds (numbers 10..18)
      // and combo courses don't get keyed against 1..N counters.
      for (const hole of holes) {
        const score = getPlayerScore(player.id, hole.number);
        if (!score) continue;

        // Handle single ball score only
        if (!isSingleBallScore(score)) continue;

        const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
        // Pickups (>= PICKUP_SCORE) resolve to WHS net double bogey for both
        // gross and net — matching the scorecard's totals. Unplayed holes
        // (no/zero score) return null and are skipped.
        const effectiveStrokes = getEffectiveGrossStrokes(score.strokes, hole.par, strokesReceived);
        if (effectiveStrokes === null) continue;

        gross += effectiveStrokes;
        net += effectiveStrokes - strokesReceived;
        coursePar += hole.par;
        holesCompleted++;
      }

      return {
        playerId: player.id,
        playerName: player.name,
        handicap: dailyHandicap,
        position: 0, // Will be calculated after sorting
        gross,
        grossRelativeToPar: gross - coursePar,
        net,
        netRelativeToPar: net - coursePar,
        holesCompleted,
        isCurrentUser: player.id === currentUserId,
      };
    });

    // Sort by the selected metric
    playerScores.sort((a, b) => {
      const aValue = sortBy === 'gross' ? a.grossRelativeToPar : a.netRelativeToPar;
      const bValue = sortBy === 'gross' ? b.grossRelativeToPar : b.netRelativeToPar;
      return aValue - bValue;
    });

    // Assign positions (handling ties)
    let currentPosition = 1;
    for (let i = 0; i < playerScores.length; i++) {
      if (i > 0) {
        const prevValue = sortBy === 'gross'
          ? playerScores[i - 1].grossRelativeToPar
          : playerScores[i - 1].netRelativeToPar;
        const currValue = sortBy === 'gross'
          ? playerScores[i].grossRelativeToPar
          : playerScores[i].netRelativeToPar;

        if (currValue !== prevValue) {
          currentPosition = i + 1;
        }
      }
      playerScores[i].position = currentPosition;
    }

    return playerScores;
  }, [players, getPlayerScore, holes, currentUserId, sortBy, dailyHandicaps]);

  // Get the maximum completed hole for "thru" display
  const maxCompletedHole = useMemo(() => {
    return Math.max(...leaderboardData.map((row) => row.holesCompleted), 0);
  }, [leaderboardData]);

  // Toggle sort option
  const toggleSort = useCallback(() => {
    setSortBy((prev) => (prev === 'net' ? 'gross' : 'net'));
  }, []);

  // Format relative to par display
  const formatRelativeToPar = (value: number) => {
    if (value === 0) return 'E';
    return value > 0 ? `+${value}` : `${value}`;
  };

  // Get position badge color
  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return MEDAL_COLORS.gold;
      case 2:
        return MEDAL_COLORS.silver;
      case 3:
        return MEDAL_COLORS.bronze;
      default:
        return colors.textSecondary;
    }
  };

  // Get position display (with suffix)
  const getPositionDisplay = (position: number) => {
    const suffix = position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th';
    return `${position}${suffix}`;
  };

  // Empty state - no scores yet
  if (maxCompletedHole === 0 || players.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]} testID={testID}>
        <EmptyState
          title="No Scores Yet"
          message="Leaderboard standings will appear here as you complete each hole."
          icon="trophy-outline"
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Header with sort toggle */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Icon source="trophy" size={24} color={colors.primary} />
          <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
            Leaderboard
          </Text>
          <Text style={[typography.small, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
            (thru {maxCompletedHole})
          </Text>
        </View>
        <TouchableOpacity
          onPress={toggleSort}
          style={[styles.sortButton, { backgroundColor: colors.surfaceVariant }]}
          accessibilityRole="button"
          accessibilityLabel={`Sort by ${sortBy === 'net' ? 'gross' : 'net'} score`}
        >
          <Icon source="sort" size={16} color={colors.textSecondary} />
          <Text style={[typography.small, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
            {sortBy === 'net' ? 'Net' : 'Gross'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Table header */}
      <View style={[styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.positionCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Pos</Text>
        </View>
        <View style={styles.playerCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Player</Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Gross</Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Net</Text>
        </View>
        <View style={styles.thruCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Thru</Text>
        </View>
      </View>

      {/* Leaderboard rows */}
      {leaderboardData.map((row, index) => {
        const rowStyle = [
          styles.row,
          { backgroundColor: row.isCurrentUser ? colors.primaryBackground : colors.surface },
          index < leaderboardData.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
        ];
        const accessibilityLabel = `${getPositionDisplay(row.position)} place: ${row.playerName}, ${formatRelativeToPar(sortBy === 'gross' ? row.grossRelativeToPar : row.netRelativeToPar)}`;
        const rowContent = (
          <>
          {/* Position */}
          <View style={styles.positionCol}>
            <View
              style={[
                styles.positionBadge,
                row.position <= 3 && { backgroundColor: getPositionColor(row.position) + '20' },
              ]}
            >
              <Text
                style={[
                  row.position <= 3 ? typography.bodyBold : typography.body,
                  { color: row.position <= 3 ? getPositionColor(row.position) : colors.textPrimary },
                ]}
              >
                {row.position}
              </Text>
            </View>
          </View>

          {/* Player info */}
          <View style={styles.playerCol}>
            <Text
              style={[
                typography.body,
                row.isCurrentUser && typography.bodyBold,
                { color: row.isCurrentUser ? colors.primary : colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {row.playerName}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              HC {row.handicap}
            </Text>
          </View>

          {/* Gross score */}
          <View style={styles.scoreCol}>
            <Text
              style={[
                sortBy === 'gross' ? typography.bodyBold : typography.body,
                { color: sortBy === 'gross' ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              {formatRelativeToPar(row.grossRelativeToPar)}
            </Text>
          </View>

          {/* Net score */}
          <View style={styles.scoreCol}>
            <Text
              style={[
                sortBy === 'net' ? typography.bodyBold : typography.body,
                { color: sortBy === 'net' ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              {formatRelativeToPar(row.netRelativeToPar)}
            </Text>
          </View>

          {/* Thru hole */}
          <View style={styles.thruCol}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {row.holesCompleted}
            </Text>
          </View>
          </>
        );

        if (onPlayerPress) {
          return (
            <TouchableOpacity
              key={row.playerId}
              style={rowStyle}
              onPress={() => onPlayerPress(row.playerId)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              accessibilityHint="Tap to view scorecard"
            >
              {rowContent}
            </TouchableOpacity>
          );
        }

        return (
          <View key={row.playerId} style={rowStyle} accessibilityLabel={accessibilityLabel}>
            {rowContent}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  // Table header styles
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  // Column styles
  positionCol: {
    width: 40,
    alignItems: 'center',
  },
  playerCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  scoreCol: {
    width: 50,
    alignItems: 'center',
  },
  thruCol: {
    width: 40,
    alignItems: 'center',
  },
  // Row styles
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
});

export default StrokePlayLeaderboardFull;

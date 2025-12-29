/**
 * LeaderboardTable - Reusable full leaderboard table component
 *
 * Features:
 * - Sorted list of players by Stableford points (descending)
 * - Columns: Position | Player Name | Handicap | Points
 * - Highlight current player row
 * - Trophy icon for 1st place
 * - Handle ties with same position number
 * - Loading and empty states
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { IconTrophy, IconChartBar } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { useThemeColors } from '@/context/ThemeContext';
import type { LeaderboardEntry } from '@/hooks/useLeaderboard';

export interface LeaderboardTableProps {
  /** Leaderboard entries to display */
  leaderboard: LeaderboardEntry[];
  /** Current user ID for highlighting */
  currentUserId?: string;
  /** Whether the data is loading */
  isLoading?: boolean;
  /** Show rounds played column */
  showRoundsPlayed?: boolean;
  /** Show tied indicator (T) next to position */
  showTiedIndicator?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Test ID for testing */
  testID?: string;
}

/** Extended entry with calculated position */
interface LeaderboardEntryWithPosition extends LeaderboardEntry {
  position: number;
  isTied: boolean;
}

/**
 * Calculate positions with tie handling
 */
function calculatePositions(leaderboard: LeaderboardEntry[]): LeaderboardEntryWithPosition[] {
  if (!leaderboard || leaderboard.length === 0) return [];

  // Sort by points descending
  const sorted = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);

  let currentPosition = 1;
  let lastPoints: number | null = null;

  return sorted.map((entry, index) => {
    if (lastPoints === null || entry.totalPoints !== lastPoints) {
      currentPosition = index + 1;
    }
    lastPoints = entry.totalPoints;

    // Check if tied (same points as previous or next entry)
    const isTied =
      (index > 0 && sorted[index - 1].totalPoints === entry.totalPoints) ||
      (index < sorted.length - 1 && sorted[index + 1].totalPoints === entry.totalPoints);

    return {
      ...entry,
      position: currentPosition,
      isTied,
    };
  });
}

export function LeaderboardTable({
  leaderboard,
  currentUserId,
  isLoading = false,
  showRoundsPlayed = false,
  showTiedIndicator = true,
  emptyMessage = 'Scores will appear here once players submit their scorecards.',
  testID,
}: LeaderboardTableProps) {
  const colors = useThemeColors();

  // Calculate positions with tie handling
  const leaderboardWithPositions = useMemo(
    () => calculatePositions(leaderboard),
    [leaderboard]
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer} testID={testID ? `${testID}-loading` : undefined}>
        <LoadingSpinner size="lg" message="Loading leaderboard..." />
      </View>
    );
  }

  // Empty state
  if (leaderboardWithPositions.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.surface }]} testID={testID ? `${testID}-empty` : undefined}>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray200 }]}>
            <IconChartBar size={48} color={colors.gray400} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No scores yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{emptyMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]} testID={testID}>
      {/* Table Header */}
      <View style={[styles.tableHeader, { borderBottomColor: colors.gray200 }]}>
        <Text style={[styles.tableHeaderCell, styles.positionCol, { color: colors.textSecondary }]}>#</Text>
        <Text style={[styles.tableHeaderCell, styles.playerCol, { color: colors.textSecondary }]}>Player</Text>
        <Text style={[styles.tableHeaderCell, styles.handicapCol, { color: colors.textSecondary }]}>HC</Text>
        <Text style={[styles.tableHeaderCell, styles.pointsCol, { color: colors.textSecondary }]}>Pts</Text>
      </View>

      {/* Table Rows */}
      {leaderboardWithPositions.map((entry) => {
        const isCurrentUser = entry.playerId === currentUserId;
        const isFirstPlace = entry.position === 1;

        return (
          <View
            key={entry.playerId}
            style={[
              styles.tableRow,
              { borderBottomColor: colors.gray100 },
              isCurrentUser && [styles.tableRowHighlighted, { backgroundColor: withOpacity(colors.primaryLighter, 0.19) }],
              isFirstPlace && [styles.tableRowFirst, { backgroundColor: withOpacity(colors.warningLight, 0.13) }],
            ]}
            accessibilityRole="text"
            accessibilityLabel={`Position ${entry.position}${entry.isTied && showTiedIndicator ? ' tied' : ''}: ${entry.playerName}, Handicap ${entry.handicap}, ${entry.totalPoints} points`}
          >
            {/* Position */}
            <View style={[styles.tableCell, styles.positionCol]}>
              {isFirstPlace ? (
                <IconTrophy size={20} color={colors.warning} />
              ) : (
                <Text
                  style={[
                    styles.positionText,
                    { color: colors.textSecondary },
                    isCurrentUser && { color: colors.primary },
                  ]}
                >
                  {entry.position}
                  {entry.isTied && showTiedIndicator && (
                    <Text style={[styles.tiedIndicator, { color: colors.textDisabled }]}>T</Text>
                  )}
                </Text>
              )}
            </View>

            {/* Player Name */}
            <View style={[styles.tableCell, styles.playerCol]}>
              <Text
                style={[
                  styles.playerName,
                  { color: colors.textPrimary },
                  isCurrentUser && [styles.playerNameHighlighted, { color: colors.primary }],
                ]}
                numberOfLines={1}
              >
                {isCurrentUser ? 'You' : entry.playerName}
              </Text>
              {showRoundsPlayed && entry.roundsPlayed > 0 && (
                <Text style={[styles.roundsPlayedText, { color: colors.textSecondary }]}>
                  {entry.roundsPlayed} round{entry.roundsPlayed !== 1 ? 's' : ''}
                </Text>
              )}
            </View>

            {/* Handicap */}
            <View style={[styles.tableCell, styles.handicapCol]}>
              <Text
                style={[
                  styles.handicapText,
                  { color: colors.textSecondary },
                  isCurrentUser && { color: colors.primary },
                ]}
              >
                {entry.handicap}
              </Text>
            </View>

            {/* Points */}
            <View style={[styles.tableCell, styles.pointsCol]}>
              <Text
                style={[
                  styles.pointsText,
                  { color: colors.textPrimary },
                  isCurrentUser && { color: colors.primary },
                  isFirstPlace && [styles.pointsFirst, { color: colors.warningDark }],
                ]}
              >
                {entry.totalPoints}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Card
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  emptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },

  // Table Header
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },

  // Table Row
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  tableRowHighlighted: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  tableRowFirst: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  tableCell: {
    justifyContent: 'center',
  },

  // Column widths
  positionCol: {
    width: 40,
    alignItems: 'center',
  },
  playerCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  handicapCol: {
    width: 40,
    alignItems: 'center',
  },
  pointsCol: {
    width: 50,
    alignItems: 'flex-end',
  },

  // Position
  positionText: {
    ...typography.bodyBold,
  },
  tiedIndicator: {
    ...typography.caption,
  },

  // Player
  playerName: {
    ...typography.body,
  },
  playerNameHighlighted: {
    ...typography.bodyBold,
  },
  roundsPlayedText: {
    ...typography.caption,
    marginTop: 2,
  },

  // Handicap
  handicapText: {
    ...typography.small,
  },

  // Points
  pointsText: {
    ...typography.h4,
  },
  pointsFirst: {
    // Color applied inline
  },

  // Loading state
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
});

export default LeaderboardTable;

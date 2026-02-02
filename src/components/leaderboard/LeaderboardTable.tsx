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
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LoadingSpinner, ScaledText } from '@/components/common';
import { IconTrophy, IconChartBar, IconChevronRight } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { useThemeColors } from '@/context/ThemeContext';
import type { LeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';

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
  /** Callback when an entry row is pressed (for showing points breakdown) */
  onEntryPress?: (playerId: string) => void;
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
  onEntryPress,
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
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.surfaceVariant }]}>
            <IconChartBar size={48} color={colors.textDisabled} />
          </View>
          <ScaledText category="body" style={[styles.emptyTitle, { color: colors.textPrimary }]}>No scores yet</ScaledText>
          <ScaledText category="body" style={[styles.emptyMessage, { color: colors.textSecondary }]}>{emptyMessage}</ScaledText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]} testID={testID}>
      {/* Table Header */}
      <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
        <ScaledText category="caption" style={[styles.tableHeaderCell, styles.positionCol, { color: colors.textSecondary }]}>#</ScaledText>
        <ScaledText category="caption" style={[styles.tableHeaderCell, styles.playerCol, { color: colors.textSecondary }]}>Player</ScaledText>
        <ScaledText category="caption" style={[styles.tableHeaderCell, styles.handicapCol, { color: colors.textSecondary }]}>HC</ScaledText>
        <ScaledText category="caption" style={[styles.tableHeaderCell, styles.pointsCol, { color: colors.textSecondary }]}>Pts</ScaledText>
      </View>

      {/* Table Rows */}
      {leaderboardWithPositions.map((entry) => {
        const isCurrentUser = entry.playerId === currentUserId;
        const isFirstPlace = entry.position === 1;
        const isPressable = !!onEntryPress;

        const rowContent = (
          <>
            {/* Position */}
            <View style={[styles.tableCell, styles.positionCol]}>
              {isFirstPlace ? (
                <IconTrophy size={20} color={colors.warning} />
              ) : (
                <ScaledText
                  category="caption"
                  style={[
                    styles.positionText,
                    { color: colors.textSecondary },
                    isCurrentUser && { color: colors.primary },
                  ]}
                >
                  {entry.position}
                  {entry.isTied && showTiedIndicator && (
                    <ScaledText category="caption" style={[styles.tiedIndicator, { color: colors.textDisabled }]}>T</ScaledText>
                  )}
                </ScaledText>
              )}
            </View>

            {/* Player Name */}
            <View style={[styles.tableCell, styles.playerCol]}>
              <ScaledText
                category="body"
                style={[
                  styles.playerName,
                  { color: colors.textPrimary },
                  isCurrentUser && [styles.playerNameHighlighted, { color: colors.primary }],
                ]}
                numberOfLines={1}
              >
                {isCurrentUser ? 'You' : entry.playerName}
              </ScaledText>
              {showRoundsPlayed && entry.roundsPlayed > 0 && (
                <ScaledText category="caption" style={[styles.roundsPlayedText, { color: colors.textSecondary }]}>
                  {entry.roundsPlayed} round{entry.roundsPlayed !== 1 ? 's' : ''}
                </ScaledText>
              )}
            </View>

            {/* Handicap */}
            <View style={[styles.tableCell, styles.handicapCol]}>
              <ScaledText
                category="caption"
                style={[
                  styles.handicapText,
                  { color: colors.textSecondary },
                  isCurrentUser && { color: colors.primary },
                ]}
              >
                {entry.handicap}
              </ScaledText>
            </View>

            {/* Points */}
            <View style={[styles.tableCell, styles.pointsCol]}>
              <ScaledText
                category="caption"
                style={[
                  styles.pointsText,
                  { color: colors.textPrimary },
                  isCurrentUser && { color: colors.primary },
                  isFirstPlace && [styles.pointsFirst, { color: colors.warningDark }],
                ]}
              >
                {entry.totalPoints}
              </ScaledText>
            </View>

            {/* Chevron indicator when pressable */}
            {isPressable && (
              <View style={[styles.tableCell, styles.chevronCol]}>
                <IconChevronRight size={16} color={colors.textTertiary} />
              </View>
            )}
          </>
        );

        const rowStyle = [
          styles.tableRow,
          { borderBottomColor: colors.border },
          isCurrentUser && [styles.tableRowHighlighted, { backgroundColor: withOpacity(colors.primaryLighter, 0.19) }],
          isFirstPlace && [styles.tableRowFirst, { backgroundColor: withOpacity(colors.warningLight, 0.13) }],
        ];

        if (isPressable) {
          return (
            <TouchableOpacity
              key={entry.playerId}
              style={rowStyle}
              onPress={() => onEntryPress(entry.playerId)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`View points breakdown for ${isCurrentUser ? 'You' : entry.playerName}, Position ${entry.position}${entry.isTied && showTiedIndicator ? ' tied' : ''}, Handicap ${entry.handicap}, ${entry.totalPoints} points`}
              accessibilityHint="Tap to view round-by-round points breakdown"
            >
              {rowContent}
            </TouchableOpacity>
          );
        }

        return (
          <View
            key={entry.playerId}
            style={rowStyle}
            accessibilityRole="text"
            accessibilityLabel={`Position ${entry.position}${entry.isTied && showTiedIndicator ? ' tied' : ''}: ${entry.playerName}, Handicap ${entry.handicap}, ${entry.totalPoints} points`}
          >
            {rowContent}
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

  // Column widths (minWidth for text scaling flexibility)
  positionCol: {
    minWidth: 40,
    alignItems: 'center',
  },
  playerCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  handicapCol: {
    minWidth: 40,
    alignItems: 'center',
  },
  pointsCol: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
  chevronCol: {
    width: 20,
    alignItems: 'center',
    marginLeft: spacing.xs,
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

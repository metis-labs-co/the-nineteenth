/**
 * LeaderboardPreview - Compact leaderboard preview for dashboard
 *
 * Features:
 * - Shows top N players (default 3)
 * - Shows current player if not in top N (with gap indicator)
 * - Trophy icon for 1st place
 * - "View Full Leaderboard" button
 * - Empty state when no scores
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { IconTrophy, IconChartBar } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { formatPosition } from '@/utils/formatting';
import type { LeaderboardEntry } from '@/hooks/useLeaderboard';

export interface LeaderboardPreviewProps {
  /** Full leaderboard data */
  leaderboard: LeaderboardEntry[];
  /** Current player's ID for highlighting */
  currentPlayerId?: string;
  /** Number of top players to show (default: 3) */
  topCount?: number;
  /** Whether to show current player if not in top N */
  showCurrentPlayerIfNotInTop?: boolean;
  /** Callback when "View Full Leaderboard" is pressed */
  onViewFullLeaderboard?: () => void;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Test ID for testing */
  testID?: string;
}

export function LeaderboardPreview({
  leaderboard,
  currentPlayerId,
  topCount = 3,
  showCurrentPlayerIfNotInTop = true,
  onViewFullLeaderboard,
  emptyMessage = 'Complete a round to see the leaderboard.',
  testID,
}: LeaderboardPreviewProps) {
  const colors = useThemeColors();

  // Sort leaderboard by points descending
  const sortedLeaderboard = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return [];
    return [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
  }, [leaderboard]);

  // Get preview entries (top N + current player if not in top N)
  const previewEntries = useMemo(() => {
    if (sortedLeaderboard.length === 0) return [];

    const topEntries = sortedLeaderboard.slice(0, topCount);

    // Check if current player is not in top N
    if (showCurrentPlayerIfNotInTop && currentPlayerId) {
      const isInTop = topEntries.some((entry) => entry.playerId === currentPlayerId);
      if (!isInTop) {
        const currentPlayer = sortedLeaderboard.find(
          (entry) => entry.playerId === currentPlayerId
        );
        if (currentPlayer) {
          return [...topEntries, currentPlayer];
        }
      }
    }

    return topEntries;
  }, [sortedLeaderboard, topCount, currentPlayerId, showCurrentPlayerIfNotInTop]);

  // Get position for a player
  const getPosition = (playerId: string): number => {
    const index = sortedLeaderboard.findIndex((e) => e.playerId === playerId);
    if (index === -1) return 0;

    // Calculate position with tie handling
    let position = 1;
    for (let i = 0; i < index; i++) {
      if (sortedLeaderboard[i].totalPoints > sortedLeaderboard[index].totalPoints) {
        position = i + 2;
      }
    }
    return position;
  };

  // Empty state
  if (!leaderboard || leaderboard.length === 0 || previewEntries.length === 0) {
    return (
      <Card style={[styles.emptyCard, { backgroundColor: colors.surface }]} testID={testID ? `${testID}-empty` : undefined}>
        <Card.Content style={styles.emptyContent}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray200 }]}>
            <IconChartBar size={48} color={colors.gray400} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No scores yet</Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{emptyMessage}</Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <View testID={testID}>
      <Card style={[styles.card, { backgroundColor: colors.surface }]} mode="outlined">
        <Card.Content style={styles.cardContent}>
          {previewEntries.map((entry, index) => {
            const actualPosition = getPosition(entry.playerId);
            const isCurrentPlayer = entry.playerId === currentPlayerId;
            const isTop = index < topCount;
            const showDivider = index < previewEntries.length - 1;

            // Check if we need to show gap indicator (current player not in top N)
            const showGapIndicator =
              index === topCount - 1 &&
              previewEntries.length > topCount &&
              !previewEntries[index + 1]?.playerId;

            // Actually show gap if this is the last top entry and next is current player
            const showGapAfterThis =
              index === topCount - 1 &&
              previewEntries.length > topCount;

            return (
              <React.Fragment key={entry.playerId}>
                <View
                  style={[
                    styles.row,
                    isCurrentPlayer && [styles.currentPlayerRow, { backgroundColor: colors.primaryLighter }],
                  ]}
                  accessibilityLabel={`${formatPosition(actualPosition)} place: ${entry.playerName}, ${entry.totalPoints} points`}
                  accessibilityRole="text"
                >
                  {/* Position */}
                  <View style={styles.positionContainer}>
                    {actualPosition === 1 ? (
                      <IconTrophy size={20} color={colors.warning} />
                    ) : (
                      <Text style={[styles.positionText, { color: colors.textSecondary }]}>{actualPosition}</Text>
                    )}
                  </View>

                  {/* Player Info */}
                  <View style={styles.playerInfo}>
                    <Text
                      style={[
                        styles.playerName,
                        { color: colors.textPrimary },
                        isCurrentPlayer && { color: colors.primaryDark, fontWeight: '600' },
                      ]}
                      numberOfLines={1}
                    >
                      {isCurrentPlayer ? 'You' : entry.playerName}
                    </Text>
                    <Text style={[styles.handicapText, { color: colors.textSecondary }]}>HC: {entry.handicap}</Text>
                  </View>

                  {/* Points */}
                  <Text
                    style={[
                      styles.pointsText,
                      { color: colors.textPrimary },
                      isCurrentPlayer && { color: colors.primaryDark },
                    ]}
                  >
                    {entry.totalPoints} pts
                  </Text>
                </View>

                {/* Gap Indicator */}
                {showGapAfterThis && (
                  <View style={styles.gapIndicator}>
                    <Text style={[styles.gapDots, { color: colors.textSecondary }]}>• • •</Text>
                  </View>
                )}

                {/* Divider */}
                {showDivider && !showGapAfterThis && (
                  <Divider style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            );
          })}
        </Card.Content>
      </Card>

      {/* View Full Leaderboard Button */}
      {onViewFullLeaderboard && (
        <Button
          mode="outlined"
          onPress={onViewFullLeaderboard}
          style={[styles.viewButton, { borderColor: colors.primary }]}
          contentStyle={styles.viewButtonContent}
          labelStyle={[styles.viewButtonLabel, { color: colors.primary }]}
          accessibilityLabel="View full leaderboard"
          accessibilityRole="button"
          accessibilityHint="Opens the complete leaderboard with all players"
        >
          View Full Leaderboard
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Card
  card: {
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  cardContent: {
    padding: spacing.md,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  currentPlayerRow: {
    borderRadius: borderRadius.md,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.md,
  },

  // Position
  positionContainer: {
    width: 32,
    alignItems: 'center',
  },
  positionText: {
    ...typography.bodyBold,
  },

  // Player Info
  playerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  playerName: {
    ...typography.body,
  },
  handicapText: {
    ...typography.caption,
    marginTop: 2,
  },

  // Points
  pointsText: {
    ...typography.bodyBold,
  },

  // Divider
  rowDivider: {
    marginHorizontal: spacing.sm,
  },

  // Gap Indicator
  gapIndicator: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  gapDots: {
    ...typography.body,
    letterSpacing: 4,
  },

  // View Button
  viewButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
  },
  viewButtonContent: {
    height: 48,
  },
  viewButtonLabel: {
    ...typography.bodyBold,
  },

  // Empty State
  emptyCard: {
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  emptyContent: {
    padding: spacing.xl,
    alignItems: 'center',
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
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },
});

export default LeaderboardPreview;

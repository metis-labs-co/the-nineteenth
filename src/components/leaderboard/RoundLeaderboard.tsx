/**
 * RoundLeaderboard - Format-specific leaderboard display for individual rounds
 *
 * Renders different layouts based on gameType:
 * - Stableford/Stroke: Table with Position, Name, Score columns
 * - Match Play: List showing matchups with results (e.g., 'Player A def. Player B 3&2')
 *
 * Features:
 * - Round info header with game type badge and date
 * - Handles team rounds by showing team names
 * - Loading and error states
 * - Auto-refresh support via useRoundLeaderboard hook
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import {
  IconTrophy,
  IconUsers,
  IconSwords,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';
import { Pill } from '@/components/common/Pill';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import {
  useRoundLeaderboard,
  type RoundLeaderboardEntry,
  type PlayerLeaderboardEntry,
  type MatchPlayScoreData,
  isTeamEntry,
  isStablefordScore,
  isStrokeScore,
  isMatchPlayScore,
  isTeamScore,
} from '@/hooks/useRoundLeaderboard';
import type { GameType } from '@/types';

// =====================================================
// TYPES
// =====================================================

export interface RoundLeaderboardProps {
  /**
   * The round ID to fetch leaderboard data for
   */
  roundId: string;
  /**
   * The game type for this round (stableford, stroke, match-play)
   * Used to determine the display layout
   */
  gameType: GameType;
  /**
   * Whether this is a team round
   */
  isTeamRound: boolean;
  /**
   * Current user ID for highlighting their row
   */
  currentUserId?: string;
  /**
   * Enable auto-refresh (default: true)
   */
  autoRefresh?: boolean;
  /**
   * Auto-refresh interval in ms (default: 30000)
   */
  refetchInterval?: number;
  /**
   * Custom empty state message
   */
  emptyMessage?: string;
  /**
   * Test ID for testing
   */
  testID?: string;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get the display label for a game type
 */
function getGameTypeLabel(gameType: GameType): string {
  switch (gameType) {
    case 'stableford':
      return 'Stableford';
    case 'stroke':
      return 'Stroke Play';
    case 'match-play':
      return 'Match Play';
    case 'ambrose':
      return 'Ambrose';
    case 'best-ball':
      return 'Best Ball';
    default:
      return gameType;
  }
}

/**
 * Get the pill variant for a game type
 */
function getGameTypeVariant(gameType: GameType): 'primary' | 'success' | 'warning' | 'info' {
  switch (gameType) {
    case 'stableford':
      return 'primary';
    case 'stroke':
      return 'info';
    case 'match-play':
      return 'warning';
    case 'ambrose':
    case 'best-ball':
      return 'success';
    default:
      return 'primary';
  }
}

/**
 * Format match play result for display
 */
function formatMatchResult(scoreData: MatchPlayScoreData): string {
  if (scoreData.matchResult === 'halved') {
    return 'Halved';
  }
  return scoreData.holesUpDown;
}

/**
 * Get match result description
 */
function getMatchResultDescription(
  entry: RoundLeaderboardEntry,
  scoreData: MatchPlayScoreData
): string {
  const name = isTeamEntry(entry) ? entry.teamName : (entry as PlayerLeaderboardEntry).playerName;

  if (scoreData.matchResult === 'halved') {
    return `${name} halved with ${scoreData.opponentName}`;
  } else if (scoreData.matchResult === 'win') {
    return `${name} def. ${scoreData.opponentName} ${scoreData.holesUpDown}`;
  } else {
    return `${name} lost to ${scoreData.opponentName} ${scoreData.holesUpDown}`;
  }
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface RoundHeaderProps {
  gameType: GameType;
  isTeamRound: boolean;
  date?: string;
  courseName?: string;
  roundNumber: number;
}

const RoundHeader = React.memo(function RoundHeader({
  gameType,
  isTeamRound,
  date,
  courseName,
  roundNumber,
}: RoundHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={[styles.roundTitle, { color: colors.textPrimary }]}>
          Round {roundNumber}
        </Text>
        <View style={styles.badgeRow}>
          <Pill
            label={getGameTypeLabel(gameType)}
            variant={getGameTypeVariant(gameType)}
            size="sm"
          />
          {isTeamRound && (
            <View style={[styles.teamBadge, { backgroundColor: colors.gray200 }]}>
              <IconUsers size={12} color={colors.textSecondary} />
              <Text style={[styles.teamBadgeText, { color: colors.textSecondary }]}>
                Teams
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.headerMeta}>
        {date && <DateTimeDisplay date={date} size="sm" />}
        {courseName && (
          <Text
            style={[styles.courseName, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {courseName}
          </Text>
        )}
      </View>
    </View>
  );
});

interface TableLeaderboardProps {
  entries: RoundLeaderboardEntry[];
  gameType: GameType;
  currentUserId?: string;
}

const TableLeaderboard = React.memo(function TableLeaderboard({
  entries,
  gameType,
  currentUserId,
}: TableLeaderboardProps) {
  const colors = useThemeColors();
  const isStroke = gameType === 'stroke';

  return (
    <View style={styles.table}>
      {/* Table Header */}
      <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerCell, styles.positionCol, { color: colors.textSecondary }]}>
          #
        </Text>
        <Text style={[styles.headerCell, styles.nameCol, { color: colors.textSecondary }]}>
          {entries.length > 0 && entries[0].isTeamResult ? 'Team' : 'Player'}
        </Text>
        <Text style={[styles.headerCell, styles.handicapCol, { color: colors.textSecondary }]}>
          HC
        </Text>
        <Text style={[styles.headerCell, styles.scoreCol, { color: colors.textSecondary }]}>
          {isStroke ? 'Net' : 'Pts'}
        </Text>
        {isStroke && (
          <Text style={[styles.headerCell, styles.grossCol, { color: colors.textSecondary }]}>
            Gross
          </Text>
        )}
      </View>

      {/* Table Rows */}
      {entries.map((entry, index) => {
        const isCurrentUser =
          !entry.isTeamResult &&
          (entry as PlayerLeaderboardEntry).playerId === currentUserId;
        const isFirstPlace = entry.position === 1;
        const isTied =
          index > 0 && entries[index - 1].position === entry.position;

        // Get name and handicap
        let name = '';
        let handicap = 0;
        if (isTeamEntry(entry)) {
          name = entry.teamName;
          // Average team handicap
          handicap = Math.round(
            entry.members.reduce((sum, m) => sum + m.handicap, 0) / entry.members.length
          );
        } else {
          name = (entry as PlayerLeaderboardEntry).playerName;
          handicap = (entry as PlayerLeaderboardEntry).handicap;
        }

        // Get score display
        let scoreDisplay = '-';
        let grossDisplay = '-';
        if (isStablefordScore(entry.scoreData)) {
          scoreDisplay = String(entry.scoreData.totalPoints);
        } else if (isStrokeScore(entry.scoreData)) {
          scoreDisplay = String(entry.scoreData.netScore);
          grossDisplay = String(entry.scoreData.grossScore);
        } else if (isTeamScore(entry.scoreData)) {
          scoreDisplay = String(entry.scoreData.teamScore);
        }

        return (
          <View
            key={isTeamEntry(entry) ? entry.teamId : (entry as PlayerLeaderboardEntry).playerId}
            style={[
              styles.tableRow,
              { borderBottomColor: colors.borderLight },
              isCurrentUser && { backgroundColor: `${colors.primary}15` },
              isFirstPlace && { backgroundColor: `${colors.warning}10` },
            ]}
            accessibilityRole="text"
            accessibilityLabel={`Position ${entry.position}${isTied ? ' tied' : ''}: ${name}, Handicap ${handicap}, ${scoreDisplay} ${isStroke ? 'net' : 'points'}`}
          >
            {/* Position */}
            <View style={[styles.cell, styles.positionCol]}>
              {isFirstPlace ? (
                <IconTrophy size={18} color={colors.warning} />
              ) : (
                <Text
                  style={[
                    styles.positionText,
                    { color: colors.textSecondary },
                    isCurrentUser && { color: colors.primary },
                  ]}
                >
                  {entry.position}
                  {isTied && <Text style={styles.tiedIndicator}>T</Text>}
                </Text>
              )}
            </View>

            {/* Name */}
            <View style={[styles.cell, styles.nameCol]}>
              <Text
                style={[
                  styles.nameText,
                  { color: colors.textPrimary },
                  isCurrentUser && { color: colors.primary, fontWeight: '600' },
                ]}
                numberOfLines={1}
              >
                {isCurrentUser ? 'You' : name}
              </Text>
              {isTeamEntry(entry) && entry.members.length > 0 && (
                <Text
                  style={[styles.membersText, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {entry.members.map((m) => m.playerName).join(', ')}
                </Text>
              )}
            </View>

            {/* Handicap */}
            <View style={[styles.cell, styles.handicapCol]}>
              <Text
                style={[
                  styles.handicapText,
                  { color: colors.textSecondary },
                  isCurrentUser && { color: colors.primary },
                ]}
              >
                {handicap}
              </Text>
            </View>

            {/* Score */}
            <View style={[styles.cell, styles.scoreCol]}>
              <Text
                style={[
                  styles.scoreText,
                  { color: colors.textPrimary },
                  isCurrentUser && { color: colors.primary },
                  isFirstPlace && { color: colors.warningDark },
                ]}
              >
                {scoreDisplay}
              </Text>
            </View>

            {/* Gross (Stroke Play only) */}
            {isStroke && (
              <View style={[styles.cell, styles.grossCol]}>
                <Text
                  style={[
                    styles.grossText,
                    { color: colors.textSecondary },
                    isCurrentUser && { color: colors.primary },
                  ]}
                >
                  {grossDisplay}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
});

interface MatchPlayLeaderboardProps {
  entries: RoundLeaderboardEntry[];
  currentUserId?: string;
}

const MatchPlayLeaderboard = React.memo(function MatchPlayLeaderboard({
  entries,
  currentUserId,
}: MatchPlayLeaderboardProps) {
  const colors = useThemeColors();

  // Group entries by matches (pairs of opponents)
  const processedMatches = useMemo(() => {
    const matches: {
      id: string;
      entry: RoundLeaderboardEntry;
      scoreData: MatchPlayScoreData;
    }[] = [];
    const seenOpponents = new Set<string>();

    entries.forEach((entry) => {
      if (!isMatchPlayScore(entry.scoreData)) return;

      const entryId = isTeamEntry(entry)
        ? entry.teamId
        : (entry as PlayerLeaderboardEntry).playerId;

      // Skip if we've already processed this match from the opponent's side
      if (seenOpponents.has(entryId)) return;

      matches.push({
        id: entryId,
        entry,
        scoreData: entry.scoreData,
      });

      // Mark opponent as seen
      if (entry.scoreData.opponentId) {
        seenOpponents.add(entry.scoreData.opponentId);
      }
    });

    return matches;
  }, [entries]);

  return (
    <View style={styles.matchPlayContainer}>
      {processedMatches.map(({ id, entry, scoreData }) => {
        const name = isTeamEntry(entry)
          ? entry.teamName
          : (entry as PlayerLeaderboardEntry).playerName;
        const isCurrentUser =
          !entry.isTeamResult &&
          (entry as PlayerLeaderboardEntry).playerId === currentUserId;
        const isWin = scoreData.matchResult === 'win';
        const isHalved = scoreData.matchResult === 'halved';

        return (
          <View
            key={id}
            style={[
              styles.matchCard,
              { backgroundColor: colors.surface },
              isCurrentUser && { borderColor: colors.primary, borderWidth: 2 },
            ]}
          >
            <View style={styles.matchHeader}>
              <IconSwords size={16} color={colors.textSecondary} />
              <Text style={[styles.matchLabel, { color: colors.textSecondary }]}>
                Match
              </Text>
            </View>

            <View style={styles.matchContent}>
              {/* Player/Team */}
              <View style={styles.matchPlayer}>
                <Text
                  style={[
                    styles.matchPlayerName,
                    { color: colors.textPrimary },
                    isWin && { color: colors.success, fontWeight: '700' },
                    isCurrentUser && { color: colors.primary },
                  ]}
                  numberOfLines={1}
                >
                  {isCurrentUser ? 'You' : name}
                </Text>
                {isTeamEntry(entry) && (
                  <Text
                    style={[styles.matchPlayerMembers, { color: colors.textTertiary }]}
                    numberOfLines={1}
                  >
                    {entry.members.map((m) => m.playerName).join(', ')}
                  </Text>
                )}
              </View>

              {/* Result */}
              <View
                style={[
                  styles.matchResult,
                  {
                    backgroundColor: isWin
                      ? `${colors.success}15`
                      : isHalved
                      ? `${colors.warning}15`
                      : `${colors.error}15`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.matchResultText,
                    {
                      color: isWin
                        ? colors.success
                        : isHalved
                        ? colors.warning
                        : colors.error,
                    },
                  ]}
                >
                  {formatMatchResult(scoreData)}
                </Text>
              </View>

              {/* Opponent */}
              <View style={styles.matchOpponent}>
                <Text style={[styles.vsText, { color: colors.textTertiary }]}>vs</Text>
                <Text
                  style={[
                    styles.matchOpponentName,
                    { color: colors.textPrimary },
                    !isWin && !isHalved && { color: colors.success, fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {scoreData.opponentName}
                </Text>
              </View>
            </View>

            {/* Score details */}
            <View style={[styles.matchFooter, { borderTopColor: colors.borderLight }]}>
              <Text style={[styles.matchStats, { color: colors.textSecondary }]}>
                {scoreData.holesWon}W - {scoreData.holesLost}L - {scoreData.holesHalved}H
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const RoundLeaderboard = React.memo(function RoundLeaderboard({
  roundId,
  gameType,
  isTeamRound,
  currentUserId,
  autoRefresh = true,
  refetchInterval = 30000,
  emptyMessage = 'Scores will appear here once players submit their scorecards.',
  testID,
}: RoundLeaderboardProps) {
  const colors = useThemeColors();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useRoundLeaderboard(roundId, {
    autoRefresh,
    refetchInterval,
    enabled: !!roundId,
  });

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer} testID={testID ? `${testID}-loading` : undefined}>
        <LoadingSpinner size="lg" message="Loading leaderboard..." />
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View testID={testID ? `${testID}-error` : undefined}>
        <ErrorState
          title="Failed to load leaderboard"
          error={error?.message || 'An unexpected error occurred'}
          onRetry={refetch}
        />
      </View>
    );
  }

  // Empty state
  if (!data || data.entries.length === 0) {
    return (
      <View testID={testID ? `${testID}-empty` : undefined}>
        <RoundHeader
          gameType={data?.metadata.gameType || gameType}
          isTeamRound={data?.metadata.isTeamRound ?? isTeamRound}
          date={data?.metadata.date}
          courseName={data?.metadata.courseName}
          roundNumber={data?.metadata.roundNumber || 1}
        />
        <EmptyState
          title="No scores yet"
          message={emptyMessage}
          icon="clipboard-list-outline"
          compact
        />
      </View>
    );
  }

  const { entries, metadata } = data;
  const effectiveGameType = metadata.gameType;
  const isMatchPlay = effectiveGameType === 'match-play';

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <RoundHeader
        gameType={effectiveGameType}
        isTeamRound={metadata.isTeamRound}
        date={metadata.date}
        courseName={metadata.courseName}
        roundNumber={metadata.roundNumber}
      />

      {/* Leaderboard Content */}
      <View
        style={[styles.card, { backgroundColor: colors.surface }]}
      >
        {isMatchPlay ? (
          <MatchPlayLeaderboard
            entries={entries}
            currentUserId={currentUserId}
          />
        ) : (
          <TableLeaderboard
            entries={entries}
            gameType={effectiveGameType}
            currentUserId={currentUserId}
          />
        )}
      </View>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  roundTitle: {
    ...typography.h3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  teamBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  courseName: {
    ...typography.caption,
    flex: 1,
  },

  // Card
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },

  // Table
  table: {
    paddingVertical: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  cell: {
    justifyContent: 'center',
  },

  // Column widths
  positionCol: {
    width: 36,
    alignItems: 'center',
  },
  nameCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  handicapCol: {
    width: 36,
    alignItems: 'center',
  },
  scoreCol: {
    width: 44,
    alignItems: 'flex-end',
  },
  grossCol: {
    width: 44,
    alignItems: 'flex-end',
  },

  // Text styles
  positionText: {
    ...typography.bodyBold,
  },
  tiedIndicator: {
    ...typography.caption,
    marginLeft: 1,
  },
  nameText: {
    ...typography.body,
  },
  membersText: {
    ...typography.caption,
    marginTop: 2,
  },
  handicapText: {
    ...typography.small,
  },
  scoreText: {
    ...typography.h4,
  },
  grossText: {
    ...typography.small,
  },

  // Match Play styles
  matchPlayContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  matchCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  matchLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  matchPlayer: {
    flex: 1,
  },
  matchPlayerName: {
    ...typography.bodyBold,
  },
  matchPlayerMembers: {
    ...typography.caption,
    marginTop: 2,
  },
  matchResult: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  matchResultText: {
    ...typography.smallBold,
  },
  matchOpponent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  vsText: {
    ...typography.caption,
    marginBottom: 2,
  },
  matchOpponentName: {
    ...typography.body,
    textAlign: 'right',
  },
  matchFooter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  matchStats: {
    ...typography.caption,
    textAlign: 'center',
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
});

export default RoundLeaderboard;

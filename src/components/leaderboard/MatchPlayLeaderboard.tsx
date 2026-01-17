/**
 * MatchPlayLeaderboard - Match play results display
 *
 * Card-based layout showing matchups:
 * - Team aggregate header (for team rounds)
 * - Match header with swords icon + status badge
 * - Player/team name and members
 * - Result badge (Win/Loss/Halved with color coding)
 * - Opponent name
 * - Match stats footer (holes won-lost-halved)
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconSwords, IconTrophy, IconClock, IconCheck } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import {
  type RoundLeaderboardEntry,
  type PlayerLeaderboardEntry,
  type MatchPlayScoreData,
  isTeamEntry,
  isMatchPlayScore,
} from '@/hooks/useRoundLeaderboard';
import {
  formatMatchResult,
  isCurrentUserEntry,
  isMatchComplete,
  formatMatchStatusText,
  calculateTeamAggregate,
} from './leaderboardUtils';
import { styles } from './RoundLeaderboard.styles';

export interface MatchPlayLeaderboardProps {
  /** Leaderboard entries to display */
  entries: RoundLeaderboardEntry[];
  /** Current user ID for highlighting */
  currentUserId?: string;
  /** Round status for determining match completion */
  roundStatus?: string;
  /** Whether this is a team round */
  isTeamRound?: boolean;
}

interface ProcessedMatch {
  id: string;
  entry: RoundLeaderboardEntry;
  scoreData: MatchPlayScoreData;
  isComplete: boolean;
  statusText: string;
}

export const MatchPlayLeaderboard = React.memo(function MatchPlayLeaderboard({
  entries,
  currentUserId,
  roundStatus = 'in-progress',
  isTeamRound = false,
}: MatchPlayLeaderboardProps) {
  const colors = useThemeColors();

  // Calculate team aggregate for team rounds
  const teamAggregate = useMemo(() => {
    if (!isTeamRound) return null;
    return calculateTeamAggregate(entries, roundStatus);
  }, [entries, isTeamRound, roundStatus]);

  // Group entries by matches (pairs of opponents)
  // Only show each match once (from winner's perspective or first entry if halved)
  const processedMatches = useMemo((): ProcessedMatch[] => {
    const matches: ProcessedMatch[] = [];
    const seenOpponents = new Set<string>();

    entries.forEach((entry) => {
      if (!isMatchPlayScore(entry.scoreData)) return;

      const entryId = isTeamEntry(entry)
        ? entry.teamId
        : (entry as PlayerLeaderboardEntry).playerId;

      // Skip if we've already processed this match from the opponent's side
      if (seenOpponents.has(entryId)) return;

      const scoreData = entry.scoreData;
      const complete = isMatchComplete(
        scoreData.matchResult,
        scoreData.holesWon,
        scoreData.holesLost,
        scoreData.holesHalved
      );
      const statusText = formatMatchStatusText(
        scoreData.matchResult,
        scoreData.holesUpDown,
        scoreData.holesWon,
        scoreData.holesLost,
        scoreData.holesHalved
      );

      matches.push({
        id: entryId,
        entry,
        scoreData,
        isComplete: complete,
        statusText,
      });

      // Mark opponent as seen
      if (entry.scoreData.opponentId) {
        seenOpponents.add(entry.scoreData.opponentId);
      }
    });

    // Sort: in-progress first, then complete
    return matches.sort((a, b) => {
      if (a.isComplete === b.isComplete) return 0;
      return a.isComplete ? 1 : -1;
    });
  }, [entries]);

  return (
    <View style={styles.matchPlayContainer}>
      {/* Team Aggregate Header (for team rounds only) */}
      {teamAggregate && (
        <View style={[localStyles.teamHeader, { backgroundColor: colors.surface }]}>
          <View style={localStyles.teamHeaderTop}>
            <IconTrophy size={16} color={colors.primary} />
            <Text style={[localStyles.teamHeaderLabel, { color: colors.textSecondary }]}>
              TEAM MATCH
            </Text>
          </View>
          <View style={localStyles.teamScoreRow}>
            <View style={localStyles.teamSide}>
              <Text
                style={[
                  localStyles.teamName,
                  { color: colors.textPrimary },
                  teamAggregate.team1Wins > teamAggregate.team2Wins && { color: colors.success },
                ]}
                numberOfLines={1}
              >
                {teamAggregate.team1Name}
              </Text>
            </View>
            <View style={localStyles.teamScoreCenter}>
              <Text style={[localStyles.teamScore, { color: colors.textPrimary }]}>
                {teamAggregate.team1Wins} - {teamAggregate.team2Wins}
              </Text>
              {teamAggregate.halvedMatches > 0 && (
                <Text style={[localStyles.halvedText, { color: colors.textSecondary }]}>
                  ({teamAggregate.halvedMatches} halved)
                </Text>
              )}
            </View>
            <View style={[localStyles.teamSide, { alignItems: 'flex-end' }]}>
              <Text
                style={[
                  localStyles.teamName,
                  { color: colors.textPrimary },
                  teamAggregate.team2Wins > teamAggregate.team1Wins && { color: colors.success },
                ]}
                numberOfLines={1}
              >
                {teamAggregate.team2Name}
              </Text>
            </View>
          </View>
          <View style={[localStyles.teamStatusRow, { borderTopColor: colors.borderLight }]}>
            {teamAggregate.isComplete ? (
              <View style={[localStyles.statusBadge, { backgroundColor: `${colors.success}15` }]}>
                <IconCheck size={12} color={colors.success} />
                <Text style={[localStyles.statusText, { color: colors.success }]}>
                  Match Complete
                </Text>
              </View>
            ) : (
              <View style={[localStyles.statusBadge, { backgroundColor: `${colors.warning}15` }]}>
                <IconClock size={12} color={colors.warning} />
                <Text style={[localStyles.statusText, { color: colors.warning }]}>
                  In Progress{teamAggregate.matchesInProgress > 0 && ` - ${teamAggregate.matchesInProgress} remaining`}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Individual Matches */}
      {processedMatches.map(({ id, entry, scoreData, isComplete, statusText }) => {
        const name = isTeamEntry(entry)
          ? entry.teamName
          : (entry as PlayerLeaderboardEntry).playerName;
        const isCurrentUser = isCurrentUserEntry(entry, currentUserId);
        const isWin = scoreData.matchResult === 'win';
        const isHalved = scoreData.matchResult === 'halved';
        const isInProgress = !scoreData.matchResult;

        // Determine result color
        const getResultBackgroundColor = () => {
          if (isInProgress) return `${colors.textSecondary}15`;
          if (isWin) return `${colors.success}15`;
          if (isHalved) return `${colors.warning}15`;
          return `${colors.error}15`;
        };

        const getResultTextColor = () => {
          if (isInProgress) return colors.textSecondary;
          if (isWin) return colors.success;
          if (isHalved) return colors.warning;
          return colors.error;
        };

        return (
          <View
            key={id}
            style={[
              styles.matchCard,
              { backgroundColor: colors.surface },
              isCurrentUser && { borderColor: colors.primary, borderWidth: 2 },
            ]}
          >
            {/* Match Header with Status */}
            <View style={[styles.matchHeader, localStyles.matchHeaderWithStatus]}>
              <View style={localStyles.matchHeaderLeft}>
                <IconSwords size={16} color={colors.textSecondary} />
                <Text style={[styles.matchLabel, { color: colors.textSecondary }]}>
                  Match
                </Text>
              </View>
              <View
                style={[
                  localStyles.statusBadgeSmall,
                  {
                    backgroundColor: isComplete
                      ? `${colors.success}15`
                      : `${colors.warning}15`,
                  },
                ]}
              >
                {isComplete ? (
                  <IconCheck size={10} color={colors.success} />
                ) : (
                  <IconClock size={10} color={colors.warning} />
                )}
                <Text
                  style={[
                    localStyles.statusTextSmall,
                    { color: isComplete ? colors.success : colors.warning },
                  ]}
                >
                  {isComplete ? 'Complete' : 'In Progress'}
                </Text>
              </View>
            </View>

            {/* Match Content */}
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

              {/* Result/Status Badge */}
              <View
                style={[
                  styles.matchResult,
                  { backgroundColor: getResultBackgroundColor() },
                ]}
              >
                <Text
                  style={[
                    styles.matchResultText,
                    { color: getResultTextColor() },
                  ]}
                >
                  {isInProgress ? statusText : formatMatchResult(scoreData)}
                </Text>
              </View>

              {/* Opponent */}
              <View style={styles.matchOpponent}>
                <Text style={[styles.vsText, { color: colors.textTertiary }]}>vs</Text>
                <Text
                  style={[
                    styles.matchOpponentName,
                    { color: colors.textPrimary },
                    !isWin && !isHalved && !isInProgress && { color: colors.success, fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {scoreData.opponentName}
                </Text>
              </View>
            </View>

            {/* Score Details */}
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

// Local styles for team header and status badges
const localStyles = StyleSheet.create({
  teamHeader: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  teamHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  teamHeaderLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  teamScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  teamSide: {
    flex: 1,
  },
  teamName: {
    ...typography.bodyBold,
  },
  teamScoreCenter: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  teamScore: {
    ...typography.h2,
  },
  halvedText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  teamStatusRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.smallBold,
  },
  matchHeaderWithStatus: {
    justifyContent: 'space-between',
  },
  matchHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusTextSmall: {
    ...typography.caption,
    fontWeight: '600',
  },
});

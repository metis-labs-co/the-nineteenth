/**
 * GameTypeHeader Component
 *
 * Displays format-specific information below the course/tee header.
 * Shows relevant running totals and status based on the game type:
 *
 * - Best Ball: Team points comparison
 * - Scramble: Team score and points
 * - Team Match Play: Match status (e.g., "Team Alpha 2 UP with 5 to play")
 * - Stroke Play: Gross/Net standings
 * - Stableford: Points totals
 * - Individual Match Play: Match status (handled by MatchPlayScoringScreen)
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { GameType, TeamFormat } from '@/types/database/enums';
import type { TeamWithMembers } from '@/types/database/team.types';
import type { Player } from '@/types';

/**
 * Team score data for display in header
 */
export interface TeamScoreData {
  teamId: string;
  teamName: string;
  points: number;
  gross?: number;
  net?: number;
}

/**
 * Match status for team match play
 */
export interface TeamMatchStatus {
  status: 'in_progress' | 'complete';
  leadingTeam: 'team1' | 'team2' | null;
  holesUp: number;
  holesRemaining: number;
  team1HolesWon: number;
  team2HolesWon: number;
  holesHalved: number;
  winner?: 'team1' | 'team2' | 'halved';
  margin?: string;
}

export interface GameTypeHeaderProps {
  /** Current game type */
  gameType: GameType;
  /** Team format (for team rounds) */
  teamFormat?: TeamFormat | null;
  /** Whether this is a team round */
  isTeamRound?: boolean;
  /** Teams in the round */
  teams?: TeamWithMembers[];
  /** Team scores for display */
  teamScores?: TeamScoreData[];
  /** Match status for team match play */
  matchStatus?: TeamMatchStatus;
  /** Current hole number (for "thru X" display) */
  currentHole?: number;
}

/**
 * Get display name for game type
 */
function getGameTypeLabel(gameType: GameType, teamFormat?: TeamFormat | null): string {
  if (teamFormat === 'best-ball') return 'BEST BALL';
  if (teamFormat === 'scramble') return 'SCRAMBLE';
  if (teamFormat === 'match-play-team') return 'TEAM MATCH PLAY';
  if (teamFormat === 'aggregate') return 'AGGREGATE';

  switch (gameType) {
    case 'stableford':
      return 'STABLEFORD';
    case 'stroke':
      return 'STROKE PLAY';
    case 'match-play':
      return 'MATCH PLAY';
    case 'shamble':
      return 'SHAMBLE';
    case 'best-ball':
      return 'BEST BALL';
    case 'scramble':
      return 'SCRAMBLE';
    default:
      return gameType.toUpperCase();
  }
}

/**
 * Get match status text for team match play
 */
function getTeamMatchStatusText(
  matchStatus: TeamMatchStatus,
  team1Name: string,
  team2Name: string
): string {
  if (matchStatus.status === 'complete') {
    if (matchStatus.winner === 'halved') {
      return 'Match Halved';
    }
    const winnerName = matchStatus.winner === 'team1' ? team1Name : team2Name;
    return `${winnerName} wins ${matchStatus.margin}`;
  }

  if (matchStatus.leadingTeam === null) {
    return `All Square with ${matchStatus.holesRemaining} to play`;
  }

  const leaderName = matchStatus.leadingTeam === 'team1' ? team1Name : team2Name;
  return `${leaderName} ${matchStatus.holesUp} UP with ${matchStatus.holesRemaining} to play`;
}

export const GameTypeHeader = React.memo(function GameTypeHeader({
  gameType,
  teamFormat,
  isTeamRound = false,
  teams = [],
  teamScores = [],
  matchStatus,
  currentHole = 1,
}: GameTypeHeaderProps) {
  const colors = useThemeColors();

  const gameTypeLabel = useMemo(
    () => getGameTypeLabel(gameType, teamFormat),
    [gameType, teamFormat]
  );

  // Get team names
  const team1Name = teams[0]?.name || 'Team 1';
  const team2Name = teams[1]?.name || 'Team 2';

  // Render Team Match Play header
  if (teamFormat === 'match-play-team' && matchStatus) {
    const statusText = getTeamMatchStatusText(matchStatus, team1Name, team2Name);
    const isComplete = matchStatus.status === 'complete';

    return (
      <View style={[styles.container, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.matchPlayHeader}>
          <View style={[styles.gameTypeBadge, { backgroundColor: colors.primary }]}>
            <Icon source="sword-cross" size={14} color={colors.white} />
            <Text style={[styles.gameTypeLabel, { color: colors.white }]}>
              {gameTypeLabel}
            </Text>
          </View>
          <Text
            style={[
              styles.matchStatusText,
              { color: isComplete ? colors.success : colors.textPrimary },
            ]}
          >
            {statusText}
          </Text>
        </View>
        <View style={styles.holesWonRow}>
          <Text style={[styles.holesWonText, { color: colors.textSecondary }]}>
            {team1Name}: {matchStatus.team1HolesWon}
          </Text>
          <View style={[styles.dividerDot, { backgroundColor: colors.border }]} />
          <Text style={[styles.holesWonText, { color: colors.textSecondary }]}>
            {team2Name}: {matchStatus.team2HolesWon}
          </Text>
          {matchStatus.holesHalved > 0 && (
            <>
              <View style={[styles.dividerDot, { backgroundColor: colors.border }]} />
              <Text style={[styles.holesWonText, { color: colors.textSecondary }]}>
                {matchStatus.holesHalved} halved
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  // Render Best Ball header
  if (teamFormat === 'best-ball' && teamScores.length >= 2) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.teamComparisonRow}>
          <View style={[styles.gameTypeBadge, { backgroundColor: colors.primary }]}>
            <Icon source="account-group" size={14} color={colors.white} />
            <Text style={[styles.gameTypeLabel, { color: colors.white }]}>
              {gameTypeLabel}
            </Text>
          </View>
          <View style={styles.teamsScoresContainer}>
            {teamScores.map((team, index) => (
              <React.Fragment key={team.teamId}>
                {index > 0 && (
                  <View style={[styles.teamDivider, { backgroundColor: colors.border }]} />
                )}
                <View style={styles.teamScoreItem}>
                  <Text
                    style={[styles.teamName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {team.teamName}
                  </Text>
                  <Text style={[styles.teamPoints, { color: colors.primary }]}>
                    {team.points} pts
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // Render Scramble header
  if (teamFormat === 'scramble' && teamScores.length > 0) {
    const teamScore = teamScores[0];
    const grossDisplay = teamScore.gross !== undefined
      ? (teamScore.gross > 0 ? `+${teamScore.gross}` : teamScore.gross === 0 ? 'E' : teamScore.gross)
      : null;

    return (
      <View style={[styles.container, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.scrambleRow}>
          <View style={[styles.gameTypeBadge, { backgroundColor: colors.primary }]}>
            <Icon source="account-group" size={14} color={colors.white} />
            <Text style={[styles.gameTypeLabel, { color: colors.white }]}>
              {gameTypeLabel}
            </Text>
          </View>
          <View style={styles.scrambleScoreContainer}>
            <Text
              style={[styles.teamName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {teamScore.teamName}
            </Text>
            {grossDisplay !== null && (
              <Text style={[styles.grossScore, { color: colors.textSecondary }]}>
                {grossDisplay} gross
              </Text>
            )}
            <Text style={[styles.teamPoints, { color: colors.primary }]}>
              {teamScore.points} pts
            </Text>
          </View>
        </View>
        {currentHole > 1 && (
          <Text style={[styles.thruText, { color: colors.textSecondary }]}>
            Thru {currentHole - 1}
          </Text>
        )}
      </View>
    );
  }

  // For individual formats (Stableford, Stroke), show simpler header
  // This is optional - the individual score cards already show player totals
  if (!isTeamRound && (gameType === 'stableford' || gameType === 'stroke')) {
    return (
      <View style={[styles.simpleContainer, { backgroundColor: colors.surfaceVariant }]}>
        <View style={[styles.gameTypeBadge, { backgroundColor: colors.primary }]}>
          <Icon
            source={gameType === 'stableford' ? 'star' : 'counter'}
            size={14}
            color={colors.white}
          />
          <Text style={[styles.gameTypeLabel, { color: colors.white }]}>
            {gameTypeLabel}
          </Text>
        </View>
        {currentHole > 1 && (
          <Text style={[styles.thruText, { color: colors.textSecondary }]}>
            Thru {currentHole - 1}
          </Text>
        )}
      </View>
    );
  }

  // Default: Just show game type badge
  return (
    <View style={[styles.simpleContainer, { backgroundColor: colors.surfaceVariant }]}>
      <View style={[styles.gameTypeBadge, { backgroundColor: colors.primary }]}>
        <Text style={[styles.gameTypeLabel, { color: colors.white }]}>
          {gameTypeLabel}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  simpleContainer: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  gameTypeLabel: {
    ...typography.captionBold,
    letterSpacing: 0.5,
  },
  // Match Play styles
  matchPlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  matchStatusText: {
    ...typography.bodyBold,
    flex: 1,
  },
  holesWonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingLeft: spacing.sm,
    gap: spacing.sm,
  },
  holesWonText: {
    ...typography.caption,
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  // Team comparison styles
  teamComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  teamsScoresContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  teamDivider: {
    width: 1,
    height: 24,
  },
  teamScoreItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  teamName: {
    ...typography.smallBold,
  },
  teamPoints: {
    ...typography.bodyBold,
  },
  // Scramble styles
  scrambleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scrambleScoreContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  grossScore: {
    ...typography.body,
  },
  thruText: {
    ...typography.caption,
  },
});

/**
 * MatchPlayLeaderboard - Match play results display
 *
 * Card-based layout showing matchups:
 * - Match header with swords icon
 * - Player/team name and members
 * - Result badge (Win/Loss/Halved with color coding)
 * - Opponent name
 * - Match stats footer (holes won-lost-halved)
 */

import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { IconSwords } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import {
  type RoundLeaderboardEntry,
  type PlayerLeaderboardEntry,
  type MatchPlayScoreData,
  isTeamEntry,
  isMatchPlayScore,
} from '@/hooks/useRoundLeaderboard';
import { formatMatchResult, isCurrentUserEntry } from './leaderboardUtils';
import { styles } from './RoundLeaderboard.styles';

export interface MatchPlayLeaderboardProps {
  /** Leaderboard entries to display */
  entries: RoundLeaderboardEntry[];
  /** Current user ID for highlighting */
  currentUserId?: string;
}

interface ProcessedMatch {
  id: string;
  entry: RoundLeaderboardEntry;
  scoreData: MatchPlayScoreData;
}

export const MatchPlayLeaderboard = React.memo(function MatchPlayLeaderboard({
  entries,
  currentUserId,
}: MatchPlayLeaderboardProps) {
  const colors = useThemeColors();

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
        const isCurrentUser = isCurrentUserEntry(entry, currentUserId);
        const isWin = scoreData.matchResult === 'win';
        const isHalved = scoreData.matchResult === 'halved';

        // Determine result color
        const getResultBackgroundColor = () => {
          if (isWin) return `${colors.success}15`;
          if (isHalved) return `${colors.warning}15`;
          return `${colors.error}15`;
        };

        const getResultTextColor = () => {
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
            {/* Match Header */}
            <View style={styles.matchHeader}>
              <IconSwords size={16} color={colors.textSecondary} />
              <Text style={[styles.matchLabel, { color: colors.textSecondary }]}>
                Match
              </Text>
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

              {/* Result Badge */}
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

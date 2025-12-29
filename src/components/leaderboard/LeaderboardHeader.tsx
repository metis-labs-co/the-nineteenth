/**
 * LeaderboardHeader - Round info header with game type badge and date
 *
 * Displays:
 * - Round number title
 * - Game type pill (Stableford, Stroke Play, Match Play, etc.)
 * - Team badge (if team round)
 * - Date and course name
 */

import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { IconUsers } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { DateTimeDisplay } from '@/components/common/DateTimeDisplay';
import { Pill } from '@/components/common/Pill';
import type { GameType } from '@/types';
import { getGameTypeLabel, getGameTypeVariant } from './leaderboardUtils';
import { styles } from './RoundLeaderboard.styles';

export interface LeaderboardHeaderProps {
  /** The game type for display */
  gameType: GameType;
  /** Whether this is a team round */
  isTeamRound: boolean;
  /** Round date (ISO string) */
  date?: string;
  /** Course name */
  courseName?: string;
  /** Round number */
  roundNumber: number;
}

export const LeaderboardHeader = React.memo(function LeaderboardHeader({
  gameType,
  isTeamRound,
  date,
  courseName,
  roundNumber,
}: LeaderboardHeaderProps) {
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

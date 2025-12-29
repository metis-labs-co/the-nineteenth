/**
 * StablefordLeaderboard - Stableford points leaderboard display
 *
 * Table layout with columns:
 * - Position (#)
 * - Player/Team name
 * - Handicap (HC)
 * - Stableford Points (Pts)
 */

import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import {
  type RoundLeaderboardEntry,
  isStablefordScore,
  isTeamScore,
} from '@/hooks/useRoundLeaderboard';
import { LeaderboardRow } from './LeaderboardRow';
import { styles } from './RoundLeaderboard.styles';

export interface StablefordLeaderboardProps {
  /** Leaderboard entries to display */
  entries: RoundLeaderboardEntry[];
  /** Current user ID for highlighting */
  currentUserId?: string;
}

export const StablefordLeaderboard = React.memo(function StablefordLeaderboard({
  entries,
  currentUserId,
}: StablefordLeaderboardProps) {
  const colors = useThemeColors();

  const isTeamLeaderboard = entries.length > 0 && entries[0].isTeamResult;

  return (
    <View style={styles.table}>
      {/* Table Header */}
      <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerCell, styles.positionCol, { color: colors.textSecondary }]}>
          #
        </Text>
        <Text style={[styles.headerCell, styles.nameCol, { color: colors.textSecondary }]}>
          {isTeamLeaderboard ? 'Team' : 'Player'}
        </Text>
        <Text style={[styles.headerCell, styles.handicapCol, { color: colors.textSecondary }]}>
          HC
        </Text>
        <Text style={[styles.headerCell, styles.scoreCol, { color: colors.textSecondary }]}>
          Pts
        </Text>
      </View>

      {/* Table Rows */}
      {entries.map((entry, index) => {
        const isTied = index > 0 && entries[index - 1].position === entry.position;

        // Get score display
        let scoreDisplay = '-';
        if (isStablefordScore(entry.scoreData)) {
          scoreDisplay = String(entry.scoreData.totalPoints);
        } else if (isTeamScore(entry.scoreData)) {
          scoreDisplay = String(entry.scoreData.teamScore);
        }

        return (
          <LeaderboardRow
            key={entry.isTeamResult ? (entry as any).teamId : (entry as any).playerId}
            entry={entry}
            currentUserId={currentUserId}
            isTied={isTied}
            scoreDisplay={scoreDisplay}
            scoreLabel="points"
          />
        );
      })}
    </View>
  );
});

/**
 * StrokePlayLeaderboard - Stroke play leaderboard display
 *
 * Table layout with columns:
 * - Position (#)
 * - Player/Team name
 * - Handicap (HC)
 * - Net Score (Net)
 * - Gross Score (Gross)
 */

import React from 'react';
import { View } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { ScaledText } from '@/components/common/ScaledText';
import {
  type RoundLeaderboardEntry,
  isStrokeScore,
  isTeamScore,
} from '@/hooks/useRoundLeaderboard';
import { LeaderboardRow, type PlayerTeamLookup } from './LeaderboardRow';
import { styles } from './RoundLeaderboard.styles';

export interface StrokePlayLeaderboardProps {
  /** Leaderboard entries to display */
  entries: RoundLeaderboardEntry[];
  /** Current user ID for highlighting */
  currentUserId?: string;
  /**
   * Whether to render the CP (competition points) column. Defaults to `true`
   * for back-compat. The per-round leaderboard view passes `false` because
   * CP belongs on the competition standings, not the round-specific table.
   */
  showCompetitionPoints?: boolean;
  /** Optional team-membership lookup forwarded to each row. */
  playerTeamLookup?: PlayerTeamLookup;
}

export const StrokePlayLeaderboard = React.memo(function StrokePlayLeaderboard({
  entries,
  currentUserId,
  showCompetitionPoints = true,
  playerTeamLookup,
}: StrokePlayLeaderboardProps) {
  const colors = useThemeColors();

  const isTeamLeaderboard = entries.length > 0 && entries[0].isTeamResult;

  return (
    <View style={styles.table}>
      {/* Table Header */}
      <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
        <ScaledText category="caption" style={[styles.headerCell, styles.positionCol, { color: colors.textSecondary }]}>
          #
        </ScaledText>
        <ScaledText category="caption" style={[styles.headerCell, styles.nameCol, { color: colors.textSecondary }]}>
          {isTeamLeaderboard ? 'Team' : 'Player'}
        </ScaledText>
        <ScaledText category="caption" style={[styles.headerCell, styles.handicapCol, { color: colors.textSecondary }]}>
          HC
        </ScaledText>
        <ScaledText category="caption" style={[styles.headerCell, styles.scoreCol, { color: colors.textSecondary }]}>
          Net
        </ScaledText>
        <ScaledText category="caption" style={[styles.headerCell, styles.grossCol, { color: colors.textSecondary }]}>
          Gross
        </ScaledText>
        {showCompetitionPoints && (
          <ScaledText category="caption" style={[styles.headerCell, styles.compPtsCol, { color: colors.textSecondary }]}>
            CP
          </ScaledText>
        )}
      </View>

      {/* Table Rows */}
      {entries.map((entry, index) => {
        const isTied = index > 0 && entries[index - 1].position === entry.position;

        // Get score displays
        let scoreDisplay = '-';
        let grossDisplay = '-';

        if (isStrokeScore(entry.scoreData)) {
          scoreDisplay = String(entry.scoreData.netScore);
          grossDisplay = String(entry.scoreData.grossScore);
        } else if (isTeamScore(entry.scoreData)) {
          scoreDisplay = String(entry.scoreData.teamScore);
          // Team formats may not have gross score
        }

        // Use proper type narrowing for key
        const key = entry.isTeamResult ? entry.teamId : entry.playerId;

        return (
          <LeaderboardRow
            key={key}
            entry={entry}
            currentUserId={currentUserId}
            isTied={isTied}
            scoreDisplay={scoreDisplay}
            scoreLabel="net"
            secondaryScore={grossDisplay}
            secondaryLabel="gross"
            showCompetitionPoints={showCompetitionPoints}
            playerTeamLookup={playerTeamLookup}
          />
        );
      })}
    </View>
  );
});

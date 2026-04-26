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
import { useThemeColors } from '@/context/ThemeContext';
import { ScaledText } from '@/components/common/ScaledText';
import {
  type RoundLeaderboardEntry,
  isStablefordScore,
  isParScore,
  isTeamScore,
} from '@/hooks/useRoundLeaderboard';
import { LeaderboardRow } from './LeaderboardRow';
import { styles } from './RoundLeaderboard.styles';

export interface StablefordLeaderboardProps {
  /** Leaderboard entries to display */
  entries: RoundLeaderboardEntry[];
  /** Current user ID for highlighting */
  currentUserId?: string;
  /** Column header for score (default: "Pts") */
  scoreColumnHeader?: string;
  /** Score label for accessibility (default: "points") */
  scoreLabel?: string;
  /** Custom score formatter (default: raw value) */
  formatScore?: (value: number) => string;
  /**
   * Whether to render the CP (competition points) column. Defaults to `true`
   * for back-compat. The per-round leaderboard view passes `false` because
   * CP belongs on the competition standings, not the round-specific table.
   */
  showCompetitionPoints?: boolean;
}

export const StablefordLeaderboard = React.memo(function StablefordLeaderboard({
  entries,
  currentUserId,
  scoreColumnHeader,
  scoreLabel,
  formatScore,
  showCompetitionPoints = true,
}: StablefordLeaderboardProps) {
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
          {scoreColumnHeader ?? 'Pts'}
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

        // Get score display
        let scoreDisplay = '-';
        let rawScore = 0;

        if (isStablefordScore(entry.scoreData)) {
          rawScore = entry.scoreData.totalPoints;
        } else if (isParScore(entry.scoreData)) {
          rawScore = entry.scoreData.parScore;
        } else if (isTeamScore(entry.scoreData)) {
          rawScore = entry.scoreData.teamScore;
        }

        scoreDisplay = formatScore ? formatScore(rawScore) : String(rawScore);

        // Use proper type narrowing for key
        const key = entry.isTeamResult ? entry.teamId : entry.playerId;

        return (
          <LeaderboardRow
            key={key}
            entry={entry}
            currentUserId={currentUserId}
            isTied={isTied}
            scoreDisplay={scoreDisplay}
            scoreLabel={scoreLabel ?? 'points'}
            showCompetitionPoints={showCompetitionPoints}
          />
        );
      })}
    </View>
  );
});

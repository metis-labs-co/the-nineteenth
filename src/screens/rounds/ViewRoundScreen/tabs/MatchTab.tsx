/**
 * MatchTab - Match play tab content (individual and team)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MatchPlayLeaderboard } from '@/components/leaderboard/MatchPlayLeaderboard';
import { MatchPlayScorecardTable } from '@/components/scorecard/MatchPlayScorecardTable';
import { EmptyState } from '@/components/common/EmptyState';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import type { Hole } from '@/types';
import type { RoundLeaderboardResponse } from '@/hooks/useRoundLeaderboard';

interface MatchPlayPlayer {
  id: string;
  name: string;
}

interface MatchTabProps {
  isMatchPlayRound: boolean;
  isTeamMatchPlayRound: boolean;
  matchPlayPlayers: { player1: MatchPlayPlayer; player2: MatchPlayPlayer } | null;
  holes: Hole[] | null;
  getPlayerScore: (playerId: string, holeNumber: number) => number | undefined;
  matchPlayData: RoundLeaderboardResponse | undefined;
  currentUserId: string | undefined;
  roundStatus: string;
  isTeamRound: boolean;
}

export function MatchTab({
  isMatchPlayRound,
  isTeamMatchPlayRound,
  matchPlayPlayers,
  holes,
  getPlayerScore,
  matchPlayData,
  currentUserId,
  roundStatus,
  isTeamRound,
}: MatchTabProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.matchTabContent}>
      {/* Individual Match Play Scorecard */}
      {isMatchPlayRound && matchPlayPlayers && holes && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Match Scorecard
          </Text>
          <MatchPlayScorecardTable
            holes={holes}
            player1={matchPlayPlayers.player1}
            player2={matchPlayPlayers.player2}
            getPlayerScore={getPlayerScore}
          />
        </>
      )}

      {/* Match Play Results (if available) */}
      {matchPlayData && matchPlayData.entries.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>
            Match Results
          </Text>
          <MatchPlayLeaderboard
            entries={matchPlayData.entries}
            currentUserId={currentUserId}
            roundStatus={roundStatus}
            isTeamRound={isTeamRound}
          />
        </>
      )}

      {/* Empty state when no data available */}
      {!isMatchPlayRound && !matchPlayData && (
        <EmptyState
          icon="golf"
          title="No Match Data"
          message="No match data available yet."
          compact
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  matchTabContent: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
});

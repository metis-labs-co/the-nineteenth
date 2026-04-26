/**
 * ScrambleLeaderboardTab - Scramble team leaderboard tab content
 */

import React, { useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { ScrambleTeamLeaderboard } from '@/components/scorecard';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import type { ScrambleTeam } from '../hooks/useScrambleTeams';

interface ScrambleLeaderboardTabProps {
  holes: Hole[];
  currentPlayers: Player[];
  currentUserId: string | undefined;
  scrambleTeams: ScrambleTeam[];
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

export function ScrambleLeaderboardTab({
  holes,
  currentPlayers,
  currentUserId,
  scrambleTeams,
  getPlayerScore,
  isRefreshing,
  onRefresh,
  bottomInset,
}: ScrambleLeaderboardTabProps) {
  const colors = useThemeColors();

  // Get team score for a specific team by index
  const getScrambleTeamScoreByIndex = useCallback((teamIndex: number, holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
    const team = scrambleTeams[teamIndex];
    if (!team) return undefined;

    for (const playerId of team.memberIds) {
      const score = getPlayerScore(playerId, holeNumber);
      if (score) return score;
    }
    return undefined;
  }, [scrambleTeams, getPlayerScore]);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.leaderboardScrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.textPrimary}
          colors={[colors.textPrimary]}
        />
      }
      showsVerticalScrollIndicator={true}
    >
      <ScrambleTeamLeaderboard
        teams={scrambleTeams}
        players={currentPlayers}
        holes={holes}
        getTeamScore={getScrambleTeamScoreByIndex}
        currentUserId={currentUserId}
        testID="scramble-team-leaderboard"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  leaderboardScrollContent: {
    flexGrow: 1,
  },
});

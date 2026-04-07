/**
 * ScrambleLeaderboardTab - Scramble team leaderboard tab content
 */

import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { ScrambleTeamLeaderboard } from '@/components/scorecard';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import type { RoundWithCourse } from '@/hooks/useRoundDetails';
import type { StandaloneTeamConfig } from '@/types/supabase/roundQueries';

interface ScrambleLeaderboardTabProps {
  holes: Hole[];
  currentPlayers: Player[];
  currentUserId: string | undefined;
  roundDetails: RoundWithCourse | undefined;
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

export function ScrambleLeaderboardTab({
  holes,
  currentPlayers,
  currentUserId,
  roundDetails,
  getPlayerScore,
  isRefreshing,
  onRefresh,
  bottomInset,
}: ScrambleLeaderboardTabProps) {
  const colors = useThemeColors();

  // Extract teams from team_config
  const scrambleTeams = useMemo(() => {
    const teamConfig = (roundDetails as unknown as { team_config?: StandaloneTeamConfig })?.team_config;
    if (teamConfig?.teams && teamConfig.teams.length > 0) {
      return teamConfig.teams;
    }

    const allPlayerIds = currentPlayers.map((p) => p.id);
    if (allPlayerIds.length > 0) {
      return [{
        id: 'default-team',
        name: 'Team',
        memberIds: allPlayerIds,
      }];
    }

    return [];
  }, [roundDetails, currentPlayers]);

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

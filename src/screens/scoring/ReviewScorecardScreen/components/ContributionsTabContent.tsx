/**
 * ContributionsTabContent - Contributions/Team Scores tab for scramble and shamble rounds
 *
 * Shows scramble team selector and contribution leaderboard.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { ScrambleTeamSelector, ContributionLeaderboard } from '@/components/scorecard';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import type { RoundWithCourse } from '@/hooks/useRoundDetails';
import type { StandaloneTeamConfig } from '@/types/supabase/roundQueries';

interface ContributionsTabContentProps {
  isScramble: boolean;
  isShamble: boolean;
  holes: Hole[];
  currentPlayers: Player[];
  roundDetails: RoundWithCourse | undefined;
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

export function ContributionsTabContent({
  isScramble,
  isShamble,
  holes,
  currentPlayers,
  roundDetails,
  getPlayerScore,
  isRefreshing,
  onRefresh,
  bottomInset,
}: ContributionsTabContentProps) {
  const colors = useThemeColors();
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);

  // Extract teams from team_config for multi-team scramble rounds
  const scrambleTeams = useMemo(() => {
    if (!isScramble) return [];

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
  }, [isScramble, roundDetails, currentPlayers]);

  // Get players for a specific team by index
  const getScrambleTeamPlayersByIndex = useCallback((teamIndex: number): Player[] => {
    if (!isScramble || scrambleTeams.length === 0) return [];

    const team = scrambleTeams[teamIndex];
    if (!team) return [];

    return team.memberIds
      .map((id) => currentPlayers.find((p) => p.id === id))
      .filter((p): p is Player => p !== undefined);
  }, [isScramble, scrambleTeams, currentPlayers]);

  // Get team score for a hole (for scramble, all players have the same score)
  const getTeamScoreForHole = useCallback(
    (holeNumber: number) => {
      if (currentPlayers.length === 0) return undefined;
      return getPlayerScore(currentPlayers[0].id, holeNumber);
    },
    [currentPlayers, getPlayerScore]
  );

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
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: bottomInset + 100 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[colors.textPrimary]}
          tintColor={colors.textPrimary}
        />
      }
      showsVerticalScrollIndicator={true}
    >
      {isScramble && (
        <ScrambleTeamSelector
          teams={scrambleTeams}
          selectedIndex={selectedTeamIndex}
          onSelectTeam={setSelectedTeamIndex}
          getTeamPlayers={getScrambleTeamPlayersByIndex}
        />
      )}
      <ContributionLeaderboard
        players={isScramble ? getScrambleTeamPlayersByIndex(selectedTeamIndex) : currentPlayers}
        getTeamScore={isScramble ? (holeNumber) => getScrambleTeamScoreByIndex(selectedTeamIndex, holeNumber) : getTeamScoreForHole}
        totalHoles={holes.length}
        showOnlyDrives={isShamble}
        getPlayerScore={isShamble ? getPlayerScore : undefined}
        holes={isShamble ? holes : undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
});

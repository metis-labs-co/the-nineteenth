/**
 * ContributionsTabContent - Contributions/Team Scores tab for scramble and shamble rounds
 *
 * Shows scramble team selector and contribution leaderboard.
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { ScrambleTeamSelector, ContributionLeaderboard } from '@/components/scorecard';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import type { ScrambleTeam } from '../hooks/useScrambleTeams';

interface ContributionsTabContentProps {
  isScramble: boolean;
  isShamble: boolean;
  holes: Hole[];
  currentPlayers: Player[];
  scrambleTeams: ScrambleTeam[];
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
  scrambleTeams,
  getPlayerScore,
  isRefreshing,
  onRefresh,
  bottomInset,
}: ContributionsTabContentProps) {
  const colors = useThemeColors();
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);

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
        holes={holes}
        showOnlyDrives={isShamble}
        getPlayerScore={isShamble ? getPlayerScore : undefined}
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

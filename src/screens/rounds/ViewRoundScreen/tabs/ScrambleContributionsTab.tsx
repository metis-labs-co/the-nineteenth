/**
 * ScrambleContributionsTab - Scramble team contributions tab content
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScrambleTeamSelector, ContributionLeaderboard } from '@/components/scorecard';
import { spacing } from '@/constants/theme';
import type { HoleScore, MultiBallHoleScore, Player } from '@/types';

interface ScrambleTeam {
  id: string;
  name: string;
  memberIds: string[];
}

interface ScrambleContributionsTabProps {
  scrambleTeams: ScrambleTeam[];
  selectedTeamIndex: number;
  onSelectTeam: (index: number) => void;
  getTeamPlayersByIndex: (teamIndex: number) => Player[];
  getTeamScoreByIndex: (teamIndex: number, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  totalHoles: number;
}

export function ScrambleContributionsTab({
  scrambleTeams,
  selectedTeamIndex,
  onSelectTeam,
  getTeamPlayersByIndex,
  getTeamScoreByIndex,
  totalHoles,
}: ScrambleContributionsTabProps) {
  return (
    <View style={styles.scrambleTabContent}>
      {/* Team selector */}
      <ScrambleTeamSelector
        teams={scrambleTeams}
        selectedIndex={selectedTeamIndex}
        onSelectTeam={onSelectTeam}
        getTeamPlayers={getTeamPlayersByIndex}
      />
      <ContributionLeaderboard
        players={getTeamPlayersByIndex(selectedTeamIndex)}
        getTeamScore={(holeNumber) => getTeamScoreByIndex(selectedTeamIndex, holeNumber)}
        totalHoles={totalHoles}
        showOnlyDrives={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrambleTabContent: {
    gap: spacing.md,
  },
});

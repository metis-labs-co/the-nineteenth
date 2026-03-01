/**
 * ScrambleTeamScoreTab - Scramble team scorecard tab content
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScrambleTeamSelector, ScrambleScorecardTable } from '@/components/scorecard';
import { EmptyState } from '@/components/common/EmptyState';
import { spacing } from '@/constants/theme';
import type { HoleScore, MultiBallHoleScore, Player, Hole } from '@/types';

interface ScrambleTeam {
  id: string;
  name: string;
  memberIds: string[];
}

interface ScrambleTeamScoreTabProps {
  holes: Hole[] | null;
  scrambleTeams: ScrambleTeam[];
  selectedTeamIndex: number;
  onSelectTeam: (index: number) => void;
  getTeamPlayersByIndex: (teamIndex: number) => Player[];
  getTeamHandicapByIndex: (teamIndex: number) => number;
  getTeamScoreByIndex: (teamIndex: number, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
}

export function ScrambleTeamScoreTab({
  holes,
  scrambleTeams,
  selectedTeamIndex,
  onSelectTeam,
  getTeamPlayersByIndex,
  getTeamHandicapByIndex,
  getTeamScoreByIndex,
}: ScrambleTeamScoreTabProps) {
  return (
    <View style={styles.scrambleTabContent}>
      {holes && scrambleTeams.length > 0 ? (
        <>
          {/* Team selector */}
          <ScrambleTeamSelector
            teams={scrambleTeams}
            selectedIndex={selectedTeamIndex}
            onSelectTeam={onSelectTeam}
            getTeamPlayers={getTeamPlayersByIndex}
          />
          {/* Selected team's scorecard */}
          <ScrambleScorecardTable
            holes={holes as Hole[]}
            teamName={scrambleTeams[selectedTeamIndex]?.name || 'Team'}
            teamHandicap={getTeamHandicapByIndex(selectedTeamIndex)}
            getTeamScore={(holeNumber) => getTeamScoreByIndex(selectedTeamIndex, holeNumber)}
          />
        </>
      ) : (
        <EmptyState
          icon="account-group-outline"
          title="No Team Data"
          message="Team scores will appear here once scoring begins."
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrambleTabContent: {
    gap: spacing.md,
  },
});

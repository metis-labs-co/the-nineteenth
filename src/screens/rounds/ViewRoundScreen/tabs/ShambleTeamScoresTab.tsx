/**
 * ShambleTeamScoresTab - Shamble team scores tab content
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ContributionLeaderboard } from '@/components/scorecard';
import { spacing } from '@/constants/theme';
import type { HoleScore, MultiBallHoleScore, Player, Hole } from '@/types';

interface ShambleTeamScoresTabProps {
  shamblePlayers: Player[];
  getShambleTeamScore: (holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  getShamblePlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  holes: Hole[];
}

export function ShambleTeamScoresTab({
  shamblePlayers,
  getShambleTeamScore,
  getShamblePlayerScore,
  holes,
}: ShambleTeamScoresTabProps) {
  return (
    <View style={styles.teamScoresTabContent}>
      <ContributionLeaderboard
        players={shamblePlayers}
        getTeamScore={getShambleTeamScore}
        holes={holes}
        showOnlyDrives={true}
        getPlayerScore={getShamblePlayerScore}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  teamScoresTabContent: {
    gap: spacing.md,
  },
});

/**
 * ScrambleLeaderboardTab - Scramble team leaderboard tab content
 */

import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { View, StyleSheet } from 'react-native';
import { ScrambleTeamLeaderboard } from '@/components/scorecard';
import { EmptyState } from '@/components/common/EmptyState';
import { spacing } from '@/constants/theme';
import type { HoleScore, MultiBallHoleScore, Player, Hole } from '@/types';

interface ScrambleTeam {
  id: string;
  name: string;
  memberIds: string[];
}

interface ScrambleLeaderboardTabProps {
  holes: Hole[] | null;
  scrambleTeams: ScrambleTeam[];
  allScramblePlayers: Player[];
  getTeamScoreByIndex: (teamIndex: number, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  currentUserId: string | undefined;
}

export function ScrambleLeaderboardTab({
  holes,
  scrambleTeams,
  allScramblePlayers,
  getTeamScoreByIndex,
  currentUserId,
}: ScrambleLeaderboardTabProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const openPlayer = useCallback(
    (playerId: string) => navigation.navigate('PlayerDetail', { id: playerId }),
    [navigation]
  );
  return (
    <View style={styles.scrambleTabContent}>
      {holes && scrambleTeams.length > 0 ? (
        <ScrambleTeamLeaderboard
          teams={scrambleTeams}
          players={allScramblePlayers}
          holes={holes as Hole[]}
          getTeamScore={getTeamScoreByIndex}
          currentUserId={currentUserId}
          onPlayerPress={openPlayer}
          testID="scramble-team-leaderboard"
        />
      ) : (
        <EmptyState
          icon="trophy-outline"
          title="No Leaderboard Data"
          message="Team standings will appear here once scoring begins."
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

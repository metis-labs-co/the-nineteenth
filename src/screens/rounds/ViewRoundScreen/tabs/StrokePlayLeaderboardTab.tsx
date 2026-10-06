/**
 * StrokePlayLeaderboardTab - Stroke play leaderboard tab content
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StrokePlayLeaderboardFull } from '@/components/scorecard/StrokePlayLeaderboardFull';
import { spacing } from '@/constants/theme';
import type { HoleScore, MultiBallHoleScore, Player, Hole } from '@/types';

interface StrokePlayLeaderboardTabProps {
  players: Player[];
  holes: Hole[];
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  currentUserId: string | undefined;
  /** Map of playerId → daily handicap so net matches the scorecard. */
  dailyHandicaps?: Record<string, number>;
}

export function StrokePlayLeaderboardTab({
  players,
  holes,
  getPlayerScore,
  currentUserId,
  dailyHandicaps,
}: StrokePlayLeaderboardTabProps) {
  return (
    <View style={styles.leaderboardTabContent}>
      <StrokePlayLeaderboardFull
        players={players}
        holes={holes}
        getPlayerScore={getPlayerScore}
        currentUserId={currentUserId}
        dailyHandicaps={dailyHandicaps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  leaderboardTabContent: {
    gap: spacing.md,
  },
});

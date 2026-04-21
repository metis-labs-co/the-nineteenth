import React from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { StrokePlayLeaderboardFull } from '@/components/scorecard/StrokePlayLeaderboardFull';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';

interface LeaderboardTabContentProps {
  players: Player[];
  holes: Hole[];
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  currentUserId?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

export function LeaderboardTabContent({
  players,
  holes,
  getPlayerScore,
  currentUserId,
  isRefreshing,
  onRefresh,
  bottomInset,
}: LeaderboardTabContentProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
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
      <StrokePlayLeaderboardFull
        players={players}
        holes={holes}
        getPlayerScore={getPlayerScore}
        currentUserId={currentUserId}
        testID="stroke-play-leaderboard-full"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
});

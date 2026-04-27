import React from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { StrokePlayLeaderboardFull } from '@/components/scorecard/StrokePlayLeaderboardFull';
import { StablefordLeaderboardFull } from '@/components/scorecard/StablefordLeaderboardFull';
import { ParLeaderboardFull } from '@/components/scorecard/ParLeaderboardFull';
import type { Player, Hole, HoleScore, MultiBallHoleScore, GameType } from '@/types';

interface LeaderboardTabContentProps {
  players: Player[];
  holes: Hole[];
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  currentUserId?: string;
  gameType: GameType;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

export function LeaderboardTabContent({
  players,
  holes,
  getPlayerScore,
  currentUserId,
  gameType,
  isRefreshing,
  onRefresh,
  bottomInset,
}: LeaderboardTabContentProps) {
  const colors = useThemeColors();

  const renderLeaderboard = () => {
    if (gameType === 'stableford') {
      return (
        <StablefordLeaderboardFull
          players={players}
          holes={holes}
          getPlayerScore={getPlayerScore}
          currentUserId={currentUserId}
          testID="stableford-leaderboard-full"
        />
      );
    }
    if (gameType === 'par') {
      return (
        <ParLeaderboardFull
          players={players}
          holes={holes}
          getPlayerScore={getPlayerScore}
          currentUserId={currentUserId}
          testID="par-leaderboard-full"
        />
      );
    }
    // Default: stroke play (also covers best-ball / aggregate team rounds whose
    // per-player scoring is gross/net relative to par).
    return (
      <StrokePlayLeaderboardFull
        players={players}
        holes={holes}
        getPlayerScore={getPlayerScore}
        currentUserId={currentUserId}
        testID="stroke-play-leaderboard-full"
      />
    );
  };

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
      {renderLeaderboard()}
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

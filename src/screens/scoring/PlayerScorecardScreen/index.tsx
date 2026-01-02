/**
 * PlayerScorecardScreen
 *
 * Displays an individual player's detailed scorecard for a round.
 * Extension of Quick Scorecard View showing:
 * - All 18 holes in rows
 * - Columns: Hole, Stroke Index, Par, Strokes, Stableford Points, Putts (optional)
 * - Front 9 / Back 9 subtotals
 * - Gross total row at bottom
 *
 * Supports both single-ball and multi-ball modes:
 * - Single-ball: Standard table with putts column
 * - Multi-ball: Separate columns for each ball's score and points
 *
 * Accessible from:
 * - Single player rounds
 * - Clicking player name from ScorecardEntryScreen
 * - Clicking player name from QuickScorecardView
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useStatsVisibilityWithTier } from '@/store/settingsStore';

import { usePlayerScorecard } from './hooks';
import {
  ScorecardPlayerHeader,
  ScorecardTable,
  ScorecardLoadingState,
  ScorecardPlayerNotFound,
  ScorecardNoScores,
} from './components';
import type { ScorecardViewMode } from './components';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerScorecard'>;

export default function PlayerScorecardScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { playerId } = route.params;

  // Get stats visibility settings (Premium-gated)
  const { showFairwayHit, showGreenInRegulation } = useStatsVisibilityWithTier();

  const {
    player,
    scorecard,
    playerStats,
    front9Holes,
    back9Holes,
    isLoading,
    isInitialized,
    // Multi-ball support
    isMultiBall,
    ballCount,
    multiBallFront9,
    multiBallBack9,
    multiBallStats,
  } = usePlayerScorecard(playerId);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ScorecardViewMode>('standard');

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh - in real app would re-fetch data
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  // Set header title dynamically
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: player ? `${player.name}'s Scorecard` : 'Player Scorecard',
      headerShown: false, // We'll use custom header
    });
  }, [navigation, player]);

  // Loading state
  if (isLoading || !isInitialized) {
    return <ScorecardLoadingState />;
  }

  // Player not found
  if (!player) {
    return <ScorecardPlayerNotFound onGoBack={handleGoBack} />;
  }

  // No scorecard data
  if (!scorecard) {
    return <ScorecardNoScores playerName={player.name} onGoBack={handleGoBack} />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Custom Header */}
      <ScorecardPlayerHeader
        playerName={player.name}
        handicap={player.handicap || 0}
        onGoBack={handleGoBack}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showViewToggle={isMultiBall && ballCount > 1}
      />

      {/* Scorecard Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.textPrimary]}
            tintColor={colors.textPrimary}
          />
        }
        showsVerticalScrollIndicator={true}
      >
        {/* Scorecard Table */}
        <ScorecardTable
          front9Holes={front9Holes}
          back9Holes={back9Holes}
          playerStats={playerStats}
          playerHandicap={player.handicap || 0}
          // Multi-ball props
          isMultiBall={isMultiBall}
          ballCount={ballCount}
          multiBallFront9={multiBallFront9}
          multiBallBack9={multiBallBack9}
          multiBallStats={multiBallStats}
          viewMode={viewMode}
          // Stats visibility (Premium-only)
          showFIR={showFairwayHit}
          showGIR={showGreenInRegulation}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
});

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

import React, { useCallback, useState, useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, TouchableOpacity } from 'react-native';
import { Text, Portal, Dialog, Button } from 'react-native-paper';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useStatsVisibilityWithTier } from '@/store/settingsStore';
import { useScorecardStore } from '@/store/scorecardStore';
import { useFinalizeSkinsForRound } from '@/hooks';
import { scoringLogger } from '@/utils/debugLogger';

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
  const { playerId, roundId } = route.params;

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

  // Get submission methods from store
  const { holes, getCompletedHolesCount, submitScorecards } = useScorecardStore();

  // Skins finalization hook
  const { finalizeSkinsForRound } = useFinalizeSkinsForRound();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ScorecardViewMode>('standard');
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [showSubmitErrorDialog, setShowSubmitErrorDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh - in real app would re-fetch data
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  // Calculate if all holes are complete
  const isAllComplete = useMemo(() => {
    if (holes.length === 0) return false;
    const completedCount = getCompletedHolesCount();
    return completedCount === holes.length;
  }, [holes.length, getCompletedHolesCount]);

  // Perform the actual submission
  const performSubmit = useCallback(async () => {
    setShowIncompleteDialog(false);
    setIsSubmitting(true);
    scoringLogger.info('SUBMIT: Starting scorecard submission from player scorecard', {
      roundId: roundId?.substring(0, 8),
      playerId: playerId?.substring(0, 8),
    });
    try {
      await submitScorecards();
      scoringLogger.info('SUBMIT: Scorecard submission successful');

      // Finalize skins game if applicable (non-blocking)
      if (roundId) {
        finalizeSkinsForRound(roundId).then((result) => {
          if (result.finalized) {
            scoringLogger.info('SUBMIT: Skins game finalized', { roundId: roundId?.substring(0, 8) });
          }
        }).catch((error) => {
          scoringLogger.warn('SUBMIT: Skins finalization failed (non-blocking)', { error });
        });
      }

      // Navigate to review screen
      navigation.navigate('ReviewScorecard', {
        roundId: roundId || '',
        competitionId: 'standalone',
        holes,
      });
    } catch (error) {
      scoringLogger.error('SUBMIT: Scorecard submission failed', error);
      setShowSubmitErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [submitScorecards, navigation, roundId, playerId, holes, finalizeSkinsForRound]);

  // Handle submit button press
  const handleSubmit = useCallback(async () => {
    const completedCount = getCompletedHolesCount();
    scoringLogger.info('SUBMIT: Submit button pressed from player scorecard', {
      completedHoles: completedCount,
      totalHoles: holes.length,
      isComplete: completedCount === holes.length,
    });
    if (completedCount < holes.length) {
      setShowIncompleteDialog(true);
    } else {
      await performSubmit();
    }
  }, [getCompletedHolesCount, holes.length, performSubmit]);

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
          { paddingBottom: isAllComplete ? insets.bottom + 120 : insets.bottom + spacing.xl },
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

      {/* Submit Footer - Show when all holes are complete */}
      {isAllComplete && (
        <View
          style={[
            styles.footerContainer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.success }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={[styles.submitButtonText, { color: colors.white }]}>
              {isSubmitting ? 'Submitting...' : 'Review & Submit'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Incomplete Round Dialog */}
      <Portal>
        <Dialog visible={showIncompleteDialog} onDismiss={() => setShowIncompleteDialog(false)}>
          <Dialog.Title>Incomplete Scorecard</Dialog.Title>
          <Dialog.Content>
            <Text>
              You have {getCompletedHolesCount()} of {holes.length} holes completed.
              Are you sure you want to submit?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowIncompleteDialog(false)}>Cancel</Button>
            <Button onPress={performSubmit}>Submit Anyway</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Submit Error Dialog */}
      <Portal>
        <Dialog visible={showSubmitErrorDialog} onDismiss={() => setShowSubmitErrorDialog(false)}>
          <Dialog.Title>Submission Failed</Dialog.Title>
          <Dialog.Content>
            <Text>
              There was an error submitting your scorecard. Please try again.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSubmitErrorDialog(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    ...shadows.sm,
  },
  submitButton: {
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    ...typography.bodyBold,
  },
});

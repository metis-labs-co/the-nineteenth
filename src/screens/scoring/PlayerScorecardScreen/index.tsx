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
import { Text, Portal, Dialog } from 'react-native-paper';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useStatsVisibilityWithTier } from '@/hooks/useStatsVisibilityWithTier';
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
    isReadOnly,
    startHole,
    // Multi-ball support
    isMultiBall,
    ballCount,
    multiBallFront9,
    multiBallBack9,
    multiBallStats,
  } = usePlayerScorecard(playerId, roundId);

  // Get submission methods from store (only used in the live-scoring context)
  const { holes, getCompletedHolesCount, submitScorecards, setCurrentHole, groupScorecards } = useScorecardStore();

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

  // Navigate back to score entry at a specific hole
  const handleHolePress = useCallback(
    (holeNumber: number) => {
      setCurrentHole(holeNumber);
      navigation.goBack();
    },
    [navigation, setCurrentHole]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh - in real app would re-fetch data
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  // Calculate if all holes are complete (groupScorecards in deps ensures re-evaluation on score changes)
  const isAllComplete = useMemo(() => {
    if (holes.length === 0) return false;
    const completedCount = getCompletedHolesCount();
    return completedCount === holes.length;
  }, [holes.length, getCompletedHolesCount, groupScorecards]);

  // Update round status to completed in database
  const updateRoundStatus = useCallback(async (rId: string): Promise<void> => {
    try {
      scoringLogger.info('SUBMIT: Updating round status to completed', { roundId: rId.substring(0, 8) });
      const { supabase } = await import('@/services/supabase/client');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { error } = await (supabase as any)
        .from('rounds')
        .update({ status: 'completed' })
        .eq('id', rId);

      if (error) {
        scoringLogger.error('SUBMIT: Failed to update round status', error);
        throw error;
      }
      scoringLogger.info('SUBMIT: Round status updated successfully');
    } catch (error) {
      scoringLogger.error('SUBMIT: Error updating round status', error);
    }
  }, []);

  // Perform the actual submission
  const performSubmit = useCallback(async () => {
    setShowIncompleteDialog(false);
    setIsSubmitting(true);
    scoringLogger.info('SUBMIT: Starting scorecard submission from player scorecard', {
      roundId: roundId?.substring(0, 8),
      playerId: playerId?.substring(0, 8),
    });
    try {
      await submitScorecards({ playerIds: [playerId] });
      scoringLogger.info('SUBMIT: Scorecard submission successful');

      // Update round status to completed
      if (roundId) {
        await updateRoundStatus(roundId);

        // Finalize skins game if applicable (non-blocking)
        finalizeSkinsForRound(roundId).then((result) => {
          if (result.finalized) {
            scoringLogger.info('SUBMIT: Skins game finalized', { roundId: roundId?.substring(0, 8) });
          }
        }).catch((error) => {
          scoringLogger.warn('SUBMIT: Skins finalization failed (non-blocking)', { error });
        });
      }

      // Reset scorecard store
      const resetFn = useScorecardStore.getState().resetRound;
      resetFn();

      // Navigate directly to ViewRound, resetting the stack so back goes to rounds list
      scoringLogger.info('SUBMIT: Navigating to ViewRound', { roundId: roundId?.substring(0, 8) });
      navigation.reset({
        index: 1,
        routes: [
          { name: 'MainTabs' },
          {
            name: 'ViewRound',
            params: {
              roundId: roundId || '',
              competitionId: undefined, // standalone round
            },
          },
        ],
      });
    } catch (error) {
      scoringLogger.error('SUBMIT: Scorecard submission failed', error);
      setShowSubmitErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [submitScorecards, navigation, roundId, playerId, finalizeSkinsForRound, updateRoundStatus]);

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
          { paddingBottom: insets.bottom + (isReadOnly ? spacing.lg : 120) },
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
          onHolePress={isReadOnly ? undefined : handleHolePress}
          startHole={startHole}
        />
      </ScrollView>

      {/* Submit Footer - live scoring only; hidden when viewing a round read-only */}
      {!isReadOnly && (
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
          {!isAllComplete && (
            <Text style={[styles.incompleteHint, { color: colors.textSecondary }]}>
              Complete all holes to submit
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: isAllComplete ? colors.success : colors.gray400 },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || !isAllComplete}
          >
            <Text style={[styles.submitButtonText, { color: colors.white }]}>
              {isSubmitting ? 'Submitting...' : 'Submit Scorecard'}
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
            <TouchableOpacity
              onPress={() => setShowIncompleteDialog(false)}
              style={styles.dialogButton}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={[styles.dialogButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={performSubmit}
              style={styles.dialogButton}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={[styles.dialogButtonText, { color: colors.primary }]}>Submit Anyway</Text>
            </TouchableOpacity>
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
            <TouchableOpacity
              onPress={() => setShowSubmitErrorDialog(false)}
              style={styles.dialogButton}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={[styles.dialogButtonText, { color: colors.primary }]}>OK</Text>
            </TouchableOpacity>
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
  incompleteHint: {
    ...typography.small,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  dialogButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dialogButtonText: {
    ...typography.bodyBold,
  },
});

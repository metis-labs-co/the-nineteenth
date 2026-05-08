/**
 * MatchPlayScorecardScreen - Full scorecard view for match play
 *
 * Displays the complete 18-hole scorecard for a match play round with:
 * - Hole-by-hole scores for both players
 * - Running match status per hole (e.g., "Sam 1 UP", "ALL SQUARE")
 * - Front 9 (OUT) and Back 9 (IN) subtotals
 * - Final match result
 * - Pull-to-refresh support
 * - Skins tab (when skins game is enabled for the round)
 */

import React, { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Portal, Dialog } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader, Tabs, LoadingSpinner, ErrorState, EmptyState, ConfirmationDialog } from '@/components/common';
import { MatchPlayScorecardTable } from '@/components/scorecard';
import { SkinsResultsCard } from '@/components/skins';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useScorecardStore } from '@/store/scorecardStore';
import { useMatchPlayData } from '@/hooks/scorecard';
import { useActiveSkinsGameForRound, useSkinsResults } from '@/hooks/useSkins';
import { useFinalizeSkinsForRound } from '@/hooks';
import { calculatePlayingHandicap } from '@/hooks/usePlayingHandicap';
import { useIsSocial } from '@/context/SubscriptionContext';
import { isSingleBallScore } from '@/types/database/base';
import type { SkinsResultWithWinner } from '@/types';
import { scoringLogger } from '@/utils/debugLogger';
import { supabase } from '@/services/supabase/client';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchPlayScorecard'>;

type TabValue = 'scorecard' | 'skins';

export default function MatchPlayScorecardScreen({ navigation, route }: Props) {
  const { roundId, player1Id, player2Id, competitionId } = route.params;
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected ?? true;

  // Tab state
  const [activeTab, setActiveTab] = useState<TabValue>('scorecard');

  // Fetch match play data (players, holes, course info)
  const {
    player1,
    player2,
    holes,
    courseName,
    selectedTee,
    isLoading: isDataLoading,
    error,
    isInitialized,
    refetch,
  } = useMatchPlayData({
    roundId,
    player1Id,
    player2Id,
  });

  // Fetch skins game for this round (if any)
  const { data: skinsGame, isLoading: _isSkinsGameLoading } = useActiveSkinsGameForRound(roundId);

  // Fetch skins results when skins game exists
  const { data: skinsResults, refetch: refetchSkinsResults } = useSkinsResults(skinsGame?.id);

  // Check if skins is enabled for this round
  const hasSkinsEnabled = !!skinsGame;

  // Create par values map for SkinsResultsCard
  const parValues = useMemo(() => {
    if (!holes || holes.length === 0) return undefined;
    const parMap: Record<number, number> = {};
    holes.forEach((hole) => {
      parMap[hole.number] = hole.par;
    });
    return parMap;
  }, [holes]);

  // Get score access and submission methods from store
  const {
    getPlayerScore,
    getCompletedHolesCount,
    submitScorecards,
    resetRound,
    handicapSource,
    selectedTeeData: storeTeeData,
    startHole,
  } = useScorecardStore();

  // Playing handicap inputs (shared with the entry screen so both views agree).
  const isSocial = useIsSocial();
  const teeData = storeTeeData || selectedTee;

  const player1PlayingHandicap = useMemo(() => {
    if (!holes.length) return 0;
    return calculatePlayingHandicap({
      player: player1,
      selectedTeeData: teeData,
      holes,
      handicapSource,
      gameType: 'match-play',
      applyDailyHandicap: isSocial,
    }).playingHandicap;
  }, [player1, teeData, holes, handicapSource, isSocial]);

  const player2PlayingHandicap = useMemo(() => {
    if (!holes.length) return 0;
    return calculatePlayingHandicap({
      player: player2,
      selectedTeeData: teeData,
      holes,
      handicapSource,
      gameType: 'match-play',
      applyDailyHandicap: isSocial,
    }).playingHandicap;
  }, [player2, teeData, holes, handicapSource, isSocial]);

  // Skins finalization hook
  const { finalizeSkinsForRound } = useFinalizeSkinsForRound();

  // Dialog states
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [showSubmitConfirmDialog, setShowSubmitConfirmDialog] = useState(false);
  const [showSubmitErrorDialog, setShowSubmitErrorDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refreshing state for pull-to-refresh
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Handle back navigation
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      refetch();
      if (hasSkinsEnabled) {
        refetchSkinsResults();
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, refetchSkinsResults, hasSkinsEnabled]);

  // Handle hole press - navigate to scoring screen for that hole
  const handleHolePress = useCallback(
    (holeNumber: number) => {
      navigation.navigate('MatchPlayScoring', {
        roundId,
        player1Id,
        player2Id,
        initialHole: holeNumber,
      });
    },
    [navigation, roundId, player1Id, player2Id]
  );

  // Calculate if all holes are complete (both players have scores for all holes)
  const isAllComplete = useMemo(() => {
    if (holes.length === 0) return false;
    const completedCount = getCompletedHolesCount();
    return completedCount === holes.length;
  }, [holes.length, getCompletedHolesCount]);

  // Update round status to completed in database
  const updateRoundStatus = useCallback(async (): Promise<void> => {
    try {
      scoringLogger.info('SUBMIT: Updating round status to completed', { roundId: roundId?.substring(0, 8) });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { error } = await (supabase as any)
        .from('rounds')
        .update({ status: 'completed' })
        .eq('id', roundId);

      if (error) {
        scoringLogger.error('SUBMIT: Failed to update round status', error);
        throw error;
      }

      scoringLogger.info('SUBMIT: Round status updated successfully');
    } catch (error) {
      scoringLogger.error('SUBMIT: Error updating round status', error);
    }
  }, [roundId]);

  // Navigate after successful submission
  const navigateAfterSubmit = useCallback(() => {
    resetRound();
    scoringLogger.info('SUBMIT: Navigating to ViewRound (resetting stack)', { roundId: roundId?.substring(0, 8) });
    // Reset navigation stack so back button goes to rounds list, not score entry
    navigation.reset({
      index: 1,
      routes: [
        { name: 'MainTabs' },
        {
          name: 'ViewRound',
          params: {
            roundId,
            competitionId: competitionId !== 'standalone' ? competitionId : undefined,
          },
        },
      ],
    });
  }, [navigation, roundId, competitionId, resetRound]);

  // Perform the actual submission
  const performSubmit = useCallback(async () => {
    setShowIncompleteDialog(false);
    setShowSubmitConfirmDialog(false);
    setIsSubmitting(true);
    scoringLogger.info('SUBMIT: Starting match play scorecard submission', {
      roundId: roundId?.substring(0, 8),
      isOnline,
    });

    try {
      await submitScorecards();
      scoringLogger.info('SUBMIT: Match play scorecard submission successful');

      if (isOnline) {
        await updateRoundStatus();

        // Finalize skins game if applicable (non-blocking)
        finalizeSkinsForRound(roundId).then((result) => {
          if (result.finalized) {
            scoringLogger.info('SUBMIT: Skins game finalized', { roundId: roundId?.substring(0, 8) });
          }
        }).catch((error) => {
          scoringLogger.warn('SUBMIT: Skins finalization failed (non-blocking)', { error });
        });
      }

      // Show success dialog
      setShowSuccessDialog(true);
    } catch (error) {
      scoringLogger.error('SUBMIT: Match play scorecard submission failed', error);
      setShowSubmitErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [submitScorecards, roundId, isOnline, updateRoundStatus, finalizeSkinsForRound]);

  // Handle submit button press
  const handleSubmit = useCallback(() => {
    const completedCount = getCompletedHolesCount();
    scoringLogger.info('SUBMIT: Submit button pressed from match play scorecard', {
      completedHoles: completedCount,
      totalHoles: holes.length,
      isComplete: completedCount === holes.length,
      isOnline,
    });

    // Show incomplete dialog if not all holes are scored
    if (completedCount < holes.length) {
      setShowIncompleteDialog(true);
      return;
    }

    // Show confirmation dialog before submitting
    setShowSubmitConfirmDialog(true);
  }, [getCompletedHolesCount, holes.length, isOnline]);

  // Get player score for the table - returns just the strokes value
  const getPlayerScoreForTable = useCallback(
    (playerId: string, holeNumber: number): number | undefined => {
      const score = getPlayerScore(playerId, holeNumber);
      if (!score) return undefined;

      // Extract strokes from single ball score
      if (isSingleBallScore(score)) {
        return score.strokes;
      }

      // For multi-ball, use first ball (shouldn't happen in match play)
      if (score.balls && score.balls.length > 0) {
        return score.balls[0].strokes;
      }

      return undefined;
    },
    [getPlayerScore]
  );

  // Loading state
  const isLoading = isDataLoading || !isInitialized;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Match Scorecard"
          showBack
          onBack={handleGoBack}
        />
        <LoadingSpinner size="lg" message="Loading scorecard..." />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Match Scorecard"
          showBack
          onBack={handleGoBack}
        />
        <ErrorState
          error={error}
          title="Error Loading Scorecard"
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  // Empty state - no holes data
  if (holes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Match Scorecard"
          subtitle={courseName || undefined}
          showBack
          onBack={handleGoBack}
        />
        <EmptyState
          title="No Scorecard Data"
          message="Start entering scores to see the match scorecard."
          icon="clipboard-list-outline"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader
        title="Match Scorecard"
        subtitle={courseName || undefined}
        showBack
        onBack={handleGoBack}
      />

      {/* Tab Buttons - Only show when skins is enabled */}
      {hasSkinsEnabled && (
        <View style={styles.tabContainer}>
          <Tabs
            tabs={[
              { key: 'scorecard', label: 'Scorecard' },
              { key: 'skins', label: 'Skins' },
            ]}
            selectedTab={activeTab}
            onTabChange={setActiveTab}
            size="medium"
          />
        </View>
      )}

      {/* Content based on active tab */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isAllComplete ? insets.bottom + 120 : insets.bottom + spacing.lg },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={true}
      >
        {activeTab === 'scorecard' ? (
          <MatchPlayScorecardTable
            holes={holes}
            player1={{ id: player1.id, name: player1.name }}
            player2={{ id: player2.id, name: player2.name }}
            getPlayerScore={getPlayerScoreForTable}
            onHolePress={handleHolePress}
            player1Handicap={player1PlayingHandicap}
            player2Handicap={player2PlayingHandicap}
            startHole={startHole}
          />
        ) : (
          /* Skins Tab Content */
          skinsGame && skinsResults ? (
            <SkinsResultsCard
              results={skinsResults as SkinsResultWithWinner[]}
              potType={skinsGame.pot_type}
              potValue={skinsGame.pot_value}
              scoringType={skinsGame.scoring_type}
              parValues={parValues}
            />
          ) : (
            <LoadingSpinner size="lg" message="Loading skins results..." />
          )
        )}
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

      {/* Submit Confirmation Dialog */}
      <ConfirmationDialog
        visible={showSubmitConfirmDialog}
        title="Submit Scorecard"
        message={
          isOnline
            ? 'Are you sure you want to submit the match scorecard? This action cannot be undone.'
            : 'You are offline. Scores will be saved locally and submitted when you reconnect.'
        }
        confirmLabel="Submit"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={performSubmit}
        onCancel={() => setShowSubmitConfirmDialog(false)}
        loading={isSubmitting}
        icon="clipboard-check-outline"
      />

      {/* Success Dialog */}
      <ConfirmationDialog
        visible={showSuccessDialog}
        title={isOnline ? 'Success' : 'Saved Offline'}
        message={
          isOnline
            ? 'Match scorecard has been submitted successfully!'
            : 'Your scores have been saved locally and will be submitted when you reconnect.'
        }
        confirmLabel="View Round"
        cancelLabel="Close"
        confirmVariant="primary"
        onConfirm={() => {
          setShowSuccessDialog(false);
          navigateAfterSubmit();
        }}
        onCancel={() => {
          setShowSuccessDialog(false);
          navigateAfterSubmit();
        }}
        icon="check-circle-outline"
      />
    </View>
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  dialogButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dialogButtonText: {
    ...typography.bodyBold,
  },
});

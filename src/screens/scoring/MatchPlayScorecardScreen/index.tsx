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
import { buildPostSubmitResetState } from '@/navigation/postSubmitNavigation';
import { PageHeader, Tabs, LoadingSpinner, ErrorState, EmptyState, ConfirmationDialog } from '@/components/common';
import { MatchPlayScorecardTable } from '@/components/scorecard';
import { SkinsResultsCard } from '@/components/skins';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useScorecardStore } from '@/store/scorecardStore';
import { useMatchPlayData } from '@/hooks/scorecard';
import { useActiveSkinsGameForRound, useSkinsHoleCounts, useSkinsResults } from '@/hooks/useSkins';
import { useFinalizeSubmittedRound } from '@/hooks/rounds/useFinalizeSubmittedRound';
import { calculatePlayingHandicap } from '@/hooks/usePlayingHandicap';
import { isSingleBallScore } from '@/types/database/base';
import type { SkinsResultWithWinner } from '@/types';
import { scoringLogger } from '@/utils/debugLogger';
// Direct path: the screen test mocks the scorecard barrel.
import { EndedEarlyBanner } from '@/components/scorecard/EndedEarlyBanner';
import { isEndedEarly } from '@/utils/roundShape';
import { filterPlayableHoles } from '@/utils/holeTransformers';

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
    courseId,
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

  // Skins are priced on the round's planned holes (read from the round, not the store)
  const roundSkinsHoleCounts = useSkinsHoleCounts(roundId);

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
    isHoleComplete,
    submitScorecards,
    resetRound,
    handicapSource,
    selectedTeeData: storeTeeData,
    startHole,
    nineType,
    holesPlayed,
    groupScorecards,
  } = useScorecardStore();

  // The local end stands in while the offline end_early item is queued.
  // Keep fetched ended counts authoritative and hole pricing planned.
  const skinsHoleCounts = useMemo(
    () =>
      holesPlayed != null &&
      isEndedEarly({ holes_played: holesPlayed }) &&
      roundSkinsHoleCounts.holesPlayed === roundSkinsHoleCounts.plannedHoles
        ? { plannedHoles: roundSkinsHoleCounts.plannedHoles, holesPlayed }
        : roundSkinsHoleCounts,
    [roundSkinsHoleCounts, holesPlayed]
  );

  // Playing handicap inputs (shared with the entry screen so both views agree).
  const teeData = storeTeeData || selectedTee;

  const player1PlayingHandicap = useMemo(() => {
    if (!holes.length) return 0;
    return calculatePlayingHandicap({
      player: player1,
      selectedTeeData: teeData,
      holes,
      handicapSource,
      gameType: 'match-play',
    }).playingHandicap;
  }, [player1, teeData, holes, handicapSource]);

  const player2PlayingHandicap = useMemo(() => {
    if (!holes.length) return 0;
    return calculatePlayingHandicap({
      player: player2,
      selectedTeeData: teeData,
      holes,
      handicapSource,
      gameType: 'match-play',
    }).playingHandicap;
  }, [player2, teeData, holes, handicapSource]);

  // Finalise the round (status → results → skins), or queue it when offline
  const finalizeRound = useFinalizeSubmittedRound();

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

  // Header subtitle: the course name links to the Course page when known.
  const headerSubtitle = useMemo(() => {
    if (!courseName) return undefined;
    if (!courseId) return courseName;
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('Course', { courseId })}
        accessibilityRole="button"
        accessibilityLabel={`View ${courseName} details`}
        testID="match-scorecard-course-link"
      >
        <Text
          style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {courseName}
        </Text>
      </TouchableOpacity>
    );
  }, [courseId, courseName, navigation, colors.textSecondary]);

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
  const handlePlayerPress = useCallback(
    (playerId: string) => navigation.navigate('PlayerDetail', { id: playerId }),
    [navigation]
  );

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

  // Match context and handicap inputs keep the planned holes; completion uses
  // only the played range after an early end.
  const playedHoles = useMemo(
    () => filterPlayableHoles(holes, nineType, holesPlayed),
    [holes, nineType, holesPlayed]
  );

  // The store function is stable. Recheck when a score write replaces the map.
  const completedPlayedHoleCount = useMemo(
    () => playedHoles.filter((hole) => isHoleComplete(hole.number)).length,
    // The stable store accessor reads the current map through its closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playedHoles, isHoleComplete, groupScorecards]
  );
  const isAllComplete =
    playedHoles.length > 0 && completedPlayedHoleCount === playedHoles.length;

  // Navigate after successful submission
  const navigateAfterSubmit = useCallback(() => {
    resetRound();
    scoringLogger.info('SUBMIT: Navigating to ViewRound (resetting stack)', { roundId: roundId?.substring(0, 8) });
    // Reset the stack so back goes to the competition (rounds list) for
    // competition rounds, or the tabs for standalone rounds — never back into
    // the scoring flow. See buildPostSubmitResetState for why CompetitionDetail
    // must sit beneath ViewRound.
    navigation.reset(buildPostSubmitResetState(roundId, competitionId));
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

      // Completes the round once every card is terminal (writing results and
      // settling skins), or queues that for the next sync. Never throws.
      const finalized = await finalizeRound(roundId);
      scoringLogger.info('SUBMIT: Round finalisation', {
        roundId: roundId?.substring(0, 8),
        completed: finalized.completed,
        queued: finalized.queued,
      });

      // Show success dialog
      setShowSuccessDialog(true);
    } catch (error) {
      scoringLogger.error('SUBMIT: Match play scorecard submission failed', error);
      setShowSubmitErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [submitScorecards, roundId, isOnline, finalizeRound]);

  // Handle submit button press
  const handleSubmit = useCallback(() => {
    scoringLogger.info('SUBMIT: Submit button pressed from match play scorecard', {
      completedHoles: completedPlayedHoleCount,
      totalHoles: playedHoles.length,
      isComplete: completedPlayedHoleCount === playedHoles.length,
      isEndedEarly: holesPlayed != null,
      isOnline,
    });

    // Show incomplete dialog if not every played hole is scored
    if (completedPlayedHoleCount < playedHoles.length) {
      setShowIncompleteDialog(true);
      return;
    }

    // Show confirmation dialog before submitting
    setShowSubmitConfirmDialog(true);
  }, [completedPlayedHoleCount, playedHoles.length, holesPlayed, isOnline]);

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
          subtitle={headerSubtitle}
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
        subtitle={headerSubtitle}
        showBack
        onBack={handleGoBack}
      />

      {/* Finish screen: the ended banner has no Finish action. */}
      {holesPlayed != null && isEndedEarly({ holes_played: holesPlayed }) ? (
        <EndedEarlyBanner holesPlayed={holesPlayed} nineType={nineType ?? 'full'} />
      ) : null}

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
            onPlayerPress={handlePlayerPress}
            player1Handicap={player1PlayingHandicap}
            player2Handicap={player2PlayingHandicap}
            startHole={startHole}
            holesPlayed={holesPlayed}
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
              holeCounts={skinsHoleCounts}
              roundId={roundId}
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
              You have {completedPlayedHoleCount} of {playedHoles.length} holes completed.
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
  headerSubtitle: {
    ...typography.caption,
  },
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

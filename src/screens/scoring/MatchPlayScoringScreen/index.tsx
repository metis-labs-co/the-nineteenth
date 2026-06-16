/**
 * MatchPlayScoringScreen
 *
 * Specialized scoring interface for Match Play format.
 * Features:
 * - Vertically stacked score entry for both players/teams
 * - Reusable HoleHeader component with navigation
 * - Score buttons for each side
 * - Hole result display (Won/Lost/Halved)
 * - Match status: 'Player A is 2 up with 5 to play' or 'All Square'
 * - Early finish detection when lead exceeds remaining holes
 * - Submit match result button when complete
 * - Skins indicator and link to full scorecard
 * - Super admin delete functionality
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, BackHandler } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner, ErrorState, Pill, ConfirmationDialog } from '@/components/common';
import { useConfirmationDialog } from '@/hooks';
import { HoleHeader, RoundHeader, SwipeableHoleNavigator, ChangeTeesSheet } from '@/components/scorecard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useScorecardStore } from '@/store/scorecardStore';
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { useMatchPlayData, useMatchPlayScoring, useOfflineSync } from '@/hooks/scorecard';
import { useProcessSkinsIfNeeded, useOnlineStatus, useAuth } from '@/hooks';
import { useRoundDetails } from '@/hooks/rounds';
import { useCompetitionInfo } from '@/hooks/competitions';
import { supabase } from '@/services/supabase/client';
import { matchPlayLogger } from '@/utils/debugLogger';
import { getStrokesReceived } from '@/utils/scoring';
import { resolvePlayerTee } from '@/utils/teeResolution';
import { getTeeColor } from '@/services/courses';
import { calculatePlayingHandicap } from '@/hooks/usePlayingHandicap';
import type { RootStackScreenProps } from '@/navigation/types';

import { MatchPlayFooter, PlayerScoreCard, MatchProgress } from './components';
import { DEFAULT_HOLES } from './constants';
import type { HoleResult } from './types';

type Props = RootStackScreenProps<'MatchPlayScoring'>;

export default function MatchPlayScoringScreen({ navigation, route }: Props) {
  const { roundId, player1Id, player2Id, team1Id, team2Id, initialHole, competitionId } = route.params;
  const colors = useThemeColors();

  // Confirmation dialog hook
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // Online status for round status update
  const isOnline = useOnlineStatus();

  const { handicapSource, selectedTeeData: storeTeeData, playerTeeMap, startHole, currentPlayers } = useScorecardStore();

  // Change-tees permission gate + state. Round owner (standalone) /
  // competition organizer / super admin may switch a player's tee.
  const { user } = useAuth();
  const { showErrorToast } = useToast();
  const isSuperAdmin = useIsSuperAdmin();
  const isStandalone = !competitionId || competitionId === 'standalone';
  const { data: roundDetails } = useRoundDetails(roundId);
  const { data: competitionInfo } = useCompetitionInfo(
    isStandalone ? undefined : competitionId
  );
  const [showChangeTeesSheet, setShowChangeTeesSheet] = useState(false);
  const canChangeTees = useMemo(() => {
    if (!user?.id) return false;
    if (isSuperAdmin) return true;
    if (isStandalone) return roundDetails?.user_id === user.id;
    return competitionInfo?.organizer_id === user.id;
  }, [user?.id, isSuperAdmin, isStandalone, roundDetails?.user_id, competitionInfo?.organizer_id]);
  const availableTees = roundDetails?.course?.tees ?? [];

  // State - start on initialHole if provided (clamped to 1-18)
  const [currentHole, setCurrentHole] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScrollingProgress, setIsScrollingProgress] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Sync currentHole when initialHole route param changes (e.g., navigating from scorecard)
  useEffect(() => {
    if (initialHole) {
      const clampedHole = Math.max(1, Math.min(18, initialHole));
      setCurrentHole(clampedHole);
    }
  }, [initialHole]);

  // Resolve player IDs (prefer explicit IDs, fall back to team IDs)
  const resolvedPlayer1Id = player1Id || team1Id || '1';
  const resolvedPlayer2Id = player2Id || team2Id || '2';

  // Use the new hooks for data fetching and store initialization
  const {
    player1,
    player2,
    holes,
    courseId,
    courseName,
    clubName,
    selectedTee: selectedTeeBox,
    isLoading,
    error: dataError,
    isInitialized,
  } = useMatchPlayData({
    roundId,
    player1Id: resolvedPlayer1Id,
    player2Id: resolvedPlayer2Id,
  });

  // Use the new hook for score management - persists to store
  const {
    handleScoreSelect: storeHandleScoreSelect,
    handleScoreAdjust: storeHandleScoreAdjust,
    handlePickUp: storeHandlePickUp,
    getHoleResult,
    holeResults,
    matchStatus: _matchStatus,
    matchStatusText,
    isMatchComplete,
    player1MatchStatus,
    player2MatchStatus,
    getScoreColor,
  } = useMatchPlayScoring({
    player1Id: player1.id,
    player2Id: player2.id,
    player1Name: player1.name,
    player2Name: player2.name,
    player1Handicap: player1.handicap,
    player2Handicap: player2.handicap,
    currentHole,
  });

  // Sync status (drives the offline indicator + animated sync line in RoundHeader).
  const { isSyncing, pendingSyncCount, submitScorecards } = useScorecardStore();
  const { triggerSync } = useOfflineSync();

  // Skins processing hook
  const { processSkinsHole } = useProcessSkinsIfNeeded();

  // Process skins for the current hole after scores change
  const triggerSkinsProcessing = useCallback((holeNumber: number, holeData: { par: number; strokeIndex: number }) => {
    // Build scorecards record from store (get fresh state)
    const latestScorecards = useScorecardStore.getState().groupScorecards;
    const scorecardsRecord: Record<string, Record<string, { strokes: number }>> = {};

    latestScorecards.forEach((scorecard, playerId) => {
      scorecardsRecord[playerId] = scorecard.scores as Record<string, { strokes: number }>;
    });

    // Process skins (non-blocking)
    processSkinsHole({
      roundId,
      holeNumber,
      scorecards: scorecardsRecord,
      hole: { par: holeData.par, strokeIndex: holeData.strokeIndex },
    }).then((result) => {
      if (result.processed) {
        if (result.hasWinner) {
          matchPlayLogger.info('SKINS: Hole won', {
            hole: holeNumber,
            winner: result.winnerName,
            amount: result.winningsAmount,
          });
        } else if (result.carryoverAmount) {
          matchPlayLogger.info('SKINS: Carryover', {
            hole: holeNumber,
            carryover: result.carryoverAmount,
          });
        }
      }
    }).catch((error) => {
      // Non-blocking - log error but don't fail score entry
      matchPlayLogger.warn('SKINS: Processing error (non-blocking)', { error });
    });
  }, [roundId, processSkinsHole]);

  // Get the tee color string for HoleHeader (uses tee color to look up yardages)
  const selectedTeeColor = selectedTeeBox?.color ?? 'white';

  // Use course holes if available, otherwise default
  const safeHoles = useMemo(() => {
    if (holes && holes.length > 0) {
      return holes;
    }
    return DEFAULT_HOLES;
  }, [holes]);

  const currentHoleData = safeHoles[currentHole - 1];

  // Calculate playing handicap + display info for both players (daily HC when tee/rating data is available)
  const teeData = storeTeeData || selectedTeeBox;
  const baseLabel = handicapSource === 'calculated' ? 'SHC' : 'HC';

  const player1HandicapResult = useMemo(() => {
    const result = calculatePlayingHandicap({
      player: player1,
      selectedTeeData: teeData,
      holes: safeHoles,
      handicapSource,
      gameType: 'match-play',
    });
    return result;
  }, [player1, teeData, safeHoles, handicapSource]);
  const player1Handicap = player1HandicapResult.playingHandicap;

  const player2HandicapResult = useMemo(() => {
    const result = calculatePlayingHandicap({
      player: player2,
      selectedTeeData: teeData,
      holes: safeHoles,
      handicapSource,
      gameType: 'match-play',
    });
    return result;
  }, [player2, teeData, safeHoles, handicapSource]);
  const player2Handicap = player2HandicapResult.playingHandicap;

  // Resolve per-player tee colour for the dot next to the player's name.
  // Uses the per-player override from the store, falling back to the round default.
  const roundDefaultTee = teeData ?? null;
  const player1TeeDotColor = useMemo(() => {
    const tee = resolvePlayerTee(player1.id, playerTeeMap, roundDefaultTee);
    return tee ? getTeeColor(tee.name) : undefined;
  }, [player1.id, playerTeeMap, roundDefaultTee]);
  const player2TeeDotColor = useMemo(() => {
    const tee = resolvePlayerTee(player2.id, playerTeeMap, roundDefaultTee);
    return tee ? getTeeColor(tee.name) : undefined;
  }, [player2.id, playerTeeMap, roundDefaultTee]);

  // Wrap score handlers with logging
  // Note: We allow score edits even after match is complete - scores are only locked after submission
  const handleScoreSelect = useCallback((player: 'player1' | 'player2', score: number) => {
    const playerName = player === 'player1' ? player1.name : player2.name;
    matchPlayLogger.info('MATCH PLAY: Score selected', {
      player,
      playerName,
      score,
      hole: currentHole,
      par: currentHoleData.par,
    });

    storeHandleScoreSelect(player, score);

    // Trigger skins processing after score is saved
    // Use setTimeout to ensure store is updated first
    setTimeout(() => {
      triggerSkinsProcessing(currentHole, {
        par: currentHoleData.par,
        strokeIndex: currentHoleData.strokeIndex,
      });
    }, 100);
  }, [currentHole, player1.name, player2.name, currentHoleData.par, currentHoleData.strokeIndex, storeHandleScoreSelect, triggerSkinsProcessing]);

  // Handle score adjustment
  // Note: We allow score edits even after match is complete - scores are only locked after submission
  const handleScoreAdjust = useCallback((player: 'player1' | 'player2', delta: number) => {
    storeHandleScoreAdjust(player, delta);

    // Trigger skins processing after score is saved
    setTimeout(() => {
      triggerSkinsProcessing(currentHole, {
        par: currentHoleData.par,
        strokeIndex: currentHoleData.strokeIndex,
      });
    }, 100);
  }, [storeHandleScoreAdjust, currentHole, currentHoleData.par, currentHoleData.strokeIndex, triggerSkinsProcessing]);

  // Handle pick up - player concedes the hole
  // Note: We allow score edits even after match is complete - scores are only locked after submission
  const handlePickUp = useCallback((player: 'player1' | 'player2') => {
    const playerName = player === 'player1' ? player1.name : player2.name;
    matchPlayLogger.info('MATCH PLAY: Player picked up', {
      player,
      playerName,
      hole: currentHole,
    });

    storeHandlePickUp(player);

    // Trigger skins processing after score is saved
    setTimeout(() => {
      triggerSkinsProcessing(currentHole, {
        par: currentHoleData.par,
        strokeIndex: currentHoleData.strokeIndex,
      });
    }, 100);
  }, [currentHole, player1.name, player2.name, storeHandlePickUp, currentHoleData.par, currentHoleData.strokeIndex, triggerSkinsProcessing]);

  // Navigation handlers — bound to the round's actual hole range so back-9
  // (10..18) and combo (10..27) rounds don't overshoot the played holes.
  const firstHoleNumber = safeHoles[0]?.number ?? 1;
  const lastHoleNumber = safeHoles[safeHoles.length - 1]?.number ?? 18;
  const handlePreviousHole = useCallback(() => {
    if (currentHole > firstHoleNumber) {
      setCurrentHole(currentHole - 1);
    }
  }, [currentHole, firstHoleNumber]);

  const handleNextHole = useCallback(() => {
    // Allow navigation even after match is complete so user can review/edit scores
    if (currentHole < lastHoleNumber) {
      setCurrentHole(currentHole + 1);
    }
  }, [currentHole, lastHoleNumber]);

  const handleHolePress = useCallback((holeNumber: number) => {
    setCurrentHole(holeNumber);
  }, []);

  // Touch handlers for MatchProgress - disable swipe while touching
  const handleProgressTouchStart = useCallback(() => {
    setIsScrollingProgress(true);
  }, []);

  const handleProgressTouchEnd = useCallback(() => {
    setIsScrollingProgress(false);
  }, []);

  const handleBackPress = useCallback(() => {
    // Scores are now persisted to the store/SQLite, so we can safely navigate back
    // The user can resume the match later
    navigation.goBack();
  }, [navigation]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true;
    });
    return () => backHandler.remove();
  }, [handleBackPress]);

  // Delete round handler (super admin only)
  const handleDeleteRound = useCallback(() => {
    showDialog({
      title: 'Delete Match',
      message: 'Are you sure you want to delete this match? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
      icon: 'trash-can-outline',
      onConfirm: () => {
        dismissDialog();
        // TODO: Implement actual deletion
        matchPlayLogger.info('MATCH PLAY: Delete requested', { roundId });
        navigation.goBack();
      },
    });
  }, [navigation, roundId, showDialog, dismissDialog]);

  // Show submit confirmation dialog
  const handleSubmitMatch = useCallback(() => {
    if (!isMatchComplete) {
      showAlert('Match Not Complete', 'The match must be finished before submitting.');
      return;
    }
    setShowSubmitDialog(true);
  }, [isMatchComplete, showAlert]);

  // Confirm and submit match result
  const handleConfirmSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Submit scorecards via the store (handles sync and persistence)
      await submitScorecards();

      // Update round status to completed in database (if online)
      if (roundId && isOnline) {
        try {
          matchPlayLogger.info('Updating round status to completed', { roundId: roundId.substring(0, 8) + '...' });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          const { error } = await (supabase as any)
            .from('rounds')
            .update({ status: 'completed' })
            .eq('id', roundId);

          if (error) {
            matchPlayLogger.error('Failed to update round status', error, { roundId: roundId.substring(0, 8) + '...' });
          } else {
            matchPlayLogger.info('Round status updated successfully', { roundId: roundId.substring(0, 8) + '...' });
          }
        } catch (statusError) {
          // Non-blocking - log error but don't fail submission
          matchPlayLogger.error('Error updating round status', statusError);
        }
      }

      // Close dialog and navigate to round details
      setShowSubmitDialog(false);
      navigation.navigate('ViewRound', { roundId });
    } catch (error) {
      matchPlayLogger.error('Failed to submit match', { error });
      showAlert('Error', 'Failed to submit match result. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [navigation, roundId, submitScorecards, isOnline, showAlert]);

  // Cancel submit dialog
  const handleCancelSubmit = useCallback(() => {
    setShowSubmitDialog(false);
  }, []);

  // Navigate to player's full scorecard
  const handlePlayer1Press = useCallback(() => {
    navigation.navigate('PlayerScorecard', {
      playerId: player1.id,
      roundId,
    });
  }, [navigation, player1.id, roundId]);

  const handlePlayer2Press = useCallback(() => {
    navigation.navigate('PlayerScorecard', {
      playerId: player2.id,
      roundId,
    });
  }, [navigation, player2.id, roundId]);

  // Navigate to full match play scorecard
  const handleViewScorecard = useCallback(() => {
    navigation.navigate('MatchPlayScorecard', {
      roundId,
      player1Id: player1.id,
      player2Id: player2.id,
      competitionId,
    });
  }, [navigation, roundId, player1.id, player2.id, competitionId]);

  // Get hole result display
  const getHoleResultDisplay = useCallback((result: HoleResult | undefined): { text: string; color: string } | null => {
    if (!result?.winner) return null;

    switch (result.winner) {
      case 'player1':
        return { text: `${player1.name} wins`, color: colors.success };
      case 'player2':
        return { text: `${player2.name} wins`, color: colors.success };
      case 'halved':
        return { text: 'Halved', color: colors.warning };
      default:
        return null;
    }
  }, [colors, player1.name, player2.name]);

  // Get score color based on par (for rendering)
  const getScoreColorForHole = useCallback((score: number | null, par: number): string => {
    return getScoreColor(score, par, colors);
  }, [colors, getScoreColor]);

  // Get hole data for any hole number
  const getHoleData = useCallback((holeNumber: number) => {
    return safeHoles[holeNumber - 1];
  }, [safeHoles]);

  // Render content for any hole number (used by SwipeableHoleNavigator for transitions)
  const renderHoleContent = useCallback(
    (holeNumber: number) => {
      const holeData = getHoleData(holeNumber);
      if (!holeData) return null;

      const holeResult = getHoleResult(holeNumber);
      const holeResultDisplay = getHoleResultDisplay(holeResult);

      // Calculate navigation state for this hole — bound to the round's
      // actual hole range so back-9 / combo rounds don't fall off the end.
      const canGoPrev = holeNumber > firstHoleNumber;
      const canGoNext = holeNumber < lastHoleNumber;

      return (
        <View style={styles.contentArea}>
          {/* Hole Header - using shared component */}
          <HoleHeader
            hole={holeData}
            selectedTee={selectedTeeColor}
            startHole={startHole}
            onPrevious={handlePreviousHole}
            onNext={handleNextHole}
            canGoPrevious={canGoPrev}
            canGoNext={canGoNext}
          />

          {/* Content Area */}
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.contentContainer}>
            {/* Vertically Stacked Score Entry */}
            <View style={styles.scoringContainer}>
              <PlayerScoreCard
                player={player1}
                currentScore={holeResult.player1Score}
                isPickedUp={holeResult.player1PickedUp}
                par={holeData.par}
                isMatchComplete={isMatchComplete}
                matchStatus={player1MatchStatus}
                strokesReceived={getStrokesReceived(player1Handicap, holeData.strokeIndex)}
                onScoreAdjust={(delta) => handleScoreAdjust('player1', delta)}
                onParSelect={() => handleScoreSelect('player1', holeData.par)}
                onPickUp={() => handlePickUp('player1')}
                getScoreColor={(score) => getScoreColorForHole(score, holeData.par)}
                onPlayerPress={handlePlayer1Press}
                dailyHandicap={player1HandicapResult.isDailyHandicap ? player1HandicapResult.dailyHandicap : null}
                baseHandicap={player1HandicapResult.baseHandicap}
                baseLabel={baseLabel}
                teeDotColor={player1TeeDotColor}
              />

              {/* VS Divider - Horizontal between cards */}
              <View style={styles.vsDivider}>
                <View style={[styles.vsDividerLine, { backgroundColor: colors.border }]} />
                <View style={[styles.vsCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
                </View>
                <View style={[styles.vsDividerLine, { backgroundColor: colors.border }]} />
              </View>

              <PlayerScoreCard
                player={player2}
                currentScore={holeResult.player2Score}
                isPickedUp={holeResult.player2PickedUp}
                par={holeData.par}
                isMatchComplete={isMatchComplete}
                matchStatus={player2MatchStatus}
                strokesReceived={getStrokesReceived(player2Handicap, holeData.strokeIndex)}
                onScoreAdjust={(delta) => handleScoreAdjust('player2', delta)}
                onParSelect={() => handleScoreSelect('player2', holeData.par)}
                onPickUp={() => handlePickUp('player2')}
                getScoreColor={(score) => getScoreColorForHole(score, holeData.par)}
                onPlayerPress={handlePlayer2Press}
                dailyHandicap={player2HandicapResult.isDailyHandicap ? player2HandicapResult.dailyHandicap : null}
                baseHandicap={player2HandicapResult.baseHandicap}
                baseLabel={baseLabel}
                teeDotColor={player2TeeDotColor}
              />
            </View>

            {/* Hole Result */}
            {holeResultDisplay && (
              <View style={[styles.holeResultContainer, { backgroundColor: colors.surfaceVariant }]}>
                <Icon source="flag-checkered" size={20} color={holeResultDisplay.color} />
                <Text style={[styles.holeResultText, { color: holeResultDisplay.color }]}>
                  {holeResultDisplay.text}
                </Text>
              </View>
            )}

            {/* Hole Progress */}
            <MatchProgress
              holeResults={holeResults}
              currentHole={holeNumber}
              holeNumbers={safeHoles.map((h) => h.number)}
              startHole={startHole}
              player1={player1}
              player2={player2}
              onHolePress={handleHolePress}
              onTouchStart={handleProgressTouchStart}
              onTouchEnd={handleProgressTouchEnd}
            />
          </ScrollView>
        </View>
      );
    },
    [
      getHoleData,
      getHoleResult,
      getHoleResultDisplay,
      selectedTeeColor,
      handlePreviousHole,
      handleNextHole,
      isMatchComplete,
      player1,
      player2,
      player1MatchStatus,
      player2MatchStatus,
      handleScoreAdjust,
      handleScoreSelect,
      handlePickUp,
      getScoreColorForHole,
      handlePlayer1Press,
      handlePlayer2Press,
      colors,
      holeResults,
      handleHolePress,
      handleProgressTouchStart,
      handleProgressTouchEnd,
      player1Handicap,
      player2Handicap,
      player1HandicapResult,
      player2HandicapResult,
      baseLabel,
      player1TeeDotColor,
      player2TeeDotColor,
      firstHoleNumber,
      lastHoleNumber,
      safeHoles,
      startHole,
    ]
  );

  // Loading state - wait for data hooks to load and store to initialize
  if (isLoading || !isInitialized) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner size="lg" message="Loading match..." />
      </SafeAreaView>
    );
  }

  // Error state
  if (dataError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
        <ErrorState
          error={dataError}
          title="Failed to load match"
          onRetry={() => navigation.goBack()}
          retryLabel="Go Back"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <RoundHeader
        titleFallback="Match Play"
        courseName={courseName ?? undefined}
        clubName={clubName}
        selectedTee={selectedTeeBox}
        onBack={handleBackPress}
        roundId={roundId}
        courseId={courseId ?? undefined}
        currentHole={currentHole}
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingSyncCount={pendingSyncCount}
        onSyncPress={triggerSync}
        canChangeTees={canChangeTees}
        onChangeTeesPress={() => setShowChangeTeesSheet(true)}
        onChangeTeesBlockedOffline={() =>
          showErrorToast('Offline', 'Connect to the internet to change tees')
        }
      />

      {/* Match Status Bar */}
      <View style={[styles.matchStatusBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text
          style={[
            styles.matchStatusText,
            { color: isMatchComplete ? colors.success : colors.textPrimary },
          ]}
        >
          {matchStatusText}
        </Text>
        {isMatchComplete && (
          <Pill label="COMPLETE" variant="success" size="sm" filled />
        )}
      </View>

      {/* Content Area with Swipe Navigation */}
      {/* Allow swipe navigation even after match is complete so user can review/edit scores */}
      <SwipeableHoleNavigator
        currentHole={currentHole}
        totalHoles={18}
        onHoleChange={setCurrentHole}
        enabled={!isSubmitting && !isScrollingProgress}
        renderHole={renderHoleContent}
      />

      {/* Footer */}
      <MatchPlayFooter
        currentHole={currentHole}
        firstHoleNumber={firstHoleNumber}
        lastHoleNumber={lastHoleNumber}
        isMatchComplete={isMatchComplete}
        isSubmitting={isSubmitting}
        onPreviousHole={handlePreviousHole}
        onNextHole={handleNextHole}
        onSubmitMatch={handleSubmitMatch}
        onViewScorecard={handleViewScorecard}
      />

      {/* Submit Confirmation Dialog */}
      <ConfirmationDialog
        visible={showSubmitDialog}
        title="Submit Match Result"
        message={`Are you sure you want to submit the match?\n\n${matchStatusText}`}
        confirmLabel="Submit"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="flag-checkered"
        loading={isSubmitting}
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
      />

      {/* General Confirmation/Alert Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />

      <ChangeTeesSheet
        visible={showChangeTeesSheet}
        onClose={() => setShowChangeTeesSheet(false)}
        roundId={roundId}
        competitionId={isStandalone ? undefined : competitionId}
        players={currentPlayers}
        availableTees={availableTees}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  matchStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  matchStatusText: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  contentArea: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  // Vertical stacked layout for player cards
  scoringContainer: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  // Horizontal VS divider between cards
  vsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  vsDividerLine: {
    flex: 1,
    height: 1,
  },
  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  vsText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
  },
  holeResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  holeResultText: {
    ...typography.bodyBold,
  },
});

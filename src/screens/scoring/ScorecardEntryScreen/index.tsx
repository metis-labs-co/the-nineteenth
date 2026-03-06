/**
 * ScorecardEntryScreen
 *
 * Offline-first scoring interface for 18-hole rounds.
 * Features:
 * - Current hole display with par and stroke index
 * - Score entry for all players in group
 * - Team scoring modes: Scramble, Best Ball, Team Match Play
 * - Previous/Next hole navigation buttons
 * - Progress bar showing completion
 * - Quick scorecard view for jumping to any hole
 * - Auto-save to SQLite for offline support
 * - Sync on submit when online
 * - Super admin hole editing (par, SI, yardage)
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useNetInfo } from '@react-native-community/netinfo';
import { LoadingSpinner, ConfirmationDialog } from '@/components/common';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScorecardStore } from '@/store/scorecardStore';
import { useStatsVisibilityWithTier } from '@/store/settingsStore';
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { useOfflineSync, useRoundData, useTeamScoring, useBuildAsYouPlay } from '@/hooks/scorecard';
import {
  QuickScorecardView,
  HoleHeader,
  SwipeableHoleNavigator,
} from '@/components/scorecard';
import { EditHoleBottomSheet, BuildCourseHoleModal } from '@/components/courses';
import { WolfDecisionModal } from '@/components/wolf';
import { useUpdateCourseHoles, useProcessSkinsIfNeeded } from '@/hooks';
import {
  useWolfGameByRound,
  useWolfCurrentHoleDecision,
  useSubmitWolfDecision,
  useRecordWolfHoleResult,
} from '@/hooks/wolf';
import { determineWolfForHole } from '@/utils/wolfCalculations';
import { scoringLogger } from '@/utils/debugLogger';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation/types';
import type { HoleScore, Hole } from '@/types';

// Local hooks and components
import {
  useScorecardDialogs,
  useScorecardNavigation,
  useScorecardSubmission,
} from './hooks';
import {
  ScorecardHeader,
  ScorecardFooter,
  ScorecardDialogs,
  ScorecardScoreContent,
} from './components';

type Props = RootStackScreenProps<'Scorecard'>;

export default function ScorecardEntryScreen({ navigation, route }: Props) {
  const { roundId, competitionId, isBuildAsYouPlay: isBuildAsYouPlayParam } = route.params;
  const colors = useThemeColors();
  const { user } = useAuth();
  const isStandaloneRound = competitionId === 'standalone';

  // Super admin check
  const isSuperAdmin = useIsSuperAdmin();

  // Edit hole state (for super admins)
  const [editingHole, setEditingHole] = useState<Hole | null>(null);

  // Track when QuickScorecardView is being scrolled (to disable swipe gestures)
  const [isQuickViewScrolling, setIsQuickViewScrolling] = useState(false);

  // Dialog state management
  const dialogs = useScorecardDialogs();

  // Core scorecard store
  const {
    currentHole,
    currentPlayers,
    holes,
    groupScorecards: _groupScorecards,
    isLoading: storeLoading,
    isInitialized,
    isSyncing,
    pendingSyncCount,
    isMultiBall,
    ballCount: storeBallCount,
    setCurrentHole,
    setPlayerScore,
    updatePlayerHoleScore,
    getPlayerScore,
    getHoleInfo,
    isHoleComplete,
    getCompletedHolesCount,
    submitScorecards,
    resetRound,
    setMultiBallConfig,
    setMultiBallScore,
    updateMultiBallStats,
    getMultiBallScores,
    getMultiBallTotals: _getMultiBallTotals,
  } = useScorecardStore();

  // Skins processing hook
  const { processSkinsHole } = useProcessSkinsIfNeeded();

  // Wolf game state and hooks
  const [showWolfDecisionModal, setShowWolfDecisionModal] = useState(false);
  const { data: wolfGame } = useWolfGameByRound(roundId);
  const { data: wolfDecision, refetch: refetchWolfDecision } = useWolfCurrentHoleDecision(
    wolfGame?.id,
    currentHole
  );
  const submitWolfDecision = useSubmitWolfDecision();
  const recordWolfHoleResult = useRecordWolfHoleResult();

  // Determine Wolf for current hole
  const currentWolfId = wolfGame?.wolf_order
    ? determineWolfForHole(wolfGame.wolf_order, currentHole)
    : null;
  const currentWolfPlayer = wolfGame?.participants.find((p) => p.id === currentWolfId);
  const otherWolfPlayers = wolfGame?.participants.filter((p) => p.id !== currentWolfId) ?? [];

  // Check if blind wolf can still be selected (no scores entered on this hole)
  const canSelectBlindWolf = useMemo(() => {
    if (!wolfGame || !currentPlayers.length) return true;
    // Check if any player has a score for current hole
    for (const player of currentPlayers) {
      const score = getPlayerScore(player.id, currentHole);
      if (score && typeof score === 'object' && 'strokes' in score && score.strokes > 0) {
        return false;
      }
    }
    return true;
  }, [wolfGame, currentPlayers, currentHole, getPlayerScore]);

  // Stats visibility (respects Premium tier)
  const { showFairwayHit, showGreenInRegulation } = useStatsVisibilityWithTier();

  // Data fetching hook
  const {
    courseName,
    courseId,
    courseTees,
    selectedTee,
    isTeamRound,
    teamFormat,
    gameType,
    teams,
    fetchError,
    isLoading: dataLoading,
    retryFetch,
    scoringPairsEnabled,
    playersToScore,
    ballCount,
    isSoloRound,
  } = useRoundData({ roundId, competitionId, currentUserId: user?.id });

  // Build-as-you-play hook
  const buildAsYouPlay = useBuildAsYouPlay({
    enabled: !!isBuildAsYouPlayParam,
    courseId: courseId ?? null,
    holes,
  });

  // Check hole 1 on initial load for build-as-you-play
  useEffect(() => {
    if (buildAsYouPlay.enabled && !dataLoading && holes.length > 0) {
      buildAsYouPlay.checkHoleBeforeNavigation(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once when data is ready
  }, [buildAsYouPlay.enabled, dataLoading, holes.length]);

  // Configure multi-ball mode when round data is loaded
  useEffect(() => {
    if (!dataLoading && ballCount > 1 && isSoloRound) {
      scoringLogger.info('MULTI-BALL: Configuring multi-ball mode', {
        ballCount,
        isSoloRound,
        roundId: roundId.substring(0, 8),
      });
      setMultiBallConfig(ballCount);
    }
  }, [dataLoading, ballCount, isSoloRound, setMultiBallConfig, roundId]);

  // Wrap setCurrentHole to intercept for build-as-you-play
  const interceptedSetCurrentHole = useCallback(
    (hole: number) => {
      if (buildAsYouPlay.enabled && !buildAsYouPlay.isHoleConfigured(hole)) {
        buildAsYouPlay.checkHoleBeforeNavigation(hole);
        return;
      }
      setCurrentHole(hole);
    },
    [buildAsYouPlay, setCurrentHole]
  );

  // Network status
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected ?? true;

  // Offline sync hook
  const { triggerSync } = useOfflineSync();

  // Navigation hook (uses intercepted setCurrentHole for build-as-you-play)
  const nav = useScorecardNavigation({
    navigation,
    currentHole,
    setCurrentHole: interceptedSetCurrentHole,
    pendingSyncCount,
    onLeaveAttempt: dialogs.openLeaveDialog,
    triggerSync,
  });

  // Submission hook
  const submission = useScorecardSubmission({
    navigation,
    roundId,
    competitionId,
    holes,
    playerCount: currentPlayers.length,
    getCompletedHolesCount,
    submitScorecards,
    resetRound,
    onIncompleteRound: dialogs.openIncompleteDialog,
    onSubmitError: dialogs.openSubmitErrorDialog,
    onCloseIncompleteDialog: dialogs.closeIncompleteDialog,
  });

  // Destructure dialog from submission hook for delete confirmation
  const { dialogConfig: submissionDialogConfig, dismissDialog: dismissSubmissionDialog } = submission;

  // Team scoring hook - pass skins processing for team formats
  const {
    selectedContributor,
    teamMatchPlayResults,
    playerScoresMap,
    setSelectedContributor,
    handleTeamScoreSelect,
    handleBestBallScoreSelect,
    handleTeamMatchPlayScoreSelect,
    getTeamScore,
    handleShotContributionsChange,
  } = useTeamScoring({
    teams,
    teamFormat,
    currentHole,
    players: currentPlayers,
    // Pass skins processing dependencies for team formats
    roundId,
    getHoleInfo,
    processSkinsHole,
  });

  // Mutation hook for updating course holes (super admin)
  const updateCourseHolesMutation = useUpdateCourseHoles();

  // Score handlers
  const handleScoreSelect = useCallback(
    async (playerId: string, strokes: number) => {
      const player = currentPlayers.find((p) => p.id === playerId);
      const holeData = getHoleInfo(currentHole);
      scoringLogger.info('SCORE ENTRY: Individual player score', {
        playerId: playerId.substring(0, 8),
        playerName: player?.name,
        hole: currentHole,
        strokes,
        holeInfo: holeData ? { par: holeData.par, si: holeData.strokeIndex } : null,
        scoredBy: user?.id?.substring(0, 8),
      });
      // Pass current user ID as scoredBy for mismatch detection attribution
      await setPlayerScore(playerId, currentHole, strokes, user?.id);

      // Process skins if applicable (non-blocking, runs in background)
      if (holeData) {
        // Convert Map to Record for skins processing
        const scorecardsRecord: Record<string, { [holeNumber: string]: { strokes: number } | number }> = {};
        // Get fresh state from store after score was saved
        const latestScorecards = useScorecardStore.getState().groupScorecards;
        latestScorecards.forEach((scorecard, pId) => {
          // Cast scores to expected type - runtime compatible even though TS types differ
          scorecardsRecord[pId] = scorecard.scores as unknown as { [holeNumber: string]: { strokes: number } | number };
        });

        processSkinsHole({
          roundId,
          holeNumber: currentHole,
          scorecards: scorecardsRecord,
          hole: { par: holeData.par, strokeIndex: holeData.strokeIndex },
        }).then((result) => {
          if (result.processed) {
            if (result.hasWinner) {
              scoringLogger.info('SKINS: Hole winner', {
                hole: currentHole,
                winner: result.winnerName,
                amount: result.winningsAmount,
              });
            } else if (result.carryoverAmount) {
              scoringLogger.info('SKINS: Hole tied, carryover', {
                hole: currentHole,
                carryover: result.carryoverAmount,
              });
            }
          }
        }).catch((error) => {
          // Non-blocking - log error but don't fail score entry
          scoringLogger.warn('SKINS: Processing error (non-blocking)', { error });
        });
      }
    },
    [currentHole, setPlayerScore, currentPlayers, getHoleInfo, roundId, processSkinsHole, user?.id]
  );

  const handleStatsUpdate = useCallback(
    async (playerId: string, updates: Partial<HoleScore>) => {
      const player = currentPlayers.find((p) => p.id === playerId);
      scoringLogger.info('STATS UPDATE: Player stats', {
        playerId: playerId.substring(0, 8),
        playerName: player?.name,
        hole: currentHole,
        updates,
      });
      await updatePlayerHoleScore(playerId, currentHole, updates);
    },
    [currentHole, updatePlayerHoleScore, currentPlayers]
  );

  // Multi-ball score handler
  const handleMultiBallScoreChange = useCallback(
    async (playerId: string, ballIndex: number, strokes: number) => {
      const player = currentPlayers.find((p) => p.id === playerId);
      scoringLogger.info('MULTI-BALL SCORE: Ball score entry', {
        playerId: playerId.substring(0, 8),
        playerName: player?.name,
        hole: currentHole,
        ballIndex,
        strokes,
      });
      await setMultiBallScore(playerId, currentHole, ballIndex, strokes);
    },
    [currentHole, setMultiBallScore, currentPlayers]
  );

  // Multi-ball stats handler (FIR/GIR)
  const handleMultiBallStatsChange = useCallback(
    async (playerId: string, ballIndex: number, updates: Partial<HoleScore>) => {
      const player = currentPlayers.find((p) => p.id === playerId);
      scoringLogger.info('MULTI-BALL STATS: Ball stats update', {
        playerId: playerId.substring(0, 8),
        playerName: player?.name,
        hole: currentHole,
        ballIndex,
        updates: Object.keys(updates),
      });
      await updateMultiBallStats(playerId, currentHole, ballIndex, updates);
    },
    [currentHole, updateMultiBallStats, currentPlayers]
  );

  const handlePlayerPress = useCallback(
    (playerId: string) => {
      navigation.navigate('PlayerScorecard', {
        playerId,
        roundId,
      });
    },
    [navigation, roundId]
  );

  // Wolf decision handler
  const handleWolfSelectPartner = useCallback(
    async (partnerId: string | null, isBlindWolf: boolean) => {
      if (!wolfGame) return;

      try {
        await submitWolfDecision.mutateAsync({
          wolf_game_id: wolfGame.id,
          hole_number: currentHole,
          is_blind_wolf: isBlindWolf,
          partner_id: partnerId,
        });
        setShowWolfDecisionModal(false);
        refetchWolfDecision();
        scoringLogger.info('WOLF: Decision submitted', {
          hole: currentHole,
          isBlindWolf,
          partnerId: partnerId?.substring(0, 8) ?? 'lone',
        });
      } catch (error) {
        scoringLogger.error('WOLF: Failed to submit decision', { error });
      }
    },
    [wolfGame, currentHole, submitWolfDecision, refetchWolfDecision]
  );

  // Wolf result processing - called after scores are complete
  const processWolfHoleResult = useCallback(async () => {
    if (!wolfGame || !wolfDecision?.decided_at || wolfDecision.calculated_at) return;

    // Check if all players have scores for this hole
    const allHaveScores = wolfGame.participant_ids.every((playerId) => {
      const score = getPlayerScore(playerId, currentHole);
      return score && typeof score === 'object' && 'strokes' in score && score.strokes > 0;
    });

    if (!allHaveScores) return;

    // Build hole scores map
    const holeScores: Record<string, number> = {};
    for (const playerId of wolfGame.participant_ids) {
      const score = getPlayerScore(playerId, currentHole);
      if (score && typeof score === 'object' && 'strokes' in score) {
        holeScores[playerId] = score.strokes;
      }
    }

    try {
      await recordWolfHoleResult.mutateAsync({
        wolf_game_id: wolfGame.id,
        hole_number: currentHole,
        hole_scores: holeScores,
      });
      refetchWolfDecision();
      scoringLogger.info('WOLF: Hole result calculated', {
        hole: currentHole,
        scores: holeScores,
      });
    } catch (error) {
      scoringLogger.error('WOLF: Failed to calculate result', { error });
    }
  }, [wolfGame, wolfDecision, currentHole, getPlayerScore, recordWolfHoleResult, refetchWolfDecision]);

  // Process Wolf result when scores are complete
  useEffect(() => {
    if (wolfGame && wolfDecision?.decided_at && !wolfDecision.calculated_at) {
      processWolfHoleResult();
    }
  }, [wolfGame, wolfDecision, processWolfHoleResult]);

  const handleViewScorecard = useCallback(() => {
    if (currentPlayers.length === 1) {
      navigation.navigate('PlayerScorecard', {
        playerId: currentPlayers[0].id,
        roundId,
      });
    } else {
      navigation.navigate('ReviewScorecard', {
        roundId,
        competitionId,
        holes,
      });
    }
  }, [navigation, roundId, competitionId, holes, currentPlayers]);

  // Get current hole data (needed for handlers and rendering)
  const currentHoleData = getHoleInfo(currentHole);

  // Build-as-you-play save handler
  const handleBuildAsYouPlaySave = useCallback(
    async (updatedHole: Hole) => {
      await buildAsYouPlay.handleSaveHoleSetup(updatedHole);
      // After save, navigate to the hole that was pending
      if (buildAsYouPlay.pendingHoleNumber) {
        setCurrentHole(buildAsYouPlay.pendingHoleNumber);
      }
    },
    [buildAsYouPlay, setCurrentHole]
  );

  // Super admin hole editing handlers
  const handleEditHole = useCallback(() => {
    if (isSuperAdmin && currentHoleData) {
      setEditingHole(currentHoleData);
    }
  }, [isSuperAdmin, currentHoleData]);

  const handleSaveHole = useCallback(
    async (updatedHole: Hole) => {
      if (!courseId) return;

      // Update the holes array with the edited hole
      const updatedHoles = holes.map((h) =>
        h.number === updatedHole.number ? updatedHole : h
      );

      try {
        // Update in database
        await updateCourseHolesMutation.mutateAsync({
          courseId,
          holes: updatedHoles,
        });

        // Update local scorecard store for immediate UI update
        useScorecardStore.getState().updateHoles(updatedHoles);

        // Close the modal
        setEditingHole(null);
      } catch (error) {
        scoringLogger.error('Failed to save hole data', { error });
        // Error handling is done via mutation's onError
      }
    },
    [courseId, holes, updateCourseHolesMutation]
  );

  // Handle leave confirm with dialog close
  const handleLeaveConfirm = useCallback(() => {
    dialogs.closeLeaveDialog();
    nav.handleLeaveConfirm();
  }, [dialogs, nav]);

  const isLoading = storeLoading || dataLoading;

  // Determine which players to render
  const playersToRender =
    scoringPairsEnabled && playersToScore.length > 0 ? playersToScore : currentPlayers;

  // Check if holes are available (defensive check for edge cases)
  const hasHoles = holes.length > 0;

  // Render content for any hole number (used by SwipeableHoleNavigator for transitions)
  const renderHoleContent = useCallback(
    (holeNumber: number) => {
      const holeData = getHoleInfo(holeNumber);
      if (!holeData) return null;

      // Calculate navigation state for this hole
      const canGoPrev = holeNumber > 1;
      const canGoNext = holeNumber < 18;

      return (
        <View style={styles.contentArea}>
          <HoleHeader
            hole={holeData}
            selectedTee={selectedTee ?? undefined}
            onPrevious={nav.handlePreviousHole}
            onNext={nav.handleNextHole}
            canGoPrevious={canGoPrev}
            canGoNext={canGoNext}
            onHolePress={handleViewScorecard}
            isSuperAdmin={isSuperAdmin}
            onEditHole={handleEditHole}
          />

          <ScrollView
            style={styles.playersContainer}
            contentContainerStyle={styles.playersContent}
            showsVerticalScrollIndicator={false}
          >
            <ScorecardScoreContent
              currentHoleData={holeData}
              currentHole={holeNumber}
              holes={holes}
              gameType={gameType}
              currentPlayers={currentPlayers}
              playersToScore={playersToScore}
              scoringPairsEnabled={scoringPairsEnabled}
              currentUserId={user?.id}
              isTeamRound={isTeamRound}
              teamFormat={teamFormat}
              teams={teams}
              onScoreSelect={handleScoreSelect}
              onStatsUpdate={handleStatsUpdate}
              onPlayerPress={handlePlayerPress}
              getPlayerScore={getPlayerScore}
              getTeamScore={getTeamScore}
              handleTeamScoreSelect={handleTeamScoreSelect}
              handleBestBallScoreSelect={handleBestBallScoreSelect}
              handleTeamMatchPlayScoreSelect={handleTeamMatchPlayScoreSelect}
              setSelectedContributor={setSelectedContributor}
              selectedContributor={selectedContributor}
              teamMatchPlayResults={teamMatchPlayResults}
              playerScoresMap={playerScoresMap}
              handleShotContributionsChange={handleShotContributionsChange}
              // Multi-ball props
              isMultiBall={isMultiBall}
              ballCount={storeBallCount}
              onMultiBallScoreChange={handleMultiBallScoreChange}
              onMultiBallStatsChange={handleMultiBallStatsChange}
              getMultiBallScores={getMultiBallScores}
              // Stats visibility (Premium-only)
              showFIR={showFairwayHit}
              showGIR={showGreenInRegulation}
              // Wolf game props
              wolfGame={wolfGame}
              wolfDecision={wolfDecision}
              onWolfChoosePartner={() => setShowWolfDecisionModal(true)}
              isWolfProcessing={submitWolfDecision.isPending || recordWolfHoleResult.isPending}
            />

            {/* Quick Scorecard View - only show for individual scoring */}
            {!isTeamRound && (
              <View style={styles.quickViewContainer}>
                <QuickScorecardView
                  holes={holes}
                  currentHole={holeNumber}
                  players={playersToRender}
                  getPlayerHoleScore={getPlayerScore}
                  isHoleComplete={isHoleComplete}
                  onHolePress={nav.handleHolePress}
                  onScrollingChange={setIsQuickViewScrolling}
                />
              </View>
            )}
          </ScrollView>
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleShotContributionsChange excluded to prevent infinite re-renders
    [
      getHoleInfo,
      courseId,
      selectedTee,
      nav.handlePreviousHole,
      nav.handleNextHole,
      handleViewScorecard,
      isSuperAdmin,
      handleEditHole,
      currentPlayers,
      playersToScore,
      scoringPairsEnabled,
      user?.id,
      isTeamRound,
      teamFormat,
      gameType,
      teams,
      handleScoreSelect,
      handleStatsUpdate,
      handlePlayerPress,
      getPlayerScore,
      getTeamScore,
      handleTeamScoreSelect,
      handleBestBallScoreSelect,
      handleTeamMatchPlayScoreSelect,
      setSelectedContributor,
      selectedContributor,
      teamMatchPlayResults,
      playerScoresMap,
      isMultiBall,
      storeBallCount,
      handleMultiBallScoreChange,
      handleMultiBallStatsChange,
      getMultiBallScores,
      showFairwayHit,
      showGreenInRegulation,
      holes,
      playersToRender,
      isHoleComplete,
      nav.handleHolePress,
      // Wolf dependencies
      wolfGame,
      wolfDecision,
      submitWolfDecision.isPending,
      recordWolfHoleResult.isPending,
    ]
  );

  // Loading state - also wait if initialized but holes are empty (race condition safeguard)
  if (isLoading || (!isInitialized && !fetchError) || (isInitialized && !hasHoles && !fetchError)) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner size="lg" message="Loading scorecard..." />
      </SafeAreaView>
    );
  }

  // Fetch error state
  if (fetchError) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Unable to Load Scorecard
        </Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{fetchError}</Text>
        <View style={styles.errorButtons}>
          <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.errorButton}>
            Go Back
          </Button>
          <Button mode="contained" onPress={retryFetch} style={styles.errorButton}>
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // No hole data state
  if (!currentHoleData) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Failed to load hole data
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      {/* Header with offline indicator, skins indicator, and sync line */}
      <ScorecardHeader
        courseName={courseName ?? undefined}
        selectedTee={courseTees.find((t) => t.color?.toLowerCase() === selectedTee) ?? null}
        onBack={nav.handleBackPress}
        onDeletePress={submission.handleDeleteRound}
        isStandaloneRound={isStandaloneRound}
        roundId={roundId}
        courseId={courseId ?? undefined}
        currentHole={currentHole}
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingSyncCount={pendingSyncCount}
        onSyncPress={triggerSync}
        scoringPairsEnabled={scoringPairsEnabled}
        playersToScore={playersToScore}
      />

      {/* Content Area with Swipe Navigation */}
      <SwipeableHoleNavigator
        currentHole={currentHole}
        totalHoles={18}
        onHoleChange={interceptedSetCurrentHole}
        enabled={!isSyncing && !isLoading && !isQuickViewScrolling}
        renderHole={renderHoleContent}
      />

      {/* Footer with navigation buttons */}
      <ScorecardFooter
        currentHole={currentHole}
        onPreviousHole={nav.handlePreviousHole}
        onNextHole={nav.handleNextHole}
        onViewScorecard={handleViewScorecard}
        canGoPrevious={nav.canGoPrevious}
        canGoNext={nav.canGoNext}
        isAllComplete={getCompletedHolesCount() === holes.length && holes.length > 0}
      />

      {/* All dialogs */}
      <ScorecardDialogs
        showLeaveDialog={dialogs.showLeaveDialog}
        pendingSyncCount={pendingSyncCount}
        onLeaveConfirm={handleLeaveConfirm}
        onLeaveCancel={dialogs.closeLeaveDialog}
        showIncompleteDialog={dialogs.showIncompleteDialog}
        completedHolesCount={dialogs.completedHolesCount}
        onIncompleteConfirm={submission.performSubmit}
        onIncompleteCancel={dialogs.closeIncompleteDialog}
        showSubmitErrorDialog={dialogs.showSubmitErrorDialog}
        onSubmitErrorDismiss={dialogs.closeSubmitErrorDialog}
      />

      {/* Super admin hole editing modal */}
      {editingHole && (
        <EditHoleBottomSheet
          visible={!!editingHole}
          onClose={() => setEditingHole(null)}
          hole={editingHole}
          allHoles={holes}
          courseTees={courseTees}
          selectedTee={selectedTee}
          onSave={handleSaveHole}
          loading={updateCourseHolesMutation.isPending}
        />
      )}

      {/* Build-as-you-play hole setup modal */}
      {buildAsYouPlay.enabled && buildAsYouPlay.pendingHoleNumber && (
        <BuildCourseHoleModal
          visible={buildAsYouPlay.showHoleSetupModal}
          holeNumber={buildAsYouPlay.pendingHoleNumber}
          selectedTeeName={buildAsYouPlay.selectedTeeName}
          usedStrokeIndexes={buildAsYouPlay.usedStrokeIndexes}
          isSaving={buildAsYouPlay.isSaving}
          onSave={handleBuildAsYouPlaySave}
          onSelectTee={buildAsYouPlay.handleSelectTee}
        />
      )}

      {/* Wolf Decision Modal */}
      {wolfGame && currentWolfPlayer && (
        <WolfDecisionModal
          visible={showWolfDecisionModal}
          onDismiss={() => setShowWolfDecisionModal(false)}
          wolfGame={wolfGame}
          currentHole={currentHole}
          wolfId={currentWolfPlayer.id}
          wolfName={currentWolfPlayer.name}
          otherPlayers={otherWolfPlayers}
          blindWolfEnabled={wolfGame.blind_wolf_enabled}
          canSelectBlindWolf={canSelectBlindWolf}
          onSelectPartner={handleWolfSelectPartner}
        />
      )}

      {/* Submission confirmation/error dialog */}
      <ConfirmationDialog {...submissionDialogConfig} onCancel={dismissSubmissionDialog} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  errorButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  errorButton: {
    minWidth: 100,
  },
  playersContainer: {
    flex: 1,
  },
  playersContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  quickViewContainer: {
    marginTop: spacing.lg,
  },
});

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
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useNetInfo } from '@react-native-community/netinfo';
import { LoadingSpinner, ConfirmationDialog } from '@/components/common';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScorecardStore } from '@/store/scorecardStore';
import { useStatsVisibilityWithTier } from '@/hooks/useStatsVisibilityWithTier';
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { useIsSocial } from '@/context/SubscriptionContext';
import { useOfflineSync, useRoundData, useTeamScoring, useBuildAsYouPlay } from '@/hooks/scorecard';
import {
  QuickScorecardView,
  HoleHeader,
  SwipeableHoleNavigator,
} from '@/components/scorecard';
import { EditHoleBottomSheet, BuildCourseHoleModal } from '@/components/courses';
import { DetailedStatsSheet } from '@/components/scorecard/DetailedStatsSheet';
import { WolfDecisionModal } from '@/components/wolf';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation/types';
import type { Hole } from '@/types';
import { calculatePlayingHandicap } from '@/hooks/usePlayingHandicap';
import { resolvePlayerTee } from '@/utils/teeResolution';
import { getTeeColor } from '@/services/courses';

// Local hooks and components
import {
  useScorecardDialogs,
  useScorecardNavigation,
  useScorecardSubmission,
  useWolfIntegration,
  useScoreHandlers,
} from './hooks';
import {
  ScorecardHeader,
  ScorecardFooter,
  ScorecardDialogs,
  ScorecardScoreContent,
} from './components';
import type { PlayerHandicapDisplay } from './components/ScorecardScoreContent';

type Props = RootStackScreenProps<'Scorecard'>;

export default function ScorecardEntryScreen({ navigation, route }: Props) {
  const { roundId, competitionId, isBuildAsYouPlay: isBuildAsYouPlayParam } = route.params;
  const colors = useThemeColors();
  const { user } = useAuth();
  const isStandaloneRound = competitionId === 'standalone';
  const isSuperAdmin = useIsSuperAdmin();
  const [editingHole, setEditingHole] = useState<Hole | null>(null);
  const [detailedStatsPlayerId, setDetailedStatsPlayerId] = useState<string | null>(null);
  const [isQuickViewScrolling, setIsQuickViewScrolling] = useState(false);

  // Dialog state management
  const dialogs = useScorecardDialogs();

  // Core scorecard store
  const {
    currentHole,
    currentPlayers,
    holes,
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
    selectedTeeData,
    handicapSource,
    playerTeeMap,
  } = useScorecardStore();

  // Stats visibility (respects Premium tier)
  const statsVisibility = useStatsVisibilityWithTier();
  const { showFairwayHit, showGreenInRegulation } = statsVisibility;
  const isSocial = useIsSocial();

  // Pre-compute daily handicap + display info for each player (Social tier+), using per-player tees
  const playerHandicapMap = useMemo(() => {
    const map = new Map<string, PlayerHandicapDisplay>();
    for (const player of currentPlayers) {
      const playerTee = playerTeeMap.get(player.id) || selectedTeeData;
      const result = calculatePlayingHandicap({
        player,
        selectedTeeData: playerTee,
        holes,
        handicapSource,
        gameType: undefined, // Game type allowance applied separately per format
        applyDailyHandicap: isSocial,
      });
      map.set(player.id, {
        playingHandicap: result.playingHandicap,
        dailyHandicap: result.isDailyHandicap ? result.dailyHandicap : null,
        baseHandicap: result.baseHandicap,
        baseLabel: handicapSource === 'calculated' ? 'SHC' : 'HC',
      });
    }
    return map;
  }, [currentPlayers, playerTeeMap, selectedTeeData, holes, handicapSource, isSocial]);

  // Show tee color dots next to player names (always when tee data is available)
  const showTeeDots = selectedTeeData != null || playerTeeMap.size > 0;

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
      setMultiBallConfig(ballCount);
    }
  }, [dataLoading, ballCount, isSoloRound, setMultiBallConfig]);

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

  // Navigation hook
  const nav = useScorecardNavigation({
    navigation,
    currentHole,
    setCurrentHole: interceptedSetCurrentHole,
    holes,
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

  const { dialogConfig: submissionDialogConfig, dismissDialog: dismissSubmissionDialog } = submission;

  // Wolf integration
  const wolf = useWolfIntegration({
    roundId,
    currentHole,
    currentPlayers,
    getPlayerScore,
  });

  // Score handlers
  const scoreHandlers = useScoreHandlers({
    roundId,
    competitionId,
    currentHole,
    currentPlayers,
    holes,
    courseId,
    isSuperAdmin,
    userId: user?.id,
    navigation,
    setPlayerScore,
    updatePlayerHoleScore,
    setMultiBallScore,
    updateMultiBallStats,
    getHoleInfo,
    buildAsYouPlay,
    setCurrentHole,
  });

  // Team scoring hook
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
    roundId,
    getHoleInfo,
    processSkinsHole: undefined as never, // Skins processing is handled in useScoreHandlers
  });

  const isLoading = storeLoading || dataLoading;
  const playersToRender =
    scoringPairsEnabled && playersToScore.length > 0 ? playersToScore : currentPlayers;
  const hasHoles = holes.length > 0;
  const currentHoleData = getHoleInfo(currentHole);

  // Render content for any hole number (used by SwipeableHoleNavigator for transitions)
  const renderHoleContent = useCallback(
    (holeNumber: number) => {
      const holeData = getHoleInfo(holeNumber);
      if (!holeData) return null;

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
            onHolePress={scoreHandlers.handleViewScorecard}
            isSuperAdmin={isSuperAdmin}
            onEditHole={() => {
              const hole = scoreHandlers.handleEditHole();
              if (hole) setEditingHole(hole);
            }}
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
              onScoreSelect={scoreHandlers.handleScoreSelect}
              onStatsUpdate={scoreHandlers.handleStatsUpdate}
              onPlayerPress={scoreHandlers.handlePlayerPress}
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
              isMultiBall={isMultiBall}
              ballCount={storeBallCount}
              onMultiBallScoreChange={scoreHandlers.handleMultiBallScoreChange}
              onMultiBallStatsChange={scoreHandlers.handleMultiBallStatsChange}
              getMultiBallScores={getMultiBallScores}
              showFIR={showFairwayHit}
              showGIR={showGreenInRegulation}
              playerHandicapMap={playerHandicapMap}
              showTeeDots={showTeeDots}
              playerTeeMap={playerTeeMap}
              selectedTeeData={selectedTeeData}
              wolfGame={wolf.wolfGame}
              wolfDecision={wolf.wolfDecision}
              onWolfChoosePartner={() => wolf.setShowWolfDecisionModal(true)}
              isWolfProcessing={wolf.isWolfProcessing}
              onDetailedStatsPress={(playerId) => setDetailedStatsPlayerId(playerId)}
              isSoloRound={isSoloRound}
            />

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
      getHoleInfo, selectedTee, nav.handlePreviousHole, nav.handleNextHole,
      scoreHandlers.handleViewScorecard, isSuperAdmin, scoreHandlers.handleEditHole,
      currentPlayers, playersToScore, scoringPairsEnabled, user?.id,
      isTeamRound, teamFormat, gameType, teams,
      scoreHandlers.handleScoreSelect, scoreHandlers.handleStatsUpdate, scoreHandlers.handlePlayerPress,
      getPlayerScore, getTeamScore, handleTeamScoreSelect, handleBestBallScoreSelect,
      handleTeamMatchPlayScoreSelect, setSelectedContributor, selectedContributor,
      teamMatchPlayResults, playerScoresMap,
      isMultiBall, storeBallCount, scoreHandlers.handleMultiBallScoreChange,
      scoreHandlers.handleMultiBallStatsChange, getMultiBallScores,
      showFairwayHit, showGreenInRegulation, holes, playersToRender, isHoleComplete,
      nav.handleHolePress, wolf.wolfGame, wolf.wolfDecision, wolf.isWolfProcessing,
      showTeeDots, playerTeeMap, selectedTeeData,
    ]
  );

  // Loading state
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
          <TouchableOpacity
            style={[styles.errorButton, styles.errorButtonOutlined, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={[styles.errorButtonLabel, { color: colors.textPrimary }]}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.errorButton, styles.errorButtonContained, { backgroundColor: colors.primary }]}
            onPress={retryFetch}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={[styles.errorButtonLabel, { color: colors.white }]}>Retry</Text>
          </TouchableOpacity>
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
        <TouchableOpacity
          style={[styles.errorButtonContained, { backgroundColor: colors.primary, minWidth: 100, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.lg }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={[styles.errorButtonLabel, { color: colors.white }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
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

      {buildAsYouPlay.enabled && (
        <View style={[styles.buildProgressContainer, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.buildProgressText, { color: colors.textSecondary }]}>
            {buildAsYouPlay.configuredCount}/{holes.length} holes set up
          </Text>
        </View>
      )}

      <SwipeableHoleNavigator
        currentHole={currentHole}
        totalHoles={18}
        onHoleChange={interceptedSetCurrentHole}
        enabled={!isSyncing && !isLoading && !isQuickViewScrolling}
        renderHole={renderHoleContent}
      />

      <ScorecardFooter
        currentHole={currentHole}
        onPreviousHole={nav.handlePreviousHole}
        onNextHole={nav.handleNextHole}
        onViewScorecard={scoreHandlers.handleViewScorecard}
        canGoPrevious={nav.canGoPrevious}
        canGoNext={nav.canGoNext}
        isAllComplete={getCompletedHolesCount() === holes.length && holes.length > 0}
      />

      <ScorecardDialogs
        showIncompleteDialog={dialogs.showIncompleteDialog}
        completedHolesCount={dialogs.completedHolesCount}
        onIncompleteConfirm={submission.performSubmit}
        onIncompleteCancel={dialogs.closeIncompleteDialog}
        showSubmitErrorDialog={dialogs.showSubmitErrorDialog}
        onSubmitErrorDismiss={dialogs.closeSubmitErrorDialog}
      />

      {editingHole && (
        <EditHoleBottomSheet
          visible={!!editingHole}
          onClose={() => setEditingHole(null)}
          hole={editingHole}
          allHoles={holes}
          courseTees={courseTees}
          selectedTee={selectedTee}
          onSave={scoreHandlers.handleSaveHole}
          loading={scoreHandlers.isHoleSaving}
        />
      )}

      {buildAsYouPlay.enabled && buildAsYouPlay.pendingHoleNumber && (
        <BuildCourseHoleModal
          visible={buildAsYouPlay.showHoleSetupModal}
          holeNumber={buildAsYouPlay.pendingHoleNumber}
          selectedTeeName={buildAsYouPlay.selectedTeeName}
          usedStrokeIndexes={buildAsYouPlay.usedStrokeIndexes}
          isSaving={buildAsYouPlay.isSaving}
          saveError={buildAsYouPlay.saveError}
          onSave={scoreHandlers.handleBuildAsYouPlaySave}
          onSelectTee={buildAsYouPlay.handleSelectTee}
        />
      )}

      {wolf.wolfGame && wolf.currentWolfPlayer && (
        <WolfDecisionModal
          visible={wolf.showWolfDecisionModal}
          onDismiss={() => wolf.setShowWolfDecisionModal(false)}
          wolfGame={wolf.wolfGame}
          currentHole={currentHole}
          wolfId={wolf.currentWolfPlayer.id}
          wolfName={wolf.currentWolfPlayer.name}
          otherPlayers={wolf.otherWolfPlayers}
          blindWolfEnabled={wolf.wolfGame.blind_wolf_enabled}
          canSelectBlindWolf={wolf.canSelectBlindWolf}
          onSelectPartner={wolf.handleWolfSelectPartner}
        />
      )}

      {/* Detailed Stats Sheet — hoisted to screen level for proper layering */}
      {detailedStatsPlayerId && (() => {
        const activePlayer = currentPlayers.find((p) => p.id === detailedStatsPlayerId);
        const activeScore = getPlayerScore(detailedStatsPlayerId, currentHole);
        const singleScore = activeScore && 'strokes' in activeScore && !('balls' in activeScore) ? activeScore : undefined;
        return (
          <DetailedStatsSheet
            visible={!!detailedStatsPlayerId}
            onClose={() => setDetailedStatsPlayerId(null)}
            holeNumber={currentHole}
            playerName={activePlayer?.name || 'Player'}
            score={singleScore}
            onStatsUpdate={(updates) => {
              scoreHandlers.handleStatsUpdate(detailedStatsPlayerId, updates);
            }}
            showFairwayMissDirection={statsVisibility.showFairwayMissDirection}
            showGreenMissDirection={statsVisibility.showGreenMissDirection}
            showBunkerShots={statsVisibility.showBunkerShots}
            showHazards={statsVisibility.showHazards}
          />
        );
      })()}

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
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  errorButtonOutlined: {
    borderWidth: 1,
  },
  errorButtonContained: {
    // backgroundColor set inline
  },
  errorButtonLabel: {
    ...typography.bodyBold,
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
  buildProgressContainer: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  buildProgressText: {
    ...typography.caption,
  },
});

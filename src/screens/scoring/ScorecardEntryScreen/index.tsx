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

import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useNetInfo } from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { activeRoundSession } from '@/services/activeRoundSession';
import { pushDiagnostic } from '@/services/diagnostics';
import { LoadingSpinner, ConfirmationDialog } from '@/components/common';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScorecardStore } from '@/store/scorecardStore';
import { useStatsVisibilityWithTier } from '@/hooks/useStatsVisibilityWithTier';
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { useOfflineSync, useRoundData, useTeamScoring, useBuildAsYouPlay, useGroupFilter, useActiveSubMatch } from '@/hooks/scorecard';
import { usePairings, useTeams as useCompetitionTeams } from '@/hooks/rounds';
import {
  QuickScorecardView,
  HoleHeader,
  SwipeableHoleNavigator,
  GroupFilterStrip,
} from '@/components/scorecard';
import { EditHoleBottomSheet, BuildCourseHoleModal } from '@/components/courses';
import { InlineShotToast } from '@/components/scorecard/ShotLogging';
import { DetailedStatsSheet } from '@/components/scorecard/DetailedStatsSheet';
import { WolfDecisionModal } from '@/components/wolf';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks';
import type { RootStackScreenProps } from '@/navigation/types';
import type { Hole } from '@/types';
import { isSingleBallScore } from '@/types/database';
import { calculatePlayingHandicap } from '@/hooks/usePlayingHandicap';
import { useApplyAutoTeeOverrides } from '@/hooks/useApplyAutoTeeOverrides';
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
import { RoundHeader } from '@/components/scorecard';
import {
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

  // Diagnostic: log every time the screen mounts. Combined with the
  // `scorecard.spinner_*` events lower down, this gives a timeline of the
  // resume flow on production builds where console logs aren't visible.
  useEffect(() => {
    pushDiagnostic('scorecard.mounted', {
      roundId,
      competitionId,
      isBuildAsYouPlay: isBuildAsYouPlayParam,
      hasUser: !!user?.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only diagnostic
  }, []);
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
    startHole,
    currentRoundId,
    setAllowedPlayers,
  } = useScorecardStore();

  // Stats visibility (respects Premium tier)
  const statsVisibility = useStatsVisibilityWithTier();
  const { showFairwayHit, showGreenInRegulation } = statsVisibility;
  // Aggregate flag for components (e.g. BestBallScoreView) that need a single
  // signal to hide the stats action when no detailed-stats fields are visible
  // for the user's tier.
  const anyStatsVisible =
    statsVisibility.showPutts ||
    showFairwayHit ||
    showGreenInRegulation ||
    statsVisibility.showBunkerShots ||
    statsVisibility.showHazards ||
    statsVisibility.showFairwayMissDirection ||
    statsVisibility.showGreenMissDirection;

  // Pre-compute daily handicap + display info for each player, using per-player tees.
  // Built across the full roster (not the sub-match-scoped slice) so cached
  // entries stay consistent even when the user navigates between sub-matches.
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
      });
      map.set(player.id, {
        playingHandicap: result.playingHandicap,
        dailyHandicap: result.isDailyHandicap ? result.dailyHandicap : null,
        baseHandicap: result.baseHandicap,
        baseLabel: handicapSource === 'calculated' ? 'SHC' : 'HC',
      });
    }
    return map;
  }, [currentPlayers, playerTeeMap, selectedTeeData, holes, handicapSource]);

  // Show tee color dots next to player names (always when tee data is available)
  const showTeeDots = selectedTeeData != null || playerTeeMap.size > 0;

  // Data fetching hook
  const {
    courseName,
    clubName,
    courseId,
    courseTees,
    selectedTee,
    isTeamRound,
    teamFormat,
    roundFormat,
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

  // Pre-populate per-hole tee origin overrides based on the player's chosen
  // tee box. Maps the round's selected tee to the most accurate origin
  // (custom tee → back/front POI → default to back). Idempotent — never
  // overwrites a manual choice the user has already set on a hole map.
  // Per-player tee wins over the round default so co-scoring rounds set
  // the override against the *current user's* tee.
  const playerTeeForAutoOverride = user?.id
    ? playerTeeMap.get(user.id) ?? selectedTeeData
    : selectedTeeData;
  useApplyAutoTeeOverrides(roundId, courseId, playerTeeForAutoOverride, holes);

  // Split team rounds (round_format='split') break the round into independent
  // sub-matches (e.g. a 2v2 better-ball with two cross-team pairs). Each user
  // should only see and score the players in their own sub-match — not the
  // full team roster. The lookup is shared with TeamMatchPlayScoringScreen
  // via useActiveSubMatch so the resolution logic stays in one place.
  const isSplitRound = roundFormat === 'split';
  const { activePlayerIds } = useActiveSubMatch({
    roundId,
    enabled: isSplitRound,
    currentPlayerId: user?.id,
  });

  // Sub-match-scoped projections of the round-level data. When there's no
  // active sub-match (combined round, or split round still loading), these
  // pass through unchanged.
  const scopedCurrentPlayers = useMemo(
    () =>
      activePlayerIds
        ? currentPlayers.filter((p) => activePlayerIds.has(p.id))
        : currentPlayers,
    [currentPlayers, activePlayerIds]
  );

  const scopedPlayersToScore = useMemo(
    () =>
      activePlayerIds
        ? playersToScore.filter((p) => activePlayerIds.has(p.id))
        : playersToScore,
    [playersToScore, activePlayerIds]
  );

  // Filter team rosters down to the active sub-match so the per-team
  // best-ball / shamble / scramble blocks only render the relevant players.
  // Empty teams (where no member is in this sub-match) are dropped.
  const scopedTeams = useMemo(() => {
    if (!activePlayerIds || teams.length === 0) return teams;
    return teams
      .map((t) => ({
        ...t,
        members: (t.members ?? []).filter((m) => activePlayerIds.has(m.player_id)),
      }))
      .filter((t) => (t.members ?? []).length > 0);
  }, [teams, activePlayerIds]);

  // Competition teams (used to label individual score cards with team names
  // even on non-team rounds like singles match play, where round-level
  // `teams` is empty but players still belong to competition teams).
  const competitionTeamsQuery = useCompetitionTeams(
    !isStandaloneRound && competitionId ? competitionId : ''
  );
  const competitionTeams = competitionTeamsQuery.data ?? [];

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

  // Resume-to-first-incomplete-hole logic lives below `playersToRender` so
  // it can be group-aware (only considers the user's playing group, not all
  // 8 players of a multi-pairing round).
  const resumeAppliedRef = useRef<string | null>(null);

  // Configure multi-ball mode when round data is loaded
  useEffect(() => {
    if (!dataLoading && ballCount > 1 && isSoloRound) {
      setMultiBallConfig(ballCount);
    }
  }, [dataLoading, ballCount, isSoloRound, setMultiBallConfig]);

  // Persist active scoring session so we can resume on cold start.
  // Re-set on every focus (covers returning from PlayerScorecard / ReviewScorecard).
  // Cleared explicitly by submit/back/delete handlers.
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      void activeRoundSession.set({
        roundId,
        competitionId,
        isBuildAsYouPlay: isBuildAsYouPlayParam,
        userId: user.id,
      });
    }, [roundId, competitionId, isBuildAsYouPlayParam, user?.id])
  );

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
    roundId,
    competitionId,
    isStandaloneRound,
  });

  // Submission hook. For split rounds the "player count" reflects the
  // sub-match scope so the incomplete-holes dialog totals match what the
  // user actually sees on screen.
  const submission = useScorecardSubmission({
    navigation,
    roundId,
    competitionId,
    holes,
    playerCount: scopedCurrentPlayers.length,
    getCompletedHolesCount,
    submitScorecards,
    resetRound,
    onIncompleteRound: dialogs.openIncompleteDialog,
    onSubmitError: dialogs.openSubmitErrorDialog,
    onCloseIncompleteDialog: dialogs.closeIncompleteDialog,
  });

  const { dialogConfig: submissionDialogConfig, dismissDialog: dismissSubmissionDialog } = submission;

  // Wolf integration. Wolf is a per-group side game; for split team rounds
  // it stays bounded to the active sub-match.
  const wolf = useWolfIntegration({
    roundId,
    currentHole,
    currentPlayers: scopedCurrentPlayers,
    getPlayerScore,
  });

  // Score handlers — scoped to the active sub-match so skins / quick-jump /
  // editing actions only touch players the user is actually scoring.
  const scoreHandlers = useScoreHandlers({
    roundId,
    competitionId,
    currentHole,
    currentPlayers: scopedCurrentPlayers,
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

  // Team scoring hook — receives sub-match-scoped teams and players so
  // best-ball / scramble / shamble aggregations only consider the players
  // actually playing in this sub-match.
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
    teams: scopedTeams,
    teamFormat,
    currentHole,
    players: scopedCurrentPlayers,
    roundId,
    getHoleInfo,
    processSkinsHole: undefined as never, // Skins processing is handled in useScoreHandlers
  });

  const isLoading = storeLoading || dataLoading;

  // Group filter: when scoring pairs is off and the round has multiple pairings,
  // default to scoring just the signed-in user's playing group. For split
  // rounds the sub-match scope is a stricter filter, so the group strip is
  // suppressed there to avoid stacking two different "subset" indicators.
  const { data: pairings } = usePairings(roundId);
  const groupFilter = useGroupFilter({
    currentUserId: user?.id,
    currentPlayers: scopedCurrentPlayers,
    pairings,
    scoringPairsEnabled: scoringPairsEnabled || !!activePlayerIds,
  });

  const playersToRender =
    scoringPairsEnabled && scopedPlayersToScore.length > 0
      ? scopedPlayersToScore
      : groupFilter.groupPlayers;
  const hasHoles = holes.length > 0;
  const currentHoleData = getHoleInfo(currentHole);

  // Resume to the first hole that's incomplete for the user's playing scope.
  // Runs once per round so user navigation isn't overridden mid-round.
  // Build-as-you-play has its own per-hole prompts and is skipped here.
  useEffect(() => {
    if (buildAsYouPlay.enabled) return;
    if (resumeAppliedRef.current === roundId) return;
    if (!isInitialized || dataLoading || holes.length === 0) return;
    if (playersToRender.length === 0) return;

    resumeAppliedRef.current = roundId;

    const sortedHoles = [...holes].sort((a, b) => a.number - b.number);
    let resumeHole = sortedHoles[sortedHoles.length - 1].number;
    for (const h of sortedHoles) {
      const allScored = playersToRender.every((player) => {
        const sc = useScorecardStore.getState().groupScorecards.get(player.id);
        const score = sc?.scores[h.number];
        if (!score) return false;
        return isSingleBallScore(score)
          ? score.strokes !== undefined
          : (score.balls?.length ?? 0) > 0;
      });
      if (!allScored) {
        resumeHole = h.number;
        break;
      }
    }

    if (resumeHole !== currentHole) {
      setCurrentHole(resumeHole);
    }
  }, [roundId, isInitialized, dataLoading, holes, playersToRender, currentHole, setCurrentHole, buildAsYouPlay.enabled]);

  // Narrow the store's `allowedPlayerIds` to the active sub-match so
  // completion checks (isHoleComplete, validateScores) match what the user
  // can actually score. useRoundData already sets this for the scoring-pair
  // case; this effect runs after and intersects the two scopes when both
  // apply. Cleared back to the scoring-pair default when the sub-match
  // scope disappears (e.g. data becomes unavailable).
  useEffect(() => {
    if (!isInitialized || currentRoundId !== roundId) return;
    if (!activePlayerIds) return;
    const subMatchIds = Array.from(activePlayerIds);
    const intersected =
      scoringPairsEnabled && playersToScore.length > 0
        ? playersToScore
            .filter((p) => activePlayerIds.has(p.id))
            .map((p) => p.id)
        : subMatchIds;
    setAllowedPlayers(intersected);
  }, [
    isInitialized,
    currentRoundId,
    roundId,
    activePlayerIds,
    scoringPairsEnabled,
    playersToScore,
    setAllowedPlayers,
  ]);

  // Render content for any hole number (used by SwipeableHoleNavigator for transitions)
  const renderHoleContent = useCallback(
    (holeNumber: number) => {
      const holeData = getHoleInfo(holeNumber);
      if (!holeData) return null;

      // Bound to the round's playable hole range (front 9 / back 9 / full).
      // If holes is briefly empty (e.g. mid re-init after a nine_type switch),
      // bail rather than fabricating a 1–18 range which lets the user navigate
      // outside the actual playable window.
      if (holes.length === 0) return null;
      const firstHoleNumber = holes[0].number;
      const lastHoleNumber = holes[holes.length - 1].number;
      const canGoPrev = holeNumber > firstHoleNumber;
      const canGoNext = holeNumber < lastHoleNumber;

      return (
        <View style={styles.contentArea}>
          <HoleHeader
            hole={holeData}
            selectedTee={selectedTee ?? undefined}
            startHole={startHole}
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

          {/* Phase C2 — Shot logging banner stuck to the bottom of the hole header. */}
          <InlineShotToast />

          <ScrollView
            style={styles.playersContainer}
            contentContainerStyle={styles.playersContent}
            showsVerticalScrollIndicator={false}
          >
            {groupFilter.canFilter && (
              <GroupFilterStrip
                isFiltered={groupFilter.isFiltered}
                groupCount={groupFilter.groupCount}
                totalCount={groupFilter.totalCount}
                onToggle={groupFilter.toggleShowAll}
              />
            )}
            <ScorecardScoreContent
              roundId={roundId}
              currentHoleData={holeData}
              currentHole={holeNumber}
              holes={holes}
              gameType={gameType}
              currentPlayers={scopedCurrentPlayers}
              playersToScore={scopedPlayersToScore}
              scoringPairsEnabled={scoringPairsEnabled}
              currentUserId={user?.id}
              isTeamRound={isTeamRound}
              teamFormat={teamFormat}
              teams={scopedTeams}
              competitionTeams={competitionTeams}
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
              anyStatsVisible={anyStatsVisible}
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
              playersOverride={groupFilter.canFilter ? groupFilter.groupPlayers : undefined}
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
                  startHole={startHole}
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
      scopedCurrentPlayers, scopedPlayersToScore, scoringPairsEnabled, user?.id,
      isTeamRound, teamFormat, gameType, scopedTeams,
      scoreHandlers.handleScoreSelect, scoreHandlers.handleStatsUpdate, scoreHandlers.handlePlayerPress,
      getPlayerScore, getTeamScore, handleTeamScoreSelect, handleBestBallScoreSelect,
      handleTeamMatchPlayScoreSelect, setSelectedContributor, selectedContributor,
      teamMatchPlayResults, playerScoresMap,
      isMultiBall, storeBallCount, scoreHandlers.handleMultiBallScoreChange,
      scoreHandlers.handleMultiBallStatsChange, getMultiBallScores,
      showFairwayHit, showGreenInRegulation, anyStatsVisible, holes, playersToRender, isHoleComplete,
      nav.handleHolePress, wolf.wolfGame, wolf.wolfDecision, wolf.isWolfProcessing,
      showTeeDots, playerTeeMap, selectedTeeData,
      groupFilter.canFilter, groupFilter.isFiltered, groupFilter.groupCount,
      groupFilter.totalCount, groupFilter.toggleShowAll, groupFilter.groupPlayers,
    ]
  );

  // Loading state — show the spinner only until we have data we can paint.
  // Once the offline store has been initialized with holes, fall through and
  // render the screen even if background queries are still pending; those
  // queries refresh data when they resolve and shouldn't block the UI on
  // a slow / hung Supabase request.
  const hasRenderableData = isInitialized && hasHoles;
  const showSpinner = !hasRenderableData && !fetchError;

  // Diagnostic: fire an event the moment we render the spinner, then again
  // every 3s while still stuck. This is what shows up in the
  // `client_diagnostics` Supabase table — query by user_id + event_name to
  // see which condition is wedged on production builds.
  useEffect(() => {
    if (!showSpinner) return;
    const snapshot = () => ({
      roundId,
      competitionId,
      isLoading,
      storeLoading,
      dataLoading,
      isInitialized,
      hasHoles,
      holesCount: holes.length,
      currentRoundId,
      currentPlayersCount: currentPlayers.length,
      fetchError,
    });
    pushDiagnostic('scorecard.spinner_visible', snapshot());
    const interval = setInterval(() => {
      pushDiagnostic('scorecard.spinner_still_visible', snapshot(), 'warn');
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot reads everything off the latest render
  }, [showSpinner]);

  if (showSpinner) {
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
          {/* Use nav.handleBackPress so we also clear the active round
              session — otherwise a cold-start resume would land us right
              back on this stuck screen. */}
          <TouchableOpacity
            style={[styles.errorButton, styles.errorButtonOutlined, { borderColor: colors.border }]}
            onPress={nav.handleBackPress}
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
      <RoundHeader
        titleFallback="Score Entry"
        courseName={courseName ?? undefined}
        clubName={clubName}
        selectedTee={courseTees.find((t) => t.color?.toLowerCase() === selectedTee) ?? null}
        onBack={nav.handleBackPress}
        roundId={roundId}
        courseId={courseId ?? undefined}
        currentHole={currentHole}
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingSyncCount={pendingSyncCount}
        onSyncPress={triggerSync}
        scoringPairsEnabled={scoringPairsEnabled}
        playersToScore={playersToScore}
        showShotLoggingInfo
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
        firstHole={holes[0]?.number ?? 1}
        totalHoles={holes[holes.length - 1]?.number ?? 18}
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
        totalHolesCount={holes.length}
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

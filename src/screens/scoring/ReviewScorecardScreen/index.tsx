/**
 * ReviewScorecardScreen - Full scorecard review with tabs for scores, stats,
 * leaderboard, skins, wolf, and payouts. Handles offline submission and sync.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { PageHeader, ConfirmationDialog } from '@/components/common';
import { Tabs } from '@/components/common/Tabs';
import { MismatchResolutionModal } from '@/components/scoring';
import { spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks';
import { usePendingMismatches, useResolveMismatch, usePartnerStatus } from '@/hooks/useScoreMismatch';
import { useRoundScoringPairs, useScorecardsRealtime } from '@/hooks/scorecard';
import { StatsTab } from '@/screens/rounds/ViewRoundScreen/tabs/StatsTab';

import { useScoreReview, useScoreSubmission, useReviewScorecardTabs, useScrambleTeams } from './hooks';
import {
  IncompleteScoresModal,
  ReviewActions,
  ReviewLoadingState,
  ReviewEmptyState,
  SkinsTabContent,
  WolfTabContent,
  LeaderboardTabContent,
  PayoutsTabContent,
  ScorecardTabContent,
  ContributionsTabContent,
  ScrambleLeaderboardTab,
  MatchPlayLeaderboardTab,
  MatchScorecardTabContent,
} from './components';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewScorecard'>;

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ReviewScorecardScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected ?? true;

  // Authentication
  const { player } = useAuth();
  const currentUserId = player?.id;

  // Review state and data
  const {
    holes,
    tablePlayerData,
    currentPlayers,
    groupScorecards,
    currentRoundId,
    gameType,
    getPlayerScore,
    incompleteHoles,
    showIncompleteModal,
    setShowIncompleteModal,
    validateScores,
    selectedTeeData,
    handicapSource,
    setCurrentHole,
    resetRound,
    submitScorecards,
  } = useScoreReview({ routeHoles: route.params?.holes });

  // Get round ID from route params or store
  const roundId = route.params?.roundId || currentRoundId;

  // Realtime: refresh scorecard / competition leaderboard queries the moment
  // a co-scorer submits a partner's scorecard, so the in-screen leaderboards
  // stay in sync without waiting for the 30s poll.
  useScorecardsRealtime(roundId || undefined, route.params?.competitionId);

  // Tab definitions and game type detection
  const {
    activeTab,
    tabs,
    showTabs,
    handleTabChange,
    effectiveGameType,
    isScramble,
    isShamble,
    isMatchPlayTeam,
    roundDetails,
    scoringPairsRequired,
    skinsGame,
    wolfGame,
    hasWolfGame,
    hasPayoutsTab,
    payoutsMode,
    statsVisibility,
    hasStats,
  } = useReviewScorecardTabs({ roundId: roundId || undefined, storeGameType: gameType, playerCount: currentPlayers.length });

  const scrambleTeams = useScrambleTeams({
    isScramble,
    roundId: roundId || undefined,
    roundDetails,
    currentPlayers,
  });

  const holeCount = holes.length || 18;

  // Scoring pairs hook for mismatch detection
  const { scoringPairsEnabled, myScorer } = useRoundScoringPairs(
    roundId || undefined,
    currentUserId,
    scoringPairsRequired,
    false, // isTeamRound
    currentPlayers
  );

  // Player name lookup for the N-way mismatch resolution UI
  const playerNamesById = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const player of currentPlayers) {
      if (player.id && player.name) map[player.id] = player.name;
    }
    return map;
  }, [currentPlayers]);

  // Mismatch hooks
  const { data: mismatches = [] } = usePendingMismatches(roundId || undefined);
  const { mutateAsync: resolveMismatch, isPending: isResolving } = useResolveMismatch();
  const { data: partnerStatus } = usePartnerStatus(roundId || undefined, currentUserId, holeCount);

  // Submission and sync logic
  const {
    isSubmitting,
    isRefreshing,
    pendingSyncs,
    syncError,
    handleSubmit,
    handleSyncPress,
    handleRefresh,
    getOfflineStatus,
    showMismatchModal,
    setShowMismatchModal,
    dialogConfig,
    dismissDialog,
  } = useScoreSubmission({
    isOnline,
    competitionId: route.params?.competitionId,
    routeRoundId: route.params?.roundId,
    currentRoundId,
    playerCount: currentPlayers.length,
    scorecardCount: groupScorecards.size,
    validateScores,
    setShowIncompleteModal,
    submitScorecards,
    resetRound,
    navigation,
    scoringPairsEnabled,
    currentUserId,
    holeCount,
  });

  // Handle mismatch resolution
  const handleResolveMismatch = useCallback(
    async (
      mismatchId: string,
      score: number,
      mismatchRoundId: string,
      playerId: string,
      holeNumber: number
    ) => {
      if (!currentUserId) {
        return { alreadyResolved: false };
      }
      const result = await resolveMismatch({
        mismatchId,
        resolvedScore: score,
        resolvedBy: currentUserId,
        roundId: mismatchRoundId,
        playerId,
        holeNumber,
      });
      return result;
    },
    [currentUserId, resolveMismatch]
  );

  // Navigation handlers
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEditScores = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleIncompleteHolePress = useCallback(
    (holeNumber: number) => {
      setShowIncompleteModal(false);
      setCurrentHole(holeNumber);
      navigation.goBack();
    },
    [navigation, setCurrentHole, setShowIncompleteModal]
  );

  // Handle hole press to navigate back to that hole
  const handleHolePress = useCallback(
    (holeNumber: number) => {
      setCurrentHole(holeNumber);
      navigation.goBack();
    },
    [navigation, setCurrentHole]
  );

  // Loading state
  if (currentPlayers.length === 0) {
    return <ReviewLoadingState />;
  }

  // Empty state
  if (groupScorecards.size === 0) {
    return <ReviewEmptyState onEnterScores={handleEditScores} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader title="Scorecard" showBack onBack={handleGoBack} />

      {/* Offline Indicator */}
      <OfflineIndicator
        status={getOfflineStatus()}
        pendingSyncs={pendingSyncs}
        errorMessage={syncError || undefined}
        onSyncPress={handleSyncPress}
        isSyncing={isSubmitting}
      />

      {/* Tab Navigation */}
      {showTabs && (
        <View style={styles.tabContainer}>
          <Tabs
            tabs={tabs}
            selectedTab={activeTab}
            onTabChange={handleTabChange}
            size="medium"
            testID="review-scorecard-tabs"
          />
        </View>
      )}

      {/* Tab Content */}
      {activeTab === 'scorecard' && isMatchPlayTeam && (
        <MatchScorecardTabContent
          roundId={roundId || undefined}
          holes={holes}
          roundDetails={roundDetails}
          selectedTeeData={selectedTeeData}
          handicapSource={handicapSource}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'scorecard' && !isMatchPlayTeam && (
        <ScorecardTabContent
          holes={holes}
          tablePlayerData={tablePlayerData}
          currentPlayers={currentPlayers}
          effectiveGameType={effectiveGameType}
          isScramble={isScramble}
          scrambleTeams={scrambleTeams}
          getPlayerScore={getPlayerScore}
          onHolePress={handleHolePress}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
          selectedTeeData={selectedTeeData}
          handicapSource={handicapSource}
        />
      )}

      {activeTab === 'stats' && hasStats && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
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
          <StatsTab
            displayPlayers={tablePlayerData}
            holes={holes}
            statsVisibility={statsVisibility}
            canEditStats={false}
          />
        </ScrollView>
      )}

      {activeTab === 'contributions' && (isScramble || isShamble) && (
        <ContributionsTabContent
          isScramble={isScramble}
          isShamble={isShamble}
          holes={holes}
          currentPlayers={currentPlayers}
          scrambleTeams={scrambleTeams}
          getPlayerScore={getPlayerScore}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'leaderboard' && isScramble && (
        <ScrambleLeaderboardTab
          holes={holes}
          currentPlayers={currentPlayers}
          currentUserId={currentUserId}
          scrambleTeams={scrambleTeams}
          getPlayerScore={getPlayerScore}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'leaderboard' && !isScramble && isMatchPlayTeam && (
        <MatchPlayLeaderboardTab
          roundId={roundId || undefined}
          holes={holes}
          roundDetails={roundDetails}
          selectedTeeData={selectedTeeData}
          handicapSource={handicapSource}
          currentUserId={currentUserId}
          roundStatus={roundDetails?.status ?? 'in-progress'}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'leaderboard' && !isScramble && !isMatchPlayTeam && (
        <LeaderboardTabContent
          players={currentPlayers}
          holes={holes}
          getPlayerScore={getPlayerScore}
          currentUserId={currentUserId}
          gameType={effectiveGameType}
          roundId={roundId ?? undefined}
          competitionId={route.params?.competitionId}
          teamFormat={roundDetails?.team_format ?? null}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'skins' && skinsGame && (
        <SkinsTabContent
          skinsGameId={skinsGame.id}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'wolf' && wolfGame && (
        <WolfTabContent
          wolfGameId={wolfGame.id}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'payouts' && hasPayoutsTab && payoutsMode && (
        <PayoutsTabContent
          mode={payoutsMode}
          skinsGameId={skinsGame?.id}
          wolfGameId={wolfGame?.id}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {/* Action Buttons */}
      <ReviewActions
        isOnline={isOnline}
        isSubmitting={isSubmitting}
        onEditScores={handleEditScores}
        onSubmit={handleSubmit}
        isAllComplete={incompleteHoles.length === 0}
      />

      {/* Incomplete Scores Modal */}
      <IncompleteScoresModal
        visible={showIncompleteModal}
        incompleteHoles={incompleteHoles}
        onClose={() => setShowIncompleteModal(false)}
        onHolePress={handleIncompleteHolePress}
      />

      {/* Mismatch Resolution Modal */}
      <MismatchResolutionModal
        visible={showMismatchModal}
        mismatches={mismatches}
        currentUserId={currentUserId ?? ''}
        partnerName={partnerStatus?.partnerName ?? myScorer?.name ?? 'Partner'}
        playerNamesById={playerNamesById}
        onResolve={handleResolveMismatch}
        onClose={() => setShowMismatchModal(false)}
        isOnline={isOnline}
        isResolving={isResolving}
      />

      {/* Confirmation/Alert Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
});

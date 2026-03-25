/**
 * ReviewScorecardScreen - Full scorecard table showing all 18 holes for all players
 *
 * Features:
 * - Scorecard table with columns: Hole | Par | Player 1 | Player 2 | Player 3
 * - Front 9 (OUT) subtotal and Back 9 (IN) subtotal rows
 * - Totals row with gross total, net total, Stableford points per player
 * - Skins tab showing hole-by-hole results and settlement (if skins game active)
 * - Edit Scores and Submit All Scores buttons
 * - Handles online/offline submission with sync status
 * - Mismatch resolution modal for scoring pairs verification
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { ScorecardTable, ScrambleTeamSelector, ScrambleScorecardTable, ContributionLeaderboard, ScrambleTeamLeaderboard } from '@/components/scorecard';
import { PageHeader, ConfirmationDialog } from '@/components/common';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { MismatchResolutionModal } from '@/components/scoring';
import { spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useActiveSkinsGameForRound } from '@/hooks/useSkins';
import { useWolfGameByRound } from '@/hooks/wolf';
import { useAuth } from '@/hooks';
import { usePendingMismatches, useResolveMismatch, usePartnerStatus } from '@/hooks/useScoreMismatch';
import { useRoundScoringPairs } from '@/hooks/scorecard';
import { useRoundDetails } from '@/hooks/useRoundDetails';
import type { PayoutsMode } from '@/utils/combinedPayouts';
import type { StandaloneTeamConfig } from '@/types/supabase/roundQueries';
import type { Player, HoleScore, MultiBallHoleScore } from '@/types';

import { useScoreReview, useScoreSubmission } from './hooks';
import {
  IncompleteScoresModal,
  ReviewActions,
  ReviewLoadingState,
  ReviewEmptyState,
  SkinsTabContent,
  WolfTabContent,
  LeaderboardTabContent,
  PayoutsTabContent,
} from './components';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewScorecard'>;

// =====================================================
// TAB TYPES
// =====================================================

type TabKey = 'scorecard' | 'leaderboard' | 'contributions' | 'skins' | 'wolf' | 'payouts';

const BASE_TABS: TabItem<TabKey>[] = [
  { key: 'scorecard', label: 'Scorecard' },
];

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ReviewScorecardScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected ?? true;

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('scorecard');
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);

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
    setCurrentHole,
    resetRound,
    submitScorecards,
  } = useScoreReview({ routeHoles: route.params?.holes });

  // Get round ID from route params or store
  const roundId = route.params?.roundId || currentRoundId;

  // Fetch round details to check if scoring pairs are required
  const { data: roundDetails } = useRoundDetails(roundId || '');
  const scoringPairsRequired = roundDetails?.scoring_pairs_required ?? false;
  const holeCount = holes.length || 18;

  // Scoring pairs hook for mismatch detection
  const { scoringPairsEnabled, myScorer } = useRoundScoringPairs(
    roundId || undefined,
    currentUserId,
    scoringPairsRequired,
    false, // isTeamRound
    currentPlayers
  );

  // Mismatch hooks
  const { data: mismatches = [], isLoading: _mismatchesLoading } = usePendingMismatches(roundId || undefined);
  const { mutateAsync: resolveMismatch, isPending: isResolving } = useResolveMismatch();
  const { data: partnerStatus } = usePartnerStatus(roundId || undefined, currentUserId, holeCount);

  // Check for active skins game
  const { data: skinsGame } = useActiveSkinsGameForRound(roundId || undefined);
  const hasSkinsGame = !!skinsGame;

  // Check for active Wolf game
  const { data: wolfGame } = useWolfGameByRound(roundId || undefined);
  const hasWolfGame = !!wolfGame && wolfGame.status !== 'cancelled';

  // Check if individual games have pots (for payouts tab)
  const hasSkinsWithPot = useMemo(() => {
    if (!hasSkinsGame || !skinsGame) return false;
    if (skinsGame.is_team_skins) return false; // v1: individual skins only
    if (skinsGame.pot_value <= 0) return false;
    return true;
  }, [hasSkinsGame, skinsGame]);

  const hasWolfWithPot = useMemo(() => {
    if (!hasWolfGame || !wolfGame) return false;
    if (!wolfGame.pot_enabled || !wolfGame.pot_value_per_point || wolfGame.pot_value_per_point <= 0) return false;
    return true;
  }, [hasWolfGame, wolfGame]);

  const hasPayoutsTab = hasSkinsWithPot || hasWolfWithPot;
  const payoutsMode: PayoutsMode | null = hasSkinsWithPot && hasWolfWithPot
    ? 'combined'
    : hasSkinsWithPot
      ? 'skins-only'
      : hasWolfWithPot
        ? 'wolf-only'
        : null;

  // Check if this is a stroke play round (for leaderboard tab)
  // Use roundDetails as fallback since store's gameType may not be preserved when loading from offline
  const effectiveGameType = roundDetails?.game_type || gameType;
  const isStrokePlay = effectiveGameType === 'stroke';

  // Check if this is a scramble round
  const isScramble = effectiveGameType === 'scramble' || roundDetails?.team_format === 'scramble';

  // Check if this is a shamble round
  const isShamble = effectiveGameType === 'shamble' || roundDetails?.team_format === 'shamble';

  // Calculate team handicap for scramble rounds
  const _teamHandicap = useMemo(() => {
    if (!isScramble || currentPlayers.length === 0) return 0;
    const handicaps = currentPlayers
      .map((p) => p.handicap ?? 0)
      .sort((a, b) => a - b);
    if (handicaps.length === 0) return 0;
    // Scramble formula: 25% of sum of all handicaps
    const sum = handicaps.reduce((acc, h) => acc + h, 0);
    return Math.round((sum * 0.25) * 10) / 10;
  }, [isScramble, currentPlayers]);

  // Get team score for a hole (for scramble, all players have the same score)
  const getTeamScoreForHole = useCallback(
    (holeNumber: number) => {
      if (currentPlayers.length === 0) return undefined;
      // For scramble, all players have the same score, so just get the first one
      return getPlayerScore(currentPlayers[0].id, holeNumber);
    },
    [currentPlayers, getPlayerScore]
  );

  // Extract teams from team_config for multi-team scramble rounds
  const scrambleTeams = useMemo(() => {
    if (!isScramble) return [];

    // Check for standalone team config from round details
    const teamConfig = (roundDetails as unknown as { team_config?: StandaloneTeamConfig })?.team_config;
    if (teamConfig?.teams && teamConfig.teams.length > 0) {
      return teamConfig.teams;
    }

    // Fallback: treat all players as one team
    const allPlayerIds = currentPlayers.map((p) => p.id);
    if (allPlayerIds.length > 0) {
      return [{
        id: 'default-team',
        name: 'Team',
        memberIds: allPlayerIds,
      }];
    }

    return [];
  }, [isScramble, roundDetails, currentPlayers]);

  // Get players for a specific team by index
  const getScrambleTeamPlayersByIndex = useCallback((teamIndex: number): Player[] => {
    if (!isScramble || scrambleTeams.length === 0) return [];

    const team = scrambleTeams[teamIndex];
    if (!team) return [];

    // Filter currentPlayers to only team members
    return team.memberIds
      .map((id) => currentPlayers.find((p) => p.id === id))
      .filter((p): p is Player => p !== undefined);
  }, [isScramble, scrambleTeams, currentPlayers]);

  // Get team handicap for a specific team by index
  const getScrambleTeamHandicapByIndex = useCallback((teamIndex: number): number => {
    const teamPlayers = getScrambleTeamPlayersByIndex(teamIndex);
    if (teamPlayers.length === 0) return 0;
    const handicaps = teamPlayers
      .map((p) => p.handicap ?? 0)
      .sort((a, b) => a - b);
    const sum = handicaps.reduce((acc, h) => acc + h, 0);
    return Math.round((sum * 0.25) * 10) / 10;
  }, [getScrambleTeamPlayersByIndex]);

  // Get team score for a specific team by index
  const getScrambleTeamScoreByIndex = useCallback((teamIndex: number, holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
    const team = scrambleTeams[teamIndex];
    if (!team) return undefined;

    // Find score from any team member (they should all have the same team score)
    for (const playerId of team.memberIds) {
      const score = getPlayerScore(playerId, holeNumber);
      if (score) return score;
    }
    return undefined;
  }, [scrambleTeams, getPlayerScore]);

  // Build tabs dynamically based on game type and skins availability
  const tabs = useMemo<TabItem<TabKey>[]>(() => {
    const tabList: TabItem<TabKey>[] = [...BASE_TABS];

    // For scramble, keep scorecard tab as "Scorecard", add leaderboard and contributions
    if (isScramble) {
      tabList[0] = { key: 'scorecard' as const, label: 'Scorecard' };
      tabList.push({ key: 'leaderboard' as const, label: 'Leaderboard' });
      tabList.push({ key: 'contributions' as const, label: 'Contributions' });
    }

    // For shamble, keep scorecard tab as "Scorecard" and add "Team Scores" tab
    if (isShamble) {
      tabList[0] = { key: 'scorecard' as const, label: 'Scorecard' };
      tabList.push({ key: 'contributions' as const, label: 'Team Scores' });
    }

    // Add leaderboard tab for stroke play
    if (isStrokePlay) {
      tabList.push({ key: 'leaderboard' as const, label: 'Leaderboard' });
    }

    // Add skins tab if skins game exists
    if (hasSkinsGame) {
      tabList.push({ key: 'skins' as const, label: 'Skins' });
    }

    // Add wolf tab if wolf game exists
    if (hasWolfGame) {
      tabList.push({ key: 'wolf' as const, label: 'Wolf' });
    }

    // Add payouts tab if any game has a pot
    if (hasPayoutsTab) {
      tabList.push({ key: 'payouts' as const, label: 'Payouts' });
    }

    return tabList;
  }, [hasSkinsGame, hasWolfGame, hasPayoutsTab, isStrokePlay, isScramble, isShamble]);

  // Determine if we need to show tabs (more than just scorecard)
  const showTabs = isStrokePlay || hasSkinsGame || hasWolfGame || isScramble || isShamble;

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
    // Scoring pairs mismatch detection
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

  // Handle tab change
  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
  }, []);

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

      {/* Tab Navigation - show if leaderboard (stroke play) or skins game exists */}
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
      {activeTab === 'scorecard' && (
        /* Scorecard Content - Different view for scramble vs individual */
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
          {isScramble ? (
            <>
              {/* Team selector */}
              <ScrambleTeamSelector
                teams={scrambleTeams}
                selectedIndex={selectedTeamIndex}
                onSelectTeam={setSelectedTeamIndex}
                getTeamPlayers={getScrambleTeamPlayersByIndex}
              />
              {/* Selected team's scorecard */}
              <ScrambleScorecardTable
                holes={holes}
                teamName={scrambleTeams[selectedTeamIndex]?.name || 'Team'}
                teamHandicap={getScrambleTeamHandicapByIndex(selectedTeamIndex)}
                getTeamScore={(holeNumber) => getScrambleTeamScoreByIndex(selectedTeamIndex, holeNumber)}
                onHolePress={handleHolePress}
              />
            </>
          ) : (
            <ScorecardTable
              players={tablePlayerData}
              holes={holes}
              screenWidth={screenWidth}
              onHolePress={handleHolePress}
              gameType={effectiveGameType}
            />
          )}
        </ScrollView>
      )}

      {activeTab === 'contributions' && (isScramble || isShamble) && (
        /* Contributions Content - Scramble or Shamble */
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
          {isScramble && (
            <ScrambleTeamSelector
              teams={scrambleTeams}
              selectedIndex={selectedTeamIndex}
              onSelectTeam={setSelectedTeamIndex}
              getTeamPlayers={getScrambleTeamPlayersByIndex}
            />
          )}
          <ContributionLeaderboard
            players={isScramble ? getScrambleTeamPlayersByIndex(selectedTeamIndex) : currentPlayers}
            getTeamScore={isScramble ? (holeNumber) => getScrambleTeamScoreByIndex(selectedTeamIndex, holeNumber) : getTeamScoreForHole}
            totalHoles={holes.length}
            showOnlyDrives={isShamble}
            getPlayerScore={isShamble ? getPlayerScore : undefined}
            holes={isShamble ? holes : undefined}
          />
        </ScrollView>
      )}

      {activeTab === 'leaderboard' && isScramble && (
        /* Scramble Team Leaderboard */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.leaderboardScrollContent, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.textPrimary}
              colors={[colors.textPrimary]}
            />
          }
          showsVerticalScrollIndicator={true}
        >
          <ScrambleTeamLeaderboard
            teams={scrambleTeams}
            players={currentPlayers}
            holes={holes}
            getTeamScore={getScrambleTeamScoreByIndex}
            currentUserId={currentUserId}
            testID="scramble-team-leaderboard"
          />
        </ScrollView>
      )}

      {activeTab === 'leaderboard' && !isScramble && (
        /* Stroke Play Leaderboard Content */
        <LeaderboardTabContent
          players={currentPlayers}
          holes={holes}
          getPlayerScore={getPlayerScore}
          currentUserId={currentUserId}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'skins' && skinsGame && (
        /* Skins Content */
        <SkinsTabContent
          skinsGameId={skinsGame.id}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'wolf' && wolfGame && (
        /* Wolf Content */
        <WolfTabContent
          wolfGameId={wolfGame.id}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          bottomInset={insets.bottom}
        />
      )}

      {activeTab === 'payouts' && hasPayoutsTab && payoutsMode && (
        /* Payouts Content */
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
  leaderboardScrollContent: {
    flexGrow: 1,
  },
});

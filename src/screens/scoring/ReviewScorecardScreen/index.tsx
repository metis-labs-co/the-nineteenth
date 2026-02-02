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
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { ScorecardTable, ScrambleTeamSelector, ScrambleScorecardTable, ContributionLeaderboard, ScrambleTeamLeaderboard } from '@/components/scorecard';
import { PageHeader, ConfirmationDialog } from '@/components/common';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { SkinsResultsCard, SkinsSettlementCard } from '@/components/skins';
import { WolfResultsCard, WolfStandingsCard, WolfSettlementCard, WOLF_COLOR } from '@/components/wolf';
import { StrokePlayLeaderboardFull } from '@/components/scorecard/StrokePlayLeaderboardFull';
import { MismatchResolutionModal } from '@/components/scoring';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useActiveSkinsGameForRound, useSkinsSummary } from '@/hooks/useSkins';
import { useWolfGameByRound, useWolfSummary } from '@/hooks/wolf';
import { useAuth } from '@/hooks';
import { usePendingMismatches, useResolveMismatch, usePartnerStatus } from '@/hooks/useScoreMismatch';
import { useRoundScoringPairs } from '@/hooks/scorecard';
import { useRoundDetails } from '@/hooks/useRoundDetails';
import type { StandaloneTeamConfig } from '@/types/supabase/roundQueries';
import type { Player, HoleScore, MultiBallHoleScore } from '@/types';

import { useScoreReview, useScoreSubmission } from './hooks';
import {
  IncompleteScoresModal,
  ReviewActions,
  ReviewLoadingState,
  ReviewEmptyState,
} from './components';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewScorecard'>;

// =====================================================
// TAB TYPES
// =====================================================

type TabKey = 'scorecard' | 'leaderboard' | 'contributions' | 'skins' | 'wolf';

const BASE_TABS: TabItem<TabKey>[] = [
  { key: 'scorecard', label: 'Scorecard' },
];

// Amber/gold color for skins
const SKINS_COLOR = '#f59e0b';

// =====================================================
// SKINS TAB CONTENT COMPONENT
// =====================================================

interface SkinsTabContentProps {
  skinsGameId: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

function SkinsTabContent({ skinsGameId, isRefreshing, onRefresh, bottomInset }: SkinsTabContentProps) {
  const colors = useThemeColors();
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useSkinsSummary(skinsGameId);

  const handleRefresh = useCallback(async () => {
    await refetchSummary();
    onRefresh();
  }, [refetchSummary, onRefresh]);

  // Loading state
  if (isSummaryLoading || !summary) {
    return (
      <View style={styles.skinsLoadingContainer}>
        <ActivityIndicator size="large" color={SKINS_COLOR} />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Loading skins results...
        </Text>
      </View>
    );
  }

  const { game, results, payouts, current_carryover, holes_completed } = summary;

  // Empty state - no results yet
  if (results.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={[styles.skinsEmptyContainer, { paddingBottom: bottomInset + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
          />
        }
      >
        <View style={[styles.skinsEmptyCard, { backgroundColor: colors.surface }]}>
          <Icon source="dice-outline" size={48} color={SKINS_COLOR} />
          <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.md }]}>
            No Skins Results Yet
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            Skins results will appear here as you complete each hole.
            {'\n'}Keep scoring to see who wins each skin!
          </Text>
          <View style={[styles.skinsEmptyConfig, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[typography.small, { color: colors.textSecondary }]}>
              ${game.pot_value} {game.pot_type === 'per_hole' ? 'per hole' : 'total'} • {game.scoring_type === 'gross' ? 'Gross' : 'Net'} scoring
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Calculate unsettled carryover (carryover from last completed hole if not all 18)
  const unsettledCarryover = holes_completed < 18 ? current_carryover : 0;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.skinsScrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.textPrimary}
        />
      }
      showsVerticalScrollIndicator={true}
    >
      {/* Skins Results Table */}
      <SkinsResultsCard
        results={results}
        potType={game.pot_type}
        potValue={game.pot_value}
        scoringType={game.scoring_type}
        testID="skins-results-card"
      />

      {/* Settlement Card (show when game is complete or has payouts) */}
      {(game.status === 'completed' || payouts.length > 0) && (
        <View style={styles.settlementContainer}>
          <SkinsSettlementCard
            payouts={payouts}
            game={game}
            unsettledCarryover={unsettledCarryover}
            testID="skins-settlement-card"
          />
        </View>
      )}

      {/* In-Progress Info */}
      {game.status === 'active' && holes_completed < 18 && (
        <View style={[styles.inProgressCard, { backgroundColor: colors.surface }]}>
          <View style={styles.inProgressHeader}>
            <Icon source="golf" size={20} color={SKINS_COLOR} />
            <Text style={[typography.bodyBold, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
              Game In Progress
            </Text>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            {holes_completed} of 18 holes completed
            {current_carryover > 0 && ` • $${current_carryover.toFixed(2)} carryover`}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// =====================================================
// WOLF TAB CONTENT COMPONENT
// =====================================================

interface WolfTabContentProps {
  wolfGameId: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

function WolfTabContent({ wolfGameId, isRefreshing, onRefresh, bottomInset }: WolfTabContentProps) {
  const colors = useThemeColors();
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useWolfSummary(wolfGameId);

  const handleRefresh = useCallback(async () => {
    await refetchSummary();
    onRefresh();
  }, [refetchSummary, onRefresh]);

  // Loading state
  if (isSummaryLoading || !summary) {
    return (
      <View style={styles.wolfLoadingContainer}>
        <ActivityIndicator size="large" color={WOLF_COLOR} />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Loading Wolf results...
        </Text>
      </View>
    );
  }

  const { game, decisions, payouts, standings, holes_completed } = summary;

  // Empty state - no decisions yet
  if (decisions.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={[styles.wolfEmptyContainer, { paddingBottom: bottomInset + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
          />
        }
      >
        <View style={[styles.wolfEmptyCard, { backgroundColor: colors.surface }]}>
          <Icon source="dog-side" size={48} color={WOLF_COLOR} />
          <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.md }]}>
            No Wolf Results Yet
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            Wolf results will appear here as you complete each hole.
            {'\n'}The Wolf player must decide and scores must be recorded!
          </Text>
          <View style={[styles.wolfEmptyConfig, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[typography.small, { color: colors.textSecondary }]}>
              {game.scoring_type === 'gross' ? 'Gross' : 'Net'} scoring • {game.participants.length} players
              {game.pot_enabled && game.pot_value_per_point ? ` • $${game.pot_value_per_point}/pt` : ''}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.wolfScrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.textPrimary}
        />
      }
      showsVerticalScrollIndicator={true}
    >
      {/* Wolf Results Table - Hole by hole breakdown */}
      <WolfResultsCard
        wolfGame={game}
        decisions={decisions}
        testID="wolf-results-card"
      />

      {/* Wolf Standings Card */}
      {standings.length > 0 && (
        <View style={styles.wolfSectionContainer}>
          <WolfStandingsCard
            standings={standings}
            potEnabled={game.pot_enabled}
            testID="wolf-standings-card"
          />
        </View>
      )}

      {/* Settlement Card (show when game is complete and pot is enabled) */}
      {game.pot_enabled && (game.status === 'completed' || payouts.length > 0) && game.pot_value_per_point && (
        <View style={styles.wolfSectionContainer}>
          <WolfSettlementCard
            payouts={payouts}
            potValue={game.pot_value_per_point}
            currency={game.currency}
            testID="wolf-settlement-card"
          />
        </View>
      )}

      {/* In-Progress Info */}
      {game.status === 'active' && holes_completed < 18 && (
        <View style={[styles.inProgressCard, { backgroundColor: colors.surface }]}>
          <View style={styles.inProgressHeader}>
            <Icon source="dog-side" size={20} color={WOLF_COLOR} />
            <Text style={[typography.bodyBold, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
              Game In Progress
            </Text>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            {holes_completed} of 18 holes completed
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// =====================================================
// LEADERBOARD TAB CONTENT COMPONENT
// =====================================================

interface LeaderboardTabContentProps {
  players: import('@/types').Player[];
  holes: import('@/types').Hole[];
  getPlayerScore: (playerId: string, holeNumber: number) => import('@/types').HoleScore | import('@/types').MultiBallHoleScore | undefined;
  currentUserId?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

function LeaderboardTabContent({
  players,
  holes,
  getPlayerScore,
  currentUserId,
  isRefreshing,
  onRefresh,
  bottomInset,
}: LeaderboardTabContentProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.leaderboardScrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.textPrimary}
        />
      }
      showsVerticalScrollIndicator={true}
    >
      <StrokePlayLeaderboardFull
        players={players}
        holes={holes}
        getPlayerScore={getPlayerScore}
        currentUserId={currentUserId}
        testID="stroke-play-leaderboard-full"
      />
    </ScrollView>
  );
}

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
  const { data: mismatches = [], isLoading: mismatchesLoading } = usePendingMismatches(roundId || undefined);
  const { mutateAsync: resolveMismatch, isPending: isResolving } = useResolveMismatch();
  const { data: partnerStatus } = usePartnerStatus(roundId || undefined, currentUserId, holeCount);

  // Check for active skins game
  const { data: skinsGame } = useActiveSkinsGameForRound(roundId || undefined);
  const hasSkinsGame = !!skinsGame;

  // Check for active Wolf game
  const { data: wolfGame } = useWolfGameByRound(roundId || undefined);
  const hasWolfGame = !!wolfGame && wolfGame.status !== 'cancelled';

  // Check if this is a stroke play round (for leaderboard tab)
  // Use roundDetails as fallback since store's gameType may not be preserved when loading from offline
  const effectiveGameType = roundDetails?.game_type || gameType;
  const isStrokePlay = effectiveGameType === 'stroke';

  // Check if this is a scramble round
  const isScramble = effectiveGameType === 'scramble' || roundDetails?.team_format === 'scramble';

  // Check if this is a shamble round
  const isShamble = effectiveGameType === 'shamble' || roundDetails?.team_format === 'shamble';

  // Calculate team handicap for scramble rounds
  const teamHandicap = useMemo(() => {
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

    return tabList;
  }, [hasSkinsGame, hasWolfGame, isStrokePlay, isScramble, isShamble]);

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
  // Tab styles
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  // Skins tab styles
  skinsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  skinsScrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  skinsEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  skinsEmptyCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  skinsEmptyConfig: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  settlementContainer: {
    marginTop: spacing.md,
  },
  inProgressCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  inProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Leaderboard tab styles
  leaderboardScrollContent: {
    flexGrow: 1,
  },
  // Wolf tab styles
  wolfLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  wolfScrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  wolfEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  wolfEmptyCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  wolfEmptyConfig: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  wolfSectionContainer: {
    marginTop: spacing.md,
  },
});

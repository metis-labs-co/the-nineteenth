/**
 * CompetitionDetailScreen - View and manage competition details
 *
 * Features tabbed interface:
 * - Details: Competition info and current round
 * - Rounds: List all rounds with actions
 * - Players: List competition players
 * - Teams: List competition teams
 * - Leaderboard: Competition standings
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import AddPlayersBottomSheet from '@/components/competitionWizard/AddPlayersBottomSheet';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { formatHandicapIndex } from '@/utils/displayHelpers';
import { useTierLimits, useIsSuperAdmin } from '@/context/SubscriptionContext';
import { UpgradePrompt } from '@/components/subscription';
import { PageHeader, Tabs, ConfirmationDialog } from '@/components/common';
import { SelectionModal, SelectionItemRow } from '@/components/common/SelectionModal';
import { useRoundScorecards } from '@/hooks/useRoundDetails';
import { useReorderCompetitionRounds } from '@/hooks/rounds/mutations';
import { ScorecardsRealtimeSubscription } from '@/hooks/scorecard/useScorecardsRealtime';
import {
  DetailsTab,
  RoundsTab,
  PlayersTab,
  TeamsTab,
  LeaderboardTab,
  StatsTab,
  PayoutsTab,
  SkinsTab,
  CompetitionHero,
} from '@/components/competitions/detail';
import { BreakdownTab } from '@/components/competitions/breakdown';
import { useCompetitionSkinsGames } from '@/hooks/skins';
import { BracketTab } from '@/components/knockout';
import { PointsBreakdownModal, LeaderboardViewToggle } from '@/components/leaderboard';

import {
  useCompetitionDetailData,
  useCompetitionDetailHandlers,
  useDeleteCompetitionRound,
} from './hooks';
import {
  buildCompetitionDetailTabs,
  reconcileCompetitionDetailTab,
  type CompetitionDetailTab,
} from './tabModel';

type Props = NativeStackScreenProps<RootStackParamList, 'CompetitionDetail'>;

type TabValue = CompetitionDetailTab;

export default function CompetitionDetailScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { id, initialTab } = route.params;
  const insets = useSafeAreaInsets();
  const tierLimits = useTierLimits();
  const isSuperAdmin = useIsSuperAdmin();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab ?? 'details');
  const lastHandledInitialTab = React.useRef(initialTab);

  // Lifted leaderboard state — lets the mini-leaderboard tap-through select a view
  const [leaderboardView, setLeaderboardView] = useState<'individual' | 'team'>(
    'individual'
  );
  // Guards the one-shot default below so it fires exactly once when competition
  // data first resolves and never re-fights a later manual toggle by the user.
  const didDefaultLeaderboardView = React.useRef(false);
  const [leaderboardScrollTarget, setLeaderboardScrollTarget] = useState<
    { kind: 'player' | 'team'; id: string } | null
  >(null);

  // Data hook
  const {
    user,
    competitionData,
    isLoading,
    error,
    refetch,
    isRefetching,
    teams,
    isLoadingTeams,
    prizePool,
    teamPrizePool,
    refetchPrizePool,
    prizePoolPlacements,
    teamPrizePoolPlacements,
    scoringPairsStatus,
    allScoredStatus,
    isOrganizer,
    hasStartedRound,
    isPrizePoolLocked,
    isPlayer,
    userTeamId,
    userTeamName,
    miniIndividual,
    miniTeam,
    refetchLeaderboard,
    refetchTeams,
  } = useCompetitionDetailData(id);

  // Team competitions open the leaderboard on the Team sub-view. Runs once when
  // competition data first resolves; never fights a later manual toggle.
  const competitionTeamMode = competitionData?.competition.team_mode;
  React.useEffect(() => {
    if (didDefaultLeaderboardView.current) return;
    if (competitionTeamMode === undefined) return; // not loaded yet
    if (competitionTeamMode !== 'none') {
      setLeaderboardView('team');
    }
    didDefaultLeaderboardView.current = true;
  }, [competitionTeamMode]);

  // Skins overview drives both the tab visibility and the tab content. We
  // fetch it up here so the conditional Tabs entry is in sync with the
  // payload `SkinsTab` consumes via the same hook below (TanStack dedupes
  // by query key).
  const { data: competitionSkinsGames } = useCompetitionSkinsGames(id);
  const hasSkinsGames = (competitionSkinsGames?.length ?? 0) > 0;
  const canViewSkinsTab =
    isOrganizer ||
    (competitionSkinsGames ?? []).some(
      (game) =>
        (!!user?.id && game.participantPlayerIds.includes(user.id)) ||
        (!!userTeamId && game.participantTeamIds.includes(userTeamId))
    );

  const handleOpenLeaderboardFromMini = useCallback(
    (view: 'individual' | 'team') => {
      setActiveTab('leaderboard');
      setLeaderboardView(view);
      if (view === 'team' && userTeamId) {
        setLeaderboardScrollTarget({ kind: 'team', id: userTeamId });
      } else if (view === 'individual' && user?.id) {
        setLeaderboardScrollTarget({ kind: 'player', id: user.id });
      } else {
        setLeaderboardScrollTarget(null);
      }
    },
    [user?.id, userTeamId]
  );

  const handleScrollHandled = useCallback(() => {
    setLeaderboardScrollTarget(null);
  }, []);

  // Handlers hook
  const {
    dialogConfig,
    showAlert,
    dismissDialog,
    showRoundUpgradePrompt,
    setShowRoundUpgradePrompt,
    showPlayerUpgradePrompt,
    setShowPlayerUpgradePrompt,
    showAddPlayersSheet,
    setShowAddPlayersSheet,
    showPointsBreakdown,
    selectedLeaderboardEntry,
    handleLeaderboardEntryPress,
    handleClosePointsBreakdown,
    removePlayerState,
    removePlayerDialogConfig,
    dismissRemovePlayerDialog,
    quickScoreRoundId,
    handleQuickScore,
    handleQuickScorePlayerSelect,
    handleQuickScoreClose,
    handleBack,
    handleAddRound,
    handleAddPlayers,
    handleRemovePlayer,
    handleScoreRound,
    handleViewRound,
    handleUpdateTeam,
    handleManageScoringPairs,
    handleRefresh,
  } = useCompetitionDetailHandlers({
    id,
    navigation,
    competitionData: competitionData ?? null,
    refetch,
    refetchLeaderboard,
    refetchTeams,
    refetchPrizePool,
  });

  // Quick Score: fetch scorecards for selected round to identify completed players
  const { data: quickScoreScorecards } = useRoundScorecards(quickScoreRoundId ?? '');
  const completedPlayerIds = useMemo(() => {
    if (!quickScoreScorecards) return new Set<string>();
    return new Set(
      quickScoreScorecards
        .filter((sc) => sc.status === 'completed')
        .map((sc) => sc.player_id)
    );
  }, [quickScoreScorecards]);

  // Round deletion (swipe-to-delete on Rounds tab)
  const {
    deleteDialogVisible: deleteRoundDialogVisible,
    roundToDelete,
    isDeleting: isDeletingRound,
    handleDeleteRound,
    handleCancelDelete: handleCancelDeleteRound,
    handleConfirmDelete: handleConfirmDeleteRound,
  } = useDeleteCompetitionRound({
    competitionId: id,
    onDeleted: refetch,
    onError: showAlert,
  });

  // Drag-to-reorder for the Rounds tab. Optimistic update lives inside the
  // hook against the competition-details cache; we only need to fire the
  // mutation here. Failures roll back automatically and surface via the
  // generic error toast pipeline.
  const { mutate: reorderRounds } = useReorderCompetitionRounds();
  const handleReorderRounds = useCallback(
    (roundIds: string[]) => {
      reorderRounds({ competitionId: id, roundIds });
    },
    [reorderRounds, id]
  );

  // Refetch on focus so returning from a round detail/settings screen shows
  // updated round data (name, course, date, status) without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Stats tab only shown when there's at least one non-scramble round — scramble
  // rounds have no individual hole scores, so individual aggregation is meaningless.
  // Must be declared before any early returns to satisfy rules-of-hooks.
  const showStatsTab = useMemo(() => {
    const roundsList = competitionData?.rounds ?? [];
    return (
      roundsList.length > 0 &&
      roundsList.some((r) => r.game_type !== 'scramble' && r.game_type !== 'alt-shot')
    );
  }, [competitionData]);

  // Ringer board needs at least one non-scramble round to draw from.
  const showRingerTab = useMemo(
    () =>
      (competitionData?.rounds ?? []).some(
        (r) => r.team_format !== 'scramble' && r.game_type !== 'scramble' && r.team_format !== 'alt-shot' && r.game_type !== 'alt-shot'
      ),
    [competitionData]
  );

  // Contributions board needs at least one team-format round to break down.
  const showContributionsTab = useMemo(() => {
    const roundsList = competitionData?.rounds ?? [];
    const teamFormats = ['best-ball', 'scramble', 'shamble', 'aggregate', 'alt-shot'];
    return roundsList.some(
      (r) => teamFormats.includes(r.team_format ?? '') || teamFormats.includes(r.game_type ?? '')
    );
  }, [competitionData]);

  // Breakdown tab surfaces if either segment has data.
  const showBreakdownTab = showRingerTab || showContributionsTab;

  // Mirrors the visibility logic inside LeaderboardTab so the pinned
  // Individual/Team toggle only renders when the inline one would have.
  const showLeaderboardToggle = useMemo(() => {
    if (!competitionData) return false;
    if (competitionData.competition.team_mode === 'none') return false;
    const roundsList = competitionData.rounds;
    // Single-ball team formats (scramble/alt-shot) have no meaningful individual standings.
    const isAllSingleBallTeam =
      roundsList.length > 0 &&
      roundsList.every((r) => r.team_format === 'scramble' || r.team_format === 'alt-shot');
    return !isAllSingleBallTeam;
  }, [competitionData]);

  const tabRole = isOrganizer ? 'organizer' : 'competitor';
  const competitionType = competitionData?.competition.competition_type ?? 'event';
  const competitionStatus = competitionData?.competition.status ?? 'upcoming';
  const tabs = useMemo(
    () =>
      buildCompetitionDetailTabs({
        role: tabRole,
        competitionType,
        status: competitionStatus,
        availability: {
          roundsCount: competitionData?.rounds.length ?? 0,
          playersCount: competitionData?.players.length ?? 0,
          teams: competitionData?.competition.team_mode !== 'none',
          stats: showStatsTab,
          breakdown: showBreakdownTab,
          payouts: !!(prizePool || teamPrizePool),
          skins: hasSkinsGames && canViewSkinsTab,
          skinsCount: competitionSkinsGames?.length,
        },
      }),
    [
      competitionData,
      competitionSkinsGames?.length,
      competitionStatus,
      competitionType,
      canViewSkinsTab,
      hasSkinsGames,
      prizePool,
      showBreakdownTab,
      showStatsTab,
      tabRole,
      teamPrizePool,
    ]
  );
  // Effects run after paint. Resolve the render key synchronously as well so
  // competitors never paint organizer-only Details content for one frame.
  const visibleActiveTab = reconcileCompetitionDetailTab(
    activeTab,
    tabs,
    tabRole,
    competitionType
  );

  // Navigation can request a tab that the resolved role/status cannot access.
  // Clamp both incoming params and stale local state to a visible tab.
  React.useEffect(() => {
    setActiveTab((current) => {
      const initialTabChanged = initialTab !== lastHandledInitialTab.current;
      const requestedTab = initialTabChanged && initialTab ? initialTab : current;
      lastHandledInitialTab.current = initialTab;
      return reconcileCompetitionDetailTab(
        requestedTab,
        tabs,
        tabRole,
        competitionType
      );
    });
  }, [competitionType, initialTab, tabRole, tabs]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.centerContent]}>
        <LoadingSpinner size="lg" message="Loading competition..." />
      </View>
    );
  }

  // Error state
  if (error || !competitionData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.centerContent]}>
        <Icon source="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Unable to load competition</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error?.message || 'Competition not found'}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={[styles.retryButtonLabel, { color: colors.white }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { competition, rounds, players } = competitionData;

  // Display number for the round being deleted — matches the pill shown on
  // the Rounds tab card (derived from list position, not the stored
  // round.round_number which can have gaps after earlier deletes).
  const roundToDeleteDisplayNumber = roundToDelete
    ? rounds.findIndex((r) => r.id === roundToDelete.id) + 1
    : 0;
  const liveRound = rounds.find((round) => round.status === 'in-progress');
  const handleHeroAction =
    competition.status === 'completed'
      ? () =>
          setActiveTab(
            competition.competition_type === 'knockout' ? 'bracket' : 'leaderboard'
          )
      : liveRound
        ? () => handleViewRound(liveRound.id)
        : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Realtime subscriptions: one channel per round so any submitted
          scorecard for this competition refreshes the mini-leaderboard /
          leaderboard tab in place. */}
      {rounds.map((round) => (
        <ScorecardsRealtimeSubscription
          key={round.id}
          roundId={round.id}
          competitionId={id}
        />
      ))}

      {/* Header */}
      <PageHeader
        title={competition.name}
        subtitle={
          !isOrganizer && userTeamName
            ? `Your team · ${userTeamName}`
            : `${rounds.length} ${rounds.length === 1 ? 'round' : 'rounds'}`
        }
        variant="centered"
        showBack
        onBack={handleBack}
        rightActions={
          isOrganizer
            ? [
                {
                  icon: 'cog-outline',
                  onPress: () => navigation.navigate('CompetitionSettings', { competitionId: id }),
                  accessibilityLabel: 'Competition settings',
                },
              ]
            : []
        }
      />

      <CompetitionHero
        status={competition.status}
        startDate={competition.start_date}
        isOrganizer={isOrganizer}
        teamName={!isOrganizer ? userTeamName : undefined}
        liveRoundName={
          liveRound
            ? `Round ${rounds.findIndex((round) => round.id === liveRound.id) + 1} is live`
            : undefined
        }
        onPrimaryAction={handleHeroAction}
      />

      {/* Tab Bar */}
      <Tabs
        tabs={tabs}
        selectedTab={visibleActiveTab}
        onTabChange={setActiveTab}
        style={styles.tabContainer}
      />

      {/* Pinned leaderboard sub-tabs: render outside the ScrollView so the
          Individual/Team toggle stays visible while scrolling the standings. */}
      {visibleActiveTab === 'leaderboard' &&
        competition.competition_type !== 'knockout' &&
        showLeaderboardToggle && (
          <LeaderboardViewToggle
            selectedView={leaderboardView}
            onViewChange={setLeaderboardView}
            showTeamOption
            style={styles.pinnedLeaderboardToggle}
          />
        )}

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[colors.textPrimary]}
            tintColor={colors.textPrimary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {visibleActiveTab === 'details' && (
          <DetailsTab
            competition={competition}
            rounds={rounds}
            playerCount={players.length}
            isPlayer={isPlayer}
            miniIndividual={miniIndividual}
            miniTeam={miniTeam}
            userTeamName={userTeamName}
            onOpenLeaderboard={handleOpenLeaderboardFromMini}
            isOrganizer={isOrganizer}
            prizePool={prizePool}
            prizePoolPlacements={prizePoolPlacements}
            teamPrizePool={teamPrizePool}
            teamPrizePoolPlacements={teamPrizePoolPlacements}
            isPrizePoolLocked={isPrizePoolLocked}
            onManagePrizePools={() =>
              navigation.navigate('CompetitionSettings', { competitionId: id })
            }
            onViewPrizePoolTransactions={
              prizePool || teamPrizePool ? () => setActiveTab('payouts') : undefined
            }
            onScoreRound={handleScoreRound}
            onViewRound={handleViewRound}
          />
        )}

        {visibleActiveTab === 'rounds' && (
          <RoundsTab
            rounds={rounds}
            isOrganizer={isOrganizer}
            competitionId={id}
            playerCount={players.length}
            onAddRound={handleAddRound}
            onScoreRound={handleScoreRound}
            onViewRound={handleViewRound}
            onQuickScore={isOrganizer && isSuperAdmin ? handleQuickScore : undefined}
            onManageScoringPairs={handleManageScoringPairs}
            onDeleteRound={isOrganizer ? handleDeleteRound : undefined}
            onReorder={isOrganizer ? handleReorderRounds : undefined}
            scoringPairsStatus={scoringPairsStatus}
            allScoredStatus={allScoredStatus}
            colors={colors}
          />
        )}

        {visibleActiveTab === 'players' && (
          <PlayersTab
            players={players}
            currentUserId={user?.id}
            isOrganizer={isOrganizer}
            onAddPlayers={handleAddPlayers}
            onRemovePlayer={handleRemovePlayer}
            removingPlayerId={
              removePlayerState.isChecking || removePlayerState.isRemoving
                ? null
                : null
            }
            colors={colors}
            competitionId={id}
            competitionName={competition.name}
            maxPlayers={competition.max_players ?? null}
            organizerIsPlayer={competition.organizer_is_player !== false}
            inviteCode={competition.invite_code}
          />
        )}

        {visibleActiveTab === 'teams' && competition.team_mode !== 'none' && (
          <TeamsTab
            competitionId={id}
            teams={teams || []}
            teamMode={competition.team_mode}
            playerCount={players.filter((p) => p.status === 'accepted').length}
            players={players}
            isLoading={isLoadingTeams}
            isOrganizer={isOrganizer}
            canEditTeamNames={isOrganizer}
            hasStartedRound={hasStartedRound}
            onUpdateTeam={handleUpdateTeam}
            colors={colors}
            currentUserId={user?.id}
          />
        )}

        {visibleActiveTab === 'stats' && showStatsTab && (
          <StatsTab competitionId={id} />
        )}

        {visibleActiveTab === 'leaderboard' && competition.competition_type !== 'knockout' && (
          <LeaderboardTab
            competitionId={id}
            teamMode={competition.team_mode}
            rounds={rounds}
            perRoundRulesEnabled={competition.per_round_rules_enabled ?? false}
            currentUserId={user?.id}
            onEntryPress={handleLeaderboardEntryPress}
            selectedView={leaderboardView}
            onViewChange={setLeaderboardView}
            scrollTarget={leaderboardScrollTarget}
            onScrollHandled={handleScrollHandled}
            renderInlineToggle={false}
          />
        )}

        {visibleActiveTab === 'bracket' && competition.competition_type === 'knockout' && (
          <BracketTab
            competitionId={id}
            knockoutConfig={competition.knockout_config}
            playerCount={players.length}
            currentUserId={user?.id}
            isOrganizer={isOrganizer}
            rounds={rounds}
          />
        )}

        {visibleActiveTab === 'payouts' && (prizePool || teamPrizePool) && (
          <PayoutsTab
            competition={competition}
            prizePool={prizePool}
            placements={prizePoolPlacements ?? []}
            teamPrizePool={teamPrizePool}
            teamPlacements={teamPrizePoolPlacements ?? []}
            isOrganizer={isOrganizer}
          />
        )}

        {visibleActiveTab === 'skins' && hasSkinsGames && (
          <SkinsTab competitionId={id} />
        )}

        {visibleActiveTab === 'breakdown' && showBreakdownTab && (
          <BreakdownTab
            competitionId={id}
            showRinger={showRingerTab}
            showContributions={showContributionsTab}
          />
        )}
      </ScrollView>

      {/* Add Players Bottom Sheet */}
      <AddPlayersBottomSheet
        visible={showAddPlayersSheet}
        onClose={() => setShowAddPlayersSheet(false)}
        competitionId={id}
        existingPlayerIds={players.map((p) => p.player_id)}
        maxPlayers={tierLimits?.maxPlayersPerCompetition ?? undefined}
        currentPlayerCount={players.length}
      />

      {/* Round Limit Upgrade Prompt */}
      <UpgradePrompt
        visible={showRoundUpgradePrompt}
        config={{
          feature: 'add_round',
          title: 'Round Limit Reached',
          message: 'Upgrade your subscription to add more rounds to your competitions.',
          targetTier: 'social',
          benefits: [
            'Add more rounds to your competitions',
            'Up to 3 rounds on Social',
            'Up to 10 rounds on Premium',
          ],
        }}
        onUpgrade={() => {
          setShowRoundUpgradePrompt(false);
          navigation.navigate('Subscription');
        }}
        onDismiss={() => setShowRoundUpgradePrompt(false)}
      />

      {/* Player Limit Upgrade Prompt */}
      <UpgradePrompt
        visible={showPlayerUpgradePrompt}
        config={{
          feature: 'add_player',
          title: 'Player Limit Reached',
          message: 'Upgrade your subscription to add more players to your competitions.',
          targetTier: 'social',
          benefits: [
            'Add more players to competitions',
            'Up to 12 players on Social',
            'Up to 40 players on Premium',
          ],
        }}
        onUpgrade={() => {
          setShowPlayerUpgradePrompt(false);
          navigation.navigate('Subscription');
        }}
        onDismiss={() => setShowPlayerUpgradePrompt(false)}
      />

      {/* Alert Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />

      {/* Remove Player Dialog */}
      <ConfirmationDialog {...removePlayerDialogConfig} onCancel={dismissRemovePlayerDialog} />

      {/* Delete Round Dialog */}
      <ConfirmationDialog
        visible={deleteRoundDialogVisible}
        title="Delete Round"
        message={`Are you sure you want to delete Round ${roundToDeleteDisplayNumber || ''}${
          roundToDelete?.course?.name ? ` at ${roundToDelete.course.name}` : ''
        }? All pairings, scores, and data will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={handleConfirmDeleteRound}
        onCancel={handleCancelDeleteRound}
        loading={isDeletingRound}
        icon="delete"
      />

      {/* Points Breakdown Modal */}
      {selectedLeaderboardEntry && (
        <PointsBreakdownModal
          visible={showPointsBreakdown}
          onClose={handleClosePointsBreakdown}
          participantName={selectedLeaderboardEntry.participantName}
          isTeam={selectedLeaderboardEntry.isTeam}
          totalPoints={selectedLeaderboardEntry.totalPoints}
          position={selectedLeaderboardEntry.position}
          roundsPlayed={selectedLeaderboardEntry.roundsPlayed}
          roundPoints={selectedLeaderboardEntry.roundPoints}
          rounds={rounds}
          onRoundPress={
            selectedLeaderboardEntry.isTeam
              ? undefined
              : (roundId) => {
                  const playerId = selectedLeaderboardEntry.participantId;
                  handleClosePointsBreakdown();
                  navigation.navigate('PlayerScorecard', { playerId, roundId });
                }
          }
          testID="points-breakdown-modal"
        />
      )}

      {/* Quick Score Player Picker */}
      <SelectionModal
        visible={quickScoreRoundId !== null}
        onClose={handleQuickScoreClose}
        onSelect={(player) => {
          if (completedPlayerIds.has(player.player_id)) return;
          handleQuickScorePlayerSelect(player.player_id);
        }}
        items={players}
        keyExtractor={(p) => p.player_id}
        renderItem={(player, selected) => {
          const isCompleted = completedPlayerIds.has(player.player_id);
          return (
            <SelectionItemRow
              label={player.player?.name ?? 'Unknown Player'}
              description={isCompleted ? 'Scorecard completed' : player.player?.handicap != null ? `Handicap: ${formatHandicapIndex(player.player.handicap)}` : undefined}
              selected={selected}
              disabled={isCompleted}
              icon={isCompleted ? 'check-circle' : 'account'}
              iconColor={isCompleted ? colors.success : undefined}
            />
          );
        }}
        searchable
        searchPlaceholder="Search players..."
        filterFn={(player, query) => {
          const q = query.toLowerCase();
          return (player.player?.name ?? '').toLowerCase().includes(q);
        }}
        title="Select Player"
        emptyMessage="No players found"
        testID="quick-score-player-picker"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  tabContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  pinnedLeaderboardToggle: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retryButtonLabel: {
    ...typography.bodyBold,
  },
});

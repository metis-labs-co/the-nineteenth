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
} from '@/components/competitions/detail';
import { useCompetitionSkinsGames } from '@/hooks/skins';
import { BracketTab } from '@/components/knockout';
import { PointsBreakdownModal, LeaderboardViewToggle } from '@/components/leaderboard';

import {
  useCompetitionDetailData,
  useCompetitionDetailHandlers,
  useDeleteCompetitionRound,
} from './hooks';

type Props = NativeStackScreenProps<RootStackParamList, 'CompetitionDetail'>;

type TabValue =
  | 'details'
  | 'rounds'
  | 'players'
  | 'teams'
  | 'leaderboard'
  | 'bracket'
  | 'stats'
  | 'payouts'
  | 'skins';

export default function CompetitionDetailScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const tierLimits = useTierLimits();
  const isSuperAdmin = useIsSuperAdmin();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabValue>('details');

  // Lifted leaderboard state — lets the mini-leaderboard tap-through select a view
  const [leaderboardView, setLeaderboardView] = useState<'individual' | 'team'>(
    'individual'
  );
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

  // Skins overview drives both the tab visibility and the tab content. We
  // fetch it up here so the conditional Tabs entry is in sync with the
  // payload `SkinsTab` consumes via the same hook below (TanStack dedupes
  // by query key).
  const { data: competitionSkinsGames } = useCompetitionSkinsGames(id);
  const hasSkinsGames = (competitionSkinsGames?.length ?? 0) > 0;

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
      roundsList.some((r) => r.game_type !== 'scramble')
    );
  }, [competitionData]);

  // Once the competition is live, surface standings earlier — leaderboard (or
  // bracket for knockouts) jumps to the 3rd tab so players can see results
  // without scrolling past Players/Teams/Stats.
  const promoteLeaderboard =
    competitionData?.competition.status === 'in-progress' ||
    competitionData?.competition.status === 'completed';

  // Mirrors the visibility logic inside LeaderboardTab so the pinned
  // Individual/Team toggle only renders when the inline one would have.
  const showLeaderboardToggle = useMemo(() => {
    if (!competitionData) return false;
    if (competitionData.competition.team_mode === 'none') return false;
    const roundsList = competitionData.rounds;
    const isAllScramble =
      roundsList.length > 0 &&
      roundsList.every((r) => r.team_format === 'scramble');
    return !isAllScramble;
  }, [competitionData]);

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

      {/* Tab Bar */}
      <Tabs
        tabs={[
          { key: 'details', label: 'Details' },
          { key: 'rounds', label: 'Rounds', count: rounds.length },
          ...(promoteLeaderboard
            ? [
                competition.competition_type === 'knockout'
                  ? ({ key: 'bracket', label: 'Bracket' } as const)
                  : ({ key: 'leaderboard', label: 'Leaderboard' } as const),
              ]
            : []),
          { key: 'players', label: 'Players', count: players.length },
          ...(competition.team_mode !== 'none' ? [{ key: 'teams' as const, label: 'Teams' }] : []),
          ...(showStatsTab ? [{ key: 'stats' as const, label: 'Stats' }] : []),
          ...(!promoteLeaderboard
            ? [
                competition.competition_type === 'knockout'
                  ? ({ key: 'bracket', label: 'Bracket' } as const)
                  : ({ key: 'leaderboard', label: 'Leaderboard' } as const),
              ]
            : []),
          ...(prizePool || teamPrizePool ? [{ key: 'payouts' as const, label: 'Payouts' }] : []),
          ...(hasSkinsGames
            ? [
                {
                  key: 'skins' as const,
                  label: 'Skins',
                  count: competitionSkinsGames?.length,
                },
              ]
            : []),
        ]}
        selectedTab={activeTab}
        onTabChange={setActiveTab}
        style={styles.tabContainer}
      />

      {/* Pinned leaderboard sub-tabs: render outside the ScrollView so the
          Individual/Team toggle stays visible while scrolling the standings. */}
      {activeTab === 'leaderboard' &&
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
        {activeTab === 'details' && (
          <DetailsTab
            competition={competition}
            rounds={rounds}
            playerCount={players.length}
            teams={teams || []}
            isPlayer={isPlayer}
            miniIndividual={miniIndividual}
            miniTeam={miniTeam}
            userTeamName={userTeamName}
            onOpenLeaderboard={handleOpenLeaderboardFromMini}
            isOrganizer={isOrganizer}
            hasStartedRound={hasStartedRound}
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
            onViewTeams={
              competition.team_mode !== 'none' ? () => setActiveTab('teams') : undefined
            }
            onScoreRound={handleScoreRound}
            onViewRound={handleViewRound}
          />
        )}

        {activeTab === 'rounds' && (
          <RoundsTab
            rounds={rounds}
            isOrganizer={isOrganizer}
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

        {activeTab === 'players' && (
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

        {activeTab === 'teams' && competition.team_mode !== 'none' && (
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

        {activeTab === 'stats' && showStatsTab && (
          <StatsTab competitionId={id} />
        )}

        {activeTab === 'leaderboard' && competition.competition_type !== 'knockout' && (
          <LeaderboardTab
            competitionId={id}
            teamMode={competition.team_mode}
            rounds={rounds}
            currentUserId={user?.id}
            onEntryPress={handleLeaderboardEntryPress}
            selectedView={leaderboardView}
            onViewChange={setLeaderboardView}
            scrollTarget={leaderboardScrollTarget}
            onScrollHandled={handleScrollHandled}
            renderInlineToggle={false}
          />
        )}

        {activeTab === 'bracket' && competition.competition_type === 'knockout' && (
          <BracketTab
            competitionId={id}
            knockoutConfig={competition.knockout_config}
            playerCount={players.length}
            currentUserId={user?.id}
            isOrganizer={isOrganizer}
            rounds={rounds}
          />
        )}

        {activeTab === 'payouts' && (prizePool || teamPrizePool) && (
          <PayoutsTab
            competition={competition}
            prizePool={prizePool}
            placements={prizePoolPlacements ?? []}
            teamPrizePool={teamPrizePool}
            teamPlacements={teamPrizePoolPlacements ?? []}
            isOrganizer={isOrganizer}
          />
        )}

        {activeTab === 'skins' && hasSkinsGames && (
          <SkinsTab competitionId={id} />
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

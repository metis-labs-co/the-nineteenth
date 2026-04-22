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

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import AddPlayersBottomSheet from '@/components/competitionWizard/AddPlayersBottomSheet';
import { EditPrizePoolBottomSheet } from '@/components/prizePool';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useTierLimits, useIsSuperAdmin } from '@/context/SubscriptionContext';
import { UpgradePrompt } from '@/components/subscription';
import { PageHeader, Tabs, ConfirmationDialog } from '@/components/common';
import { SelectionModal, SelectionItemRow } from '@/components/common/SelectionModal';
import { useRoundScorecards } from '@/hooks/useRoundDetails';
import {
  DetailsTab,
  RoundsTab,
  PlayersTab,
  TeamsTab,
  LeaderboardTab,
  StatsTab,
  PayoutsTab,
} from '@/components/competitions/detail';
import { BracketTab } from '@/components/knockout';
import { PointsBreakdownModal } from '@/components/leaderboard';

import {
  useCompetitionDetailData,
  useCompetitionDetailHandlers,
  usePrizePoolManagement,
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
  | 'payouts';

export default function CompetitionDetailScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const tierLimits = useTierLimits();
  const isSuperAdmin = useIsSuperAdmin();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabValue>('details');

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
    refetchPrizePool,
    prizePoolPlacements,
    scoringPairsStatus,
    allScoredStatus,
    isOrganizer,
    hasStartedRound,
    isPrizePoolLocked,
    currentStanding,
    refetchLeaderboard,
    refetchTeams,
  } = useCompetitionDetailData(id);

  // Handlers hook
  const {
    dialogConfig,
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
    handleUpdateTeamName,
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

  // Prize pool management
  const {
    showPrizePoolSheet,
    setShowPrizePoolSheet,
    handleAddPrizePool,
    handleEditPrizePool,
    handlePrizePoolSuccess,
    handleViewPrizePoolTransactions,
  } = usePrizePoolManagement({ refetchPrizePool });

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          { key: 'players', label: 'Players', count: players.length },
          ...(competition.team_mode !== 'none' ? [{ key: 'teams' as const, label: 'Teams' }] : []),
          ...(showStatsTab ? [{ key: 'stats' as const, label: 'Stats' }] : []),
          ...(competition.competition_type === 'knockout'
            ? [{ key: 'bracket' as const, label: 'Bracket' }]
            : [{ key: 'leaderboard' as const, label: 'Leaderboard' }]),
          ...(prizePool ? [{ key: 'payouts' as const, label: 'Payouts' }] : []),
        ]}
        selectedTab={activeTab}
        onTabChange={setActiveTab}
        style={styles.tabContainer}
      />

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
            currentStanding={currentStanding}
            isOrganizer={isOrganizer}
            hasStartedRound={hasStartedRound}
            prizePool={prizePool}
            prizePoolPlacements={prizePoolPlacements}
            isPrizePoolLocked={isPrizePoolLocked}
            onAddPrizePool={handleAddPrizePool}
            onEditPrizePool={handleEditPrizePool}
            onViewPrizePoolTransactions={handleViewPrizePoolTransactions}
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
          />
        )}

        {activeTab === 'teams' && competition.team_mode !== 'none' && (
          <TeamsTab
            competitionId={id}
            teams={teams || []}
            teamMode={competition.team_mode}
            playerCount={players.filter((p) => p.status === 'accepted').length}
            isLoading={isLoadingTeams}
            isOrganizer={isOrganizer}
            canEditTeamNames={isOrganizer}
            onUpdateTeamName={handleUpdateTeamName}
            colors={colors}
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
          />
        )}

        {activeTab === 'bracket' && competition.competition_type === 'knockout' && (
          <BracketTab
            competitionId={id}
            knockoutConfig={competition.knockout_config}
            playerCount={players.length}
            currentUserId={user?.id}
            isOrganizer={isOrganizer}
          />
        )}

        {activeTab === 'payouts' && prizePool && (
          <PayoutsTab
            competition={competition}
            prizePool={prizePool}
            placements={prizePoolPlacements ?? []}
            isOrganizer={isOrganizer}
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

      {/* Edit Prize Pool Bottom Sheet */}
      <EditPrizePoolBottomSheet
        visible={showPrizePoolSheet}
        onClose={() => setShowPrizePoolSheet(false)}
        competitionId={id}
        playerCount={players.length}
        roundCount={rounds.length}
        hasStartedRound={hasStartedRound}
        onSuccess={handlePrizePoolSuccess}
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
              description={isCompleted ? 'Scorecard completed' : player.player?.handicap != null ? `Handicap: ${player.player.handicap}` : undefined}
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

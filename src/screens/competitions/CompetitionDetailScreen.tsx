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

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConfirmationDialog, useCompetitionDetailsData, getCurrentPlayerStanding } from '@/hooks';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import AddPlayersBottomSheet from '@/components/competitionWizard/AddPlayersBottomSheet';
import { EditPrizePoolBottomSheet } from '@/components/prizePool';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext, useTierLimits } from '@/context/SubscriptionContext';
import { UpgradePrompt } from '@/components/subscription';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompetitionLeaderboard, type CompetitionLeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';
import { useTeams, useUpdateTeamName } from '@/hooks/useTeams';
import { useRemoveCompetitionPlayer } from '@/hooks/useRemoveCompetitionPlayer';
import { useCompetitionPrizePool, usePoolAllocationSummary } from '@/hooks/usePrizePool';
import { scoringPairsKeys } from '@/hooks/queryKeys';
import { getRoundScoringPairs } from '@/services/scoringPairs';
import { PageHeader, Tabs, ConfirmationDialog } from '@/components/common';
import {
  DetailsTab,
  RoundsTab,
  PlayersTab,
  TeamsTab,
  LeaderboardTab,
} from '@/components/competitions/detail';
import { BracketTab } from '@/components/knockout';
import { PointsBreakdownModal } from '@/components/leaderboard';

type Props = NativeStackScreenProps<RootStackParamList, 'CompetitionDetail'>;

type TabValue = 'details' | 'rounds' | 'players' | 'teams' | 'leaderboard' | 'bracket';

export default function CompetitionDetailScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabValue>('details');

  // Delete competition state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add players bottom sheet state
  const [showAddPlayersSheet, setShowAddPlayersSheet] = useState(false);

  // Prize pool bottom sheet state
  const [showPrizePoolSheet, setShowPrizePoolSheet] = useState(false);

  // Upgrade prompt state for round limits
  const [showRoundUpgradePrompt, setShowRoundUpgradePrompt] = useState(false);

  // Upgrade prompt state for player limits
  const [showPlayerUpgradePrompt, setShowPlayerUpgradePrompt] = useState(false);

  // Points breakdown modal state
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false);
  const [selectedLeaderboardEntry, setSelectedLeaderboardEntry] = useState<CompetitionLeaderboardEntry | null>(null);

  // Subscription context for tier limit checks
  const { checkCanAddRound, checkCanAddPlayer } = useSubscriptionContext();
  const tierLimits = useTierLimits();

  // Dialog state for alerts
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  // Fetch competition details
  const {
    data: competitionData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCompetitionDetailsData(id);

  // Fetch leaderboard data (individuals filter for current standing)
  const {
    data: leaderboard,
    refetch: refetchLeaderboard,
  } = useCompetitionLeaderboard(id, { filter: 'individuals' });

  // Fetch teams data
  const {
    data: teams,
    isLoading: isLoadingTeams,
    refetch: refetchTeams,
  } = useTeams(id);

  // Fetch prize pool data
  const {
    data: prizePool,
    refetch: refetchPrizePool,
  } = useCompetitionPrizePool(id);

  // Fetch prize pool allocation summary
  const { data: prizePoolSummary } = usePoolAllocationSummary(id);

  // Team name update hook
  const { mutate: updateTeamNameMutation } = useUpdateTeamName();

  // Player removal hook
  const {
    state: removePlayerState,
    removePlayer: initiateRemovePlayer,
    dialogConfig: removePlayerDialogConfig,
    dismissDialog: dismissRemovePlayerDialog,
  } = useRemoveCompetitionPlayer({
    competitionId: id,
    onSuccess: (playerId, affectedRoundIds) => {
      // Refresh data after removal
      refetch();
      refetchLeaderboard();
      refetchTeams();

      // Notify organizer about affected rounds
      if (affectedRoundIds.length > 0) {
        showAlert(
          'Player Removed',
          `The player has been removed. ${affectedRoundIds.length} round${affectedRoundIds.length !== 1 ? 's' : ''} had scoring pair assignments that were deleted. Please re-configure scoring pairs for affected rounds.`
        );
      }
    },
    onError: (error) => {
      showAlert('Error', error.message || 'Failed to remove player');
    },
  });

  // Get rounds that require scoring pairs (only when user is organizer)
  const roundsRequiringScoringPairs = useMemo(() => {
    if (!competitionData?.rounds) return [];
    return competitionData.rounds.filter((r) => r.scoring_pairs_required);
  }, [competitionData?.rounds]);

  // Fetch scoring pairs status for rounds that require them
  const scoringPairsQueries = useQueries({
    queries: roundsRequiringScoringPairs.map((round) => ({
      queryKey: scoringPairsKeys.list(round.id),
      queryFn: () => getRoundScoringPairs(round.id),
      enabled: !!round.id,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });

  // Build a map of roundId -> hasPairs (true if pairs exist)
  const scoringPairsStatus = useMemo(() => {
    const status: Record<string, boolean> = {};
    roundsRequiringScoringPairs.forEach((round, index) => {
      const query = scoringPairsQueries[index];
      status[round.id] = (query?.data?.length ?? 0) > 0;
    });
    return status;
  }, [roundsRequiringScoringPairs, scoringPairsQueries]);

  // Check if current user is the organizer
  const isOrganizer = useMemo(() => {
    if (!competitionData?.competition || !user) return false;
    return competitionData.competition.organizer_id === user.id;
  }, [competitionData?.competition, user]);

  // Check if any round has started (for prize pool lock status)
  const hasStartedRound = useMemo(() => {
    if (!competitionData?.rounds) return false;
    return competitionData.rounds.some(
      (r) => r.status === 'in-progress' || r.status === 'completed'
    );
  }, [competitionData?.rounds]);

  // Check if prize pool is locked
  const isPrizePoolLocked = useMemo(() => {
    return !!prizePool?.is_locked || hasStartedRound;
  }, [prizePool?.is_locked, hasStartedRound]);

  // Get current player's standing (for non-organizers)
  const currentStanding = useMemo(
    () => getCurrentPlayerStanding(leaderboard, user?.id),
    [leaderboard, user?.id]
  );

  // Note: Auto-split skins creation is now handled automatically by:
  // - usePrizePool mutations (on pool save)
  // - useAddRoundForm (on round add)
  // - useDeleteRound/useRoundActions (on round delete)
  // These call the `redistribute_skins_pots` RPC which handles all skins game creation.

  // Handle navigation
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEdit = useCallback(() => {
    navigation.navigate('EditCompetition', { id });
  }, [navigation, id]);

  const handleAddRound = useCallback(() => {
    // Get current round count from competition data
    const currentRoundCount = competitionData?.rounds?.length ?? 0;

    // Check if user can add another round based on their subscription tier
    const access = checkCanAddRound(id, currentRoundCount);

    if (!access.allowed) {
      // Show upgrade prompt instead of navigating
      setShowRoundUpgradePrompt(true);
      return;
    }

    // Allowed - navigate to add round screen
    navigation.navigate('AddRound', { competitionId: id });
  }, [navigation, id, competitionData?.rounds?.length, checkCanAddRound]);

  const handleAddPlayers = useCallback(() => {
    // Get current player count from competition data
    const currentPlayerCount = competitionData?.players?.length ?? 0;

    // Check if user can add more players based on their subscription tier
    const access = checkCanAddPlayer(id, currentPlayerCount);

    if (!access.allowed) {
      // Show upgrade prompt instead of opening bottom sheet
      setShowPlayerUpgradePrompt(true);
      return;
    }

    // Allowed - open the add players bottom sheet
    setShowAddPlayersSheet(true);
  }, [id, competitionData?.players?.length, checkCanAddPlayer]);

  const handleRemovePlayer = useCallback(
    (playerId: string, playerName: string) => {
      initiateRemovePlayer(playerId, playerName);
    },
    [initiateRemovePlayer]
  );

  const handleScoreRound = useCallback(
    (roundId: string, gameType: string, isTeamRound: boolean) => {
      // Route to appropriate scoring screen based on game type
      if (gameType === 'match-play') {
        if (isTeamRound) {
          // Team match play goes to TeamMatchPlayScoring
          navigation.navigate('TeamMatchPlayScoring', {
            roundId,
            // TODO: Pass actual team IDs from round pairings
            team1Id: undefined,
            team2Id: undefined,
          });
        } else {
          // Individual match play goes to MatchPlayScoring
          navigation.navigate('MatchPlayScoring', {
            roundId,
            // TODO: Pass actual player IDs from round pairings
            player1Id: undefined,
            player2Id: undefined,
          });
        }
      } else {
        navigation.navigate('Scorecard', { roundId, competitionId: id });
      }
    },
    [navigation, id]
  );

  const handleViewRound = useCallback(
    (roundId: string) => {
      navigation.navigate('ViewRound', { roundId, competitionId: id });
    },
    [navigation, id]
  );

  const handleManageTeams = useCallback(() => {
    navigation.navigate('TeamManagement', { competitionId: id });
  }, [navigation, id]);

  const handleUpdateTeamName = useCallback(
    (teamId: string, newName: string) => {
      updateTeamNameMutation(
        { teamId, competitionId: id, name: newName },
        {
          onError: (error) => {
            showAlert('Error', error.message || 'Failed to update team name');
          },
        }
      );
    },
    [updateTeamNameMutation, id, showAlert]
  );

  const handleManageScoringPairs = useCallback(
    (roundId: string) => {
      navigation.navigate('ScoringPairs', { roundId, competitionId: id });
    },
    [navigation, id]
  );

  // Prize pool handlers
  const handleAddPrizePool = useCallback(() => {
    setShowPrizePoolSheet(true);
  }, []);

  const handleEditPrizePool = useCallback(() => {
    setShowPrizePoolSheet(true);
  }, []);

  const handlePrizePoolSuccess = useCallback(() => {
    refetchPrizePool();
  }, [refetchPrizePool]);

  const handleViewPrizePoolTransactions = useCallback(() => {
    // TODO: Navigate to prize pool transactions screen
    // For now, this is a placeholder - could open a modal or navigate to a new screen
    console.log('View prize pool transactions - not implemented');
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    refetchLeaderboard();
    refetchTeams();
    refetchPrizePool();
  }, [refetch, refetchLeaderboard, refetchTeams, refetchPrizePool]);

  // Handle leaderboard entry press to show points breakdown
  const handleLeaderboardEntryPress = useCallback((entry: CompetitionLeaderboardEntry) => {
    setSelectedLeaderboardEntry(entry);
    setShowPointsBreakdown(true);
  }, []);

  const handleClosePointsBreakdown = useCallback(() => {
    setShowPointsBreakdown(false);
    setSelectedLeaderboardEntry(null);
  }, []);

  const handleDeleteCompetition = useCallback(async () => {
    setIsDeleting(true);
    try {
      // Use the soft_delete_competition database function
      // This sets deleted_at on the competition and all related data
      // Note: Type assertion needed as generated types may not include this function yet
      const { error } = await supabase.rpc(
        'soft_delete_competition' as never,
        { p_competition_id: id } as never
      );

      if (error) {
        throw error;
      }

      // Invalidate competitions list cache (both myCompetitions and joinedCompetitions)
      queryClient.invalidateQueries({ queryKey: ['myCompetitions'] });
      queryClient.invalidateQueries({ queryKey: ['joinedCompetitions'] });

      // Close dialog and navigate back
      setShowDeleteDialog(false);
      navigation.goBack();
    } catch (error: unknown) {
      setIsDeleting(false);
      showAlert(
        'Error',
        error instanceof Error ? error.message : 'Failed to delete competition. Please try again.'
      );
    }
  }, [id, navigation, queryClient, showAlert]);

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
                  icon: 'delete-outline',
                  onPress: () => setShowDeleteDialog(true),
                  accessibilityLabel: 'Delete competition',
                  color: colors.error,
                },
              ]
            : []
        }
      />

      {/* Tab Bar */}
      <Tabs
        tabs={[
          { key: 'details', label: 'Details' },
          { key: 'rounds', label: 'Rounds' },
          { key: 'players', label: 'Players' },
          ...(competition.team_mode !== 'none' ? [{ key: 'teams' as const, label: 'Teams' }] : []),
          ...(competition.competition_type === 'knockout'
            ? [{ key: 'bracket' as const, label: 'Bracket' }]
            : [{ key: 'leaderboard' as const, label: 'Leaderboard' }]),
        ]}
        selectedTab={activeTab}
        onTabChange={setActiveTab}
        scrollable
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
            prizePool={prizePool}
            prizePoolSummary={prizePoolSummary}
            isPrizePoolLocked={isPrizePoolLocked}
            onEdit={handleEdit}
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
            onManageScoringPairs={handleManageScoringPairs}
            scoringPairsStatus={scoringPairsStatus}
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
                ? null // We don't track specific player during check/remove since Alert handles loading
                : null
            }
            colors={colors}
            competitionId={id}
            competitionName={competition.name}
          />
        )}

        {activeTab === 'teams' && competition.team_mode !== 'none' && (
          <TeamsTab
            teams={teams || []}
            teamMode={competition.team_mode}
            isLoading={isLoadingTeams}
            isOrganizer={isOrganizer}
            canEditTeamNames={isOrganizer}
            onManageTeams={handleManageTeams}
            onUpdateTeamName={handleUpdateTeamName}
            colors={colors}
          />
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
            'Up to 16 players on Social',
            'Up to 40 players on Premium',
          ],
        }}
        onUpgrade={() => {
          setShowPlayerUpgradePrompt(false);
          navigation.navigate('Subscription');
        }}
        onDismiss={() => setShowPlayerUpgradePrompt(false)}
      />

      {/* Delete Competition Confirmation Dialog */}
      <ConfirmationDialog
        visible={showDeleteDialog}
        title="Delete Competition"
        message="Are you sure you want to delete this competition? All rounds, scores, and player data will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        icon="alert-circle-outline"
        onConfirm={handleDeleteCompetition}
        onCancel={() => setShowDeleteDialog(false)}
        loading={isDeleting}
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

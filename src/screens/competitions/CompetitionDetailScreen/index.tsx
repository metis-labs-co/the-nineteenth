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

import React, { useState } from 'react';
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
import { useTierLimits } from '@/context/SubscriptionContext';
import { UpgradePrompt } from '@/components/subscription';
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

import {
  useCompetitionDetailData,
  useCompetitionDetailHandlers,
  usePrizePoolManagement,
  useDeleteCompetition,
} from './hooks';

type Props = NativeStackScreenProps<RootStackParamList, 'CompetitionDetail'>;

type TabValue = 'details' | 'rounds' | 'players' | 'teams' | 'leaderboard' | 'bracket';

export default function CompetitionDetailScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const tierLimits = useTierLimits();

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
    handleBack,
    handleEdit,
    handleAddRound,
    handleAddPlayers,
    handleRemovePlayer,
    handleScoreRound,
    handleViewRound,
    handleManageTeams,
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

  // Prize pool management
  const {
    showPrizePoolSheet,
    setShowPrizePoolSheet,
    handleAddPrizePool,
    handleEditPrizePool,
    handlePrizePoolSuccess,
    handleViewPrizePoolTransactions,
  } = usePrizePoolManagement({ refetchPrizePool });

  // Delete competition
  const {
    showDeleteDialog,
    setShowDeleteDialog,
    isDeleting,
    handleDeleteCompetition,
  } = useDeleteCompetition({
    id,
    onDeleted: () => navigation.goBack(),
    showAlert,
  });

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
            prizePoolPlacements={prizePoolPlacements}
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

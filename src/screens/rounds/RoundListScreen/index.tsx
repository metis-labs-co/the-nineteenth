/**
 * RoundsScreen - Main tab screen showing active rounds to score
 *
 * Features:
 * - "Score New Round" floating button at top
 * - List of active rounds needing to be scored
 * - Links to score entry screen
 * - Pull-to-refresh for updating rounds
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext, useIsPremium } from '@/context/SubscriptionContext';
import { ConfirmationDialog, LoadingSpinner } from '@/components/common';
import { SelectionModal, SelectionItemRow } from '@/components/common/SelectionModal';
import { ScreenWelcomeModal } from '@/components/common/ScreenWelcomeModal';
import { RoundListCard } from '@/components/rounds';
import { useAuth } from '@/hooks/useAuth';
import { useScreenWelcome } from '@/hooks/useScreenWelcome';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import { spacing } from '@/constants/theme';
import { formatDateWithWeekday } from '@/utils/formatting';
import CreateRoundBottomSheet from '../CreateRoundBottomSheet';

import { useRoundList, useRoundFilters, useRoundActions, useStartNewRound, useQuickScoreFlow } from './hooks';
import { RoundListEmpty, RoundListHeader } from './components';
import type { RoundItem, RoundPlayerInfo } from './types';

export default function RoundsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { limits } = useSubscriptionContext();
  const isPremium = useIsPremium();

  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  // Welcome modal
  const { isModalVisible, dismissModal, showModal, isFirstVisit, content: welcomeContent } = useScreenWelcome('rounds');

  // Get tier limit for rounds played
  const maxRoundsPlayed = limits?.maxRoundsPlayed ?? 20;
  const hasUnlimitedRounds = isUnlimited(maxRoundsPlayed) || isNoLimit(maxRoundsPlayed);

  // Hooks for data and state management
  const { rounds, isLoading, isRefetching, refetch, roundsPlayedCount } = useRoundList();
  const { selectedTab, setSelectedTab, roundTypeFilter, setRoundTypeFilter, displayedRounds, activeRounds, historyRounds } = useRoundFilters(rounds);
  const {
    handleScoreRound,
    handleDeleteRound,
    handleConfirmDelete,
    handleCancelDelete,
    deleteDialogVisible,
    roundToDelete,
    isDeleting,
    dialogConfig: actionsDialogConfig,
    dismissDialog: dismissActionsDialog,
  } = useRoundActions();

  const {
    handleStartNewRound,
    dialogConfig: startRoundDialogConfig,
    dismissDialog: dismissStartRoundDialog,
  } = useStartNewRound(() => {
    setIsBottomSheetVisible(false);
  });

  // Quick Score flow (premium only)
  const quickScore = useQuickScoreFlow();

  // Players for the selected quick score round
  const selectedRoundPlayers = useMemo(() => {
    if (!quickScore.quickScoreRoundId) return [];
    const round = activeRounds.find((r) => r.id === quickScore.quickScoreRoundId);
    return round?.players ?? [];
  }, [quickScore.quickScoreRoundId, activeRounds]);

  // Refetch rounds when screen is focused (e.g., navigating back from scoring)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleOpenNewRound = useCallback(() => {
    setIsBottomSheetVisible(true);
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  const renderRoundItem = ({ item }: { item: RoundItem }) => (
    <RoundListCard
      round={item}
      onPress={() => handleScoreRound(item)}
      onDelete={handleDeleteRound}
      swipeEnabled={true}
      actionLabel={selectedTab === 'active' ? 'Score' : 'View'}
      currentUserId={user?.id}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RoundListHeader
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        roundTypeFilter={roundTypeFilter}
        onRoundTypeFilterChange={setRoundTypeFilter}
        activeRounds={activeRounds}
        historyRounds={historyRounds}
        onOpenNewRound={handleOpenNewRound}
        hasUnlimitedRounds={hasUnlimitedRounds}
        roundsPlayedCount={roundsPlayedCount}
        maxRoundsPlayed={maxRoundsPlayed}
        showInfoIcon={!isFirstVisit}
        onInfoPress={showModal}
        onQuickScore={isPremium ? quickScore.openRoundPicker : undefined}
      />

      {/* Scrollable Rounds List */}
      {isLoading ? (
        <LoadingSpinner size="md" message="Loading rounds..." />
      ) : (
        <FlatList
          data={displayedRounds}
          renderItem={renderRoundItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<RoundListEmpty selectedTab={selectedTab} />}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.textPrimary} colors={[colors.textPrimary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Sheet */}
      <CreateRoundBottomSheet
        visible={isBottomSheetVisible}
        onClose={handleCloseBottomSheet}
        onStartRound={handleStartNewRound}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title="Delete Round"
        message={`Are you sure you want to delete this round at ${roundToDelete?.course.name ?? 'this course'}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={isDeleting}
        icon="delete"
      />

      {/* Round Actions Error Dialog */}
      <ConfirmationDialog {...actionsDialogConfig} onCancel={dismissActionsDialog} />

      {/* Start Round Error Dialog */}
      <ConfirmationDialog {...startRoundDialogConfig} onCancel={dismissStartRoundDialog} />

      {/* Welcome Info Modal */}
      <ScreenWelcomeModal
        visible={isModalVisible}
        content={welcomeContent}
        onDismiss={dismissModal}
        testID="rounds-welcome-modal"
      />

      {/* Quick Score: Round Picker */}
      <SelectionModal
        visible={quickScore.showRoundPicker}
        onClose={quickScore.closeRoundPicker}
        onSelect={(round: RoundItem) => quickScore.handleRoundSelect(round.id)}
        items={activeRounds}
        keyExtractor={(r) => r.id}
        renderItem={(round) => (
          <SelectionItemRow
            label={round.course.name}
            description={`${round.gameType.replace(/_/g, ' ')}${round.date ? ` · ${formatDateWithWeekday(typeof round.date === 'string' ? round.date : round.date.toISOString())}` : ''}`}
            selected={false}
            icon="golf"
          />
        )}
        title="Select Round"
        emptyMessage="No active rounds"
        testID="quick-score-round-picker"
      />

      {/* Quick Score: Player Picker */}
      <SelectionModal
        visible={quickScore.quickScoreRoundId !== null}
        onClose={quickScore.handlePlayerPickerClose}
        onSelect={(player: RoundPlayerInfo) => {
          if (quickScore.completedPlayerIds.has(player.id)) return;
          quickScore.handlePlayerSelect(player.id);
        }}
        items={selectedRoundPlayers}
        keyExtractor={(p) => p.id}
        renderItem={(player) => {
          const isCompleted = quickScore.completedPlayerIds.has(player.id);
          return (
            <SelectionItemRow
              label={player.name}
              description={isCompleted ? 'Scorecard completed' : undefined}
              selected={false}
              disabled={isCompleted}
              icon={isCompleted ? 'check-circle' : 'account'}
            />
          );
        }}
        searchable
        searchPlaceholder="Search players..."
        filterFn={(player, query) => player.name.toLowerCase().includes(query.toLowerCase())}
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  separator: {
    height: spacing.md,
  },
});

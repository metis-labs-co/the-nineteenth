/**
 * RoundsScreen - Main tab screen showing active rounds to score
 *
 * Features:
 * - "Score New Round" floating button at top
 * - List of active rounds needing to be scored
 * - Links to score entry screen
 * - Pull-to-refresh for updating rounds
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { ConfirmationDialog } from '@/components/common';
import { RoundListCard } from '@/components/rounds';
import { useAuth } from '@/hooks/useAuth';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import { spacing } from '@/constants/theme';
import CreateRoundBottomSheet from '../CreateRoundBottomSheet';

import { useRoundList, useRoundFilters, useRoundActions, useStartNewRound } from './hooks';
import { RoundListEmpty, RoundListHeader } from './components';
import type { RoundItem } from './types';

export default function RoundsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { limits } = useSubscriptionContext();

  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  // Get tier limit for rounds played
  const maxRoundsPlayed = limits?.maxRoundsPlayed ?? 20;
  const hasUnlimitedRounds = isUnlimited(maxRoundsPlayed) || isNoLimit(maxRoundsPlayed);

  // Hooks for data and state management
  const { rounds, isLoading, isRefetching, refetch, roundsPlayedCount } = useRoundList();
  const { selectedTab, setSelectedTab, displayedRounds, activeRounds, historyRounds } = useRoundFilters(rounds);
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
        activeRounds={activeRounds}
        historyRounds={historyRounds}
        onOpenNewRound={handleOpenNewRound}
        hasUnlimitedRounds={hasUnlimitedRounds}
        roundsPlayedCount={roundsPlayedCount}
        maxRoundsPlayed={maxRoundsPlayed}
      />

      {/* Scrollable Rounds List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading rounds...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedRounds}
          renderItem={renderRoundItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<RoundListEmpty selectedTab={selectedTab} />}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
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
  loadingContainer: {
    flex: 1,
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
});

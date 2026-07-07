/**
 * RoundsScreen - Main tab screen showing active rounds to score
 *
 * Features:
 * - "Score New Round" floating button at top
 * - "In Progress" section with rounds needing to be scored
 * - "Recent Rounds" section with completed rounds and type filters
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
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext, useIsSuperAdmin } from '@/context/SubscriptionContext';
import { useNotificationContext } from '@/context/NotificationContext';
import { ConfirmationDialog, LoadingSpinner } from '@/components/common';
import { SelectionModal, SelectionItemRow } from '@/components/common/SelectionModal';
import { ScreenWelcomeModal } from '@/components/common/ScreenWelcomeModal';
import { BottomNavigation, type NavigationTab } from '@/components/layout';
import { RoundListCard } from '@/components/rounds';
import { useAuth } from '@/hooks/useAuth';
import { useInProgressRounds } from '@/hooks/home';
import { useScreenWelcome } from '@/hooks/useScreenWelcome';
import type { GameType } from '@/types/database.types';
import type { RoundWithCourse } from '@/components/competitions/detail/types';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import { spacing } from '@/constants/theme';
import { formatDateWithWeekday } from '@/utils/formatting';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import CreateRoundBottomSheet from '../CreateRoundBottomSheet';

import { useLeagues } from '@/hooks/useLeagues';
import { TagToLeagueBottomSheet } from '@/components/leagues/TagToLeagueBottomSheet';

import { useRoundList, useRoundFilters, useRoundActions, useStartNewRound, useScheduleRound, useQuickScoreFlow } from './hooks';
import { RoundListEmpty, RoundListHeader, RoundListSections } from './components';
import type { RoundItem, RoundPlayerInfo } from './types';

export default function RoundsScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AllRounds'>>();
  const initialFilter = route.params?.initialFilter ?? 'all';
  const { user } = useAuth();
  const { limits } = useSubscriptionContext();
  const isSuperAdmin = useIsSuperAdmin();
  const { unreadCount } = useNotificationContext();

  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  // Welcome modal
  const { isModalVisible, dismissModal, showModal, isFirstVisit, content: welcomeContent } = useScreenWelcome('rounds');

  // Get tier limit for rounds played
  const maxRoundsPlayed = limits?.maxRoundsPlayed ?? 20;
  const hasUnlimitedRounds = isUnlimited(maxRoundsPlayed) || isNoLimit(maxRoundsPlayed);

  // League tagging: the swipe action only shows when the tier permits leagues
  // and the user actually has an active league to tag into.
  const maxLeaguesOwned = limits?.maxLeaguesOwned ?? 0;
  const tierAllowsLeagues =
    isUnlimited(maxLeaguesOwned) || isNoLimit(maxLeaguesOwned) || maxLeaguesOwned > 0;
  const { data: leagues } = useLeagues();
  const hasActiveLeague = useMemo(
    () => (leagues ?? []).some((l) => l.status === 'active'),
    [leagues]
  );
  const canTagToLeague = tierAllowsLeagues && hasActiveLeague;
  const [tagScorecardId, setTagScorecardId] = useState<string | null>(null);

  // Hooks for data and state management
  const { rounds, isLoading, isRefetching, refetch, roundsPlayedCount } = useRoundList();
  const { roundTypeFilter, setRoundTypeFilter, filteredHistoryRounds, activeRounds } = useRoundFilters(rounds, initialFilter);

  // In-progress rounds in the RoundWithCourse shape the shared
  // InProgressRoundSection carousel expects. This screen only lists
  // standalone rounds, so competition rounds are filtered out.
  const { data: inProgressData, refetch: refetchInProgress } = useInProgressRounds();
  const inProgressRounds = useMemo(
    () => (inProgressData ?? []).filter((r) => !r.competition_id),
    [inProgressData]
  );

  // Active rounds not yet started keep the standard list card
  const upcomingRounds = useMemo(
    () => activeRounds.filter((r) => r.status !== 'in-progress'),
    [activeRounds]
  );

  const handleRefresh = useCallback(() => {
    refetch();
    refetchInProgress();
  }, [refetch, refetchInProgress]);

  const {
    handleScoreRound,
    handleDeleteRound,
    handleConfirmDelete,
    handleCancelDelete,
    deleteDialogVisible,
    roundToDelete,
    isDeleting,
    pendingDeleteIsCancel,
    dialogConfig: actionsDialogConfig,
    dismissDialog: dismissActionsDialog,
  } = useRoundActions(handleRefresh);

  // Bridge the carousel's RoundWithCourse shape into the screen's delete flow.
  const handleDeleteInProgressRound = useCallback(
    (round: RoundWithCourse) => {
      const item = activeRounds.find((r) => r.id === round.id);
      if (item) {
        handleDeleteRound(item);
        return;
      }
      // The carousel and list queries load independently; build a minimal
      // item so the confirm dialog still works if they're briefly out of sync.
      handleDeleteRound({
        id: round.id,
        course: {
          id: round.course?.id ?? '',
          name: round.course?.name ?? 'Unknown Course',
        },
        competition: round.competition ?? undefined,
        status: round.status,
        gameType: round.game_type,
        isStandalone: true,
        roundNumber: round.round_number ?? 1,
        totalRounds: 1,
        holesCompleted: 0,
        totalHoles: 18,
      });
    },
    [activeRounds, handleDeleteRound]
  );

  const {
    handleStartNewRound,
    dialogConfig: startRoundDialogConfig,
    dismissDialog: dismissStartRoundDialog,
  } = useStartNewRound(() => {
    setIsBottomSheetVisible(false);
  });

  const {
    handleScheduleRound,
    dialogConfig: scheduleRoundDialogConfig,
    dismissDialog: dismissScheduleRoundDialog,
  } = useScheduleRound(() => {
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
      refetchInProgress();
    }, [refetch, refetchInProgress])
  );

  // Resume scoring from the in-progress carousel. Mirrors handleScoreRound's
  // routing for active rounds, keyed off the carousel's callback shape.
  const handleResumeRound = useCallback(
    (roundId: string, gameType: GameType, isTeamRound: boolean) => {
      if (gameType === 'match-play') {
        if (isTeamRound) {
          navigation.navigate('TeamMatchPlayScoring', { roundId });
        } else {
          navigation.navigate('MatchPlayScoring', { roundId });
        }
        return;
      }
      navigation.navigate('Scorecard', { roundId, competitionId: 'standalone' });
    },
    [navigation]
  );

  const handleViewRound = useCallback(
    (roundId: string) => {
      navigation.navigate('ViewRound', { roundId, competitionId: undefined });
    },
    [navigation]
  );

  // Upcoming scheduled rounds navigate to the detail/start-day screen.
  // Only standalone rounds (competition_id IS NULL) appear in this list.
  const handleUpcomingRoundPress = useCallback(
    (round: { id: string }) => {
      navigation.navigate('ScheduledRound', { roundId: round.id });
    },
    [navigation]
  );

  const handleOpenNewRound = useCallback(() => {
    setIsBottomSheetVisible(true);
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  }, [navigation]);

  const handleTabPress = useCallback(
    (tab: NavigationTab) => {
      navigation.navigate('MainTabs', {
        screen: tab.route as keyof TabParamList,
      });
    },
    [navigation]
  );

  const tabBadges = useMemo(
    () => (unreadCount > 0 ? { profile: unreadCount } : undefined),
    [unreadCount]
  );

  // Tag a completed round to a league from the swipe menu. Per-round
  // eligibility mirrors ViewRound: a submitted scorecard with a differential.
  const handleTagToLeague = useCallback((round: RoundItem) => {
    const scorecardId = round.userScore?.scorecardId;
    if (scorecardId) setTagScorecardId(scorecardId);
  }, []);

  const renderRoundItem = ({ item }: { item: RoundItem }) => {
    const isTaggable =
      canTagToLeague &&
      !!item.userScore?.scorecardId &&
      item.userScore?.differential != null;
    return (
      <RoundListCard
        round={item}
        onPress={() => handleScoreRound(item)}
        onDelete={handleDeleteRound}
        onTagToLeague={isTaggable ? handleTagToLeague : undefined}
        swipeEnabled={true}
        actionLabel="View"
        currentUserId={user?.id}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RoundListHeader
        onOpenNewRound={handleOpenNewRound}
        showInfoIcon={!isFirstVisit}
        onInfoPress={showModal}
        onQuickScore={isSuperAdmin ? quickScore.openRoundPicker : undefined}
        showBack
        onBack={handleBack}
      />

      {/* Scrollable Rounds List */}
      {isLoading ? (
        <LoadingSpinner size="md" message="Loading rounds..." />
      ) : (
        <FlatList
          data={filteredHistoryRounds}
          renderItem={renderRoundItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <RoundListSections
              inProgressRounds={inProgressRounds}
              upcomingRounds={upcomingRounds}
              roundTypeFilter={roundTypeFilter}
              onRoundTypeFilterChange={setRoundTypeFilter}
              onResumeRound={handleResumeRound}
              onViewRound={handleViewRound}
              onDeleteInProgressRound={handleDeleteInProgressRound}
              onScoreRound={handleScoreRound}
              onUpcomingRoundPress={handleUpcomingRoundPress}
              onDeleteRound={handleDeleteRound}
              hasUnlimitedRounds={hasUnlimitedRounds}
              roundsPlayedCount={roundsPlayedCount}
              maxRoundsPlayed={maxRoundsPlayed}
              currentUserId={user?.id}
            />
          }
          ListEmptyComponent={<RoundListEmpty />}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.textPrimary} colors={[colors.textPrimary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Sheet */}
      <CreateRoundBottomSheet
        visible={isBottomSheetVisible}
        onClose={handleCloseBottomSheet}
        onStartRound={handleStartNewRound}
        onScheduleRound={handleScheduleRound}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title={pendingDeleteIsCancel ? 'Cancel Round' : 'Delete Round'}
        message={
          pendingDeleteIsCancel
            ? `Cancel this round at ${roundToDelete?.course.name ?? 'this course'}? All invited players will be notified and it will be removed for everyone. This can't be undone.`
            : `Are you sure you want to delete this round at ${roundToDelete?.course.name ?? 'this course'}? This action cannot be undone.`
        }
        confirmLabel={pendingDeleteIsCancel ? 'Cancel Round' : 'Delete'}
        cancelLabel={pendingDeleteIsCancel ? 'Keep Round' : 'Cancel'}
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

      {/* Schedule Round Error Dialog */}
      <ConfirmationDialog {...scheduleRoundDialogConfig} onCancel={dismissScheduleRoundDialog} />

      {/* Tag to League Bottom Sheet */}
      {tagScorecardId && (
        <TagToLeagueBottomSheet
          visible={!!tagScorecardId}
          onClose={() => setTagScorecardId(null)}
          scorecardId={tagScorecardId}
        />
      )}

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

      <BottomNavigation onTabPress={handleTabPress} badges={tabBadges} />
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

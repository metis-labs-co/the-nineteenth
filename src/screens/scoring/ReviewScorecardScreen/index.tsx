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
import { ScorecardTable } from '@/components/scorecard';
import { PageHeader } from '@/components/common';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { SkinsResultsCard, SkinsSettlementCard } from '@/components/skins';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useActiveSkinsGameForRound, useSkinsSummary } from '@/hooks/useSkins';

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

type TabKey = 'scorecard' | 'skins';

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

  // Review state and data
  const {
    holes,
    tablePlayerData,
    currentPlayers,
    groupScorecards,
    currentRoundId,
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

  // Check for active skins game
  const { data: skinsGame } = useActiveSkinsGameForRound(roundId || undefined);
  const hasSkinsGame = !!skinsGame;

  // Build tabs dynamically based on skins availability
  const tabs = useMemo<TabItem<TabKey>[]>(() => {
    if (hasSkinsGame) {
      return [
        ...BASE_TABS,
        { key: 'skins' as const, label: 'Skins' },
      ];
    }
    return BASE_TABS;
  }, [hasSkinsGame]);

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
  });

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

      {/* Tab Navigation - only show if skins game exists */}
      {hasSkinsGame && (
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
      {activeTab === 'scorecard' ? (
        /* Scorecard Content */
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
          <ScorecardTable
            players={tablePlayerData}
            holes={holes}
            screenWidth={screenWidth}
          />
        </ScrollView>
      ) : (
        /* Skins Content */
        skinsGame && (
          <SkinsTabContent
            skinsGameId={skinsGame.id}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            bottomInset={insets.bottom}
          />
        )
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
});

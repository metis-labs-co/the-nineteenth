import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { SkinsResultsCard, SkinsSettlementCard } from '@/components/skins';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSkinsSummary } from '@/hooks/useSkins';

// Amber/gold color for skins
const SKINS_COLOR = '#f59e0b';

interface SkinsTabContentProps {
  skinsGameId: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

export function SkinsTabContent({ skinsGameId, isRefreshing, onRefresh, bottomInset }: SkinsTabContentProps) {
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
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="md" message="Loading skins results..." fullScreen={false} />
      </View>
    );
  }

  const { game, results, payouts, current_carryover, holes_completed } = summary;

  // Empty state - no results yet
  if (results.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={[styles.emptyContainer, { paddingBottom: bottomInset + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
      >
        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <Icon source="dice-outline" size={48} color={SKINS_COLOR} />
          <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.md }]}>
            No Skins Results Yet
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            Skins results will appear here as you complete each hole.
            {'\n'}Keep scoring to see who wins each skin!
          </Text>
          <View style={[styles.emptyConfig, { backgroundColor: colors.surfaceVariant }]}>
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
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.textPrimary}
          colors={[colors.textPrimary]}
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

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  emptyConfig: {
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

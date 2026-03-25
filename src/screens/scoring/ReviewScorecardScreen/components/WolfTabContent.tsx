import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { WolfResultsCard, WolfStandingsCard, WolfSettlementCard } from '@/components/wolf';
import { spacing, borderRadius, typography, wolfColor } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useWolfSummary } from '@/hooks/wolf';

interface WolfTabContentProps {
  wolfGameId: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

export function WolfTabContent({ wolfGameId, isRefreshing, onRefresh, bottomInset }: WolfTabContentProps) {
  const colors = useThemeColors();
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useWolfSummary(wolfGameId);

  const handleRefresh = useCallback(async () => {
    await refetchSummary();
    onRefresh();
  }, [refetchSummary, onRefresh]);

  // Loading state
  if (isSummaryLoading || !summary) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="md" message="Loading Wolf results..." fullScreen={false} />
      </View>
    );
  }

  const { game, decisions, payouts, standings, holes_completed } = summary;

  // Empty state - no decisions yet
  if (decisions.length === 0) {
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
          <Icon source="dog-side" size={48} color={wolfColor} />
          <Text style={[typography.h3, { color: colors.textPrimary, marginTop: spacing.md }]}>
            No Wolf Results Yet
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            Wolf results will appear here as you complete each hole.
            {'\n'}The Wolf player must decide and scores must be recorded!
          </Text>
          <View style={[styles.emptyConfig, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[typography.small, { color: colors.textSecondary }]}>
              {game.scoring_type === 'gross' ? 'Gross' : 'Net'} scoring • {game.participants.length} players
              {game.pot_enabled && game.pot_value_per_point ? ` • $${game.pot_value_per_point}/pt` : ''}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

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
      {/* Wolf Results Table - Hole by hole breakdown */}
      <WolfResultsCard
        wolfGame={game}
        decisions={decisions}
        testID="wolf-results-card"
      />

      {/* Wolf Standings Card */}
      {standings.length > 0 && (
        <View style={styles.sectionContainer}>
          <WolfStandingsCard
            standings={standings}
            potEnabled={game.pot_enabled}
            testID="wolf-standings-card"
          />
        </View>
      )}

      {/* Settlement Card (show when game is complete and pot is enabled) */}
      {game.pot_enabled && (game.status === 'completed' || payouts.length > 0) && game.pot_value_per_point && (
        <View style={styles.sectionContainer}>
          <WolfSettlementCard
            payouts={payouts}
            potValue={game.pot_value_per_point}
            currency={game.currency}
            testID="wolf-settlement-card"
          />
        </View>
      )}

      {/* In-Progress Info */}
      {game.status === 'active' && holes_completed < 18 && (
        <View style={[styles.inProgressCard, { backgroundColor: colors.surface }]}>
          <View style={styles.inProgressHeader}>
            <Icon source="dog-side" size={20} color={wolfColor} />
            <Text style={[typography.bodyBold, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
              Game In Progress
            </Text>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
            {holes_completed} of 18 holes completed
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
  sectionContainer: {
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

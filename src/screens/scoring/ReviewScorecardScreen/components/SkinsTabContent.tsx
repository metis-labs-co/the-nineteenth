import React, { useCallback, useState } from 'react';
import { Alert, View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { SkinsResultsCard, SkinsSettlementCard, SkinsCurrentStandingsCard } from '@/components/skins';
import { spacing, borderRadius, typography, skinsColor } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSkinsSummary } from '@/hooks/useSkins';
import {
  backfillSkinsResults,
  useProcessSkinsHole,
  useProcessTeamSkinsHole,
} from '@/hooks/skins';

// Amber/gold color for skins
const SKINS_COLOR = skinsColor;

interface SkinsTabContentProps {
  skinsGameId: string;
  /** Holes the round actually plays (9 for front/back nine, 18 for full).
   *  Drives the "x of N holes" copy and the "still has carryover" gate so
   *  9-hole rounds don't get treated as incomplete 18-hole rounds. */
  totalHoles: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

export function SkinsTabContent({ skinsGameId, totalHoles, isRefreshing, onRefresh, bottomInset }: SkinsTabContentProps) {
  const colors = useThemeColors();
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useSkinsSummary(skinsGameId);

  const processSkinsHoleMutation = useProcessSkinsHole();
  const processTeamSkinsHoleMutation = useProcessTeamSkinsHole();
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRefresh = useCallback(async () => {
    await refetchSummary();
    onRefresh();
  }, [refetchSummary, onRefresh]);

  const handleRecalculate = useCallback(() => {
    const game = summary?.game;
    if (!game || isRecalculating) return;
    Alert.alert(
      'Recalculate skins?',
      'Reprocesses every hole that already has scores. Useful if this game was created mid-round and earlier holes are missing results.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recalculate',
          onPress: async () => {
            setIsRecalculating(true);
            try {
              await backfillSkinsResults(
                game,
                processSkinsHoleMutation,
                processTeamSkinsHoleMutation
              );
              await refetchSummary();
              Alert.alert('Skins recalculated', 'Scored holes have been processed.');
            } catch (error) {
              Alert.alert(
                'Recalculation failed',
                error instanceof Error ? error.message : 'Unknown error'
              );
            } finally {
              setIsRecalculating(false);
            }
          },
        },
      ]
    );
  }, [summary, isRecalculating, processSkinsHoleMutation, processTeamSkinsHoleMutation, refetchSummary]);

  // Loading state
  if (isSummaryLoading || !summary) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="md" message="Loading skins results..." fullScreen={false} />
      </View>
    );
  }

  const { game, results, payouts, current_carryover, holes_completed } = summary;
  const canRecalculate = game.status === 'active';

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
          {canRecalculate ? (
            <TouchableOpacity
              style={[
                styles.recalcButton,
                { borderColor: `${SKINS_COLOR}40`, opacity: isRecalculating ? 0.6 : 1 },
              ]}
              onPress={handleRecalculate}
              disabled={isRecalculating}
              accessibilityRole="button"
              accessibilityLabel="Recalculate skins for already-scored holes"
              accessibilityState={{ disabled: isRecalculating, busy: isRecalculating }}
            >
              <Icon source="refresh" size={16} color={SKINS_COLOR} />
              <Text style={[styles.recalcButtonText, { color: SKINS_COLOR }]}>
                {isRecalculating ? 'Recalculating…' : 'Recalculate scored holes'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  // Carryover only "unsettled" if the round still has holes left to play.
  const unsettledCarryover = holes_completed < totalHoles ? current_carryover : 0;

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
      {canRecalculate ? (
        <TouchableOpacity
          style={[
            styles.recalcButton,
            { borderColor: `${SKINS_COLOR}40`, opacity: isRecalculating ? 0.6 : 1 },
          ]}
          onPress={handleRecalculate}
          disabled={isRecalculating}
          accessibilityRole="button"
          accessibilityLabel="Recalculate skins for already-scored holes"
          accessibilityState={{ disabled: isRecalculating, busy: isRecalculating }}
        >
          <Icon source="refresh" size={16} color={SKINS_COLOR} />
          <Text style={[styles.recalcButtonText, { color: SKINS_COLOR }]}>
            {isRecalculating ? 'Recalculating…' : 'Recalculate scored holes'}
          </Text>
        </TouchableOpacity>
      ) : null}

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

      {/* In-Progress Info: live standings for individual games, plain copy for team games
          (the summary doesn't carry team member data, so no team standings yet) */}
      {game.status === 'active' && holes_completed < totalHoles && (
        game.is_team_skins ? (
          <View style={[styles.inProgressCard, { backgroundColor: colors.surface }]}>
            <View style={styles.inProgressHeader}>
              <Icon source="golf" size={20} color={SKINS_COLOR} />
              <Text style={[typography.bodyBold, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
                Game In Progress
              </Text>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              {holes_completed} of {totalHoles} holes completed
              {current_carryover > 0 && ` • $${current_carryover.toFixed(2)} carryover`}
            </Text>
          </View>
        ) : (
          <View style={styles.settlementContainer}>
            <SkinsCurrentStandingsCard
              game={game}
              results={results}
              totalHoles={totalHoles}
              holesCompleted={holes_completed}
              testID="skins-current-standings-card"
            />
          </View>
        )
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
  recalcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 44,
  },
  recalcButtonText: {
    ...typography.caption,
    fontWeight: '600',
  },
});

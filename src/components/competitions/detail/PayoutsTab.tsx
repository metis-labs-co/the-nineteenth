/**
 * PayoutsTab - Prize pool payouts preview and settlement
 *
 * Shown on CompetitionDetailScreen whenever a prize pool exists. Shows:
 * - Pool summary (total, currency, status)
 * - Per-placement cards mapping the live leaderboard to payout slots
 * - For organisers: a "Settle Payouts" action when the competition is
 *   completed and the pool hasn't been settled
 * - Transaction log after settlement (re-uses PoolTransactionsList)
 */

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { ConfirmationDialog, SectionHeader, StatusBadge } from '@/components/common';
import type { StatusVariant } from '@/components/common';
import { PoolTransactionsList } from '@/components/prizePool/PoolTransactionsList';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import { useCompetitionLeaderboard } from '@/hooks/competitions/leaderboard';
import type { CompetitionLeaderboardEntry } from '@/hooks/competitions/leaderboard';
import {
  usePoolTransactions,
  useSettleCompetitionPayouts,
} from '@/hooks/prizePool';
import { formatDateAustralian } from '@/utils/formatting';
import type { Competition } from '@/types/database.types';
import type {
  CompetitionPrizePool,
  PrizePoolPlacement,
} from '@/types/database/prizePool.types';

// ============================================================================
// Props
// ============================================================================

export interface PayoutsTabProps {
  competition: Competition;
  prizePool: CompetitionPrizePool;
  placements: PrizePoolPlacement[];
  isOrganizer: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function positionBadge(position: number): string {
  if (position === 1) return '🥇';
  if (position === 2) return '🥈';
  if (position === 3) return '🥉';
  return `#${position}`;
}

interface PlacementView {
  placement: PrizePoolPlacement;
  previewWinner: CompetitionLeaderboardEntry | null;
  tiedAt: CompetitionLeaderboardEntry[];
}

// ============================================================================
// Component
// ============================================================================

export function PayoutsTab({
  competition,
  prizePool,
  placements,
  isOrganizer,
}: PayoutsTabProps) {
  const colors = useThemeColors();

  const { data: leaderboard, isLoading: isLoadingLeaderboard } =
    useCompetitionLeaderboard(competition.id, { filter: 'individuals' });

  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions,
    isRefetching: isRefetchingTransactions,
  } = usePoolTransactions(prizePool.id);

  const { mutate: settle, isPending: isSettling } = useSettleCompetitionPayouts();

  const [showConfirm, setShowConfirm] = useState(false);

  const leaderByPosition = useMemo(() => {
    if (!leaderboard) return new Map<number, CompetitionLeaderboardEntry[]>();
    const map = new Map<number, CompetitionLeaderboardEntry[]>();
    for (const entry of leaderboard) {
      const bucket = map.get(entry.position) ?? [];
      bucket.push(entry);
      map.set(entry.position, bucket);
    }
    return map;
  }, [leaderboard]);

  const placementViews: PlacementView[] = useMemo(
    () =>
      [...placements]
        .sort((a, b) => a.position - b.position)
        .map((placement) => {
          const atPos = leaderByPosition.get(placement.position) ?? [];
          return {
            placement,
            previewWinner: atPos[0] ?? null,
            tiedAt: atPos.length > 1 ? atPos : [],
          };
        }),
    [placements, leaderByPosition]
  );

  const hasTiesAtPaying = placementViews.some(
    (v) => v.placement.paid_at === null && v.tiedAt.length > 1
  );

  const isSettled = prizePool.status === 'settled';
  const isCompetitionComplete = competition.status === 'completed';
  const canSettle = isOrganizer && !isSettled && isCompetitionComplete;
  const isTeamCompetition = competition.team_mode !== 'none';

  const handleSettleConfirm = () => {
    if (!leaderboard) return;
    setShowConfirm(false);
    settle({
      poolId: prizePool.id,
      competitionId: competition.id,
      standings: leaderboard.map((e) => ({
        participantId: e.participantId,
        position: e.position,
      })),
    });
  };

  return (
    <View style={styles.container}>
      {/* Pool summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.summaryHeader}>
          <View style={[styles.trophyBadge, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="trophy-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.summaryText}>
            <Text style={[styles.summaryAmount, { color: colors.textPrimary }]}>
              {formatMoney(prizePool.total_pool_amount, prizePool.currency)}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Total prize pool
            </Text>
          </View>
          <StatusBadge status={prizePool.status as StatusVariant} />
        </View>
        {isTeamCompetition && (
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Prize pool pays individual positions — teams don&apos;t affect payouts.
          </Text>
        )}
      </View>

      {/* Placements */}
      <View style={styles.section}>
        <SectionHeader title="Placements" icon="medal-outline" primaryIcon={false} />
        {isLoadingLeaderboard ? (
          <View style={[styles.placementCard, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center' }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : placementViews.length === 0 ? (
          <View style={[styles.placementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No placements configured for this pool.
            </Text>
          </View>
        ) : (
          placementViews.map((view) => (
            <PlacementCard
              key={view.placement.id}
              view={view}
              currency={prizePool.currency}
              isSettled={isSettled}
            />
          ))
        )}
      </View>

      {/* Settle action */}
      {isOrganizer && !isSettled && (
        <View style={styles.section}>
          {canSettle ? (
            <>
              <TouchableOpacity
                onPress={() => setShowConfirm(true)}
                disabled={isSettling || !leaderboard || leaderboard.length === 0}
                style={[
                  styles.settleButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: isSettling || !leaderboard || leaderboard.length === 0 ? 0.5 : 1,
                  },
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Settle payouts"
              >
                <Icon source="cash-multiple" size={20} color={colors.white} />
                <Text style={[styles.settleButtonText, { color: colors.white }]}>
                  {isSettling ? 'Settling…' : 'Settle Payouts'}
                </Text>
              </TouchableOpacity>
              {hasTiesAtPaying && (
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  Ties exist at paying positions — winners will be chosen arbitrarily.
                </Text>
              )}
            </>
          ) : (
            <View
              style={[
                styles.infoBox,
                { backgroundColor: colors.primaryBackground, borderColor: colors.border },
              ]}
            >
              <Icon source="information-outline" size={16} color={colors.primaryDark} />
              <Text style={[styles.infoText, { color: colors.primaryDark }]}>
                Finish the competition to settle payouts.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Transactions (settled only) */}
      {isSettled && (
        <View style={styles.section}>
          <SectionHeader title="Transactions" icon="receipt" primaryIcon={false} />
          <PoolTransactionsList
            transactions={transactions ?? []}
            isLoading={isLoadingTransactions}
            onRefresh={refetchTransactions}
            isRefreshing={isRefetchingTransactions}
            testID="payouts-transactions"
          />
        </View>
      )}

      {/* Settle confirmation */}
      <ConfirmationDialog
        visible={showConfirm}
        title="Settle payouts"
        message={buildConfirmMessage(placementViews, prizePool.currency, hasTiesAtPaying)}
        confirmLabel={hasTiesAtPaying ? 'Continue anyway' : 'Settle'}
        cancelLabel="Cancel"
        confirmVariant={hasTiesAtPaying ? 'destructive' : 'primary'}
        icon={hasTiesAtPaying ? 'alert-outline' : 'cash-multiple'}
        onConfirm={handleSettleConfirm}
        onCancel={() => setShowConfirm(false)}
        loading={isSettling}
      />
    </View>
  );
}

function buildConfirmMessage(
  views: PlacementView[],
  currency: string,
  hasTies: boolean
): string {
  const lines = views.map((v) => {
    const winner = v.previewWinner?.participantName ?? '—';
    return `${positionBadge(v.placement.position)}  ${winner} · ${formatMoney(
      v.placement.payout_amount,
      currency
    )}`;
  });
  const prefix = hasTies
    ? 'Ties exist at paying positions. Proceeding will break ties arbitrarily.\n\n'
    : '';
  return `${prefix}${lines.join('\n')}\n\nThis cannot be undone.`;
}

// ============================================================================
// Placement card
// ============================================================================

interface PlacementCardProps {
  view: PlacementView;
  currency: string;
  isSettled: boolean;
}

function PlacementCard({ view, currency, isSettled }: PlacementCardProps) {
  const colors = useThemeColors();
  const { placement, previewWinner, tiedAt } = view;
  const hasTie = tiedAt.length > 1;
  const isPaid = placement.paid_at !== null;

  return (
    <View
      style={[
        styles.placementCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.placementRow}>
        <View style={[styles.positionBadge, { backgroundColor: colors.primaryBackground }]}>
          <Text style={[styles.positionBadgeText, { color: colors.primaryDark }]}>
            {positionBadge(placement.position)}
          </Text>
        </View>
        <View style={styles.placementBody}>
          <View style={styles.placementTopRow}>
            <Text style={[styles.placementName, { color: colors.textPrimary }]} numberOfLines={1}>
              {previewWinner?.participantName ?? '—'}
            </Text>
            <Text style={[styles.placementAmount, { color: colors.primary }]}>
              {formatMoney(placement.payout_amount, currency)}
            </Text>
          </View>
          <View style={styles.placementMetaRow}>
            <Text style={[styles.placementMeta, { color: colors.textSecondary }]}>
              {placement.percent}% of pool
            </Text>
            {hasTie && !isPaid && (
              <View style={[styles.tiePill, { backgroundColor: colors.warningLight }]}>
                <Text style={[styles.tiePillText, { color: colors.warningDark }]}>Tied</Text>
              </View>
            )}
            {isPaid && (
              <View style={styles.paidBadge}>
                <Icon source="check-circle" size={14} color={colors.success} />
                <Text style={[styles.paidText, { color: colors.success }]}>
                  Paid {formatDateAustralian(placement.paid_at!)}
                </Text>
              </View>
            )}
          </View>
          {hasTie && !isPaid && !isSettled && (
            <Text style={[styles.tieDetail, { color: colors.textSecondary }]} numberOfLines={2}>
              Tied: {tiedAt.map((e) => e.participantName).join(', ')}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  summaryCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trophyBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryText: {
    flex: 1,
  },
  summaryAmount: {
    ...typography.h3,
  },
  summaryLabel: {
    ...typography.caption,
  },
  helperText: {
    ...typography.caption,
  },
  section: {
    gap: spacing.sm,
  },
  placementCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.sm,
  },
  placementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  positionBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionBadgeText: {
    ...typography.h4,
  },
  placementBody: {
    flex: 1,
    gap: spacing.xs,
  },
  placementTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  placementName: {
    ...typography.bodyBold,
    flex: 1,
  },
  placementAmount: {
    ...typography.bodyBold,
  },
  placementMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placementMeta: {
    ...typography.small,
  },
  tiePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tiePillText: {
    ...typography.caption,
    fontWeight: '600',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  paidText: {
    ...typography.caption,
  },
  tieDetail: {
    ...typography.caption,
  },
  emptyText: {
    ...typography.body,
  },
  settleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  settleButtonText: {
    ...typography.bodyBold,
  },
  warningText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
});

export default PayoutsTab;

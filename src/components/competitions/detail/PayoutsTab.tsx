/**
 * PayoutsTab - Prize pool payouts preview and settlement
 *
 * Renders one settlement section per existing pool (individual and/or team).
 * Each section shows:
 *   - Dark pot hero card with total, state pill and funding meta line
 *   - Placements list card mapping the live leaderboard to payout slots
 *   - Settle action when the competition is completed and the pool is unsettled
 *   - Transactions log after settlement
 */

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, Text } from 'react-native-paper';

import {
  ConfirmationDialog,
  HeroCard,
  SectionLabel,
  heroPalette,
} from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import type { ColorPalette } from '@/constants/theme';
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
  PoolTransaction,
  PrizePoolPlacement,
} from '@/types/database/prizePool.types';

// ============================================================================
// Props
// ============================================================================

export interface PayoutsTabProps {
  competition: Competition;
  /** Individual pool (or null) */
  prizePool: CompetitionPrizePool | null;
  /** Individual pool placements */
  placements: PrizePoolPlacement[];
  /** Team pool (or null) */
  teamPrizePool?: CompetitionPrizePool | null;
  /** Team pool placements */
  teamPlacements?: PrizePoolPlacement[];
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

interface PoolStatePill {
  label: string;
  color: string;
  bg: string;
}

/**
 * Map the pool + competition state onto the design's four hero pill states:
 * Not set → Locked → Ready to settle → Settled.
 */
function getPoolStatePill(
  pool: CompetitionPrizePool,
  isCompetitionComplete: boolean,
  colors: ColorPalette
): PoolStatePill {
  if (pool.status === 'settled') {
    return { label: 'Settled', color: colors.primaryDark, bg: colors.primaryBackground };
  }
  if (isCompetitionComplete) {
    return {
      label: 'Ready to settle',
      color: colors.primaryDark,
      bg: colors.primaryBackground,
    };
  }
  if (pool.is_locked) {
    return { label: 'Locked', color: colors.warningDark, bg: colors.warningBackground };
  }
  return { label: 'Not set', color: colors.warningDark, bg: colors.warningBackground };
}

/** Hero meta line: "Winner takes all · $30 a head · split within teams" */
function buildPoolMetaLine(
  pool: CompetitionPrizePool,
  placementCount: number,
  isTeamPool: boolean
): string {
  const structure =
    placementCount === 1
      ? 'Winner takes all'
      : placementCount > 1
        ? `Top ${placementCount} paid`
        : 'No placements set';
  const contribution =
    pool.funding_type === 'per_player'
      ? `${formatMoney(pool.funding_amount, pool.currency)} a head`
      : `${formatMoney(pool.funding_amount, pool.currency)} fixed pot`;
  const parts = [structure, contribution];
  if (isTeamPool) parts.push('split within teams');
  return parts.join(' · ');
}

// ============================================================================
// Top-level component — renders one PoolSection per pool that exists
// ============================================================================

export function PayoutsTab({
  competition,
  prizePool,
  placements,
  teamPrizePool,
  teamPlacements,
  isOrganizer,
}: PayoutsTabProps) {
  return (
    <View style={styles.container}>
      {prizePool && (
        <PoolSection
          competition={competition}
          pool={prizePool}
          placements={placements}
          isOrganizer={isOrganizer}
        />
      )}
      {teamPrizePool && (
        <PoolSection
          competition={competition}
          pool={teamPrizePool}
          placements={teamPlacements ?? []}
          isOrganizer={isOrganizer}
        />
      )}
    </View>
  );
}

// ============================================================================
// PoolSection — settlement UI for a single pool
// ============================================================================

interface PoolSectionProps {
  competition: Competition;
  pool: CompetitionPrizePool;
  placements: PrizePoolPlacement[];
  isOrganizer: boolean;
}

function PoolSection({
  competition,
  pool,
  placements,
  isOrganizer,
}: PoolSectionProps) {
  const colors = useThemeColors();
  const isTeamPool = pool.target_type === 'team';

  const { data: leaderboard, isLoading: isLoadingLeaderboard } =
    useCompetitionLeaderboard(competition.id, {
      filter: isTeamPool ? 'teams' : 'individuals',
    });

  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions,
    isRefetching: isRefetchingTransactions,
  } = usePoolTransactions(pool.id);

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

  const isSettled = pool.status === 'settled';
  const isCompetitionComplete = competition.status === 'completed';
  const canSettle = isOrganizer && !isSettled && isCompetitionComplete;

  const statePill = getPoolStatePill(pool, isCompetitionComplete, colors);
  const metaLine = buildPoolMetaLine(pool, placements.length, isTeamPool);

  const handleSettleConfirm = () => {
    if (!leaderboard) return;
    setShowConfirm(false);
    settle({
      poolId: pool.id,
      competitionId: competition.id,
      target: pool.target_type,
      standings: leaderboard.map((e) => ({
        participantId: e.participantId,
        position: e.position,
      })),
    });
  };

  const settleDisabled = isSettling || !leaderboard || leaderboard.length === 0;

  return (
    <View style={styles.poolSection}>
      {/* Pot hero */}
      <HeroCard variant="green" testID={`payouts-hero-${pool.target_type}`}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroLeft}>
            <Text style={[styles.heroEyebrow, { color: heroPalette.eyebrowGreen }]}>
              Winners&apos; pot · {isTeamPool ? 'team' : 'individual'}
            </Text>
            <Text style={[styles.heroAmount, { color: heroPalette.text }]}>
              {formatMoney(pool.total_pool_amount, pool.currency)}
            </Text>
          </View>
          <View style={[styles.statePill, { backgroundColor: statePill.bg }]}>
            <Text style={[styles.statePillText, { color: statePill.color }]}>
              {statePill.label}
            </Text>
          </View>
        </View>
        <Text style={[styles.heroMeta, { color: heroPalette.mutedGreen }]}>
          {metaLine}
        </Text>
      </HeroCard>

      {/* Placements */}
      <View style={styles.section}>
        <SectionLabel>Placements</SectionLabel>
        <View
          style={[
            styles.listCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {isLoadingLeaderboard ? (
            <View style={styles.listCardCenter}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : placementViews.length === 0 ? (
            <View style={styles.listCardCenter}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No placements configured for this pool.
              </Text>
            </View>
          ) : (
            placementViews.map((view, index) => (
              <PlacementRow
                key={view.placement.id}
                view={view}
                currency={pool.currency}
                isSettled={isSettled}
                isTeamPool={isTeamPool}
                isLast={index === placementViews.length - 1}
              />
            ))
          )}
        </View>
      </View>

      {/* Settle action */}
      {isOrganizer && !isSettled && (
        <View style={styles.section}>
          {canSettle ? (
            <>
              <TouchableOpacity
                onPress={() => setShowConfirm(true)}
                disabled={settleDisabled}
                style={[styles.settleTouchable, settleDisabled && styles.settleDisabled]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Settle ${isTeamPool ? 'team' : 'individual'} payouts`}
              >
                <LinearGradient
                  colors={[colors.primaryLight, colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.settleGradient}
                >
                  <Text style={[styles.settleText, { color: colors.white }]}>
                    {isSettling
                      ? 'Settling…'
                      : `Settle ${isTeamPool ? 'team' : 'individual'} payouts`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              {hasTiesAtPaying && (
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  Ties exist at paying positions — winners will be chosen arbitrarily.
                </Text>
              )}
            </>
          ) : (
            <Text style={[styles.lockedNote, { color: colors.textTertiary }]}>
              Payouts unlock when the competition is completed.
            </Text>
          )}
        </View>
      )}

      {/* Transactions (settled only) */}
      {isSettled && (
        <View style={styles.section}>
          <View style={styles.transactionsHeaderRow}>
            <SectionLabel style={styles.transactionsLabel}>Transactions</SectionLabel>
            <TouchableOpacity
              onPress={() => refetchTransactions()}
              disabled={isRefetchingTransactions}
              style={styles.refreshButton}
              accessibilityRole="button"
              accessibilityLabel="Refresh transactions"
            >
              {isRefetchingTransactions ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon source="refresh" size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.listCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            testID={`payouts-transactions-${pool.target_type}`}
          >
            {isLoadingTransactions ? (
              <View style={styles.listCardCenter}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : !transactions || transactions.length === 0 ? (
              <View style={styles.listCardCenter}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No transactions yet.
                </Text>
              </View>
            ) : (
              transactions.map((transaction, index) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  currency={pool.currency}
                  isLast={index === transactions.length - 1}
                />
              ))
            )}
          </View>
        </View>
      )}

      {/* Settle confirmation */}
      <ConfirmationDialog
        visible={showConfirm}
        title={`Settle ${isTeamPool ? 'team' : 'individual'} payouts`}
        message={buildConfirmMessage(placementViews, pool.currency, hasTiesAtPaying)}
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
// Placement row
// ============================================================================

interface PlacementRowProps {
  view: PlacementView;
  currency: string;
  isSettled: boolean;
  isTeamPool: boolean;
  isLast: boolean;
}

function PlacementRow({ view, currency, isSettled, isTeamPool, isLast }: PlacementRowProps) {
  const colors = useThemeColors();
  const { placement, previewWinner, tiedAt } = view;
  const hasTie = tiedAt.length > 1;
  const isPaid = placement.paid_at !== null;
  const hasWinner = previewWinner !== null;
  const paysOut = placement.payout_amount > 0;

  const subParts = [`${placement.percent}% of pool`];
  if (isPaid) {
    subParts.push(`Paid ${formatDateAustralian(placement.paid_at!)}`);
  } else if (!hasWinner) {
    subParts.push('To be decided');
  }

  return (
    <View
      style={[
        styles.placementRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
      ]}
    >
      <Text
        style={[
          styles.placementPos,
          { color: placement.position === 1 ? colors.warningDark : colors.textTertiary },
        ]}
      >
        {placement.position}
      </Text>
      <View
        style={[
          styles.placementDot,
          { backgroundColor: hasWinner ? colors.primary : colors.textTertiary },
        ]}
      />
      <View style={styles.placementBody}>
        <View style={styles.placementNameRow}>
          <Text
            style={[styles.placementName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {previewWinner?.participantName ??
              (isTeamPool ? 'Winning team' : 'Winner')}
          </Text>
          {hasTie && !isPaid && (
            <View style={[styles.tiePill, { backgroundColor: colors.warningBackground }]}>
              <Text style={[styles.tiePillText, { color: colors.warningDark }]}>Tied</Text>
            </View>
          )}
          {isPaid && <Icon source="check-circle" size={14} color={colors.success} />}
        </View>
        <Text style={[styles.placementSub, { color: colors.textTertiary }]}>
          {subParts.join(' · ')}
        </Text>
        {hasTie && !isPaid && !isSettled && (
          <Text
            style={[styles.tieDetail, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            Tied: {tiedAt.map((e) => e.participantName).join(', ')}
          </Text>
        )}
      </View>
      <Text
        style={[
          styles.placementAmount,
          { color: paysOut ? colors.primaryDark : colors.textTertiary },
        ]}
      >
        {formatMoney(placement.payout_amount, currency)}
      </Text>
    </View>
  );
}

// ============================================================================
// Transaction row
// ============================================================================

interface TransactionRowProps {
  transaction: PoolTransaction;
  currency: string;
  isLast: boolean;
}

function TransactionRow({ transaction, currency, isLast }: TransactionRowProps) {
  const colors = useThemeColors();
  const isPayout = transaction.transaction_type === 'prize_payout';

  const iconBg = isPayout ? colors.primaryBackground : colors.warningBackground;
  const iconColor = isPayout ? colors.primaryDark : colors.warningDark;
  const iconSource = isPayout ? 'check' : 'tune-variant';

  const title =
    transaction.description ?? (isPayout ? 'Prize payout' : 'Adjustment');
  const sub = `${formatDateAustralian(transaction.created_at)} · Balance ${formatMoney(
    transaction.balance_after,
    currency
  )}`;

  const amountText = isPayout
    ? formatMoney(Math.abs(transaction.amount), currency)
    : `${transaction.amount >= 0 ? '+' : '−'}${formatMoney(
        Math.abs(transaction.amount),
        currency
      )}`;
  const amountColor =
    isPayout || transaction.amount >= 0 ? colors.primaryDark : colors.error;

  return (
    <View
      style={[
        styles.transactionRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
      ]}
    >
      <View style={[styles.transactionIcon, { backgroundColor: iconBg }]}>
        <Icon source={iconSource} size={17} color={iconColor} />
      </View>
      <View style={styles.transactionBody}>
        <Text
          style={[styles.transactionTitle, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={[styles.transactionSub, { color: colors.textTertiary }]}>
          {sub}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: amountColor }]}>
        {amountText}
      </Text>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  poolSection: {
    gap: spacing.lg,
  },

  // Pot hero
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroLeft: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 3,
  },
  statePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statePillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  heroMeta: {
    fontSize: 12,
    marginTop: spacing.sm,
  },

  section: {
    gap: 0,
  },

  // Shared list card (placements + transactions)
  listCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  listCardCenter: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
  },

  // Placement rows
  placementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  placementPos: {
    width: 30,
    fontSize: 14,
    fontWeight: '800',
  },
  placementDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 11,
  },
  placementBody: {
    flex: 1,
    marginRight: spacing.sm,
  },
  placementNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  placementName: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  placementSub: {
    fontSize: 11.5,
    marginTop: 1,
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
  tieDetail: {
    ...typography.caption,
    marginTop: 2,
  },
  placementAmount: {
    fontSize: 16,
    fontWeight: '800',
  },

  // Settle CTA
  settleTouchable: {
    borderRadius: 14,
    ...shadows.md,
  },
  settleDisabled: {
    opacity: 0.5,
  },
  settleGradient: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  warningText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  lockedNote: {
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Transactions
  transactionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transactionsLabel: {
    marginBottom: 0,
  },
  refreshButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionBody: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  transactionSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default PayoutsTab;

/**
 * PrizePoolSummaryCard - Display prize pool summary with placement payouts
 *
 * Shows the prize pool configuration with placement-based payout breakdown.
 * Used in competition details screen to show pool status and prize distribution.
 *
 * @example
 * ```tsx
 * <PrizePoolSummaryCard
 *   pool={prizePool}
 *   placements={placements}
 *   isLocked={true}
 *   onEditPress={handleEdit}
 *   onViewTransactionsPress={handleViewTransactions}
 * />
 * ```
 */

import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import {
  IconTrophy,
  IconLock,
  IconReceipt,
  IconEdit,
  IconCheck,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows, featureColors } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { formatCurrency } from '@/utils/currency';
import { formatPosition as getOrdinal } from '@/utils/formatting';
import type { CompetitionPrizePool, PrizePoolPlacement } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface PrizePoolSummaryCardProps {
  /** The prize pool to display */
  pool: CompetitionPrizePool;
  /** Placement breakdown with payout amounts */
  placements: PrizePoolPlacement[];
  /** Whether the pool is locked (any round has started) */
  isLocked: boolean;
  /** Handler for edit button press (optional, hidden if not provided or locked) */
  onEditPress?: () => void;
  /** Handler for view transactions link press (optional) */
  onViewTransactionsPress?: () => void;
  /** Lookup of team metadata for rendering team payouts (team pools only) */
  teamLookup?: Map<string, { name: string; memberCount: number }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIZE_POOL_COLOR = featureColors.prizePool;
const GOLD_COLOR = '#F59E0B'; // 1st place (amber, distinct from standard medal gold)
const SILVER_COLOR = '#9CA3AF'; // 2nd place
const BRONZE_COLOR = '#CD7F32'; // 3rd place
const DEFAULT_COLOR = '#6B7280'; // 4th+ place

// ============================================================================
// HELPERS
// ============================================================================

/** Get medal color for a given position */
const getMedalColor = (position: number): string => {
  switch (position) {
    case 1:
      return GOLD_COLOR;
    case 2:
      return SILVER_COLOR;
    case 3:
      return BRONZE_COLOR;
    default:
      return DEFAULT_COLOR;
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export const PrizePoolSummaryCard = memo(function PrizePoolSummaryCard({
  pool,
  placements,
  isLocked,
  onEditPress,
  onViewTransactionsPress,
  teamLookup,
}: PrizePoolSummaryCardProps) {
  const colors = useThemeColors();

  // Format currency helper

  // Determine if edit should be shown
  const showEdit = onEditPress && !isLocked;

  // Sort placements by position
  const sortedPlacements = [...placements].sort((a, b) => a.position - b.position);

  return (
    <Surface
      style={[styles.container, { backgroundColor: colors.surface }]}
      elevation={1}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${PRIZE_POOL_COLOR}15` }]}>
            <IconTrophy size={24} color={PRIZE_POOL_COLOR} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {pool.target_type === 'team' ? 'Team Prize Pool' : 'Prize Pool'}
            </Text>
            <Text style={[styles.totalAmount, { color: PRIZE_POOL_COLOR }]}>
              {formatCurrency(pool.total_pool_amount)}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isLocked && (
            <View style={[styles.lockedBadge, { backgroundColor: colors.surfaceVariant }]}>
              <IconLock size={14} color={colors.textSecondary} />
              <Text style={[styles.lockedText, { color: colors.textSecondary }]}>Locked</Text>
            </View>
          )}
          {showEdit && (
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={onEditPress}
              accessibilityRole="button"
              accessibilityLabel="Edit prize pool"
            >
              <IconEdit size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Funding Info */}
      <View style={[styles.fundingInfo, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.fundingLabel, { color: colors.textSecondary }]}>
          {pool.funding_type === 'per_player' ? 'Per Player' : 'Fixed Total'}
        </Text>
        <Text style={[styles.fundingValue, { color: colors.textPrimary }]}>
          {pool.funding_type === 'per_player'
            ? `${formatCurrency(pool.funding_amount)} \u00D7 players`
            : formatCurrency(pool.funding_amount)}
        </Text>
      </View>

      {/* Placements */}
      {sortedPlacements.length > 0 && (
        <View style={styles.placements}>
          {sortedPlacements.map((placement) => (
            <PlacementRow
              key={placement.id}
              placement={placement}
              colors={colors}
              isTeamPool={pool.target_type === 'team'}
              teamLookup={teamLookup}
            />
          ))}
        </View>
      )}

      {/* View Transactions Link */}
      {onViewTransactionsPress && (
        <TouchableOpacity
          style={styles.transactionsLink}
          onPress={onViewTransactionsPress}
          accessibilityRole="button"
          accessibilityLabel="View pool transactions"
        >
          <IconReceipt size={16} color={colors.primary} />
          <Text style={[styles.transactionsLinkText, { color: colors.primary }]}>
            View Transactions
          </Text>
        </TouchableOpacity>
      )}
    </Surface>
  );
});

// ============================================================================
// PLACEMENT ROW COMPONENT
// ============================================================================

interface PlacementRowProps {
  placement: PrizePoolPlacement;
  colors: ReturnType<typeof useThemeColors>;
  isTeamPool: boolean;
  teamLookup?: Map<string, { name: string; memberCount: number }>;
}

const PlacementRow = memo(function PlacementRow({
  placement,
  colors,
  isTeamPool,
  teamLookup,
}: PlacementRowProps) {
  const medalColor = getMedalColor(placement.position);
  const isSettled = placement.paid_at !== null;

  const teamMeta =
    isTeamPool && placement.team_id ? teamLookup?.get(placement.team_id) : undefined;
  const perMemberShare =
    teamMeta && teamMeta.memberCount > 0
      ? placement.payout_amount / teamMeta.memberCount
      : null;

  return (
    <View style={styles.placementRow}>
      {/* Position badge */}
      <View style={[styles.positionBadge, { backgroundColor: `${medalColor}20` }]}>
        <Text style={[styles.positionText, { color: medalColor }]}>
          {getOrdinal(placement.position)}
        </Text>
      </View>

      {/* Percentage and amount */}
      <View style={styles.placementDetails}>
        <Text style={[styles.placementAmount, { color: colors.textPrimary }]}>
          {formatCurrency(placement.payout_amount)}
        </Text>
        {teamMeta ? (
          <Text style={[styles.placementPercent, { color: colors.textSecondary }]}>
            {teamMeta.name}
            {perMemberShare !== null && ` · ${formatCurrency(perMemberShare)} each`}
          </Text>
        ) : (
          <Text style={[styles.placementPercent, { color: colors.textSecondary }]}>
            {placement.percent}%
          </Text>
        )}
      </View>

      {/* Settlement status */}
      {isSettled && (
        <View style={[styles.settledBadge, { backgroundColor: `${colors.success}15` }]}>
          <IconCheck size={14} color={colors.success} />
          <Text style={[styles.settledText, { color: colors.success }]}>Settled</Text>
        </View>
      )}
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.smallBold,
  },
  totalAmount: {
    ...typography.h3,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  lockedText: {
    ...typography.caption,
    fontWeight: '500',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fundingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  fundingLabel: {
    ...typography.caption,
  },
  fundingValue: {
    ...typography.small,
    fontWeight: '500',
  },
  placements: {
    gap: spacing.sm,
  },
  placementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  positionBadge: {
    width: 40,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    ...typography.smallBold,
  },
  placementDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placementAmount: {
    ...typography.bodyBold,
  },
  placementPercent: {
    ...typography.caption,
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  settledText: {
    ...typography.caption,
    fontWeight: '500',
  },
  transactionsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  transactionsLinkText: {
    ...typography.small,
    fontWeight: '500',
  },
});

export default PrizePoolSummaryCard;

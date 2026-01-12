/**
 * PrizePoolSummaryCard - Display prize pool summary with balances
 *
 * Shows the prize pool configuration with allocation breakdowns, usage tracking,
 * and remaining balances. Used in competition details screen to show pool status.
 *
 * @example
 * ```tsx
 * <PrizePoolSummaryCard
 *   pool={prizePool}
 *   summary={allocationSummary}
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
  IconDice,
  IconMedal,
  IconDots,
  IconReceipt,
  IconEdit,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { CompetitionPrizePool, PoolAllocationSummary } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface PrizePoolSummaryCardProps {
  /** The prize pool to display */
  pool: CompetitionPrizePool;
  /** Allocation summary with used/remaining amounts */
  summary: PoolAllocationSummary;
  /** Whether the pool is locked (any round has started) */
  isLocked: boolean;
  /** Handler for edit button press (optional, hidden if not provided or locked) */
  onEditPress?: () => void;
  /** Handler for view transactions link press (optional) */
  onViewTransactionsPress?: () => void;
  /** Number of rounds in competition (for auto-split display) */
  roundCount?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIZE_POOL_COLOR = '#059669'; // Emerald/success color for prize money
const SKINS_COLOR = '#8B5CF6'; // Purple for skins
const WINNER_COLOR = '#F59E0B'; // Amber for winner prizes
const OTHER_COLOR = '#6B7280'; // Gray for other

// ============================================================================
// COMPONENT
// ============================================================================

export const PrizePoolSummaryCard = memo(function PrizePoolSummaryCard({
  pool,
  summary,
  isLocked,
  onEditPress,
  onViewTransactionsPress,
  roundCount,
}: PrizePoolSummaryCardProps) {
  const colors = useThemeColors();

  // Format currency helper
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  // Format percentage helper
  const formatPercent = (percent: number) => `${percent}%`;

  // Calculate progress percentage (0-100)
  const getUsagePercent = (used: number, budget: number) => {
    if (budget === 0) return 0;
    return Math.min((used / budget) * 100, 100);
  };

  // Determine if edit should be shown
  const showEdit = onEditPress && !isLocked;

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
            <Text style={[styles.title, { color: colors.textPrimary }]}>Prize Pool</Text>
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
            ? `${formatCurrency(pool.funding_amount)} × players`
            : formatCurrency(pool.funding_amount)}
        </Text>
      </View>

      {/* Allocations */}
      <View style={styles.allocations}>
        {/* Skins Budget */}
        <AllocationRow
          icon={IconDice}
          iconColor={SKINS_COLOR}
          label="Skins Games"
          percent={summary.skins.percent}
          budget={summary.skins.budget}
          used={summary.skins.used}
          remaining={summary.skins.remaining}
          colors={colors}
        />

        {/* Winner Prizes */}
        <AllocationRow
          icon={IconMedal}
          iconColor={WINNER_COLOR}
          label="Winner Prizes"
          percent={summary.winner.percent}
          budget={summary.winner.budget}
          used={summary.winner.used}
          remaining={summary.winner.remaining}
          colors={colors}
        />

        {/* Other */}
        <AllocationRow
          icon={IconDots}
          iconColor={OTHER_COLOR}
          label="Other"
          percent={summary.other.percent}
          budget={summary.other.budget}
          used={summary.other.used}
          remaining={summary.other.remaining}
          colors={colors}
        />
      </View>

      {/* Auto-Split Info */}
      {pool.auto_split_skins && pool.skins_pot_per_round !== null && (
        <View style={[styles.autoSplitInfo, { backgroundColor: `${SKINS_COLOR}10` }]}>
          <IconDice size={16} color={SKINS_COLOR} />
          <Text style={[styles.autoSplitText, { color: colors.textSecondary }]}>
            Auto-split:{' '}
            <Text style={{ color: SKINS_COLOR, fontWeight: '600' }}>
              {formatCurrency(pool.skins_pot_per_round)}
            </Text>{' '}
            per round
            {roundCount !== undefined && roundCount > 0 && (
              <Text style={{ color: colors.textTertiary }}> × {roundCount} rounds</Text>
            )}
          </Text>
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
// ALLOCATION ROW COMPONENT
// ============================================================================

interface AllocationRowProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  iconColor: string;
  label: string;
  percent: number;
  budget: number;
  used: number;
  remaining: number;
  colors: ReturnType<typeof useThemeColors>;
}

const AllocationRow = memo(function AllocationRow({
  icon: IconComponent,
  iconColor,
  label,
  percent,
  budget,
  used,
  remaining,
  colors,
}: AllocationRowProps) {
  // Don't show row if no allocation
  if (percent === 0 && budget === 0) {
    return null;
  }

  const usagePercent = budget > 0 ? (used / budget) * 100 : 0;
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <View style={styles.allocationRow}>
      {/* Header */}
      <View style={styles.allocationHeader}>
        <View style={styles.allocationLeft}>
          <View style={[styles.allocationIcon, { backgroundColor: `${iconColor}20` }]}>
            <IconComponent size={16} color={iconColor} />
          </View>
          <View>
            <Text style={[styles.allocationLabel, { color: colors.textPrimary }]}>{label}</Text>
            <Text style={[styles.allocationPercent, { color: colors.textSecondary }]}>
              {percent}%
            </Text>
          </View>
        </View>
        <View style={styles.allocationRight}>
          <Text style={[styles.allocationBudget, { color: colors.textPrimary }]}>
            {formatCurrency(budget)}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: colors.surfaceVariant }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(usagePercent, 100)}%`,
              backgroundColor: iconColor,
            },
          ]}
        />
      </View>

      {/* Used / Remaining */}
      <View style={styles.allocationDetails}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Used</Text>
          <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
            {formatCurrency(used)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Remaining</Text>
          <Text
            style={[
              styles.detailValue,
              { color: remaining > 0 ? colors.success : colors.textSecondary },
            ]}
          >
            {formatCurrency(remaining)}
          </Text>
        </View>
      </View>
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
  allocations: {
    gap: spacing.lg,
  },
  allocationRow: {
    gap: spacing.sm,
  },
  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allocationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  allocationIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allocationLabel: {
    ...typography.small,
    fontWeight: '500',
  },
  allocationPercent: {
    ...typography.caption,
  },
  allocationRight: {
    alignItems: 'flex-end',
  },
  allocationBudget: {
    ...typography.bodyBold,
  },
  progressContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  allocationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    ...typography.caption,
  },
  detailValue: {
    ...typography.caption,
    fontWeight: '500',
  },
  autoSplitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  autoSplitText: {
    ...typography.small,
    flex: 1,
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

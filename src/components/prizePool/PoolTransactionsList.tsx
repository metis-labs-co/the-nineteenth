/**
 * PoolTransactionsList - List of pool transactions for audit
 *
 * Displays a list of transactions against a prize pool with filtering,
 * type-based icons, and running balance tracking. Supports pull-to-refresh
 * and pagination.
 *
 * @example
 * ```tsx
 * <PoolTransactionsList
 *   transactions={poolTransactions}
 *   isLoading={false}
 *   onRefresh={handleRefresh}
 *   onEndReached={handleLoadMore}
 * />
 * ```
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  type ListRenderItemInfo,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import {
  IconTrophy,
  IconAdjustmentsAlt,
  IconReceipt,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { PoolTransaction, PoolTransactionType } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export type TransactionFilter = 'all' | 'payouts' | 'adjustments';

export interface PoolTransactionsListProps {
  /** Array of pool transactions to display */
  transactions: PoolTransaction[];
  /** Whether transactions are currently loading */
  isLoading: boolean;
  /** Whether more transactions are loading (pagination) */
  isLoadingMore?: boolean;
  /** Handler for pull-to-refresh */
  onRefresh?: () => void;
  /** Whether currently refreshing */
  isRefreshing?: boolean;
  /** Handler for reaching end of list (pagination) */
  onEndReached?: () => void;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIZE_POOL_COLOR = '#059669'; // Emerald/success
const ERROR_COLOR = '#DC2626'; // Red for debits
const ADJUSTMENT_COLOR = '#6B7280'; // Gray for adjustments

const FILTER_TABS: { key: TransactionFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'payouts', label: 'Payouts' },
  { key: 'adjustments', label: 'Adjustments' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the icon component for a transaction type
 */
function getTransactionIcon(
  type: PoolTransactionType
): React.ComponentType<{ size: number; color: string }> {
  switch (type) {
    case 'prize_payout':
      return IconTrophy;
    case 'adjustment':
      return IconAdjustmentsAlt;
    default:
      return IconReceipt;
  }
}

/**
 * Get the color for a transaction type
 */
function getTransactionColor(type: PoolTransactionType, amount: number): string {
  // Payouts (negative) are error color
  if (type === 'prize_payout') return ERROR_COLOR;

  // Adjustments depend on sign
  if (type === 'adjustment') return amount >= 0 ? PRIZE_POOL_COLOR : ERROR_COLOR;

  // Default neutral
  return ADJUSTMENT_COLOR;
}

/**
 * Get human-readable label for transaction type
 */
function getTransactionLabel(type: PoolTransactionType): string {
  switch (type) {
    case 'prize_payout':
      return 'Prize Payout';
    case 'adjustment':
      return 'Adjustment';
    default:
      return 'Transaction';
  }
}

/**
 * Format currency amount with sign
 */
function formatAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

/**
 * Format balance amount
 */
function formatBalance(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format timestamp to relative or date string
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Format as date for older transactions
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Filter transactions by type
 */
function filterTransactions(
  transactions: PoolTransaction[],
  filter: TransactionFilter
): PoolTransaction[] {
  if (filter === 'all') return transactions;

  if (filter === 'payouts') {
    return transactions.filter((t) => t.transaction_type === 'prize_payout');
  }

  if (filter === 'adjustments') {
    return transactions.filter((t) => t.transaction_type === 'adjustment');
  }

  return transactions;
}

// ============================================================================
// TRANSACTION ROW COMPONENT
// ============================================================================

interface TransactionRowProps {
  transaction: PoolTransaction;
  colors: ReturnType<typeof useThemeColors>;
}

const TransactionRow = memo(function TransactionRow({
  transaction,
  colors,
}: TransactionRowProps) {
  const IconComponent = getTransactionIcon(transaction.transaction_type);
  const iconColor = getTransactionColor(transaction.transaction_type, transaction.amount);
  const isPositive = transaction.amount >= 0;

  return (
    <View style={[styles.transactionRow, { backgroundColor: colors.surface }]}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
        <IconComponent size={20} color={iconColor} />
      </View>

      {/* Details */}
      <View style={styles.transactionDetails}>
        <View style={styles.transactionHeader}>
          <Text style={[styles.transactionLabel, { color: colors.textPrimary }]}>
            {getTransactionLabel(transaction.transaction_type)}
          </Text>
          <Text
            style={[
              styles.transactionAmount,
              { color: isPositive ? PRIZE_POOL_COLOR : ERROR_COLOR },
            ]}
          >
            {formatAmount(transaction.amount)}
          </Text>
        </View>

        {/* Description if present */}
        {transaction.description && (
          <Text
            style={[styles.transactionDescription, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {transaction.description}
          </Text>
        )}

        {/* Footer: Balance and Time */}
        <View style={styles.transactionFooter}>
          <Text style={[styles.balanceLabel, { color: colors.textTertiary }]}>
            Balance: <Text style={{ color: colors.textSecondary }}>{formatBalance(transaction.balance_after)}</Text>
          </Text>
          <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
            {formatTimestamp(transaction.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );
});

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  filter: TransactionFilter;
  colors: ReturnType<typeof useThemeColors>;
}

const EmptyState = memo(function EmptyState({ filter, colors }: EmptyStateProps) {
  const getMessage = () => {
    switch (filter) {
      case 'payouts':
        return 'No prize payouts yet';
      case 'adjustments':
        return 'No adjustments yet';
      default:
        return 'No transactions yet';
    }
  };

  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: `${PRIZE_POOL_COLOR}15` }]}>
        <IconReceipt size={32} color={PRIZE_POOL_COLOR} />
      </View>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {getMessage()}
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
        Transactions will appear here as the pool is used
      </Text>
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PoolTransactionsList = memo(function PoolTransactionsList({
  transactions,
  isLoading,
  isLoadingMore = false,
  onRefresh,
  isRefreshing = false,
  onEndReached,
  testID,
}: PoolTransactionsListProps) {
  const colors = useThemeColors();
  const [activeFilter, setActiveFilter] = useState<TransactionFilter>('all');

  // Filter transactions based on active filter
  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, activeFilter),
    [transactions, activeFilter]
  );

  // Render a single transaction item
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PoolTransaction>) => (
      <TransactionRow transaction={item} colors={colors} />
    ),
    [colors]
  );

  // Key extractor
  const keyExtractor = useCallback((item: PoolTransaction) => item.id, []);

  // Handle end reached for pagination
  const handleEndReached = useCallback(() => {
    if (!isLoadingMore && onEndReached) {
      onEndReached();
    }
  }, [isLoadingMore, onEndReached]);

  // Render loading indicator at bottom for pagination
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isLoadingMore, colors.primary]);

  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return <EmptyState filter={activeFilter} colors={colors} />;
  }, [isLoading, activeFilter, colors]);

  // Item separator
  const renderSeparator = useCallback(
    () => <View style={[styles.separator, { backgroundColor: colors.border }]} />,
    [colors.border]
  );

  // Show loading state for initial load
  if (isLoading && transactions.length === 0) {
    return (
      <View style={styles.loadingContainer} testID={testID}>
        <LoadingSpinner size="lg" />
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.surfaceVariant }]}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                isActive && { backgroundColor: colors.surface },
                isActive && shadows.sm,
              ]}
              onPress={() => setActiveFilter(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Filter by ${tab.label}`}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isActive ? colors.textPrimary : colors.textSecondary },
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.listContent,
          filteredTransactions.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Loading states
  loadingContainer: {
    flex: 1,
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },

  // Filter tabs
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabText: {
    ...typography.small,
  },
  filterTabTextActive: {
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingBottom: spacing.lg,
  },
  listContentEmpty: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 40 + spacing.md, // Align with text after icon
  },

  // Transaction row
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
    gap: spacing.xs,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLabel: {
    ...typography.bodyBold,
  },
  transactionAmount: {
    ...typography.bodyBold,
  },
  transactionDescription: {
    ...typography.small,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  balanceLabel: {
    ...typography.caption,
  },
  timestamp: {
    ...typography.caption,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.small,
    textAlign: 'center',
  },
});

export default PoolTransactionsList;

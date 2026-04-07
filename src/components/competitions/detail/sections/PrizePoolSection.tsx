/**
 * PrizePoolSection - Prize pool display for competition details
 *
 * Displays:
 * - Prize pool summary with placement-based payouts
 * - Lock status indicator when pool is locked
 * - Add/Edit buttons for organizers
 * - Empty state when no pool is configured
 *
 * This component integrates with PrizePoolSummaryCard for the detailed
 * pool display when a pool exists.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { IconTrophy, IconPlus } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows, featureColors } from '@/constants/theme';
import { PrizePoolSummaryCard } from '@/components/prizePool';
import type { PrizePoolSectionProps } from './types';

// =====================================================
// CONSTANTS
// =====================================================

const PRIZE_POOL_COLOR = featureColors.prizePool;

// =====================================================
// COMPONENT
// =====================================================

export function PrizePoolSection({
  pool,
  placements,
  isOrganizer,
  isLocked,
  onAddPress,
  onEditPress,
  onViewTransactionsPress,
}: PrizePoolSectionProps) {
  const colors = useThemeColors();

  // No pool configured - show empty state
  if (!pool) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <IconTrophy size={20} color={colors.textPrimary} />
            <Text style={[styles.sectionTitle, styles.noMargin, { color: colors.textPrimary }]}>
              Prize Pool
            </Text>
          </View>
        </View>

        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: `${PRIZE_POOL_COLOR}15` }]}>
            <IconTrophy size={32} color={PRIZE_POOL_COLOR} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No Prize Pool Configured
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            Add a prize pool to fund winner prizes and other competition rewards.
          </Text>
          {isOrganizer && onAddPress && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={onAddPress}
              accessibilityRole="button"
              accessibilityLabel="Add prize pool"
              activeOpacity={0.7}
            >
              <IconPlus size={18} color={colors.white} />
              <Text style={[styles.addButtonText, { color: colors.white }]}>Add Prize Pool</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <IconTrophy size={20} color={colors.textPrimary} />
          <Text style={[styles.sectionTitle, styles.noMargin, { color: colors.textPrimary }]}>
            Prize Pool
          </Text>
        </View>
      </View>

      <PrizePoolSummaryCard
        pool={pool}
        placements={placements}
        isLocked={isLocked}
        onEditPress={isOrganizer && !isLocked ? onEditPress : undefined}
        onViewTransactionsPress={onViewTransactionsPress}
      />
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  // Section
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  noMargin: {
    marginBottom: 0,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Empty State
  emptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyDescription: {
    ...typography.small,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.lg,
  },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  addButtonText: {
    ...typography.smallBold,
  },
});

export default PrizePoolSection;

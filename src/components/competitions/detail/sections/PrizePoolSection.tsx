/**
 * PrizePoolSection - Prize pool display for competition details
 *
 * Displays:
 * - Prize pool summary with total amount and allocations
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
import { IconTrophy, IconPlus, IconDice, IconCheck, IconAlertCircle } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PrizePoolSummaryCard } from '@/components/prizePool';
import { useAutoSplitSkinsSync } from '@/hooks/useAutoSplitSkinsSync';
import type { PoolAllocationSummary } from '@/types';
import type { PrizePoolSectionProps } from './types';

// =====================================================
// CONSTANTS
// =====================================================

const PRIZE_POOL_COLOR = '#059669'; // Emerald/success color for prize money

// =====================================================
// COMPONENT
// =====================================================

export function PrizePoolSection({
  pool,
  summary,
  isOrganizer,
  isLocked,
  roundCount,
  competitionId,
  playerCount,
  onAddPress,
  onEditPress,
  onViewTransactionsPress,
}: PrizePoolSectionProps) {
  const colors = useThemeColors();

  // Get auto-split skins status
  const {
    potPerRound,
    skinsGamesCreated,
    playerCount: syncPlayerCount,
    isLoading: isLoadingSync,
  } = useAutoSplitSkinsSync(competitionId);

  // Use passed playerCount or fallback to sync's playerCount
  const effectivePlayerCount = playerCount ?? syncPlayerCount;

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
            Add a prize pool to fund skins games, winner prizes, and other competition rewards.
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

  // Pool exists - show summary card
  // Create a default summary if none provided
  const displaySummary: PoolAllocationSummary = summary ?? {
    skins: {
      percent: pool.skins_allocation_percent,
      budget: pool.skins_budget,
      used: 0,
      remaining: pool.skins_budget,
    },
    winner: {
      percent: pool.winner_allocation_percent,
      budget: pool.winner_budget,
      used: 0,
      remaining: pool.winner_budget,
    },
    other: {
      percent: pool.other_allocation_percent,
      budget: pool.other_budget,
      used: 0,
      remaining: pool.other_budget,
    },
  };

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
        summary={displaySummary}
        isLocked={isLocked}
        onEditPress={isOrganizer && !isLocked ? onEditPress : undefined}
        onViewTransactionsPress={onViewTransactionsPress}
        roundCount={roundCount}
      />

      {/* Auto-Split Skins Status */}
      {pool.auto_split_skins && (
        <View style={[styles.autoSplitStatus, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.autoSplitHeader}>
            <IconDice size={20} color="#8B5CF6" />
            <Text style={[styles.autoSplitTitle, { color: colors.textPrimary }]}>
              Auto-Split Skins
            </Text>
          </View>
          <Text style={[styles.autoSplitSubtitle, { color: colors.textSecondary }]}>
            ${potPerRound}/round × {roundCount ?? 0} rounds = ${potPerRound * (roundCount ?? 0)}
          </Text>

          {/* Status indicator */}
          {!isLoadingSync && (
            <>
              {effectivePlayerCount < 2 ? (
                <View style={[styles.statusBox, { backgroundColor: colors.warningLight }]}>
                  <IconAlertCircle size={16} color={colors.warning} />
                  <Text style={[styles.statusText, { color: colors.warningDark }]}>
                    Add 2+ players to activate skins games
                  </Text>
                </View>
              ) : skinsGamesCreated > 0 ? (
                <View style={[styles.statusBox, { backgroundColor: colors.successLight }]}>
                  <IconCheck size={16} color={colors.success} />
                  <Text style={[styles.statusText, { color: colors.successDark }]}>
                    {skinsGamesCreated} game{skinsGamesCreated !== 1 ? 's' : ''} configured
                  </Text>
                </View>
              ) : (
                <View style={[styles.statusBox, { backgroundColor: colors.infoLight }]}>
                  <IconDice size={16} color={colors.info} />
                  <Text style={[styles.statusText, { color: colors.infoDark }]}>
                    Skins games will be created automatically
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
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

  // Auto-Split Status
  autoSplitStatus: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  autoSplitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  autoSplitTitle: {
    ...typography.smallBold,
  },
  autoSplitSubtitle: {
    ...typography.caption,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusText: {
    ...typography.small,
    flex: 1,
  },
});

export default PrizePoolSection;

/**
 * PrizePoolSection - Displays prize pool configuration in the review step
 *
 * Shows funding type, amount, per-player note, and placement breakdown.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Divider, Chip } from 'react-native-paper';
import { IconTrophy } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ReviewItem } from './ReviewItem';
import type { PrizePoolConfigFormData } from '@/schemas/competition';

// Prize pool color for styling
const PRIZE_POOL_COLOR = '#059669';

export interface PrizePoolSectionProps {
  prizePoolData: PrizePoolConfigFormData;
  /** Section title — defaults to "Prize Pool" */
  title?: string;
}

export function PrizePoolSection({ prizePoolData, title = 'Prize Pool' }: PrizePoolSectionProps) {
  const colors = useThemeColors();

  const fundingLabel =
    prizePoolData.fundingType === 'per_player' ? 'Per Player' : 'Fixed Total';

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.prizePoolIcon, { backgroundColor: `${PRIZE_POOL_COLOR}20` }]}>
            <IconTrophy size={18} color={PRIZE_POOL_COLOR} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        </View>
        <Chip
          mode="flat"
          style={[styles.badge, { backgroundColor: PRIZE_POOL_COLOR }]}
          textStyle={[styles.badgeText, { color: colors.white }]}
        >
          {fundingLabel}
        </Chip>
      </View>
      <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

      <View style={styles.itemsContainer}>
        <ReviewItem
          label="Amount"
          value={formatCurrency(prizePoolData.fundingAmount)}
          colors={colors}
        />
        {prizePoolData.fundingType === 'per_player' && (
          <View style={[styles.perPlayerNote, { backgroundColor: colors.gray50 }]}>
            <Text style={[styles.perPlayerNoteText, { color: colors.textSecondary }]}>
              Total calculated when players are added
            </Text>
          </View>
        )}

        {/* Placement breakdown */}
        <View style={styles.allocationContainer}>
          {prizePoolData.placements.map((placement) => (
            <View key={placement.position} style={styles.allocationRow}>
              <View style={styles.allocationLabel}>
                <View style={[styles.colorDot, { backgroundColor: PRIZE_POOL_COLOR }]} />
                <Text style={[styles.allocationText, { color: colors.textPrimary }]}>
                  {placement.position === 1
                    ? '1st Place'
                    : placement.position === 2
                      ? '2nd Place'
                      : placement.position === 3
                        ? '3rd Place'
                        : `${placement.position}th Place`}
                </Text>
              </View>
              <Text style={[styles.allocationValue, { color: colors.textSecondary }]}>
                {placement.percent}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.bodyBold,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prizePoolIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    height: 28,
  },
  badgeText: {
    ...typography.captionBold,
  },
  divider: {
    marginVertical: spacing.md,
  },
  itemsContainer: {
    gap: spacing.md,
  },
  perPlayerNote: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  perPlayerNoteText: {
    ...typography.caption,
    textAlign: 'center',
  },
  allocationContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allocationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  allocationText: {
    ...typography.small,
  },
  allocationValue: {
    ...typography.small,
  },
});

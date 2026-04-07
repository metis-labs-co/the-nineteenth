/**
 * PrizePoolFundingSection - Funding type and amount configuration UI
 *
 * Displays:
 * - Funding type segmented button (per player / fixed total)
 * - Funding amount input with calculated total
 * - Total prize pool summary
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import {
  IconCurrencyDollar,
  IconInfoCircle,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import type { PoolFundingType } from '@/types';
import { formatCurrency, type PrizePoolCalculations } from './usePrizePoolConfig';

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIZE_POOL_COLOR = '#059669';

const FUNDING_TYPE_OPTIONS = [
  { value: 'per_player' as PoolFundingType, label: 'Per Player', icon: 'account-group' },
  { value: 'fixed_total' as PoolFundingType, label: 'Fixed Total', icon: 'currency-usd' },
];

// ============================================================================
// TYPES
// ============================================================================

export interface PrizePoolFundingSectionProps {
  /** Current funding type */
  fundingType: PoolFundingType;
  /** Current funding amount */
  fundingAmount: number;
  /** Number of players for per-player calculation */
  playerCount: number;
  /** Calculated values */
  calculations: PrizePoolCalculations;
  /** Whether inputs are disabled */
  isDisabled: boolean;
  /** Whether the pool is locked */
  isLocked: boolean;
  /** Handler for funding type changes */
  onFundingTypeChange: (value: PoolFundingType) => void;
  /** Handler for funding amount changes */
  onFundingAmountChange: (text: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PrizePoolFundingSection = memo(function PrizePoolFundingSection({
  fundingType,
  fundingAmount,
  playerCount,
  calculations,
  isDisabled,
  isLocked,
  onFundingTypeChange,
  onFundingAmountChange,
}: PrizePoolFundingSectionProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Funding Type */}
      <View style={styles.configSection}>
        <Text style={[styles.configSectionTitle, { color: colors.textPrimary }]}>
          Funding Type
        </Text>
        <SegmentedButton
          value={fundingType}
          onValueChange={onFundingTypeChange}
          buttons={FUNDING_TYPE_OPTIONS}
          disabled={isDisabled}
          size="small"
        />
      </View>

      {/* Funding Amount */}
      <View style={styles.configSection}>
        <Text style={[styles.configSectionTitle, { color: colors.textPrimary }]}>
          {fundingType === 'per_player' ? 'Amount Per Player' : 'Total Amount'}
        </Text>
        <View style={styles.amountRow}>
          <TextInput
            mode="outlined"
            value={fundingAmount.toString()}
            onChangeText={onFundingAmountChange}
            keyboardType="decimal-pad"
            disabled={isDisabled}
            left={<TextInput.Affix text="$" />}
            style={[styles.amountInput, { backgroundColor: colors.surface }]}
            outlineColor={colors.border}
            activeOutlineColor={PRIZE_POOL_COLOR}
          />
          {fundingType === 'per_player' && (
            <View style={styles.calculatedTotal}>
              <Text style={[styles.calculatedLabel, { color: colors.textSecondary }]}>
                x {playerCount} players =
              </Text>
              <Text style={[styles.calculatedValue, { color: PRIZE_POOL_COLOR }]}>
                {formatCurrency(calculations.totalPool)}
              </Text>
            </View>
          )}
        </View>
        {fundingType === 'per_player' && playerCount === 0 && (
          <View style={[styles.infoBox, { backgroundColor: colors.warningLight }]}>
            <IconInfoCircle size={16} color={colors.warning} />
            <Text style={[styles.infoText, { color: colors.warningDark }]}>
              Total will be calculated when players are added
            </Text>
          </View>
        )}
      </View>

      {/* Total Pool Amount Summary */}
      <View
        style={[
          styles.totalSummary,
          { backgroundColor: `${PRIZE_POOL_COLOR}15`, borderColor: `${PRIZE_POOL_COLOR}30` },
        ]}
      >
        <IconCurrencyDollar size={20} color={PRIZE_POOL_COLOR} />
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
          Total Prize Pool:
        </Text>
        <Text style={[styles.totalValue, { color: PRIZE_POOL_COLOR }]}>
          {formatCurrency(calculations.totalPool)}
        </Text>
      </View>
    </>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  configSection: {
    gap: spacing.sm,
  },
  configSectionTitle: {
    ...typography.smallBold,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  amountInput: {
    width: 120,
  },
  calculatedTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  calculatedLabel: {
    ...typography.small,
  },
  calculatedValue: {
    ...typography.bodyBold,
  },
  totalSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  totalLabel: {
    ...typography.small,
    flex: 1,
  },
  totalValue: {
    ...typography.h4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
});

/**
 * PrizePoolSection - Prize pool configuration section for competition setup
 *
 * Allows organizers to enable and configure prize pools for competitions.
 * Prize pools fund skins games and other competition prizes.
 *
 * Supports both Add (no editState) and Edit (with editState) scenarios.
 *
 * When editState is provided:
 * - Shows lock icon instead of switch when pool is locked
 * - Displays locked reason message
 * - Prevents editing of funding/allocation fields
 *
 * @example
 * ```tsx
 * <PrizePoolSection
 *   competitionId={competitionId}
 *   pool={existingPool}
 *   playerCount={8}
 *   roundCount={4}
 *   onPoolChange={handlePoolChange}
 *   isPremium={isPremium}
 *   onUpgradePress={navigateToSubscription}
 * />
 * ```
 */

import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { Text, Icon, Divider, TextInput } from 'react-native-paper';
import {
  IconTrophy,
  IconLock,
  IconCurrencyDollar,
  IconPercentage,
  IconInfoCircle,
  IconUsers,
  IconDice,
  IconMedal,
  IconDots,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Pill } from '@/components/common';
import type {
  CompetitionPrizePool,
  PoolFundingType,
  CreatePrizePoolInput,
  UpdatePrizePoolInput,
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * State for tracking existing prize pool in edit mode
 */
export interface PrizePoolEditState {
  /** Whether the competition has an existing prize pool */
  hasExistingPool: boolean;
  /** Whether the pool is locked (any round has started) */
  isLocked: boolean;
  /** Reason why pool can't be edited (if applicable) */
  lockedReason: string | null;
}

/**
 * Prize pool configuration values used during setup
 */
export interface PrizePoolConfig {
  fundingType: PoolFundingType;
  fundingAmount: number;
  skinsAllocationPercent: number;
  winnerAllocationPercent: number;
  otherAllocationPercent: number;
  autoSplitSkins: boolean;
}

export interface PrizePoolSectionProps {
  /** Competition ID (for creating pool) */
  competitionId?: string;
  /** Existing pool data (null if none) */
  pool: CompetitionPrizePool | null;
  /** Number of players in competition */
  playerCount: number;
  /** Number of rounds in competition */
  roundCount: number;
  /** Callback when pool config changes */
  onPoolChange: (config: PrizePoolConfig | null) => void;
  /** Handler for upgrade prompt */
  onUpgradePress: () => void;
  /** Whether the entire section is disabled */
  disabled?: boolean;
  /** Optional edit mode state */
  editState?: PrizePoolEditState;
  /** Hide the enable/disable toggle (used in wizard where user already opted in) */
  hideToggle?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FUNDING_TYPE_OPTIONS = [
  { value: 'per_player' as PoolFundingType, label: 'Per Player', icon: 'account-group' },
  { value: 'fixed_total' as PoolFundingType, label: 'Fixed Total', icon: 'currency-usd' },
];

const PRIZE_POOL_COLOR = '#059669'; // Emerald/success color for prize money

const DEFAULT_CONFIG: PrizePoolConfig = {
  fundingType: 'per_player',
  fundingAmount: 50,
  skinsAllocationPercent: 60,
  winnerAllocationPercent: 30,
  otherAllocationPercent: 10,
  autoSplitSkins: true,
};

// ============================================================================
// COMPONENT
// ============================================================================

export const PrizePoolSection = memo(function PrizePoolSection({
  competitionId,
  pool,
  playerCount,
  roundCount,
  onPoolChange,
  onUpgradePress,
  disabled,
  editState,
  hideToggle,
}: PrizePoolSectionProps) {
  const colors = useThemeColors();
  const checkFeature = useCheckFeature();
  const isPremium = checkFeature('prize_pool').allowed;

  // Determine mode and lock state
  const isEditMode = editState !== undefined;
  const isLocked = isEditMode && editState.isLocked;
  const isDisabled = disabled || isLocked;
  const hasExistingPool = isEditMode && editState.hasExistingPool;

  // Local state for pool configuration
  // When hideToggle is true, pool is always enabled (user already opted in)
  const [poolEnabled, setPoolEnabled] = useState<boolean>(hideToggle || !!pool);
  const [config, setConfig] = useState<PrizePoolConfig>(() => {
    if (pool) {
      return {
        fundingType: pool.funding_type,
        fundingAmount: pool.funding_amount,
        skinsAllocationPercent: pool.skins_allocation_percent,
        winnerAllocationPercent: pool.winner_allocation_percent,
        otherAllocationPercent: pool.other_allocation_percent,
        autoSplitSkins: pool.auto_split_skins,
      };
    }
    return DEFAULT_CONFIG;
  });

  // Sync with prop changes
  useEffect(() => {
    if (pool) {
      setPoolEnabled(true);
      setConfig({
        fundingType: pool.funding_type,
        fundingAmount: pool.funding_amount,
        skinsAllocationPercent: pool.skins_allocation_percent,
        winnerAllocationPercent: pool.winner_allocation_percent,
        otherAllocationPercent: pool.other_allocation_percent,
        autoSplitSkins: pool.auto_split_skins,
      });
    }
  }, [pool]);

  // When hideToggle is true, notify parent of initial config on mount
  useEffect(() => {
    if (hideToggle && !pool) {
      onPoolChange(config);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate derived values
  const calculations = useMemo(() => {
    const totalPool =
      config.fundingType === 'per_player'
        ? config.fundingAmount * playerCount
        : config.fundingAmount;

    const totalAllocated =
      config.skinsAllocationPercent +
      config.winnerAllocationPercent +
      config.otherAllocationPercent;

    const skinsBudget = (totalPool * config.skinsAllocationPercent) / 100;
    const winnerBudget = (totalPool * config.winnerAllocationPercent) / 100;
    const otherBudget = (totalPool * config.otherAllocationPercent) / 100;
    const unallocated = totalPool - skinsBudget - winnerBudget - otherBudget;

    const skinsPerRound =
      config.autoSplitSkins && roundCount > 0 ? skinsBudget / roundCount : null;

    return {
      totalPool,
      totalAllocated,
      skinsBudget,
      winnerBudget,
      otherBudget,
      unallocated,
      skinsPerRound,
      isValidAllocation: totalAllocated <= 100,
    };
  }, [config, playerCount, roundCount]);

  // Handle toggle change
  const handleToggle = useCallback(() => {
    if (isDisabled) return;

    const newEnabled = !poolEnabled;
    setPoolEnabled(newEnabled);

    if (newEnabled) {
      onPoolChange(config);
    } else {
      onPoolChange(null);
    }
  }, [poolEnabled, config, onPoolChange, isDisabled]);

  // Handle config field changes
  const updateConfig = useCallback(
    (updates: Partial<PrizePoolConfig>) => {
      const newConfig = { ...config, ...updates };
      setConfig(newConfig);
      if (poolEnabled) {
        onPoolChange(newConfig);
      }
    },
    [config, poolEnabled, onPoolChange]
  );

  // Handle funding type change
  const handleFundingTypeChange = useCallback(
    (value: PoolFundingType) => {
      updateConfig({ fundingType: value });
    },
    [updateConfig]
  );

  // Handle funding amount change
  const handleFundingAmountChange = useCallback(
    (text: string) => {
      const value = parseFloat(text) || 0;
      updateConfig({ fundingAmount: value });
    },
    [updateConfig]
  );

  // Handle allocation changes
  const handleAllocationChange = useCallback(
    (field: 'skinsAllocationPercent' | 'winnerAllocationPercent' | 'otherAllocationPercent') =>
      (text: string) => {
        const value = Math.min(100, Math.max(0, parseInt(text) || 0));
        updateConfig({ [field]: value });
      },
    [updateConfig]
  );

  // Handle auto-split toggle
  const handleAutoSplitToggle = useCallback(() => {
    updateConfig({ autoSplitSkins: !config.autoSplitSkins });
  }, [config.autoSplitSkins, updateConfig]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  // Labels based on mode
  const labelText = hasExistingPool ? 'Prize Pool Configured' : 'Add Prize Pool';
  const descriptionText =
    isLocked && editState?.lockedReason
      ? editState.lockedReason
      : 'Fund skins games and competition prizes';

  return (
    <>
      {!hideToggle && (
        <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
      )}

      {isPremium ? (
        <>
          {/* Toggle - hidden when hideToggle is true (user already opted in) */}
          {!hideToggle && (
            <View style={styles.toggleContainer}>
              <View style={styles.toggleContent}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: poolEnabled ? `${PRIZE_POOL_COLOR}20` : colors.gray200 },
                  ]}
                >
                  <IconTrophy
                    size={24}
                    color={poolEnabled ? PRIZE_POOL_COLOR : colors.gray500}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>{labelText}</Text>
                  <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {descriptionText}
                  </Text>
                </View>
              </View>
              {isLocked ? (
                <IconLock size={24} color={colors.gray400} />
              ) : (
                <Switch
                  value={poolEnabled}
                  onValueChange={handleToggle}
                  trackColor={{ false: colors.gray300, true: `${PRIZE_POOL_COLOR}80` }}
                  thumbColor={poolEnabled ? PRIZE_POOL_COLOR : colors.gray100}
                  disabled={isDisabled}
                />
              )}
            </View>
          )}

          {/* Configuration Panel (when enabled) */}
          {poolEnabled && (
            <View
              style={[
                styles.configPanel,
                {
                  backgroundColor: isLocked ? colors.surfaceVariant : `${PRIZE_POOL_COLOR}08`,
                  borderColor: isLocked ? colors.border : `${PRIZE_POOL_COLOR}30`,
                },
              ]}
            >
              {/* Funding Type */}
              <View style={styles.configSection}>
                <Text style={[styles.configSectionTitle, { color: colors.textPrimary }]}>
                  Funding Type
                </Text>
                <SegmentedButton
                  value={config.fundingType}
                  onValueChange={handleFundingTypeChange}
                  buttons={FUNDING_TYPE_OPTIONS}
                  disabled={isDisabled}
                  size="small"
                />
              </View>

              {/* Funding Amount */}
              <View style={styles.configSection}>
                <Text style={[styles.configSectionTitle, { color: colors.textPrimary }]}>
                  {config.fundingType === 'per_player' ? 'Amount Per Player' : 'Total Amount'}
                </Text>
                <View style={styles.amountRow}>
                  <TextInput
                    mode="outlined"
                    value={config.fundingAmount.toString()}
                    onChangeText={handleFundingAmountChange}
                    keyboardType="decimal-pad"
                    disabled={isDisabled}
                    left={<TextInput.Affix text="$" />}
                    style={[styles.amountInput, { backgroundColor: colors.surface }]}
                    outlineColor={colors.border}
                    activeOutlineColor={PRIZE_POOL_COLOR}
                  />
                  {config.fundingType === 'per_player' && (
                    <View style={styles.calculatedTotal}>
                      <Text style={[styles.calculatedLabel, { color: colors.textSecondary }]}>
                        × {playerCount} players =
                      </Text>
                      <Text style={[styles.calculatedValue, { color: PRIZE_POOL_COLOR }]}>
                        {formatCurrency(calculations.totalPool)}
                      </Text>
                    </View>
                  )}
                </View>
                {config.fundingType === 'per_player' && playerCount === 0 && (
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

              {/* Allocations Section */}
              <View style={styles.configSection}>
                <Text style={[styles.configSectionTitle, { color: colors.textPrimary }]}>
                  Allocations
                </Text>
                <Text style={[styles.configSectionDescription, { color: colors.textSecondary }]}>
                  How the prize pool will be divided
                </Text>

                {/* Skins Allocation */}
                <AllocationRow
                  icon={IconDice}
                  iconColor="#8B5CF6"
                  label="Skins Games"
                  percent={config.skinsAllocationPercent}
                  amount={calculations.skinsBudget}
                  onPercentChange={handleAllocationChange('skinsAllocationPercent')}
                  disabled={isDisabled}
                  colors={colors}
                />

                {/* Winner Allocation */}
                <AllocationRow
                  icon={IconMedal}
                  iconColor="#F59E0B"
                  label="Winner Prizes"
                  percent={config.winnerAllocationPercent}
                  amount={calculations.winnerBudget}
                  onPercentChange={handleAllocationChange('winnerAllocationPercent')}
                  disabled={isDisabled}
                  colors={colors}
                />

                {/* Other Allocation */}
                <AllocationRow
                  icon={IconDots}
                  iconColor="#6B7280"
                  label="Other"
                  percent={config.otherAllocationPercent}
                  amount={calculations.otherBudget}
                  onPercentChange={handleAllocationChange('otherAllocationPercent')}
                  disabled={isDisabled}
                  colors={colors}
                />

                {/* Allocation Summary Bar */}
                <View style={styles.allocationBarContainer}>
                  <View style={styles.allocationBarLabels}>
                    <Text style={[styles.allocationBarLabel, { color: colors.textSecondary }]}>
                      {calculations.totalAllocated}% allocated
                    </Text>
                    {calculations.unallocated > 0 && (
                      <Text style={[styles.allocationBarLabel, { color: colors.textTertiary }]}>
                        {formatCurrency(calculations.unallocated)} unallocated
                      </Text>
                    )}
                  </View>
                  <View style={[styles.allocationBar, { backgroundColor: colors.surfaceVariant }]}>
                    <View
                      style={[
                        styles.allocationBarFill,
                        {
                          width: `${Math.min(config.skinsAllocationPercent, 100)}%`,
                          backgroundColor: '#8B5CF6',
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.allocationBarFill,
                        {
                          width: `${Math.min(config.winnerAllocationPercent, 100 - config.skinsAllocationPercent)}%`,
                          backgroundColor: '#F59E0B',
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.allocationBarFill,
                        {
                          width: `${Math.min(config.otherAllocationPercent, 100 - config.skinsAllocationPercent - config.winnerAllocationPercent)}%`,
                          backgroundColor: '#6B7280',
                        },
                      ]}
                    />
                  </View>
                </View>

                {!calculations.isValidAllocation && (
                  <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
                    <IconInfoCircle size={16} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      Allocations cannot exceed 100%
                    </Text>
                  </View>
                )}
              </View>

              {/* Auto-Split Skins */}
              {config.skinsAllocationPercent > 0 && (
                <View style={styles.configSection}>
                  <View style={styles.autoSplitRow}>
                    <View style={styles.autoSplitContent}>
                      <Text style={[styles.autoSplitLabel, { color: colors.textPrimary }]}>
                        Auto-split for skins
                      </Text>
                      <Text style={[styles.autoSplitDescription, { color: colors.textSecondary }]}>
                        Automatically enable skins on all rounds with equal pots
                      </Text>
                    </View>
                    <Switch
                      value={config.autoSplitSkins}
                      onValueChange={handleAutoSplitToggle}
                      trackColor={{ false: colors.gray300, true: `${PRIZE_POOL_COLOR}80` }}
                      thumbColor={config.autoSplitSkins ? PRIZE_POOL_COLOR : colors.gray100}
                      disabled={isDisabled}
                    />
                  </View>

                  {config.autoSplitSkins && roundCount > 0 && (
                    <View style={[styles.autoSplitSummary, { backgroundColor: colors.infoLight }]}>
                      <IconDice size={16} color={colors.info} />
                      <Text style={[styles.autoSplitSummaryText, { color: colors.infoDark }]}>
                        {formatCurrency(calculations.skinsPerRound || 0)} per round × {roundCount}{' '}
                        rounds
                      </Text>
                    </View>
                  )}

                  {config.autoSplitSkins && roundCount === 0 && (
                    <View style={[styles.autoSplitSummary, { backgroundColor: colors.warningLight }]}>
                      <IconInfoCircle size={16} color={colors.warning} />
                      <Text style={[styles.autoSplitSummaryText, { color: colors.warningDark }]}>
                        Add rounds to calculate per-round amount
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Locked State Info */}
              {isLocked && editState?.lockedReason && (
                <View style={[styles.lockedInfo, { backgroundColor: colors.surfaceVariant }]}>
                  <IconLock size={20} color={colors.textSecondary} />
                  <Text style={[styles.lockedInfoText, { color: colors.textSecondary }]}>
                    {editState.lockedReason}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Info when pool enabled */}
          {poolEnabled && !isLocked && (
            <View style={[styles.infoBox, { backgroundColor: colors.infoLight, marginTop: spacing.md }]}>
              <Icon source="information-outline" size={20} color={colors.info} />
              <Text style={[styles.infoText, { color: colors.infoDark }]}>
                Prize pool will be locked once any round starts
              </Text>
            </View>
          )}
        </>
      ) : (
        /* Non-premium locked state */
        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={onUpgradePress}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Premium to use prize pools"
          activeOpacity={0.7}
        >
          <View style={styles.toggleContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
              <IconLock size={24} color={colors.gray500} />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Add Prize Pool</Text>
                <Pill label="Premium" variant="warning" filled size="sm" />
              </View>
              <Text style={[styles.description, { color: colors.textTertiary }]}>
                Upgrade to Premium for prize pools
              </Text>
            </View>
          </View>
          <Icon source="chevron-right" size={24} color={colors.gray400} />
        </TouchableOpacity>
      )}
    </>
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
  amount: number;
  onPercentChange: (text: string) => void;
  disabled: boolean;
  colors: ReturnType<typeof useThemeColors>;
}

const AllocationRow = memo(function AllocationRow({
  icon: IconComponent,
  iconColor,
  label,
  percent,
  amount,
  onPercentChange,
  disabled,
  colors,
}: AllocationRowProps) {
  return (
    <View style={styles.allocationRow}>
      <View style={styles.allocationInfo}>
        <View style={[styles.allocationIcon, { backgroundColor: `${iconColor}20` }]}>
          <IconComponent size={16} color={iconColor} />
        </View>
        <View style={styles.allocationLabels}>
          <Text style={[styles.allocationLabel, { color: colors.textPrimary }]}>{label}</Text>
          <Text style={[styles.allocationAmount, { color: colors.textSecondary }]}>
            ${amount.toFixed(2)}
          </Text>
        </View>
      </View>
      <View style={styles.allocationInputContainer}>
        <TextInput
          mode="outlined"
          value={percent.toString()}
          onChangeText={onPercentChange}
          keyboardType="number-pad"
          disabled={disabled}
          right={<TextInput.Affix text="%" />}
          style={[styles.allocationInput, { backgroundColor: colors.surface }]}
          outlineColor={colors.border}
          activeOutlineColor={iconColor}
          dense
        />
      </View>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  divider: {
    marginVertical: spacing.lg,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...typography.bodyBold,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  description: {
    ...typography.small,
    marginTop: 2,
  },
  configPanel: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.lg,
  },
  configSection: {
    gap: spacing.sm,
  },
  configSectionTitle: {
    ...typography.smallBold,
  },
  configSectionDescription: {
    ...typography.caption,
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
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  allocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  allocationIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allocationLabels: {
    flex: 1,
  },
  allocationLabel: {
    ...typography.small,
  },
  allocationAmount: {
    ...typography.caption,
  },
  allocationInputContainer: {
    width: 80,
  },
  allocationInput: {
    height: 40,
    fontSize: 14,
  },
  allocationBarContainer: {
    marginTop: spacing.sm,
  },
  allocationBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  allocationBarLabel: {
    ...typography.caption,
  },
  allocationBar: {
    height: 8,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  allocationBarFill: {
    height: '100%',
  },
  autoSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoSplitContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  autoSplitLabel: {
    ...typography.small,
  },
  autoSplitDescription: {
    ...typography.caption,
    marginTop: 2,
  },
  autoSplitSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  autoSplitSummaryText: {
    ...typography.small,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.small,
    flex: 1,
  },
  lockedInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  lockedInfoText: {
    ...typography.small,
    flex: 1,
  },
});

export default PrizePoolSection;

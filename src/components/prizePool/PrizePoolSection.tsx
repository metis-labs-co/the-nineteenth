/**
 * PrizePoolSection - Prize pool configuration section for competition setup
 *
 * Allows organizers to enable and configure prize pools for competitions.
 * Prize pools distribute payouts to top finishers based on placement splits.
 *
 * Supports both Add (no editState) and Edit (with editState) scenarios.
 *
 * When editState is provided:
 * - Shows lock icon instead of switch when pool is locked
 * - Displays locked reason message
 * - Prevents editing of funding/placement fields
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
} from 'react-native';
import { Text, Icon, Divider, TextInput } from 'react-native-paper';
import {
  IconTrophy,
  IconLock,
  IconCurrencyDollar,
  IconInfoCircle,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { Pill } from '@/components/common';
import type {
  CompetitionPrizePool,
  PoolFundingType,
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
 * A single placement split entry
 */
export interface PlacementEntry {
  position: number;
  percent: number;
}

/**
 * Prize pool configuration values used during setup
 */
export interface PrizePoolConfig {
  fundingType: PoolFundingType;
  fundingAmount: number;
  placements: PlacementEntry[];
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

const DEFAULT_PLACEMENTS: PlacementEntry[] = [
  { position: 1, percent: 60 },
  { position: 2, percent: 30 },
  { position: 3, percent: 10 },
];

const DEFAULT_CONFIG: PrizePoolConfig = {
  fundingType: 'per_player',
  fundingAmount: 50,
  placements: DEFAULT_PLACEMENTS,
};

/** Ordinal suffix for position labels */
function getOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PrizePoolSection = memo(function PrizePoolSection({
  competitionId: _competitionId,
  pool,
  playerCount,
  roundCount: _roundCount,
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
        placements: DEFAULT_PLACEMENTS,
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
        // Placements come from parent context; keep current if pool doesn't carry them
        placements: config.placements,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const totalPercent = config.placements.reduce((sum, p) => sum + p.percent, 0);
    const isValidAllocation = Math.abs(totalPercent - 100) < 0.01;

    return {
      totalPool,
      totalPercent,
      isValidAllocation,
    };
  }, [config, playerCount]);

  // Max placements capped at player count (minimum 1)
  const maxPlacements = Math.max(playerCount, 1);

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

  // Handle placement percent change
  const handlePlacementPercentChange = useCallback(
    (index: number) => (text: string) => {
      const value = Math.min(100, Math.max(0, parseInt(text) || 0));
      const newPlacements = [...config.placements];
      newPlacements[index] = { ...newPlacements[index], percent: value };
      updateConfig({ placements: newPlacements });
    },
    [config.placements, updateConfig]
  );

  // Handle add placement
  const handleAddPlacement = useCallback(() => {
    if (config.placements.length >= maxPlacements) return;
    const nextPosition = config.placements.length + 1;
    const newPlacements = [...config.placements, { position: nextPosition, percent: 0 }];
    updateConfig({ placements: newPlacements });
  }, [config.placements, maxPlacements, updateConfig]);

  // Handle remove placement
  const handleRemovePlacement = useCallback(
    (index: number) => {
      if (config.placements.length <= 1) return;
      const newPlacements = config.placements
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, position: i + 1 }));
      updateConfig({ placements: newPlacements });
    },
    [config.placements, updateConfig]
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  // Labels based on mode
  const labelText = hasExistingPool ? 'Prize Pool Configured' : 'Add Prize Pool';
  const descriptionText =
    isLocked && editState?.lockedReason
      ? editState.lockedReason
      : 'Distribute prizes to top finishers';

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
                        x {playerCount} players =
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

              {/* Prize Distribution Section */}
              <View style={styles.configSection}>
                <View style={styles.distributionHeader}>
                  <Text style={[styles.configSectionTitle, { color: colors.textPrimary }]}>
                    Prize Distribution
                  </Text>
                  <View
                    style={[
                      styles.percentBadge,
                      {
                        backgroundColor: calculations.isValidAllocation
                          ? `${PRIZE_POOL_COLOR}20`
                          : `${colors.error}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.percentBadgeText,
                        {
                          color: calculations.isValidAllocation
                            ? PRIZE_POOL_COLOR
                            : colors.error,
                        },
                      ]}
                    >
                      {calculations.totalPercent}%
                    </Text>
                  </View>
                </View>
                <Text style={[styles.configSectionDescription, { color: colors.textSecondary }]}>
                  How the prize pool will be split among top finishers
                </Text>

                {/* Placement Rows */}
                {config.placements.map((placement, index) => (
                  <PlacementRow
                    key={placement.position}
                    position={placement.position}
                    percent={placement.percent}
                    amount={(calculations.totalPool * placement.percent) / 100}
                    onPercentChange={handlePlacementPercentChange(index)}
                    onRemove={() => handleRemovePlacement(index)}
                    canRemove={config.placements.length > 1}
                    disabled={isDisabled}
                    colors={colors}
                  />
                ))}

                {/* Add Placement Button */}
                {config.placements.length < maxPlacements && !isDisabled && (
                  <TouchableOpacity
                    style={[styles.addPlacementButton, { borderColor: `${PRIZE_POOL_COLOR}40` }]}
                    onPress={handleAddPlacement}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Add placement"
                  >
                    <IconPlus size={16} color={PRIZE_POOL_COLOR} />
                    <Text style={[styles.addPlacementText, { color: PRIZE_POOL_COLOR }]}>
                      Add Placement
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Validation Message */}
                {!calculations.isValidAllocation && (
                  <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
                    <IconInfoCircle size={16} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {calculations.totalPercent > 100
                        ? 'Percentages cannot exceed 100%'
                        : 'Percentages must add up to exactly 100%'}
                    </Text>
                  </View>
                )}
              </View>

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
// PLACEMENT ROW COMPONENT
// ============================================================================

interface PlacementRowProps {
  position: number;
  percent: number;
  amount: number;
  onPercentChange: (text: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled: boolean;
  colors: ReturnType<typeof useThemeColors>;
}

const PlacementRow = memo(function PlacementRow({
  position,
  percent,
  amount,
  onPercentChange,
  onRemove,
  canRemove,
  disabled,
  colors,
}: PlacementRowProps) {
  return (
    <View style={styles.placementRow}>
      <View style={styles.placementInfo}>
        <View style={[styles.positionBadge, { backgroundColor: `${PRIZE_POOL_COLOR}15` }]}>
          <Text style={[styles.positionText, { color: PRIZE_POOL_COLOR }]}>
            {getOrdinal(position)}
          </Text>
        </View>
        <Text style={[styles.placementAmount, { color: colors.textSecondary }]}>
          ${amount.toFixed(2)}
        </Text>
      </View>
      <View style={styles.placementActions}>
        <View style={styles.placementInputContainer}>
          <TextInput
            mode="outlined"
            value={percent.toString()}
            onChangeText={onPercentChange}
            keyboardType="number-pad"
            disabled={disabled}
            right={<TextInput.Affix text="%" />}
            style={[styles.placementInput, { backgroundColor: colors.surface }]}
            outlineColor={colors.border}
            activeOutlineColor={PRIZE_POOL_COLOR}
            dense
          />
        </View>
        {canRemove && !disabled && (
          <TouchableOpacity
            onPress={onRemove}
            style={styles.removeButton}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${getOrdinal(position)} place`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconTrash size={18} color={colors.error} />
          </TouchableOpacity>
        )}
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
  distributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  percentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  percentBadgeText: {
    ...typography.captionBold,
  },
  placementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  placementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  positionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  positionText: {
    ...typography.smallBold,
  },
  placementAmount: {
    ...typography.caption,
  },
  placementActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placementInputContainer: {
    width: 80,
  },
  placementInput: {
    height: 40,
    fontSize: 14,
  },
  removeButton: {
    padding: spacing.xs,
  },
  addPlacementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  addPlacementText: {
    ...typography.small,
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

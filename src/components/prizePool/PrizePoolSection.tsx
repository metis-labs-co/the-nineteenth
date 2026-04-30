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

import React, { memo } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import {
  IconTrophy,
  IconLock,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { Pill } from '@/components/common';
import { PrizePoolFundingSection } from './PrizePoolFundingSection';
import { PrizePoolPlacements } from './PrizePoolPlacements';
import { usePrizePoolConfig } from './usePrizePoolConfig';
import type { CompetitionPrizePool, PoolFundingType, PoolTargetType } from '@/types';

// Re-export types from the hook for backward compatibility
export type {
  PrizePoolEditState,
  PrizePoolConfig,
  PlacementEntry,
} from './usePrizePoolConfig';

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIZE_POOL_COLOR = '#059669'; // Emerald/success color for prize money

// ============================================================================
// TYPES
// ============================================================================

export interface PrizePoolSectionProps {
  /** Competition ID (for creating pool) */
  competitionId?: string;
  /** Existing pool data (null if none) */
  pool: CompetitionPrizePool | null;
  /** Number of players in competition */
  playerCount: number;
  /** Number of teams in competition (required when targetType='team') */
  teamCount?: number;
  /** Pool target — defaults to 'individual' */
  targetType?: PoolTargetType;
  /** Number of rounds in competition */
  roundCount: number;
  /** Callback when pool config changes */
  onPoolChange: (config: import('./usePrizePoolConfig').PrizePoolConfig | null) => void;
  /** Handler for upgrade prompt */
  onUpgradePress: () => void;
  /** Whether the entire section is disabled */
  disabled?: boolean;
  /** Optional edit mode state */
  editState?: import('./usePrizePoolConfig').PrizePoolEditState;
  /** Hide the enable/disable toggle (used in wizard where user already opted in) */
  hideToggle?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PrizePoolSection = memo(function PrizePoolSection({
  competitionId: _competitionId,
  pool,
  playerCount,
  teamCount = 0,
  targetType = 'individual',
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

  const {
    poolEnabled,
    config,
    calculations,
    maxPlacements,
    isLocked,
    isDisabled,
    labelText,
    descriptionText,
    handleToggle,
    handleFundingTypeChange,
    handleFundingAmountChange,
    handlePlacementPercentChange,
    handleAddPlacement,
    handleRemovePlacement,
  } = usePrizePoolConfig({
    pool,
    playerCount,
    teamCount,
    targetType,
    onPoolChange,
    disabled,
    editState,
    hideToggle,
  });

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
              {/* Funding Type & Amount */}
              <PrizePoolFundingSection
                fundingType={config.fundingType}
                fundingAmount={config.fundingAmount}
                playerCount={playerCount}
                calculations={calculations}
                isDisabled={isDisabled}
                isLocked={isLocked}
                onFundingTypeChange={handleFundingTypeChange}
                onFundingAmountChange={handleFundingAmountChange}
              />

              {/* Prize Distribution */}
              <PrizePoolPlacements
                placements={config.placements}
                calculations={calculations}
                maxPlacements={maxPlacements}
                isDisabled={isDisabled}
                onPlacementPercentChange={handlePlacementPercentChange}
                onAddPlacement={handleAddPlacement}
                onRemovePlacement={handleRemovePlacement}
              />

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

export default PrizePoolSection;

/**
 * PrizePoolSetupStep - Prize pool configuration step for competition wizard
 *
 * This step is dynamically inserted after the Rounds step when prize pool is enabled.
 * It uses the PrizePoolSection component for configuration.
 *
 * Features:
 * - Funding type selection (per player / fixed total)
 * - Funding amount input
 * - Allocation percentages (skins, winner, other)
 * - Auto-split toggle for skins
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Button, Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconTrophy, IconInfoCircle } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { PrizePoolConfigFormData, PoolFundingType } from '@/schemas/competition';
import { PrizePoolSection, type PrizePoolConfig } from '@/components/prizePool';

// Prize pool color for styling
const PRIZE_POOL_COLOR = '#059669';

export interface PrizePoolSetupStepProps {
  /** Initial configuration data */
  initialData?: PrizePoolConfigFormData;
  /** Number of players (for per-player calculation) */
  playerCount?: number;
  /** Number of rounds (for auto-split calculation) */
  roundCount: number;
  /** Handler when step is completed */
  onComplete: (data: PrizePoolConfigFormData) => void;
  /** Handler for back navigation */
  onBack: () => void;
}

// Default prize pool configuration
const DEFAULT_CONFIG: PrizePoolConfigFormData = {
  fundingType: 'per_player',
  fundingAmount: 50,
  skinsAllocationPercent: 60,
  winnerAllocationPercent: 30,
  otherAllocationPercent: 10,
  autoSplitSkins: true,
};

export function PrizePoolSetupStep({
  initialData,
  playerCount = 0,
  roundCount,
  onComplete,
  onBack,
}: PrizePoolSetupStepProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // Local state for prize pool configuration
  const [config, setConfig] = useState<PrizePoolConfigFormData>(
    initialData || DEFAULT_CONFIG
  );

  // Calculate derived values for display
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
    const skinsPerRound =
      config.autoSplitSkins && roundCount > 0 ? skinsBudget / roundCount : null;

    return {
      totalPool,
      totalAllocated,
      skinsBudget,
      skinsPerRound,
      isValidAllocation: totalAllocated <= 100,
    };
  }, [config, playerCount, roundCount]);

  // Handle pool configuration changes from PrizePoolSection
  const handlePoolChange = useCallback((poolConfig: PrizePoolConfig | null) => {
    if (poolConfig) {
      setConfig({
        fundingType: poolConfig.fundingType,
        fundingAmount: poolConfig.fundingAmount,
        skinsAllocationPercent: poolConfig.skinsAllocationPercent,
        winnerAllocationPercent: poolConfig.winnerAllocationPercent,
        otherAllocationPercent: poolConfig.otherAllocationPercent,
        autoSplitSkins: poolConfig.autoSplitSkins,
      });
    }
  }, []);

  // Handle step completion
  const handleComplete = useCallback(() => {
    if (calculations.isValidAllocation) {
      onComplete(config);
    }
  }, [config, calculations.isValidAllocation, onComplete]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Configure your competition prize pool. This funds skins games and other prizes.
        </Text>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: `${PRIZE_POOL_COLOR}10` }]}>
          <View style={[styles.summaryIcon, { backgroundColor: `${PRIZE_POOL_COLOR}20` }]}>
            <IconTrophy size={28} color={PRIZE_POOL_COLOR} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={[styles.summaryTitle, { color: PRIZE_POOL_COLOR }]}>
              {playerCount > 0 || config.fundingType === 'fixed_total'
                ? formatCurrency(calculations.totalPool)
                : 'Pending'}
            </Text>
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              {config.fundingType === 'per_player'
                ? playerCount > 0
                  ? `${formatCurrency(config.fundingAmount)} × ${playerCount} players`
                  : `${formatCurrency(config.fundingAmount)} per player`
                : 'Fixed total amount'}
            </Text>
          </View>
        </View>

        {/* Configuration Section */}
        <View style={[styles.configSection, { backgroundColor: colors.surface }]}>
          <PrizePoolSection
            pool={null}
            playerCount={playerCount}
            roundCount={roundCount}
            onPoolChange={handlePoolChange}
            isPremium={true} // Already gated at step 1
            onUpgradePress={() => {}} // Not needed - already premium
            hideToggle={true} // User already opted in at step 1
          />
        </View>

        {/* Info box for players not added yet */}
        {playerCount === 0 && config.fundingType === 'per_player' && (
          <View style={[styles.infoBox, { backgroundColor: colors.infoLight }]}>
            <IconInfoCircle size={20} color={colors.info} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.info }]}>
                Players not added yet
              </Text>
              <Text style={[styles.infoText, { color: colors.infoDark }]}>
                The total pool amount will be calculated when you add players to the
                competition after creation.
              </Text>
            </View>
          </View>
        )}

        {/* Allocation Summary */}
        {calculations.totalAllocated > 0 && (
          <View style={[styles.allocationSummary, { backgroundColor: colors.surface }]}>
            <Text style={[styles.allocationTitle, { color: colors.textPrimary }]}>
              Allocation Summary
            </Text>

            {config.skinsAllocationPercent > 0 && (
              <View style={styles.allocationRow}>
                <View style={styles.allocationLabel}>
                  <View style={[styles.colorDot, { backgroundColor: '#8B5CF6' }]} />
                  <Text style={[styles.allocationText, { color: colors.textPrimary }]}>
                    Skins Games
                  </Text>
                </View>
                <Text style={[styles.allocationValue, { color: colors.textSecondary }]}>
                  {config.skinsAllocationPercent}%
                </Text>
              </View>
            )}

            {config.winnerAllocationPercent > 0 && (
              <View style={styles.allocationRow}>
                <View style={styles.allocationLabel}>
                  <View style={[styles.colorDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.allocationText, { color: colors.textPrimary }]}>
                    Winner Prizes
                  </Text>
                </View>
                <Text style={[styles.allocationValue, { color: colors.textSecondary }]}>
                  {config.winnerAllocationPercent}%
                </Text>
              </View>
            )}

            {config.otherAllocationPercent > 0 && (
              <View style={styles.allocationRow}>
                <View style={styles.allocationLabel}>
                  <View style={[styles.colorDot, { backgroundColor: '#6B7280' }]} />
                  <Text style={[styles.allocationText, { color: colors.textPrimary }]}>
                    Other Prizes
                  </Text>
                </View>
                <Text style={[styles.allocationValue, { color: colors.textSecondary }]}>
                  {config.otherAllocationPercent}%
                </Text>
              </View>
            )}

            {calculations.totalAllocated < 100 && (
              <View style={styles.allocationRow}>
                <View style={styles.allocationLabel}>
                  <View style={[styles.colorDot, { backgroundColor: colors.gray300 }]} />
                  <Text style={[styles.allocationText, { color: colors.textTertiary }]}>
                    Unallocated
                  </Text>
                </View>
                <Text style={[styles.allocationValue, { color: colors.textTertiary }]}>
                  {100 - calculations.totalAllocated}%
                </Text>
              </View>
            )}

            {config.autoSplitSkins && roundCount > 0 && calculations.skinsPerRound && (
              <View style={[styles.autoSplitInfo, { backgroundColor: colors.infoLight }]}>
                <Icon source="dice-6" size={16} color={colors.info} />
                <Text style={[styles.autoSplitText, { color: colors.infoDark }]}>
                  Skins auto-split: {formatCurrency(calculations.skinsPerRound)} per round × {roundCount} rounds
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons - Sticky Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            backgroundColor: colors.surface,
            borderTopColor: colors.gray200,
          },
        ]}
      >
        <Button
          mode="outlined"
          onPress={onBack}
          style={[styles.backButton, { borderColor: colors.gray300 }]}
          contentStyle={styles.buttonContent}
          textColor={colors.textSecondary}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={handleComplete}
          style={styles.nextButton}
          contentStyle={styles.buttonContent}
          buttonColor={PRIZE_POOL_COLOR}
          textColor={colors.white}
          disabled={!calculations.isValidAllocation}
        >
          Next: Review
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    ...typography.h2,
  },
  summarySubtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  configSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.small,
  },
  allocationSummary: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  allocationTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  allocationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  allocationText: {
    ...typography.body,
  },
  allocationValue: {
    ...typography.body,
  },
  autoSplitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  autoSplitText: {
    ...typography.small,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  backButton: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  nextButton: {
    flex: 2,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    height: 48,
  },
});

export default PrizePoolSetupStep;

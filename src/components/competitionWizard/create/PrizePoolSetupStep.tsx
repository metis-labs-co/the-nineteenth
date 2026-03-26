/**
 * PrizePoolSetupStep - Prize pool configuration step for competition wizard
 *
 * This step is dynamically inserted after the Rounds step when prize pool is enabled.
 * It uses the PrizePoolSection component for configuration.
 *
 * Features:
 * - Funding type selection (per player / fixed total)
 * - Funding amount input
 * - Placement-based prize distribution
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconTrophy, IconInfoCircle } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { PrizePoolConfigFormData } from '@/schemas/competition';
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
  placements: [
    { position: 1, percent: 60 },
    { position: 2, percent: 30 },
    { position: 3, percent: 10 },
  ],
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

    const totalPercent = config.placements.reduce((sum, p) => sum + p.percent, 0);
    const isValidAllocation = Math.abs(totalPercent - 100) < 0.01;

    return {
      totalPool,
      totalPercent,
      isValidAllocation,
    };
  }, [config, playerCount]);

  // Handle pool configuration changes from PrizePoolSection
  const handlePoolChange = useCallback((poolConfig: PrizePoolConfig | null) => {
    if (poolConfig) {
      setConfig({
        fundingType: poolConfig.fundingType,
        fundingAmount: poolConfig.fundingAmount,
        placements: poolConfig.placements,
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
          Configure your competition prize pool. Set up funding and how prizes are distributed.
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
                  ? `${formatCurrency(config.fundingAmount)} x ${playerCount} players`
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

        {/* Distribution Summary */}
        {config.placements.length > 0 && (
          <View style={[styles.distributionSummary, { backgroundColor: colors.surface }]}>
            <Text style={[styles.distributionTitle, { color: colors.textPrimary }]}>
              Distribution Summary
            </Text>

            {config.placements.map((placement) => {
              const amount = (calculations.totalPool * placement.percent) / 100;
              return (
                <View key={placement.position} style={styles.summaryRow}>
                  <View style={styles.summaryLabel}>
                    <View style={[styles.colorDot, { backgroundColor: PRIZE_POOL_COLOR }]} />
                    <Text style={[styles.summaryRowText, { color: colors.textPrimary }]}>
                      {placement.position === 1
                        ? '1st Place'
                        : placement.position === 2
                          ? '2nd Place'
                          : placement.position === 3
                            ? '3rd Place'
                            : `${placement.position}th Place`}
                    </Text>
                  </View>
                  <View style={styles.summaryValues}>
                    <Text style={[styles.summaryPercent, { color: colors.textSecondary }]}>
                      {placement.percent}%
                    </Text>
                    <Text style={[styles.summaryAmount, { color: PRIZE_POOL_COLOR }]}>
                      {formatCurrency(amount)}
                    </Text>
                  </View>
                </View>
              );
            })}
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
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { borderColor: colors.gray300, borderWidth: 1 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleComplete}
          style={[styles.nextButton, { backgroundColor: PRIZE_POOL_COLOR }, !calculations.isValidAllocation && { opacity: 0.5 }]}
          activeOpacity={0.8}
          accessibilityRole="button"
          disabled={!calculations.isValidAllocation}
        >
          <Text style={[styles.buttonLabel, { color: colors.white }]}>Next: Review</Text>
        </TouchableOpacity>
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
  distributionSummary: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  distributionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  summaryRowText: {
    ...typography.body,
  },
  summaryValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryPercent: {
    ...typography.body,
    minWidth: 36,
    textAlign: 'right',
  },
  summaryAmount: {
    ...typography.bodyBold,
    minWidth: 70,
    textAlign: 'right',
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
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flex: 2,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
});

export default PrizePoolSetupStep;

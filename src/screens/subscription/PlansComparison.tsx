/**
 * PlansComparison - Displays all available plan comparison cards
 *
 * Shows plan cards for each tier with features, current plan indicator,
 * and upgrade/downgrade actions.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { PlanComparisonCard } from '@/components/subscription';
import { COMPARISON_TIERS, TIER_ICONS, buildPlanFeatures } from './useSubscriptionState';
import type { SubscriptionTier, TierLimits } from '@/types/subscription.types';

interface PlansComparisonProps {
  tier: SubscriptionTier;
  allTierLimits: Record<SubscriptionTier, TierLimits> | null;
  isDevSimulationMode: boolean;
  onPlanPress: (tier: SubscriptionTier) => void;
}

const TIER_ORDER: Record<SubscriptionTier, number> = {
  free: 0,
  social: 1,
  premium: 2,
  enterprise: 3,
  super_admin: 4,
  developer: 5,
};

export const PlansComparison = React.memo(function PlansComparison({
  tier,
  allTierLimits,
  isDevSimulationMode,
  onPlanPress,
}: PlansComparisonProps) {
  const colors = useThemeColors();

  const tiersToShow = isDevSimulationMode
    ? (['free', 'social', 'premium', 'enterprise', 'super_admin', 'developer'] as SubscriptionTier[])
    : COMPARISON_TIERS;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: isDevSimulationMode ? spacing.xs : spacing.lg }]}>
        All Plans
      </Text>
      {isDevSimulationMode && (
        <Text style={[styles.devHint, { color: colors.warning }]}>
          DEV MODE: Tap any plan to switch tier instantly (staging DB)
        </Text>
      )}

      {tiersToShow.map((comparisonTier) => {
        const tierLimits = allTierLimits?.[comparisonTier];
        if (!tierLimits) return null;

        const isCurrentTier = tier === comparisonTier;
        const tierColor = tierLimits.badgeColor ?? colors.gray400;
        const isUpgradeOption = TIER_ORDER[comparisonTier] > TIER_ORDER[tier];
        const isDowngradeOption = TIER_ORDER[comparisonTier] < TIER_ORDER[tier];

        return (
          <PlanComparisonCard
            key={comparisonTier}
            planName={tierLimits.displayName}
            description={tierLimits.description}
            icon={TIER_ICONS[comparisonTier]}
            badgeColor={tierColor}
            features={buildPlanFeatures(tierLimits, comparisonTier)}
            isCurrentPlan={isCurrentTier}
            isUpgradeOption={isDevSimulationMode ? !isCurrentTier : isUpgradeOption}
            isDowngradeOption={isDevSimulationMode ? false : isDowngradeOption}
            onPress={() => onPlanPress(comparisonTier)}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  devHint: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
});

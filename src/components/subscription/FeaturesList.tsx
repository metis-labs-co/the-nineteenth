/**
 * FeaturesList Component
 *
 * Displays a list of features for a subscription tier in a styled card.
 * Used in the Paywall to show what's included in each tier.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { getTierConfig, type PaywallTier } from './tierConfig';
import { FeatureRow } from './FeatureRow';

// ============================================================================
// TYPES
// ============================================================================

export interface FeaturesListProps {
  /** Tier to display features for */
  tier: PaywallTier;
  /** Optional custom title (defaults to "{TierName} includes:") */
  title?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FeaturesList({ tier, title }: FeaturesListProps) {
  const colors = useThemeColors();
  const config = getTierConfig(tier);
  const displayTitle = title ?? `${config.name} includes:`;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{displayTitle}</Text>
      {config.features.map((feature, index) => (
        <FeatureRow key={index} feature={feature} />
      ))}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  title: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
});

export default FeaturesList;

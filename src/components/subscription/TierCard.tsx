/**
 * TierCard Component
 *
 * Individual subscription tier card for the Paywall.
 * Displays tier icon, name, description, and selection state.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { getTierConfig, type PaywallTier } from './tierConfig';

// ============================================================================
// TYPES
// ============================================================================

export interface TierCardProps {
  /** Tier to display */
  tier: PaywallTier;
  /** Whether this tier is selected */
  selected: boolean;
  /** Called when tier is selected */
  onSelect: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TierCard({ tier, selected, onSelect }: TierCardProps) {
  const colors = useThemeColors();
  const config = getTierConfig(tier);
  const tierColor = config.color;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? tierColor : colors.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${config.name} tier, ${config.description}`}
    >
      <View style={[styles.icon, { backgroundColor: tierColor + '20' }]}>
        <Icon source={config.icon} size={24} color={tierColor} />
      </View>
      <Text style={[styles.name, { color: colors.textPrimary }]}>{config.name}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {config.description}
      </Text>
      {selected && (
        <View style={[styles.selectedIndicator, { backgroundColor: tierColor }]}>
          <Icon source="check" size={16} color={colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    ...typography.bodyBold,
  },
  description: {
    ...typography.caption,
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TierCard;

/**
 * UpgradeSection - Upgrade button and hint text for non-premium users
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

interface UpgradeSectionProps {
  purchasesEnabled: boolean;
  onUpgradePress: () => void;
}

export const UpgradeSection = React.memo(function UpgradeSection({
  purchasesEnabled,
  onUpgradePress,
}: UpgradeSectionProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
        onPress={onUpgradePress}
        accessibilityRole="button"
        accessibilityLabel="Upgrade your subscription"
      >
        <Icon source="arrow-up-circle" size={24} color={colors.white} />
        <Text style={[styles.upgradeButtonText, { color: colors.white }]}>
          Upgrade Plan
        </Text>
      </TouchableOpacity>
      <Text style={[styles.upgradeHint, { color: colors.textSecondary }]}>
        {purchasesEnabled
          ? 'Start your 7-day free trial'
          : 'Contact support to upgrade your plan'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  upgradeButtonText: {
    ...typography.bodyBold,
  },
  upgradeHint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

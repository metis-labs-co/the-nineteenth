/**
 * DebugInfoSection - Displays debug information for subscription
 *
 * A small section showing technical debug information about the subscription
 * provider and purchase state. Useful for troubleshooting subscription issues.
 *
 * @example
 * ```tsx
 * <DebugInfoSection
 *   provider="RevenueCat"
 *   purchasesEnabled={true}
 *   isDev={false}
 * />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

export interface DebugInfoSectionProps {
  /** Subscription provider type name */
  provider: string;
  /** Whether purchases are enabled */
  purchasesEnabled: boolean;
  /** Whether in development mode */
  isDev: boolean;
  /** Optional testID for testing */
  testID?: string;
}

export const DebugInfoSection = React.memo(function DebugInfoSection({
  provider,
  purchasesEnabled,
  isDev,
  testID,
}: DebugInfoSectionProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surfaceVariant }]}
      testID={testID}
      accessible
      accessibilityLabel="Debug information"
    >
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        Debug Info
      </Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        Provider: {provider} | Purchases: {purchasesEnabled ? 'enabled' : 'disabled'} | DEV: {isDev ? 'yes' : 'no'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  title: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  text: {
    ...typography.caption,
    fontSize: 11,
  },
});

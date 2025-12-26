/**
 * UsageSection - Displays subscription usage limits
 *
 * A card component showing either usage indicators for regular users
 * or a "no limits" message for super admins. Uses LimitIndicator
 * components internally to show individual usage metrics.
 *
 * @example
 * ```tsx
 * // Regular user usage
 * <UsageSection
 *   usage={[
 *     { current: 2, max: 3, label: 'Competitions' },
 *     { current: 5, max: 10, label: 'Friends' },
 *   ]}
 * />
 *
 * // Super admin (no limits)
 * <UsageSection isSuperAdmin />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { LimitIndicator } from './LimitIndicator';

export interface UsageItem {
  /** Current usage count */
  current: number;
  /** Maximum allowed by subscription */
  max: number;
  /** Display label for this limit */
  label: string;
  /** Optional testID for testing */
  testID?: string;
}

export interface UsageSectionProps {
  /** Array of usage items to display (ignored if isSuperAdmin) */
  usage?: UsageItem[];
  /** Whether user is super admin (shows "no limits" instead) */
  isSuperAdmin?: boolean;
  /** Optional section title (defaults to "Usage") */
  title?: string;
  /** Optional testID for testing */
  testID?: string;
}

export const UsageSection = React.memo(function UsageSection({
  usage = [],
  isSuperAdmin = false,
  title = 'Usage',
  testID,
}: UsageSectionProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }]}
      testID={testID}
      accessible
      accessibilityLabel={`${title} section`}
    >
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>

      {isSuperAdmin ? (
        <View style={styles.noLimitsContainer}>
          <Icon source="infinity" size={32} color={colors.primary} />
          <Text style={[styles.noLimitsText, { color: colors.textSecondary }]}>
            No limits - you have full access to all features
          </Text>
        </View>
      ) : (
        <View style={styles.usageGrid}>
          {usage.map((item, index) => (
            <LimitIndicator
              key={item.label}
              current={item.current}
              max={item.max}
              label={item.label}
              testID={item.testID ?? `usage-${index}`}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  usageGrid: {
    gap: spacing.lg,
  },
  noLimitsContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  noLimitsText: {
    ...typography.body,
    textAlign: 'center',
  },
});

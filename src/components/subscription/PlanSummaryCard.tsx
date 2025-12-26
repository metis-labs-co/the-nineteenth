/**
 * PlanSummaryCard - Displays current subscription plan summary
 *
 * A card component showing the user's current plan name and description.
 * Used in the subscription screen to summarize the active plan.
 *
 * @example
 * ```tsx
 * <PlanSummaryCard
 *   planName="Premium"
 *   description="Full access to all features and unlimited competitions"
 * />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';

export interface PlanSummaryCardProps {
  /** Plan display name */
  planName: string;
  /** Optional plan description */
  description?: string | null;
  /** Optional section title (defaults to "Your Plan") */
  title?: string;
  /** Optional testID for testing */
  testID?: string;
}

export const PlanSummaryCard = React.memo(function PlanSummaryCard({
  planName,
  description,
  title = 'Your Plan',
  testID,
}: PlanSummaryCardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface }]}
      testID={testID}
      accessible
      accessibilityLabel={`${title}: ${planName}${description ? `. ${description}` : ''}`}
    >
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.planName, { color: colors.textPrimary }]}>
        {planName}
      </Text>
      {description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
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
  planName: {
    ...typography.h2,
  },
  description: {
    ...typography.body,
  },
});

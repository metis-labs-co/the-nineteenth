/**
 * PlanComparisonCard - Displays a subscription plan with features
 *
 * A card component for comparing subscription plans. Shows the plan icon,
 * name, description, features list, and whether it's the current plan or
 * an upgrade option.
 *
 * @example
 * ```tsx
 * <PlanComparisonCard
 *   planName="Premium"
 *   description="For serious organizers"
 *   icon="crown-outline"
 *   badgeColor="#FFD700"
 *   features={[
 *     { label: 'Competitions', value: 'Unlimited' },
 *     { label: 'Team formats', value: true },
 *   ]}
 *   isCurrentPlan
 * />
 * ```
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';

export interface PlanFeature {
  /** Feature label */
  label: string;
  /** Feature value - string for text, boolean for check/cross icon */
  value: string | boolean;
}

export interface PlanComparisonCardProps {
  /** Plan display name */
  planName: string;
  /** Plan description */
  description?: string | null;
  /** Icon name from MaterialCommunityIcons */
  icon: string;
  /** Badge/accent color for this plan */
  badgeColor: string;
  /** List of features to display */
  features: PlanFeature[];
  /** Whether this is the user's current plan */
  isCurrentPlan?: boolean;
  /** Whether this is an upgrade option */
  isUpgradeOption?: boolean;
  /** Whether this is a downgrade option (lower tier than current) */
  isDowngradeOption?: boolean;
  /** Callback when card is pressed (for upgrade/downgrade options) */
  onPress?: () => void;
  /** Optional testID for testing */
  testID?: string;
}

/**
 * FeatureRow - Internal component for displaying a feature row
 */
function FeatureRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string | boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const isBoolean = typeof value === 'boolean';

  return (
    <View style={styles.featureRow}>
      <Text style={[styles.featureLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      {isBoolean ? (
        <Icon
          source={value ? 'check-circle' : 'close-circle'}
          size={20}
          color={value ? colors.success : colors.gray400}
        />
      ) : (
        <Text style={[styles.featureValue, { color: colors.textPrimary }]}>
          {value}
        </Text>
      )}
    </View>
  );
}

export const PlanComparisonCard = React.memo(function PlanComparisonCard({
  planName,
  description,
  icon,
  badgeColor,
  features,
  isCurrentPlan = false,
  isUpgradeOption = false,
  isDowngradeOption = false,
  onPress,
  testID,
}: PlanComparisonCardProps) {
  const colors = useThemeColors();

  const cardContent = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: isCurrentPlan ? badgeColor : colors.border,
          borderWidth: isCurrentPlan ? 2 : 1,
        },
      ]}
      testID={testID}
      accessible
      accessibilityLabel={`${planName} plan${isCurrentPlan ? ' (current)' : isUpgradeOption ? ' - tap to upgrade' : ''}`}
    >
      {/* Plan Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon source={icon} size={24} color={badgeColor} />
          <Text style={[styles.planName, { color: colors.textPrimary }]}>
            {planName}
          </Text>
          {isCurrentPlan && (
            <View style={[styles.currentBadge, { backgroundColor: badgeColor }]}>
              <Text style={[styles.currentBadgeText, { color: colors.textOnColored }]}>
                Current
              </Text>
            </View>
          )}
        </View>
        {description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>

      <Divider style={{ backgroundColor: colors.border }} />

      {/* Plan Features */}
      <View style={styles.features}>
        {features.map((feature) => (
          <FeatureRow
            key={feature.label}
            label={feature.label}
            value={feature.value}
            colors={colors}
          />
        ))}
      </View>

      {/* Action hint for upgrade/downgrade options */}
      {(isUpgradeOption || isDowngradeOption) && (
        <View style={[styles.actionHintRow, { borderTopColor: colors.border }]}>
          <Icon
            source={isUpgradeOption ? 'arrow-up-circle' : 'arrow-down-circle'}
            size={16}
            color={isUpgradeOption ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.actionHintText,
              { color: isUpgradeOption ? colors.primary : colors.textSecondary },
            ]}
          >
            {isUpgradeOption ? 'Tap to upgrade' : 'Tap to manage'}
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress && (isUpgradeOption || isDowngradeOption)) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={
          isUpgradeOption ? `Upgrade to ${planName}` : `Manage ${planName} plan`
        }
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  header: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planName: {
    ...typography.h4,
    flex: 1,
  },
  description: {
    ...typography.small,
  },
  currentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  currentBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  features: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureLabel: {
    ...typography.small,
    flex: 1,
  },
  featureValue: {
    ...typography.smallBold,
  },
  actionHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  actionHintText: {
    ...typography.smallBold,
  },
});

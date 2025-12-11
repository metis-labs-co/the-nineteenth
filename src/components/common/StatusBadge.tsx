// src/components/common/StatusBadge.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

/**
 * Available status variants for the badge
 */
export type StatusVariant =
  | 'in-progress'
  | 'completed'
  | 'upcoming'
  | 'scheduled'
  | 'active'
  | 'draft'
  | 'cancelled'
  | 'custom';

/**
 * Badge size options
 */
export type StatusBadgeSize = 'sm' | 'md';

export interface StatusBadgeProps {
  /**
   * The status variant to display
   */
  status: StatusVariant;
  /**
   * Optional custom label. If not provided, uses default label for status.
   * Required when status is 'custom'.
   */
  label?: string;
  /**
   * Size of the badge
   * @default 'md'
   */
  size?: StatusBadgeSize;
  /**
   * Optional accessibility label override
   */
  accessibilityLabel?: string;
  /**
   * Custom background color. Only used when status is 'custom'.
   */
  backgroundColor?: string;
  /**
   * Custom text color. Only used when status is 'custom'.
   */
  textColor?: string;
}

/**
 * Get the default label for a status variant
 */
const getDefaultLabel = (status: StatusVariant): string => {
  switch (status) {
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'upcoming':
      return 'Upcoming';
    case 'scheduled':
      return 'Scheduled';
    case 'active':
      return 'Active';
    case 'draft':
      return 'Draft';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

/**
 * StatusBadge - A reusable status indicator component
 *
 * Used to display status information for rounds, competitions, and other entities.
 * Supports multiple status variants with appropriate color coding.
 *
 * @example
 * ```tsx
 * <StatusBadge status="in-progress" />
 * <StatusBadge status="completed" label="Done" />
 * <StatusBadge status="upcoming" size="sm" />
 * <StatusBadge
 *   status="custom"
 *   label="You"
 *   backgroundColor={colors.primaryLighter}
 *   textColor={colors.primaryDark}
 * />
 * ```
 */
export const StatusBadge = React.memo(function StatusBadge({
  status,
  label,
  size = 'md',
  accessibilityLabel,
  backgroundColor: customBackgroundColor,
  textColor: customTextColor,
}: StatusBadgeProps) {
  const colors = useThemeColors();

  // Get colors based on status variant
  const getStatusColors = () => {
    switch (status) {
      case 'in-progress':
        return {
          backgroundColor: colors.warningBackground,
          textColor: colors.warningDark,
        };
      case 'active':
        return {
          backgroundColor: colors.successBackground,
          textColor: colors.successDark,
        };
      case 'completed':
        return {
          backgroundColor: colors.gray100,
          textColor: colors.gray600,
        };
      case 'upcoming':
      case 'scheduled':
        return {
          backgroundColor: colors.primaryBackground,
          textColor: colors.primaryDark,
        };
      case 'draft':
        return {
          backgroundColor: colors.warningBackground,
          textColor: colors.warningDark,
        };
      case 'cancelled':
        return {
          backgroundColor: colors.errorBackground,
          textColor: colors.errorDark,
        };
      case 'custom':
        return {
          backgroundColor: customBackgroundColor || colors.gray100,
          textColor: customTextColor || colors.gray600,
        };
      default:
        return {
          backgroundColor: colors.gray100,
          textColor: colors.gray600,
        };
    }
  };

  const { backgroundColor, textColor } = getStatusColors();
  const displayLabel = label || getDefaultLabel(status);
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        isSmall && styles.badgeSmall,
        { backgroundColor },
      ]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || `Status: ${displayLabel}`}
    >
      <Text
        style={[
          styles.text,
          isSmall && styles.textSmall,
          { color: textColor },
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeSmall: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  text: {
    ...typography.captionBold,
  },
  textSmall: {
    fontSize: 10,
    lineHeight: 14,
  },
});

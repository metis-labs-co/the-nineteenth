// src/components/common/StatusBadge.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Badge, type BadgeVariant, type BadgeSize } from './Badge';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius } from '@/constants/theme';

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
 * Map StatusVariant to BadgeVariant
 */
const STATUS_TO_BADGE_VARIANT: Record<StatusVariant, BadgeVariant> = {
  'in-progress': 'warning',
  'completed': 'info',
  'upcoming': 'neutral',
  'scheduled': 'neutral',
  'active': 'success',
  'draft': 'neutral',
  'cancelled': 'error',
  'custom': 'default',
};

/**
 * StatusBadge - A reusable status indicator component
 *
 * Used to display status information for rounds, competitions, and other entities.
 * Supports multiple status variants with appropriate color coding.
 *
 * This component composes the unified Badge component with status-specific styling.
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
 * />
 * ```
 */
export const StatusBadge = React.memo(function StatusBadge({
  status,
  label,
  size = 'md',
  accessibilityLabel,
  backgroundColor: customBackgroundColor,
}: StatusBadgeProps) {
  // Theme colors needed for custom status fallback
  const colors = useThemeColors();
  const displayLabel = label || getDefaultLabel(status);
  const badgeVariant = STATUS_TO_BADGE_VARIANT[status];

  // For custom status, we need to use custom styling with theme colors
  if (status === 'custom') {
    return (
      <Badge
        label={displayLabel}
        variant="default"
        size={size as BadgeSize}
        filled
        style={[
          styles.statusBadge,
          {
            backgroundColor: customBackgroundColor || colors.surfaceVariant,
          },
        ]}
        accessibilityLabel={accessibilityLabel || `Status: ${displayLabel}`}
      />
    );
  }

  return (
    <Badge
      label={displayLabel}
      variant={badgeVariant}
      size={size as BadgeSize}
      filled
      style={styles.statusBadge}
      accessibilityLabel={accessibilityLabel || `Status: ${displayLabel}`}
    />
  );
});

const styles = StyleSheet.create({
  statusBadge: {
    // StatusBadge uses sm border radius instead of full pill shape
    borderRadius: borderRadius.sm,
    borderWidth: 0,
  },
});

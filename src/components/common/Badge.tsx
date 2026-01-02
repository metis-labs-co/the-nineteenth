// src/components/common/Badge.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, type ColorPalette } from '@/constants/theme';

/**
 * Size variants for the Badge component
 */
export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Color variants for the Badge component
 */
export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'birdie'
  | 'par'
  | 'bogey'
  | 'doubleBogey';

/**
 * Props for the Badge component
 */
export interface BadgeProps {
  /**
   * The text label displayed inside the badge
   */
  label: string;
  /**
   * Color variant of the badge
   * @default 'default'
   */
  variant?: BadgeVariant;
  /**
   * Size variant of the badge
   * @default 'md'
   */
  size?: BadgeSize;
  /**
   * Whether to use a filled background style (more prominent)
   * @default false
   */
  filled?: boolean;
  /**
   * Whether the badge is interactive (clickable)
   * @default false
   */
  interactive?: boolean;
  /**
   * Whether the badge is currently selected (for interactive badges)
   * @default false
   */
  selected?: boolean;
  /**
   * Callback when the badge is pressed (only works if interactive=true)
   */
  onPress?: () => void;
  /**
   * Optional icon name to display before the label
   */
  icon?: string;
  /**
   * Whether the badge is disabled
   * @default false
   */
  disabled?: boolean;
  /**
   * Optional custom styles for the container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Accessibility label (defaults to label if not provided)
   */
  accessibilityLabel?: string;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Get variant colors based on the variant type, filled state, and selected state
 */
const getVariantColors = (
  variant: BadgeVariant,
  colors: ColorPalette,
  filled: boolean,
  selected: boolean
): { backgroundColor: string; borderColor: string; textColor: string } => {
  // If selected (for interactive badges), use a highlighted style
  if (selected) {
    return {
      backgroundColor: `${colors.primary}15`,
      borderColor: colors.primary,
      textColor: colors.primary,
    };
  }

  switch (variant) {
    case 'primary':
      return {
        backgroundColor: filled ? colors.primary : `${colors.primary}15`,
        borderColor: colors.primary,
        textColor: filled ? colors.textInverse : colors.primary,
      };
    case 'secondary':
      return {
        backgroundColor: filled ? colors.surfaceVariant : colors.surface,
        borderColor: colors.border,
        textColor: filled ? colors.textPrimary : colors.textSecondary,
      };
    case 'success':
      return {
        backgroundColor: filled ? colors.success : colors.successBackground,
        borderColor: colors.success,
        textColor: filled ? colors.textInverse : colors.successDark,
      };
    case 'warning':
      return {
        backgroundColor: filled ? colors.warning : colors.warningBackground,
        borderColor: colors.warning,
        textColor: filled ? colors.textInverse : colors.warningDark,
      };
    case 'error':
      return {
        backgroundColor: filled ? colors.error : colors.errorBackground,
        borderColor: colors.error,
        textColor: filled ? colors.textInverse : colors.errorDark,
      };
    case 'info':
      return {
        backgroundColor: filled ? colors.info : colors.primaryBackground,
        borderColor: colors.info,
        textColor: filled ? colors.textInverse : colors.primaryDark,
      };
    case 'neutral':
      return {
        backgroundColor: filled ? colors.surfaceVariant : colors.surface,
        borderColor: colors.border,
        textColor: filled ? colors.textPrimary : colors.textSecondary,
      };
    case 'birdie':
      return {
        backgroundColor: filled ? colors.birdie : `${colors.birdie}15`,
        borderColor: colors.birdie,
        textColor: filled ? colors.textInverse : colors.birdie,
      };
    case 'par':
      return {
        backgroundColor: filled ? colors.par : `${colors.par}15`,
        borderColor: colors.par,
        textColor: filled ? colors.textInverse : colors.par,
      };
    case 'bogey':
      return {
        backgroundColor: filled ? colors.bogey : `${colors.bogey}15`,
        borderColor: colors.bogey,
        textColor: filled ? colors.textInverse : colors.bogey,
      };
    case 'doubleBogey':
      return {
        backgroundColor: filled ? colors.doubleBogey : `${colors.doubleBogey}15`,
        borderColor: colors.doubleBogey,
        textColor: filled ? colors.textInverse : colors.doubleBogey,
      };
    case 'default':
    default:
      return {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textColor: colors.textSecondary,
      };
  }
};

/**
 * Badge - A unified badge component for displaying labels, statuses, and interactive toggles
 *
 * This is the base component that Pill, FilterPill, and StatusBadge compose.
 *
 * @example
 * ```tsx
 * // Non-interactive badge
 * <Badge label="Active" variant="success" filled />
 *
 * // Interactive toggle badge
 * <Badge
 *   label="Filter"
 *   interactive
 *   selected={isSelected}
 *   onPress={() => setSelected(!isSelected)}
 * />
 *
 * // With icon
 * <Badge label="New" variant="primary" icon="star" />
 *
 * // Golf score variants
 * <Badge label="Birdie" variant="birdie" filled />
 * ```
 */
export const Badge = React.memo(function Badge({
  label,
  variant = 'default',
  size = 'md',
  filled = false,
  interactive = false,
  selected = false,
  onPress,
  icon,
  disabled = false,
  style,
  accessibilityLabel,
  testID,
}: BadgeProps) {
  const colors = useThemeColors();
  const variantColors = getVariantColors(variant, colors, filled, selected);

  const sizeStyles = SIZE_STYLES[size];
  const textSizeStyles = TEXT_SIZE_STYLES[size];
  const iconSize = ICON_SIZES[size];

  const containerStyle = [
    styles.badge,
    sizeStyles,
    {
      backgroundColor: variantColors.backgroundColor,
      borderColor: variantColors.borderColor,
    },
    disabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    textSizeStyles,
    { color: disabled ? colors.textDisabled : variantColors.textColor },
  ];

  const content = (
    <>
      {icon && (
        <Icon
          source={icon}
          size={iconSize}
          color={disabled ? colors.textDisabled : variantColors.textColor}
        />
      )}
      <Text style={textStyle}>{label}</Text>
    </>
  );

  if (interactive && onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        accessibilityState={{ selected, disabled }}
        testID={testID}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={containerStyle}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || label}
      testID={testID}
    >
      {content}
    </View>
  );
});

// Size style mappings
const SIZE_STYLES = StyleSheet.create({
  sm: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    minHeight: 20,
    gap: spacing.xs,
  },
  md: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 26,
    gap: spacing.xs,
  },
  lg: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 32,
    gap: spacing.sm,
  },
});

// Text size style mappings
const TEXT_SIZE_STYLES = StyleSheet.create({
  sm: {
    ...typography.caption,
    fontWeight: '600' as const,
    fontSize: 10,
    lineHeight: 14,
  },
  md: {
    ...typography.caption,
    fontWeight: '600' as const,
  },
  lg: {
    ...typography.small,
    fontWeight: '600' as const,
  },
});

// Icon size mappings
const ICON_SIZES: Record<BadgeSize, number> = {
  sm: 10,
  md: 12,
  lg: 14,
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

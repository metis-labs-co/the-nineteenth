// src/components/common/Pill.tsx
import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, type ColorPalette } from '@/constants/theme';

/**
 * Size variants for the Pill component
 */
export type PillSize = 'sm' | 'md' | 'lg';

/**
 * Color variants for the Pill component
 */
export type PillVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'birdie'
  | 'par'
  | 'bogey'
  | 'doubleBogey';

/**
 * Props for the Pill component
 */
export interface PillProps {
  /**
   * The text label displayed inside the pill
   */
  label: string;
  /**
   * Size variant of the pill
   * @default 'md'
   */
  size?: PillSize;
  /**
   * Color variant of the pill
   * @default 'default'
   */
  variant?: PillVariant;
  /**
   * Whether to use a filled background style (more prominent)
   * @default false
   */
  filled?: boolean;
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
 * Get variant colors based on the variant type
 */
const getVariantColors = (
  variant: PillVariant,
  colors: ColorPalette,
  filled: boolean
): { backgroundColor: string; borderColor: string; textColor: string } => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: filled ? colors.primary : `${colors.primary}15`,
        borderColor: colors.primary,
        textColor: filled ? colors.textInverse : colors.primary,
      };
    case 'success':
      return {
        backgroundColor: filled ? colors.success : `${colors.success}15`,
        borderColor: colors.success,
        textColor: filled ? colors.textInverse : colors.success,
      };
    case 'warning':
      return {
        backgroundColor: filled ? colors.warning : `${colors.warning}15`,
        borderColor: colors.warning,
        textColor: filled ? colors.textInverse : colors.warningDark,
      };
    case 'error':
      return {
        backgroundColor: filled ? colors.error : `${colors.error}15`,
        borderColor: colors.error,
        textColor: filled ? colors.textInverse : colors.error,
      };
    case 'info':
      return {
        backgroundColor: filled ? colors.info : `${colors.info}15`,
        borderColor: colors.info,
        textColor: filled ? colors.textInverse : colors.info,
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
        backgroundColor: colors.gray100,
        borderColor: colors.gray200,
        textColor: colors.textSecondary,
      };
  }
};

/**
 * Pill - A non-interactive pill-shaped badge for displaying informational text
 *
 * Use this component for displaying static information like:
 * - Round numbers ("Round 2 of 4")
 * - Categories or tags
 * - Informational labels
 *
 * For interactive/toggle pills, use FilterPill instead.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Pill label="Round 2 of 4" />
 *
 * // With variant
 * <Pill label="Birdie" variant="birdie" />
 *
 * // Filled style
 * <Pill label="Active" variant="success" filled />
 *
 * // Different sizes
 * <Pill label="Small" size="sm" />
 * <Pill label="Large" size="lg" />
 * ```
 */
export const Pill = React.memo(function Pill({
  label,
  size = 'md',
  variant = 'default',
  filled = false,
  style,
  accessibilityLabel,
  testID,
}: PillProps) {
  const colors = useThemeColors();
  const variantColors = getVariantColors(variant, colors, filled);

  const sizeStyles = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  };

  const textSizeStyles = {
    sm: styles.textSm,
    md: styles.textMd,
    lg: styles.textLg,
  };

  return (
    <View
      style={[
        styles.pill,
        sizeStyles[size],
        {
          backgroundColor: variantColors.backgroundColor,
          borderColor: variantColors.borderColor,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || label}
      testID={testID}
    >
      <Text
        style={[
          styles.text,
          textSizeStyles[size],
          { color: variantColors.textColor },
        ]}
      >
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  pill: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  // Size variants
  sizeSm: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minHeight: 20,
  },
  sizeMd: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 26,
  },
  sizeLg: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 32,
  },
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  textSm: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
    lineHeight: 14,
  },
  textMd: {
    ...typography.caption,
    fontWeight: '600',
  },
  textLg: {
    ...typography.small,
    fontWeight: '600',
  },
});

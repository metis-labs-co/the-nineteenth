// src/components/common/FeatureButton.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, View, StyleProp, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { IconChevronRight } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

/**
 * Props for the FeatureButton component
 */
interface FeatureButtonProps {
  /**
   * Main title text displayed prominently
   */
  title: string;
  /**
   * Secondary subtitle text displayed below the title
   */
  subtitle: string;
  /**
   * Icon component to display in the circular container
   * Should be a Tabler icon or similar with size and color props
   */
  icon: React.ReactNode;
  /**
   * Callback fired when the button is pressed
   */
  onPress: () => void;
  /**
   * Background color for the button (defaults to primary)
   */
  backgroundColor?: string;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Custom accessibility label (defaults to title)
   */
  accessibilityLabel?: string;
  /**
   * Test ID for testing purposes
   */
  testID?: string;
  /**
   * Custom container style to override default margins/layout
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Whether to show the chevron arrow (defaults to true)
   */
  showChevron?: boolean;
  /**
   * Layout variant - 'horizontal' (default) or 'compact' for side-by-side
   */
  variant?: 'horizontal' | 'compact';
  /**
   * When true, renders as an outlined button (surface background with a colored
   * border and matching content) instead of a solid filled button. The accent
   * color is taken from `backgroundColor` (defaults to primary). Use for
   * non-AI actions, since solid purple/accent fills are reserved for AI buttons.
   */
  outlined?: boolean;
}

/**
 * FeatureButton - A prominent action button with icon, title, and subtitle
 *
 * Used for primary feature actions like "Score New Round" or "Create Competition"
 * Follows iOS HIG with 44dp minimum touch targets and proper accessibility
 *
 * @example
 * ```tsx
 * <FeatureButton
 *   title="Score New Round"
 *   subtitle="Start scoring a round at any course"
 *   icon={<IconPlus size={24} color={colors.white} strokeWidth={2.5} />}
 *   onPress={() => navigation.navigate('NewRound')}
 * />
 * ```
 */
export const FeatureButton = React.memo(function FeatureButton({
  title,
  subtitle,
  icon,
  onPress,
  backgroundColor,
  disabled = false,
  accessibilityLabel,
  testID,
  style,
  showChevron = true,
  variant = 'horizontal',
  outlined = false,
}: FeatureButtonProps) {
  const colors = useThemeColors();

  const accentColor = backgroundColor ?? colors.primary;
  const isCompact = variant === 'compact';

  // Filled buttons use the accent as the fill with white content; outlined
  // buttons use a surface fill with the accent as the border + content color.
  const buttonBackgroundColor = outlined ? colors.surface : accentColor;
  const contentColor = outlined ? accentColor : colors.white;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isCompact && styles.containerCompact,
        { backgroundColor: buttonBackgroundColor },
        outlined && { borderWidth: 1, borderColor: accentColor },
        outlined && shadows.none,
        disabled && styles.containerDisabled,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      <View
        style={[
          styles.iconContainer,
          isCompact && styles.iconContainerCompact,
          outlined && styles.iconContainerOutlined,
        ]}
      >
        {icon}
      </View>
      <View style={[styles.textContainer, isCompact && styles.textContainerCompact]}>
        <Text style={[styles.title, { color: contentColor }, isCompact && styles.titleCompact]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.subtitle, { color: contentColor }, isCompact && styles.subtitleCompact]} numberOfLines={1}>{subtitle}</Text>
      </View>
      {showChevron && <IconChevronRight size={24} color={contentColor} />}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    minHeight: 72, // Ensures proper touch target
    ...shadows.md,
  },
  containerCompact: {
    marginHorizontal: 0,
    marginBottom: 0,
    padding: spacing.md,
    minHeight: 64,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconContainerCompact: {
    width: 36,
    height: 36,
    marginRight: spacing.sm,
  },
  iconContainerOutlined: {
    // No translucent white wash on a surface background; let the icon's own
    // color carry the accent.
    backgroundColor: 'transparent',
  },
  textContainer: {
    flex: 1,
  },
  textContainerCompact: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
  },
  titleCompact: {
    fontSize: 14,
  },
  subtitle: {
    ...typography.small,
    marginTop: 2,
  },
  subtitleCompact: {
    fontSize: 11,
  },
});

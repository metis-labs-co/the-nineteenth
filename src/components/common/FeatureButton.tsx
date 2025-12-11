// src/components/common/FeatureButton.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
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
}: FeatureButtonProps) {
  const colors = useThemeColors();

  const buttonBackgroundColor = backgroundColor ?? colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: buttonBackgroundColor },
        disabled && styles.containerDisabled,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.white }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.white }]}>{subtitle}</Text>
      </View>
      <IconChevronRight size={24} color={colors.white} />
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
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
  },
  subtitle: {
    ...typography.small,
    marginTop: 2,
  },
});

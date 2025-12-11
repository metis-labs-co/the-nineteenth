/**
 * BottomActionBar - Sticky bottom action buttons
 *
 * Provides a consistent bottom action bar pattern with:
 * - Primary action (required)
 * - Optional secondary action
 * - Safe area handling
 * - Loading states
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Button, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface BottomActionBarProps {
  /** Primary button label (required) */
  primaryLabel: string;
  /** Primary button press handler */
  onPrimaryPress: () => void;
  /** Whether primary button is disabled */
  primaryDisabled?: boolean;
  /** Whether primary button shows loading spinner */
  primaryLoading?: boolean;
  /** Primary button color (defaults to primary color) */
  primaryColor?: string;

  /** Secondary button label (optional - shows outlined button on left) */
  secondaryLabel?: string;
  /** Secondary button press handler */
  onSecondaryPress?: () => void;
  /** Whether secondary button is disabled */
  secondaryDisabled?: boolean;

  /** Container style override */
  style?: ViewStyle;
  /** Whether to show shadow/elevation */
  elevated?: boolean;
}

/**
 * BottomActionBar component for form submit buttons
 *
 * @example
 * ```tsx
 * // Two button layout
 * <BottomActionBar
 *   primaryLabel="Save"
 *   onPrimaryPress={handleSave}
 *   primaryLoading={isSubmitting}
 *   secondaryLabel="Cancel"
 *   onSecondaryPress={handleCancel}
 * />
 *
 * // Single button layout
 * <BottomActionBar
 *   primaryLabel="Submit All Scores"
 *   onPrimaryPress={handleSubmit}
 *   primaryColor={colors.success}
 * />
 * ```
 */
export function BottomActionBar({
  primaryLabel,
  onPrimaryPress,
  primaryDisabled = false,
  primaryLoading = false,
  primaryColor,
  secondaryLabel,
  onSecondaryPress,
  secondaryDisabled = false,
  style,
  elevated = true,
}: BottomActionBarProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const hasSecondary = !!secondaryLabel && !!onSecondaryPress;
  const buttonColor = primaryColor ?? colors.primary;

  return (
    <Surface
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderTopColor: colors.border },
        elevated && styles.elevated,
        { paddingBottom: insets.bottom + spacing.md },
        style,
      ]}
      elevation={elevated ? 2 : 0}
    >
      {/* Secondary Button (left) */}
      {hasSecondary && (
        <Button
          mode="outlined"
          onPress={onSecondaryPress}
          disabled={secondaryDisabled || primaryLoading}
          style={styles.secondaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={[styles.secondaryLabel, { color: colors.textPrimary }]}
          theme={{ colors: { outline: colors.gray400 } }}
          accessibilityLabel={secondaryLabel}
          accessibilityRole="button"
        >
          {secondaryLabel}
        </Button>
      )}

      {/* Primary Button (right, or full width if no secondary) */}
      <Button
        mode="contained"
        onPress={onPrimaryPress}
        disabled={primaryDisabled || primaryLoading}
        loading={primaryLoading}
        style={[styles.primaryButton, !hasSecondary && styles.primaryButtonFull]}
        contentStyle={styles.buttonContent}
        labelStyle={styles.primaryLabel}
        buttonColor={buttonColor}
        textColor={colors.textInverse}
        accessibilityLabel={primaryLabel}
        accessibilityRole="button"
      >
        {primaryLabel}
      </Button>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  elevated: {
    ...shadows.md,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 2,
  },
  primaryButton: {
    flex: 2,
  },
  primaryButtonFull: {
    flex: 1,
  },
  buttonContent: {
    minHeight: 48,
  },
  secondaryLabel: {
    ...typography.bodyBold,
  },
  primaryLabel: {
    ...typography.bodyBold,
  },
});

export default BottomActionBar;

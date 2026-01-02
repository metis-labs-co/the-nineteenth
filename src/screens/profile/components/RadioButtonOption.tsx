/**
 * RadioButtonOption - A radio-style selection option component
 *
 * Provides a consistent, accessible selection pattern for single-select options
 * used across settings screens and selection forms.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <RadioButtonOption
 *   label="Yards"
 *   selected={unit === 'yards'}
 *   onSelect={() => setUnit('yards')}
 * />
 *
 * // With description and icon
 * <RadioButtonOption
 *   label="Yards"
 *   description="Imperial measurement"
 *   selected={unit === 'yards'}
 *   onSelect={() => setUnit('yards')}
 *   icon="ruler"
 * />
 *
 * // Disabled state
 * <RadioButtonOption
 *   label="Premium Feature"
 *   description="Upgrade to access"
 *   selected={false}
 *   onSelect={() => {}}
 *   disabled
 * />
 * ```
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

/**
 * Props for the RadioButtonOption component
 */
export interface RadioButtonOptionProps {
  /** Main label text displayed in the option */
  label: string;
  /** Optional secondary text below the label */
  description?: string;
  /** Whether this option is currently selected */
  selected: boolean;
  /** Callback when the option is tapped */
  onSelect: () => void;
  /** Optional Material Community Icons name for left icon */
  icon?: string;
  /** Whether the option is disabled (default: false) */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * RadioButtonOption - A radio-style selection option for settings and forms
 *
 * Features:
 * - Visual feedback for selected/unselected states
 * - Optional leading icon
 * - Optional description text
 * - Proper accessibility support with radio role
 * - Disabled state with reduced opacity
 */
export const RadioButtonOption = React.memo(function RadioButtonOption({
  label,
  description,
  selected,
  onSelect,
  icon,
  disabled = false,
  testID,
}: RadioButtonOptionProps) {
  const colors = useThemeColors();

  const accessibilityLabel = description ? `${label}, ${description}` : label;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: selected ? `${colors.primary}15` : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
        disabled && styles.disabled,
      ]}
      onPress={onSelect}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      testID={testID}
    >
      {/* Left icon (optional) */}
      {icon && (
        <View style={styles.iconContainer}>
          <Icon
            source={icon}
            size={24}
            color={
              disabled
                ? colors.textDisabled
                : selected
                  ? colors.primary
                  : colors.textSecondary
            }
          />
        </View>
      )}

      {/* Label and description */}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.label,
            {
              color: disabled
                ? colors.textDisabled
                : selected
                  ? colors.textPrimary
                  : colors.textPrimary,
            },
          ]}
        >
          {label}
        </Text>
        {description && (
          <Text
            style={[
              styles.description,
              {
                color: disabled ? colors.textDisabled : colors.textSecondary,
              },
            ]}
          >
            {description}
          </Text>
        )}
      </View>

      {/* Right checkmark (shown only when selected) */}
      {selected && (
        <View style={styles.checkContainer}>
          <Icon
            source="check-circle"
            size={24}
            color={disabled ? colors.textDisabled : colors.primary}
          />
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...typography.body,
  },
  description: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  checkContainer: {
    marginLeft: spacing.md,
  },
});

export default RadioButtonOption;

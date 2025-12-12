import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

/**
 * Option for a segment in the SegmentedButton component
 */
export interface SegmentOption<T extends string = string> {
  /** Unique value for this segment */
  value: T;
  /** Display label for the segment */
  label: string;
  /** Optional Material Design icon name */
  icon?: string;
  /** Whether this segment is disabled */
  disabled?: boolean;
}

/**
 * Props for the SegmentedButton component
 */
interface SegmentedButtonProps<T extends string = string> {
  /** Currently selected value */
  value: T;
  /** Callback when a segment is selected */
  onValueChange: (value: T) => void;
  /** Array of segment options */
  buttons: SegmentOption<T>[];
  /** Optional style for the container */
  style?: object;
  /** Whether the entire component is disabled */
  disabled?: boolean;
  /** Size variant of the buttons */
  size?: 'small' | 'medium' | 'large';
}

/**
 * A segmented button component for single-select options.
 * Styled consistently with the app's design system.
 *
 * @example
 * ```tsx
 * <SegmentedButton
 *   value={selectedType}
 *   onValueChange={setSelectedType}
 *   buttons={[
 *     { value: 'event', label: 'Event', icon: 'calendar-star' },
 *     { value: 'league', label: 'League', icon: 'trophy-outline' },
 *   ]}
 * />
 * ```
 */
export function SegmentedButton<T extends string = string>({
  value,
  onValueChange,
  buttons,
  style,
  disabled = false,
  size = 'medium',
}: SegmentedButtonProps<T>) {
  const colors = useThemeColors();

  const getHeight = () => {
    switch (size) {
      case 'small':
        return 36;
      case 'large':
        return 52;
      default:
        return 44;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  const getTextStyle = () => {
    switch (size) {
      case 'small':
        return typography.small;
      case 'large':
        return typography.body;
      default:
        return typography.small;
    }
  };

  return (
    <View
      style={[
        styles.container,
        { borderColor: colors.gray300, backgroundColor: colors.surfaceVariant },
        style,
      ]}
    >
      {buttons.map((button, index) => {
        const isSelected = value === button.value;
        const isDisabled = disabled || button.disabled;
        const isFirst = index === 0;
        const isLast = index === buttons.length - 1;

        return (
          <TouchableOpacity
            key={button.value}
            onPress={() => !isDisabled && onValueChange(button.value)}
            disabled={isDisabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: isDisabled }}
            accessibilityLabel={`${button.label}${isSelected ? ', selected' : ''}`}
            style={[
              styles.segment,
              {
                height: getHeight(),
                backgroundColor: isSelected ? colors.surface : 'transparent',
                borderColor: isSelected ? colors.primary : 'transparent',
              },
              isFirst && styles.segmentFirst,
              isLast && styles.segmentLast,
              isSelected && styles.segmentSelected,
            ]}
          >
            {button.icon && (
              <Icon
                source={button.icon}
                size={getIconSize()}
                color={
                  isDisabled
                    ? colors.textDisabled
                    : isSelected
                      ? colors.primary
                      : colors.textSecondary
                }
              />
            )}
            <Text
              style={[
                getTextStyle(),
                styles.segmentText,
                {
                  color: isDisabled
                    ? colors.textDisabled
                    : isSelected
                      ? colors.primary
                      : colors.textSecondary,
                },
                isSelected && styles.segmentTextSelected,
              ]}
            >
              {button.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  segmentFirst: {
    borderTopLeftRadius: borderRadius.sm,
    borderBottomLeftRadius: borderRadius.sm,
  },
  segmentLast: {
    borderTopRightRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
  },
  segmentSelected: {
    borderWidth: 1,
  },
  segmentText: {
    textAlign: 'center',
  },
  segmentTextSelected: {
    fontWeight: '600',
  },
});

export default SegmentedButton;

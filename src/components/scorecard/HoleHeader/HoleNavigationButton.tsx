/**
 * HoleNavigationButton Component
 *
 * A navigation button for navigating between holes.
 * Renders a chevron icon with proper accessibility and disabled states.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react-native';
import { borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export type NavigationDirection = 'previous' | 'next';

export interface HoleNavigationButtonProps {
  direction: NavigationDirection;
  onPress?: () => void;
  disabled?: boolean;
}

export const HoleNavigationButton = React.memo(function HoleNavigationButton({
  direction,
  onPress,
  disabled = false,
}: HoleNavigationButtonProps) {
  const colors = useThemeColors();
  const isDisabled = disabled || !onPress;

  const IconComponent = direction === 'previous' ? IconChevronLeft : IconChevronRight;
  const accessibilityLabel = direction === 'previous' ? 'Previous hole' : 'Next hole';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        { backgroundColor: colors.surface, borderColor: colors.border },
        isDisabled && styles.disabled,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <IconComponent
        size={20}
        color={colors.textPrimary}
        style={isDisabled ? { opacity: 0.3 } : undefined}
      />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});

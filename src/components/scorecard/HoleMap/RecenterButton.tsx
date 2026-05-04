import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows } from '@/constants/theme';

interface RecenterButtonProps {
  /** Hide entirely when location is unavailable (no GPS, denied, etc.). */
  visible: boolean;
  onPress: () => void;
}

export const RecenterButton = React.memo(function RecenterButton({
  visible,
  onPress,
}: RecenterButtonProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Center map on my location"
      onPress={onPress}
      testID="recenter-button"
      style={({ pressed }) => [
        styles.button,
        shadows.md,
        {
          backgroundColor: colors.surfaceElevated,
          right: spacing.lg,
          bottom: spacing.lg + insets.bottom,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon source="navigation" size={24} color={colors.textPrimary} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * AddTeePill — small floating pill button for triggering the place-custom-tee
 * flow on the map. Anchored top-left of the map area, beneath MapHeader.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';

interface AddTeePillProps {
  visible: boolean;
  onPress: () => void;
}

export const AddTeePill = React.memo(function AddTeePill({
  visible,
  onPress,
}: AddTeePillProps) {
  const colors = useThemeColors();

  if (!visible) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add a custom tee box"
      onPress={onPress}
      testID="add-tee-pill"
      style={({ pressed }) => [
        styles.pill,
        shadows.md,
        {
          backgroundColor: colors.surfaceElevated,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        <Icon source="plus" size={18} color={colors.textPrimary} />
        <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
          Add tee
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.lg,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});

/**
 * EditTeePill — surfaces the action sheet for editing a user-created
 * custom tee. Renders next to (slightly below) the AddTeePill, with the
 * matching pill aesthetic and a colour swatch from the selected tee.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';

interface EditTeePillProps {
  visible: boolean;
  /** Hex swatch of the tee being edited — used as a small colour dot in the pill. */
  swatch: string | null;
  onPress: () => void;
}

export const EditTeePill = React.memo(function EditTeePill({
  visible,
  swatch,
  onPress,
}: EditTeePillProps) {
  const colors = useThemeColors();

  if (!visible) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit selected tee"
      onPress={onPress}
      testID="edit-tee-pill"
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
        {swatch && (
          <View
            style={[
              styles.swatch,
              { backgroundColor: swatch, borderColor: colors.borderLight },
            ]}
          />
        )}
        <Icon source="pencil" size={16} color={colors.textPrimary} />
        <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
          Edit tee
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    // Sits just below AddTeePill (which is at top: spacing.sm). Add the
    // pill's own height + gap so the two pills stack cleanly without
    // overlapping the map header chrome.
    top: spacing.sm + 36 + spacing.xs,
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
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
});

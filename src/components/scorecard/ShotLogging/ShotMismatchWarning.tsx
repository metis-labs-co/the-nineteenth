import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface ShotMismatchWarningProps {
  shotsLogged: number;
  strokes: number | null;
  onAddShot?: () => void;
}

export const ShotMismatchWarning = React.memo(function ShotMismatchWarning({
  shotsLogged,
  strokes,
  onAddShot,
}: ShotMismatchWarningProps) {
  const colors = useThemeColors();

  // No warning when score is unset, or when shots match strokes.
  if (strokes === null || shotsLogged === strokes) return null;

  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.warningLight ?? '#fef3c7' }]}
      testID="shot-mismatch-warning"
    >
      <Icon source="alert-circle-outline" size={16} color={colors.warning} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        Logged {shotsLogged} shot{shotsLogged === 1 ? '' : 's'} · entered {strokes} stroke
        {strokes === 1 ? '' : 's'}
      </Text>
      {onAddShot && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add missing shot"
          onPress={onAddShot}
          testID="shot-mismatch-add"
        >
          <Text style={[styles.action, { color: colors.primary }]}>Open map</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  text: {
    ...typography.small,
    flex: 1,
  },
  action: {
    ...typography.small,
    fontWeight: '600',
  },
});

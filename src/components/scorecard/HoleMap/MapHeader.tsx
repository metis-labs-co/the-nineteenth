import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface MapHeaderProps {
  holeNumber: number;
  canReset: boolean;
  onClose: () => void;
  onReset: () => void;
}

export function MapHeader({ holeNumber, canReset, onClose, onReset }: MapHeaderProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close map"
        onPress={onClose}
        style={styles.iconButton}
      >
        <Icon source="close" size={24} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Hole {holeNumber}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset marker"
        accessibilityState={{ disabled: !canReset }}
        onPress={canReset ? onReset : undefined}
        style={[styles.iconButton, !canReset && styles.iconButtonDisabled]}
      >
        <Icon source="restart" size={24} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...typography.h4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
});

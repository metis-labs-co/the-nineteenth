import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';

export interface OptionRowProps {
  icon: string;
  label: string;
  description?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function OptionRow({
  icon,
  label,
  description,
  selected,
  disabled = false,
  onPress,
}: OptionRowProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderColor: selected ? colors.primary : colors.gray300,
          backgroundColor: selected ? withOpacity(colors.primaryLighter, 0.13) : colors.surface,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: selected ? colors.primary : colors.gray200 },
          ]}
        >
          <Icon source={icon} size={20} color={selected ? colors.white : colors.gray600} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
          {description && (
            <Text
              style={[styles.description, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {description}
            </Text>
          )}
        </View>
        {selected && (
          <View style={[styles.marker, { backgroundColor: colors.primary }]}>
            <Icon source="check" size={14} color={colors.white} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 2,
    overflow: 'hidden',
    ...shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: 72,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  label: {
    ...typography.bodyBold,
  },
  description: {
    ...typography.small,
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OptionRow;

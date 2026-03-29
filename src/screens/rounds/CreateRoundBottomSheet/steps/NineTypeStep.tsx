/**
 * NineTypeStep - Select full 18, front 9, or back 9
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import type { NineType } from '@/types/database/enums';

interface NineTypeStepProps {
  selectedNineType: NineType;
  onSelectNineType: (nineType: NineType) => void;
}

const OPTIONS: { value: NineType; label: string; holes: string; count: string }[] = [
  { value: 'full', label: 'Full Round', holes: 'All 18 holes', count: '18' },
  { value: 'front9', label: 'Front 9', holes: 'Holes 1–9', count: '9' },
  { value: 'back9', label: 'Back 9', holes: 'Holes 10–18', count: '9' },
];

export default function NineTypeStep({ selectedNineType, onSelectNineType }: NineTypeStepProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        How many holes are you playing?
      </Text>
      <View style={styles.options}>
        {OPTIONS.map((opt) => {
          const isSelected = selectedNineType === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => onSelectNineType(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.count, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                {opt.count}
              </Text>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {opt.label}
              </Text>
              <Text style={[styles.holes, { color: colors.textSecondary }]}>
                {opt.holes}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  options: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  count: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  holes: {
    ...typography.caption,
  },
});

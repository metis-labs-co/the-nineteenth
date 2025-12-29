/**
 * TeesSection - Tee selection UI
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { TeeSelector } from '@/components/common';
import type { TeeBox } from '@/types/database.types';

interface TeesSectionProps {
  tees: TeeBox[];
  selectedTee: TeeBox | null;
  onSelectTee: (tee: TeeBox) => void;
  disabled?: boolean;
}

export function TeesSection({
  tees,
  selectedTee,
  onSelectTee,
  disabled,
}: TeesSectionProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Tee</Text>
      <TeeSelector
        tees={tees}
        selectedTee={selectedTee}
        onSelectTee={onSelectTee}
        variant="cards"
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
});

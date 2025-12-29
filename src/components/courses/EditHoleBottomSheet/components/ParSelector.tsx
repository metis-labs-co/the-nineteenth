/**
 * ParSelector - Segmented control for selecting hole par value
 */

import React, { memo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PAR_OPTIONS, type ParValue } from '../types';

interface ParSelectorProps {
  value: ParValue;
  onSelect: (par: ParValue) => void;
  error?: string;
}

export const ParSelector = memo(function ParSelector({
  value,
  onSelect,
  error,
}: ParSelectorProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Par</Text>
      <View style={styles.segmentedControl}>
        {PAR_OPTIONS.map((par) => {
          const isSelected = value === par;
          return (
            <TouchableOpacity
              key={par}
              onPress={() => onSelect(par)}
              style={[
                styles.button,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                  borderColor: colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Par ${par}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: isSelected ? colors.white : colors.textPrimary },
                ]}
              >
                {par}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: {
    ...typography.bodyBold,
  },
  errorText: {
    ...typography.small,
    marginTop: spacing.xs,
  },
});

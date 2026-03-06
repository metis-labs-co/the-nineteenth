/**
 * TeeColorSelector - Horizontal tee color picker for build-as-you-play
 *
 * Displays colored circles for standard tee options.
 * Selected circle gets a border indicator.
 */

import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { TEE_COLORS } from '@/services/courses/teesService';

interface TeeColorSelectorProps {
  selectedTee: string | null;
  onSelect: (teeName: string) => void;
}

/** Common tees shown in the selector (subset of TEE_COLORS) */
const COMMON_TEES = ['blue', 'white', 'red', 'yellow', 'black', 'gold'] as const;

export const TeeColorSelector = memo(function TeeColorSelector({
  selectedTee,
  onSelect,
}: TeeColorSelectorProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Tee Colour
      </Text>
      <View style={styles.teeRow}>
        {COMMON_TEES.map((teeName) => {
          const teeColor = TEE_COLORS[teeName] ?? '#808080';
          const isSelected = selectedTee === teeName;
          const isWhiteTee = teeName === 'white';

          return (
            <TouchableOpacity
              key={teeName}
              onPress={() => onSelect(teeName)}
              style={styles.teeOption}
              accessibilityRole="button"
              accessibilityLabel={`${teeName} tee`}
              accessibilityState={{ selected: isSelected }}
            >
              <View
                style={[
                  styles.teeCircle,
                  { backgroundColor: teeColor },
                  isWhiteTee && { borderWidth: 1, borderColor: colors.border },
                  isSelected && {
                    borderWidth: 3,
                    borderColor: colors.primary,
                  },
                ]}
              >
                {isSelected && (
                  <Icon
                    source="check"
                    size={16}
                    color={isWhiteTee || teeName === 'yellow' || teeName === 'gold' ? '#000' : '#FFF'}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.teeName,
                  { color: isSelected ? colors.textPrimary : colors.textSecondary },
                  isSelected && styles.teeNameSelected,
                ]}
                numberOfLines={1}
              >
                {teeName.charAt(0).toUpperCase() + teeName.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  teeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teeOption: {
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 48,
  },
  teeCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teeName: {
    ...typography.caption,
  },
  teeNameSelected: {
    fontWeight: '700',
  },
});

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { getTeeColor } from '@/screens/rounds/CreateRoundBottomSheet/types';
import type { TeeBox } from '@/types/database/base';

export interface PlayerTeeRowProps {
  playerName: string;
  availableTees: TeeBox[];
  selectedTee: TeeBox | null;
  onPick: (tee: TeeBox) => void;
  disabled?: boolean;
}

export function PlayerTeeRow({
  playerName,
  availableTees,
  selectedTee,
  onPick,
  disabled = false,
}: PlayerTeeRowProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.playerRow, { borderBottomColor: colors.border }]}>
      <Text
        style={[typography.bodyBold, styles.playerName, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {playerName}
      </Text>
      <View style={styles.teePills}>
        {availableTees.map((tee) => {
          const isSelected =
            selectedTee?.tee_id === tee.tee_id ||
            (selectedTee?.name === tee.name && !tee.tee_id);
          const dotColor = getTeeColor(tee.color, colors.textSecondary);
          return (
            <TouchableOpacity
              key={tee.tee_id ?? tee.name}
              style={[
                styles.teePill,
                {
                  backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onPick(tee)}
              activeOpacity={0.7}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`${playerName} ${tee.name} tee`}
              accessibilityState={{ selected: isSelected, disabled }}
            >
              <View
                style={[styles.teeDot, { backgroundColor: dotColor, borderColor: colors.border }]}
              />
              <Text
                style={[
                  styles.teePillText,
                  { color: isSelected ? colors.primary : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {tee.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playerRow: {
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playerName: {
    marginBottom: spacing.sm,
  },
  teePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  teePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  teeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  teePillText: {
    ...typography.caption,
  },
});

export default PlayerTeeRow;

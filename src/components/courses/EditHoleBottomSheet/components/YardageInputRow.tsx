/**
 * YardageInputRow - Single row for entering yardage for a tee box
 */

import React, { memo } from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { getTeeColor } from '@/components/common/TeeSelector';
import type { TeeBox } from '@/types/database/base';

interface YardageInputRowProps {
  tee: TeeBox;
  value: string;
  onChangeText: (value: string) => void;
  isSelectedTee: boolean;
  isMetres: boolean;
  error?: string;
}

export const YardageInputRow = memo(function YardageInputRow({
  tee,
  value,
  onChangeText,
  isSelectedTee,
  isMetres,
  error,
}: YardageInputRowProps) {
  const colors = useThemeColors();
  const unit = isMetres ? 'metres' : 'yards';

  return (
    <View style={styles.row}>
      <View style={styles.teeInfo}>
        <View
          style={[
            styles.colorDot,
            {
              backgroundColor: getTeeColor(tee.color, colors.textDisabled),
              borderColor: colors.border,
            },
          ]}
        />
        <Text style={[styles.teeName, { color: colors.textPrimary }]}>
          {tee.name}
          {isSelectedTee && (
            <Text style={{ color: colors.primary }}> (playing)</Text>
          )}
        </Text>
      </View>
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor: colors.surfaceVariant },
          isSelectedTee && { borderWidth: 2, borderColor: colors.primary },
          error && { borderWidth: 1, borderColor: colors.error },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder="—"
          placeholderTextColor={colors.textDisabled}
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          maxLength={4}
          accessibilityLabel={`${tee.name} tee distance in ${unit}`}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  teeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  teeName: {
    ...typography.body,
  },
  inputWrapper: {
    width: 80,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  input: {
    ...typography.body,
    textAlign: 'center',
  },
});

import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';

import { useUpdateCompetitionField } from './useUpdateCompetitionField';

export interface EditTeamSizeSheetProps {
  visible: boolean;
  onDismiss: () => void;
  competitionId: string;
  currentSize: number | null;
}

const TEAM_SIZES = [2, 3, 4] as const;

export function EditTeamSizeSheet({
  visible,
  onDismiss,
  competitionId,
  currentSize,
}: EditTeamSizeSheetProps) {
  const colors = useThemeColors();
  const { mutate, isPending } = useUpdateCompetitionField({
    competitionId,
    onSuccess: onDismiss,
  });

  const handleSelect = useCallback(
    (size: number) => {
      if (size === currentSize) {
        onDismiss();
        return;
      }
      mutate({ team_size: size });
    },
    [currentSize, mutate, onDismiss]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Team Size"
      height={0.4}
      useModal
      testID="edit-team-size-sheet"
    >
      <View style={styles.body}>
        <Text style={[styles.helper, { color: colors.textSecondary }]}>
          Number of players per team.
        </Text>
        <View style={styles.chipRow}>
          {TEAM_SIZES.map((size) => {
            const isSelected = currentSize === size;
            return (
              <TouchableOpacity
                key={size}
                style={[
                  styles.chip,
                  {
                    borderColor: isSelected ? colors.primary : colors.gray300,
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                  },
                ]}
                onPress={() => handleSelect(size)}
                disabled={isPending}
                accessibilityRole="radio"
                accessibilityLabel={`${size} players per team`}
                accessibilityState={{ selected: isSelected, disabled: isPending }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? colors.white : colors.textPrimary },
                  ]}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  helper: {
    ...typography.body,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  chip: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    ...typography.h3,
  },
});

export default EditTeamSizeSheet;

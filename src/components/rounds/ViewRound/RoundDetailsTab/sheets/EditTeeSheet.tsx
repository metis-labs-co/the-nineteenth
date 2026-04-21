/**
 * EditTeeSheet - Edit a round's default tee box in a focused bottom sheet.
 *
 * Writes round-level `selected_tee` only. Per-player overrides are handled
 * by the separate `EditTeesSheet` and are not affected by this sheet.
 */

import React, { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BottomSheet } from '@/components/common/BottomSheet';
import { TeeSelector } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { roundKeys } from '@/hooks/queryKeys';
import { updateRound } from '@/screens/admin/EditRoundScreen/hooks/useEditRoundData';
import type { TeeBox } from '@/types/database.types';

export interface EditTeeSheetProps {
  visible: boolean;
  onDismiss: () => void;
  roundId: string;
  tees: TeeBox[];
  currentTee: TeeBox | null;
}

export function EditTeeSheet({
  visible,
  onDismiss,
  roundId,
  tees,
  currentTee,
}: EditTeeSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (tee: TeeBox) => {
      await updateRound(roundId, { selected_tee: tee });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      onDismiss();
    },
  });

  const handleSelect = useCallback(
    (tee: TeeBox) => {
      if (tee.name === currentTee?.name) {
        onDismiss();
        return;
      }
      mutate(tee);
    },
    [currentTee?.name, mutate, onDismiss]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Tee"
      height={0.6}
      useModal
      testID="edit-tee-sheet"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {tees.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            No tees available for this course.
          </Text>
        ) : (
          <TeeSelector
            tees={tees}
            selectedTee={currentTee}
            onSelectTee={handleSelect}
            variant="cards"
            disabled={isPending}
          />
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  empty: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});

export default EditTeeSheet;

/**
 * EditNineTypeSheet — change a round's hole count (Full 18 / Front 9 / Back 9).
 *
 * Available for standalone rounds while the round is upcoming OR in-progress.
 * Mid-round changes are intentionally allowed: switching from full → front9
 * doesn't invalidate scores already entered on holes 1–9; the scorecard
 * simply stops surfacing the back nine afterwards. Switching front9 → full
 * exposes holes 10–18 again ready to be scored.
 */

import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BottomSheet } from '@/components/common/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import { roundKeys, leaderboardKeys } from '@/hooks/queryKeys';
import { updateRound } from '@/screens/admin/EditRoundScreen/hooks/useEditRoundData';
import type { NineType } from '@/types/database/enums';

export interface EditNineTypeSheetProps {
  visible: boolean;
  onDismiss: () => void;
  roundId: string;
  currentNineType: NineType;
}

interface OptionMeta {
  value: NineType;
  label: string;
  count: string;
  description: string;
}

const OPTIONS: OptionMeta[] = [
  { value: 'full', label: 'Full Round', count: '18', description: 'All 18 holes' },
  { value: 'front9', label: 'Front 9', count: '9', description: 'Holes 1–9' },
  { value: 'back9', label: 'Back 9', count: '9', description: 'Holes 10–18' },
];

export function EditNineTypeSheet({
  visible,
  onDismiss,
  roundId,
  currentNineType,
}: EditNineTypeSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (nineType: NineType) => {
      await updateRound(roundId, { nine_type: nineType });
    },
    onSuccess: () => {
      // Invalidate detail + lists so the visible row, scorecard, and
      // leaderboards all repaint against the new hole count.
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
      onDismiss();
    },
  });

  const handleSelect = useCallback(
    (nineType: NineType) => {
      if (nineType === currentNineType || isPending) {
        onDismiss();
        return;
      }
      mutate(nineType);
    },
    [currentNineType, isPending, mutate, onDismiss]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Holes Played"
      height={0.55}
      useModal
      testID="edit-nine-type-sheet"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.helper, { color: colors.textSecondary }]}>
          Change which holes count toward this round's score. Scores already
          entered on holes outside the new selection are kept in your records
          but won't appear on the scorecard.
        </Text>
        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const selected = opt.value === currentNineType;
            return (
              <TouchableOpacity
                key={opt.value}
                accessibilityRole="button"
                accessibilityLabel={`${opt.label} (${opt.description})`}
                accessibilityState={{ selected, disabled: isPending }}
                onPress={() => handleSelect(opt.value)}
                disabled={isPending}
                activeOpacity={0.75}
                style={[
                  styles.card,
                  shadows.sm,
                  {
                    backgroundColor: colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                    borderWidth: selected ? 2 : 1,
                    opacity: isPending && !selected ? 0.5 : 1,
                  },
                ]}
                testID={`edit-nine-type-option-${opt.value}`}
              >
                <Text
                  style={[
                    styles.count,
                    { color: selected ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {opt.count}
                </Text>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  {opt.label}
                </Text>
                <Text
                  style={[styles.description, { color: colors.textSecondary }]}
                >
                  {opt.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  helper: {
    ...typography.body,
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
  },
  count: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.caption,
    textAlign: 'center',
  },
});

export default EditNineTypeSheet;

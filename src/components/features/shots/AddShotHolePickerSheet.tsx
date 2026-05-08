/**
 * AddShotHolePickerSheet — bottom-sheet picker that lists all holes 1–N for
 * the round and lets the user choose one to log a shot for. Used from the
 * Shots tab to backfill shots on holes that have no existing shots logged
 * (so they don't appear in the per-hole list above).
 *
 * Each row shows the current `n / s` (shots logged / strokes scored) so the
 * user can pick a hole that's missing data at a glance.
 */

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { BottomSheet } from '@/components/common';

export interface AddShotHolePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Total holes in the round. Defaults to 18 if not provided. */
  totalHoles?: number;
  /** Map of hole_number → shots logged by the current user. */
  shotsByHole: Record<number, number>;
  /** Map of hole_number → strokes scored by the current user. Optional. */
  strokesByHole?: Record<number, number>;
  onSelect: (holeNumber: number) => void;
}

interface RowMeta {
  holeNumber: number;
  n: number;
  s: number | null;
}

export function AddShotHolePickerSheet({
  visible,
  onClose,
  totalHoles = 18,
  shotsByHole,
  strokesByHole,
  onSelect,
}: AddShotHolePickerSheetProps) {
  const colors = useThemeColors();

  const rows: RowMeta[] = useMemo(() => {
    const out: RowMeta[] = [];
    for (let h = 1; h <= totalHoles; h++) {
      const n = shotsByHole[h] ?? 0;
      const s =
        strokesByHole && Object.prototype.hasOwnProperty.call(strokesByHole, h)
          ? strokesByHole[h]
          : null;
      out.push({ holeNumber: h, n, s });
    }
    return out;
  }, [totalHoles, shotsByHole, strokesByHole]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.7}
      title="Pick a hole"
      showCloseButton
      useModal
    >
      <View style={styles.intro}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Choose any hole to log a shot. The map opens for that hole so you
          can place the shot exactly.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {rows.map(({ holeNumber, n, s }) => {
          const subtitle =
            s != null
              ? `${n} shot${n === 1 ? '' : 's'} logged · ${s} stroke${s === 1 ? '' : 's'} scored`
              : `${n} shot${n === 1 ? '' : 's'} logged`;
          return (
            <Pressable
              key={holeNumber}
              accessibilityRole="button"
              accessibilityLabel={`Log shot for hole ${holeNumber}. ${subtitle}.`}
              onPress={() => onSelect(holeNumber)}
              testID={`add-shot-hole-${holeNumber}`}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.borderLight,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                Hole {holeNumber}
              </Text>
              <Text
                style={[typography.small, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  intro: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 56,
  },
});

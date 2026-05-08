/**
 * EditNineTypeSheet — change a round's hole count (Full 18 / Front 9 / Back 9).
 *
 * Available for standalone rounds while the round is upcoming OR in-progress.
 * Mid-round changes are intentionally allowed: switching from full → front9
 * doesn't invalidate scores already entered on holes 1–9; the scorecard
 * simply stops surfacing the back nine afterwards. Switching front9 → full
 * exposes holes 10–18 again ready to be scored.
 *
 * When the new selection would hide holes that already have scores entered
 * (e.g. switching to Front 9 after holes 10–13 have been played) we surface
 * a confirmation dialog so the user can back out before the change applies.
 * Scores aren't deleted — the dialog wording reflects that.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BottomSheet } from '@/components/common/BottomSheet';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import { roundKeys, leaderboardKeys } from '@/hooks/queryKeys';
import { useRoundScorecards } from '@/hooks/rounds';
import { updateRound } from '@/screens/admin/EditRoundScreen/hooks/useEditRoundData';
import { isMultiBallScore, isSingleBallScore } from '@/types/database/base';
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

const NINE_TYPE_LABEL: Record<NineType, string> = {
  full: 'Full 18',
  front9: 'Front 9',
  back9: 'Back 9',
};

/** Compress a sorted list of hole numbers into a human-readable range list. */
function formatHoleList(holes: number[]): string {
  if (holes.length === 0) return '';
  const sorted = [...holes].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    ranges.push(start === prev ? String(start) : `${start}–${prev}`);
    start = cur;
    prev = cur;
  }
  return ranges.join(', ');
}

/** Holes that have at least one strokes value entered, across every scorecard
 *  on the round. Pulled from the per-hole `scores` JSONB; supports single and
 *  multi-ball score shapes. */
function collectScoredHoles(
  scorecards: { scores: Record<string, unknown> | null }[]
): Set<number> {
  const set = new Set<number>();
  for (const sc of scorecards) {
    const scores = sc.scores;
    if (!scores) continue;
    for (const [holeKey, raw] of Object.entries(scores)) {
      const num = Number(holeKey);
      if (!Number.isInteger(num)) continue;
      const score = raw as Parameters<typeof isSingleBallScore>[0];
      if (isSingleBallScore(score) && score.strokes != null) {
        set.add(num);
      } else if (
        isMultiBallScore(score) &&
        score.balls.some((b) => b.strokes != null)
      ) {
        set.add(num);
      }
    }
  }
  return set;
}

/** Holes that fall outside `nineType` — i.e. the holes that would stop being
 *  surfaced on the scorecard after switching. */
function holesOutsideNineType(holes: number[], nineType: NineType): number[] {
  if (nineType === 'front9') return holes.filter((n) => n >= 10);
  if (nineType === 'back9') return holes.filter((n) => n <= 9);
  return [];
}

export function EditNineTypeSheet({
  visible,
  onDismiss,
  roundId,
  currentNineType,
}: EditNineTypeSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  // Scorecards drive the data-loss check. Cheap to share a query with the
  // scorecard tab — same key, no extra fetch when both are mounted.
  const { data: scorecards } = useRoundScorecards(roundId);
  const scoredHoles = useMemo(
    () => collectScoredHoles(scorecards ?? []),
    [scorecards]
  );

  const [pendingChange, setPendingChange] = useState<{
    nineType: NineType;
    hiddenHoles: number[];
  } | null>(null);

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
      setPendingChange(null);
      onDismiss();
    },
  });

  const applyChange = useCallback(
    (nineType: NineType) => {
      const hidden = holesOutsideNineType(
        Array.from(scoredHoles),
        nineType
      );
      if (hidden.length > 0) {
        setPendingChange({ nineType, hiddenHoles: hidden });
        return;
      }
      mutate(nineType);
    },
    [mutate, scoredHoles]
  );

  const handleSelect = useCallback(
    (nineType: NineType) => {
      if (nineType === currentNineType || isPending) {
        onDismiss();
        return;
      }
      applyChange(nineType);
    },
    [applyChange, currentNineType, isPending, onDismiss]
  );

  const confirmPendingChange = useCallback(() => {
    if (!pendingChange) return;
    mutate(pendingChange.nineType);
  }, [mutate, pendingChange]);

  const cancelPendingChange = useCallback(() => {
    setPendingChange(null);
  }, []);

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
          {`Change which holes count toward this round's score. Scores already entered on holes outside the new selection are kept in your records but won't appear on the scorecard.`}
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

      <ConfirmationDialog
        visible={!!pendingChange}
        title="Hide scored holes?"
        message={
          pendingChange
            ? `Hole${pendingChange.hiddenHoles.length === 1 ? '' : 's'} ${formatHoleList(pendingChange.hiddenHoles)} ${pendingChange.hiddenHoles.length === 1 ? 'has' : 'have'} scores entered. Switching to ${NINE_TYPE_LABEL[pendingChange.nineType]} will hide ${pendingChange.hiddenHoles.length === 1 ? 'it' : 'them'} from this round's scorecard. Your scores stay saved and become visible again if you switch back.`
            : ''
        }
        confirmLabel={
          pendingChange
            ? `Switch to ${NINE_TYPE_LABEL[pendingChange.nineType]}`
            : 'Confirm'
        }
        cancelLabel="Cancel"
        confirmVariant="destructive"
        icon="alert-circle-outline"
        onConfirm={confirmPendingChange}
        onCancel={cancelPendingChange}
        loading={isPending}
      />
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

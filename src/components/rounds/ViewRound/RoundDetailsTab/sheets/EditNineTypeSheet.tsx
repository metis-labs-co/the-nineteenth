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

import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { deleteHoles } from '@/services/offline/database';
import { useScorecardStore } from '@/store/scorecardStore';
import { isMultiBallScore, isSingleBallScore } from '@/types/database/base';
import type { NineType } from '@/types/database/enums';

export interface EditNineTypeSheetProps {
  visible: boolean;
  onDismiss: () => void;
  roundId: string;
  currentNineType: NineType;
  /** Any non-null rounds.holes_played marker fixes the round's hole count. */
  holesPlayed?: number | null;
  /** Live scored holes (score entry); when set, server cards aren't read. */
  scoredHoleNumbers?: number[];
  /** Awaited before resetRound(): refetch metadata + players so re-init isn't stale. */
  beforeReset?: () => Promise<void>;
  /** Called after a successful change (e.g. to broadcast to peers). */
  onChanged?: (nineType: NineType) => void;
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
  holesPlayed = null,
  scoredHoleNumbers,
  beforeReset,
  onChanged,
}: EditNineTypeSheetProps) {
  const colors = useThemeColors();
  const isEndedEarly = holesPlayed != null;
  // A confirmation callback can outlive its render when the end marker arrives.
  const isEndedEarlyRef = useRef(isEndedEarly);
  isEndedEarlyRef.current = isEndedEarly;
  const queryClient = useQueryClient();

  // Scorecards drive the data-loss check. Cheap to share a query with the
  // scorecard tab — same key, no extra fetch when both are mounted. Score
  // entry passes its live scored holes instead, so the query stays idle.
  const { data: scorecards } = useRoundScorecards(roundId, {
    enabled: !scoredHoleNumbers,
  });
  const scoredHoles = useMemo(
    () =>
      scoredHoleNumbers
        ? new Set(scoredHoleNumbers)
        : collectScoredHoles(scorecards ?? []),
    [scoredHoleNumbers, scorecards]
  );

  const [pendingChange, setPendingChange] = useState<{
    nineType: NineType;
    hiddenHoles: number[];
  } | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: async (nineType: NineType) => {
      if (isEndedEarlyRef.current) {
        throw new Error("This round's holes can't be changed after it was ended early.");
      }
      await updateRound(roundId, { nine_type: nineType });
    },
    onSuccess: async (_data, nineType) => {
      // Invalidate detail + lists so the visible row, scorecard, and
      // leaderboards all repaint against the new hole count.
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });

      // Clear the scoring caches keyed off the previous nine_type. Without
      // this, opening Continue Scoring after a switch keeps showing the old
      // hole count:
      //   1. The Zustand scorecardStore holds the in-memory holes array
      //      and `nineType` from the prior init — Scorecard short-circuits
      //      its re-init when these are still set for this round.
      //   2. SQLite's per-round holes cache may only contain the previous
      //      filtered subset (e.g. 1–9 from a front9 init), so the offline
      //      load path's `filterHolesByNineType` would re-emit the wrong
      //      window when widening (front9 → full) or repointing (front9
      //      → back9). Deleting forces the next open to fetch fresh course
      //      holes and re-filter against the new nine_type.
      // The holes cache is cleared (awaited) BEFORE the store reset so the
      // re-init can't read the old window. Cache clear is best-effort —
      // useRoundData's nine_type-mismatch path will still re-init from the
      // network if SQLite isn't writable. `beforeReset` lets live score entry
      // refetch metadata + roster first so the re-init isn't built on stale data.
      await deleteHoles(roundId).catch(() => undefined);
      await beforeReset?.().catch(() => undefined);
      const scorecardState = useScorecardStore.getState();
      if (scorecardState.currentRoundId === roundId) {
        scorecardState.resetRound();
      }
      onChanged?.(nineType);

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
      if (nineType === currentNineType || isPending || isEndedEarlyRef.current) {
        onDismiss();
        return;
      }
      applyChange(nineType);
    },
    [applyChange, currentNineType, isPending, onDismiss]
  );

  const confirmPendingChange = useCallback(() => {
    if (!pendingChange || isEndedEarlyRef.current) return;
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
          {isEndedEarly
            ? `This round was ended after ${holesPlayed} holes, so its holes can't be changed.`
            : `Change which holes count toward this round's score. Scores already entered on holes outside the new selection are kept in your records but won't appear on the scorecard.`}
        </Text>
        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const selected = opt.value === currentNineType;
            const disabled = isPending || isEndedEarly;
            return (
              <TouchableOpacity
                key={opt.value}
                accessibilityRole="button"
                accessibilityLabel={`${opt.label} (${opt.description})`}
                accessibilityState={{ selected, disabled }}
                onPress={() => handleSelect(opt.value)}
                disabled={disabled}
                activeOpacity={0.75}
                style={[
                  styles.card,
                  shadows.sm,
                  {
                    backgroundColor: colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                    borderWidth: selected ? 2 : 1,
                    opacity: disabled && !selected ? 0.5 : 1,
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

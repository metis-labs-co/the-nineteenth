/**
 * useApplyAutoTeeOverrides — pre-populate tee origin overrides for every
 * hole of a round based on the player's selected tee box.
 *
 * Runs once per (round, selected-tee) when the scoring screen mounts and
 * the supporting data (course tees + custom tees) is ready. For each hole
 * that doesn't already have a user-set override in `useTeeOverrideStore`,
 * the hook resolves the best match via `resolveAutoTeeOverride`:
 *
 *   1. A custom tee on the hole that shares the selected tee's colour
 *   2. The back/front POI when the selected tee is the course's
 *      longest/shortest
 *   3. Default to back (longest yardage) when neither applies
 *
 * Idempotent: existing user-set overrides are never overwritten.
 *
 * Solo / shot-tracked rounds are the primary surface for this — multi-
 * player rounds disable shot logging upstream — but the hook is harmless
 * regardless because nothing reads the overrides until shots get logged.
 */

import { useEffect, useRef } from 'react';
import { useCourse } from '@/hooks/courses';
import { useCustomHoleTeesByCourse } from '@/hooks/customTees';
import { useTeeOverrideStore } from '@/store/teeOverrideStore';
import { resolveAutoTeeOverride } from '@/utils/teeColors';
import type { Hole, TeeBox } from '@/types';

export function useApplyAutoTeeOverrides(
  roundId: string | null | undefined,
  courseId: string | null | undefined,
  selectedTee: TeeBox | null | undefined,
  holes: readonly Hole[]
) {
  const { data: course } = useCourse(courseId ?? undefined);
  const { data: customTeesByHole = {} } = useCustomHoleTeesByCourse(courseId, {
    enabled: !!courseId,
  });

  // Guard against re-applying every render. The key bakes in the round id
  // and the selected tee identity so a tee change mid-round (e.g. user
  // edits the round's tee) re-runs the auto-apply for any newly-missing
  // overrides; user-set overrides remain untouched (the inner loop skips
  // them via `getOverride`).
  const appliedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!roundId) return;
    if (!selectedTee) return;
    if (!course?.tees) return;
    if (holes.length === 0) return;

    const teeKey = selectedTee.tee_id ?? selectedTee.color ?? selectedTee.name ?? 'unknown';
    const key = `${roundId}::${teeKey}`;
    if (appliedKey.current === key) return;
    appliedKey.current = key;

    const store = useTeeOverrideStore.getState();
    for (const hole of holes) {
      const existing = store.getOverride(roundId, hole.number);
      if (existing) continue; // never overwrite a manual choice

      const override = resolveAutoTeeOverride(
        selectedTee,
        course.tees,
        customTeesByHole[hole.number] ?? []
      );
      if (override) {
        store.setOverride(roundId, hole.number, override);
      }
    }
  }, [roundId, selectedTee, course?.tees, holes, customTeesByHole]);
}

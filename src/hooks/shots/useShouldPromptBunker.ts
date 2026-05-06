/**
 * Eligibility hook for the V2 Phase B bunker-prompt fallback.
 *
 * Returns true when ALL of these hold:
 *   1. shot and priorShot are both non-null
 *   2. shot.from_bunker is false (auto-detect didn't catch it)
 *   3. courseId is defined and useHoleHazards has loaded with 0 bunker polygons
 *   4. green_center coordinate is available for this hole
 *   5. shot is < 50m from green_center
 *   6. priorShot is > 50m from green_center
 *   7. elapsed time between priorShot and shot is < 5 minutes
 *   8. (roundId, holeNumber) is not in the dismissal cooldown
 *
 * Pure-ish: side-effect-free, reads from cached query hooks + zustand state.
 *
 * Spec §6: docs/superpowers/specs/2026-05-06-bunker-prompt-fallback-design.md
 */

import { useHoleHazards } from '@/hooks/hazards';
import { useHoleCoordinatesByHole } from '@/hooks/coordinates';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';
import { calculateDistance } from '@/utils/gpsCalculations';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

const SHORT_SHOT_RADIUS_M = 50;
const PRIOR_SHOT_FAR_M = 50;
const MAX_GAP_MS = 5 * 60 * 1000; // 5 minutes

export function useShouldPromptBunker(
  shot: ShotLogEntry | null,
  priorShot: ShotLogEntry | null,
  courseId: string | undefined,
  holeNumber: number
): boolean {
  // Always call hooks (rules of hooks); pass safe defaults when courseId is undefined.
  const { data: hazards, isLoading: hazardsLoading } = useHoleHazards(
    courseId ?? '',
    courseId ? holeNumber : 0
  );
  const { data: coords } = useHoleCoordinatesByHole(
    courseId ?? '',
    courseId ? holeNumber : 0
  );
  const cooldown = useShotLoggingUiStore((s) => s.bunkerPromptCooldown);

  if (!courseId) return false;
  if (!shot || !priorShot) return false;
  if (shot.from_bunker) return false;
  if (hazardsLoading) return false;
  if ((hazards ?? []).some((h) => h.type === 'bunker')) return false;

  const greenCenter = coords?.green_center;
  if (!greenCenter) return false;

  const shotToGreen = calculateDistance(
    shot.latitude,
    shot.longitude,
    greenCenter.latitude,
    greenCenter.longitude
  );
  if (shotToGreen >= SHORT_SHOT_RADIUS_M) return false;

  const priorToGreen = calculateDistance(
    priorShot.latitude,
    priorShot.longitude,
    greenCenter.latitude,
    greenCenter.longitude
  );
  if (priorToGreen <= PRIOR_SHOT_FAR_M) return false;

  const gapMs =
    new Date(shot.created_at).getTime() -
    new Date(priorShot.created_at).getTime();
  if (gapMs >= MAX_GAP_MS) return false;

  if (cooldown.has(`${shot.round_id}:${shot.hole_number}`)) return false;

  return true;
}

/**
 * Per-hole last-edit-wins merge for social rounds.
 *
 * Pure: decides which side's version of each hole to keep and nothing else.
 * Totals are recomputed by the store (calculatePlayerTotals). A hole moves as
 * one unit. Holes are compared by edit identity (editedAt, or strokes when
 * neither side is stamped), never structurally: the server copy has its JSON
 * keys reordered by Postgres and may lack local-only fields, so the same edit
 * must keep the richer local hole. Missing editedAt (pre-1.14.1) is the oldest
 * edit; two unstamped holes that differ resolve to the server's copy.
 */
import type { HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database/base';

export interface ScorecardScoresMerge {
  scores: Record<number, HoleScore | MultiBallHoleScore>;
  /** The result differs from the local scores. */
  localChanged: boolean;
  /** Some local hole beats or is missing on the server: upload the result. */
  localAhead: boolean;
}

const editTime = (score: HoleScore): number =>
  score.editedAt ? Date.parse(score.editedAt) || 0 : 0;

const isSameEdit = (a: HoleScore, b: HoleScore): boolean =>
  a.editedAt || b.editedAt ? a.editedAt === b.editedAt : a.strokes === b.strokes;

export function mergeScorecardScores(
  local: Record<number, HoleScore | MultiBallHoleScore>,
  server: Record<number | string, HoleScore> | null | undefined,
): ScorecardScoresMerge {
  const scores: Record<number, HoleScore | MultiBallHoleScore> = { ...local };
  let localChanged = false;
  let localAhead = false;
  const serverHoles = new Set<number>();

  for (const [key, serverHole] of Object.entries(server ?? {})) {
    const hole = Number(key);
    if (!Number.isFinite(hole) || !serverHole || serverHole.strokes == null) continue;
    serverHoles.add(hole);
    const localHole = local[hole];

    if (!localHole) {
      scores[hole] = serverHole;
      localChanged = true;
      continue;
    }
    if (!isSingleBallScore(localHole)) continue; // multi-ball never syncs
    if (isSameEdit(localHole, serverHole)) continue;

    if (editTime(localHole) > editTime(serverHole)) {
      localAhead = true;
    } else {
      scores[hole] = serverHole;
      localChanged = true;
    }
  }

  for (const [key, localHole] of Object.entries(local)) {
    if (!serverHoles.has(Number(key)) && localHole && isSingleBallScore(localHole)) localAhead = true;
  }

  return { scores, localChanged, localAhead };
}

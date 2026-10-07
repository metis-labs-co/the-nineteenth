/**
 * Apply a server scorecard row to the local card for a social round.
 * Pure. The caller recomputes totals (calculatePlayerTotals) and persists.
 *
 * Revision rule: the server revision is adopted only together with that
 * server's holes, and an older row never lowers it. A final (submitted) row
 * wins over anything local; the echo of a card this phone already holds as
 * final at that revision is a no-op.
 */
import type { HoleScore, Scorecard } from '@/types';
import { mergeScorecardScores } from '@/services/offline/sync/mergeScorecardScores';

export interface RemoteScorecardRow {
  player_id: string;
  scores: Record<string, HoleScore> | null;
  revision: number;
  status: string;
}

export interface RemoteMergeResult {
  scorecard: Scorecard;
  changed: boolean;
  needsUpload: boolean;
  becameFinal: boolean;
}

export const isFinalStatus = (status: string | undefined): boolean =>
  status === 'completed' || status === 'confirmed';

const unchanged = (local: Scorecard): RemoteMergeResult =>
  ({ scorecard: local, changed: false, needsUpload: false, becameFinal: false });

export function applyRemoteScorecard(local: Scorecard, remote: RemoteScorecardRow): RemoteMergeResult {
  const localRevision = local.serverRevision ?? 0;
  const localFinal = isFinalStatus(local.status);

  if (isFinalStatus(remote.status)) {
    if (localFinal && localRevision >= remote.revision) return unchanged(local);
    // A row without scores carries no hole data: keep the local holes rather
    // than wiping the card.
    let scores: Scorecard['scores'] = local.scores;
    if (remote.scores != null) {
      scores = {};
      for (const [key, hole] of Object.entries(remote.scores)) {
        if (hole && hole.strokes != null) scores[Number(key)] = hole;
      }
    }
    return {
      scorecard: {
        ...local,
        scores,
        status: remote.status as Scorecard['status'],
        serverRevision: Math.max(localRevision, remote.revision),
        updatedAt: new Date(),
      },
      changed: true,
      needsUpload: false,
      becameFinal: !localFinal,
    };
  }

  if (remote.revision < localRevision) return unchanged(local);

  const merge = mergeScorecardScores(local.scores, remote.scores);
  if (!merge.localChanged && remote.revision === localRevision) {
    return { ...unchanged(local), needsUpload: merge.localAhead };
  }
  return {
    scorecard: { ...local, scores: merge.scores, serverRevision: remote.revision, updatedAt: new Date() },
    changed: true,
    needsUpload: merge.localAhead,
    becameFinal: false,
  };
}

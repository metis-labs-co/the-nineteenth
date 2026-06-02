import { PICKUP_SCORE } from '@/constants/scoring';
import type { HoleScore } from '@/types/database/base';
import type { WatchScoreWrite, WatchWriteResult, WatchStatFlags } from './types';

export interface ScoreWriteContext {
  currentUserId: string;
  allowedPlayerIds: Set<string>;
  statFlags: WatchStatFlags;
  getExisting: (playerId: string, hole: number) => HoleScore | undefined;
  getLastEditedRev: (playerId: string, hole: number) => number; // -1 if never
  seen: Set<string>;
  applyHoleScore: (playerId: string, hole: number, holeScore: HoleScore) => Promise<void>;
  markEdited: (playerId: string, hole: number, rev: number) => void;
  nextRev: () => number;
}

export async function applyWatchScoreWrite(
  write: WatchScoreWrite,
  ctx: ScoreWriteContext,
): Promise<WatchWriteResult> {
  if (ctx.seen.has(write.clientWriteId)) return { status: 'duplicate', clientWriteId: write.clientWriteId };
  if (!ctx.allowedPlayerIds.has(write.playerId)) return { status: 'unauthorized', clientWriteId: write.clientWriteId };
  if (ctx.getLastEditedRev(write.playerId, write.hole) > write.baseRev) {
    return { status: 'superseded', clientWriteId: write.clientWriteId };
  }
  const existing = ctx.getExisting(write.playerId, write.hole) ?? ({} as HoleScore);
  const strokes = write.strokes === 'pickup' ? PICKUP_SCORE : write.strokes;
  const next: HoleScore = { ...existing, strokes, scoredBy: ctx.currentUserId };
  if (write.stat) {
    const s = write.stat;
    const f = ctx.statFlags;
    if (f.putts && s.putts !== undefined) next.putts = s.putts;
    if (f.fairways && s.fairwayHit !== undefined) next.fairwayHit = s.fairwayHit;
    if (f.fairwayDirection && s.fairwayMissDirection !== undefined) next.fairwayMissDirection = s.fairwayMissDirection;
    if (f.gir && s.greenInRegulation !== undefined) next.greenInRegulation = s.greenInRegulation;
    if (f.greenDirection && s.greenMissDirection !== undefined) next.greenMissDirection = s.greenMissDirection;
    if (f.bunker && s.bunkerShots !== undefined) next.bunkerShots = s.bunkerShots;
    if (f.penalties && s.hazards !== undefined) next.hazards = s.hazards;
  }
  await ctx.applyHoleScore(write.playerId, write.hole, next);
  const rev = ctx.nextRev();
  ctx.markEdited(write.playerId, write.hole, rev);
  ctx.seen.add(write.clientWriteId);
  return { status: 'applied', clientWriteId: write.clientWriteId, rev };
}

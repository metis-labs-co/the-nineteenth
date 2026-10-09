import { getHoleRange, getHoleCount } from '@/constants/scoring';
/** Shared contracts. Shape reads/errors have narrow siblings; adoption owns orchestration. */
import type { NineType } from '@/types/database/enums';
import type { Scorecard } from '@/types';
export type RoundScoringShape = Readonly<{ nine_type: NineType; holes_played: number | null }>;
export type PositiveRoundScoringShape = RoundScoringShape & { holes_played: number };
/** scorecardId is the LOCAL Scorecard.id, never the UUID returned by the server RPC. */
export type AcceptedScorecardWrite = Readonly<{ scorecardId: string; serverRevision: number }>;
export type OwnedRoundEndIntent = Readonly<{ userId: string }>;
export type PriorLocalShapes = ReadonlyMap<string, RoundScoringShape>;
export type RebuildRoundShapeCard = (source: Scorecard, keep: ReadonlySet<number>, target: RoundScoringShape) => Scorecard;

/** Pure played-number mask shared by passive disk repair and current-store repair. */
export function shapeHoleNumbers(shape: RoundScoringShape): Set<number> {
  if (
    !['full', 'front9', 'back9'].includes(shape.nine_type) ||
    (shape.holes_played !== null &&
      (!Number.isInteger(shape.holes_played) ||
        shape.holes_played < 1 ||
        shape.holes_played >= getHoleCount(shape.nine_type)))
  ) {
    throw new Error('Invalid round scoring shape');
  }
  const { start, end } = getHoleRange(shape.nine_type);
  return new Set(
    Array.from({ length: shape.holes_played ?? end - start + 1 }, (_, i) => start + i)
  );
}

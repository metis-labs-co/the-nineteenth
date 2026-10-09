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
export type RebuildRoundShapeCard = (
  source: Scorecard,
  keep: ReadonlySet<number>,
  target: RoundScoringShape
) => Scorecard;

/** Content identity for an upload acknowledgment; revisions are preserved independently. */
export function scorecardScoringVersion(card: Scorecard): string {
  const keys = [
    'id',
    'roundId',
    'playerId',
    'scores',
    'totalGross',
    'totalNet',
    'total_par_score',
    'status',
    'submittedAt',
    'submittedBy',
    'createdAt',
    'updatedAt',
    'holesPlayed',
    'syncNineType',
    'teeData',
    'playerHandicap',
    'playerGender',
    'coursePar',
    'syncHoles',
    'syncGameType',
    'syncHandicapSource',
  ] as const;
  return JSON.stringify(
    Object.fromEntries(keys.map((key) => [key, card[key] ?? null])),
    (_key, value) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
        : value
  );
}

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

import type { HoleScore } from '@/types/database/base';
import { shapeHoleNumbers, type RoundScoringShape } from '@/services/rounds/roundScoringWrite';

/** Raw JSON stays opaque except for supported single-ball physical hole values. */
export type StatsScores = Record<string, unknown>;
export const EDITABLE_STATS_FIELDS = [
  'putts',
  'fairwayHit',
  'fairwayMissDirection',
  'greenInRegulation',
  'greenMissDirection',
  'bunkerShots',
  'hazards',
] as const satisfies readonly (keyof HoleScore)[];
export type EditableHoleStats = Pick<HoleScore, (typeof EDITABLE_STATS_FIELDS)[number]>;

export function isStatsHoleScore(value: unknown): value is HoleScore & Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'strokes' in value &&
    typeof value.strokes === 'number' &&
    Number.isFinite(value.strokes) &&
    !('balls' in value)
  );
}

export function editableStatsHoleNumbers(scores: StatsScores, shape: RoundScoringShape): number[] {
  return [...shapeHoleNumbers(shape)].filter((number) => isStatsHoleScore(scores[String(number)]));
}

/** Overlay only supported stats on the captured original. No scoring or opaque keys can change. */
export function prepareStatsScores(
  original: StatsScores,
  draft: StatsScores,
  shape: RoundScoringShape
): StatsScores {
  const scores = { ...original };
  for (const number of editableStatsHoleNumbers(original, shape)) {
    const key = String(number);
    const edited = draft[key];
    if (!isStatsHoleScore(edited)) continue;
    const hole: Record<string, unknown> = { ...(original[key] as Record<string, unknown>) };
    for (const field of EDITABLE_STATS_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(edited, field)) hole[field] = edited[field];
    }
    scores[key] = hole;
  }
  return scores;
}

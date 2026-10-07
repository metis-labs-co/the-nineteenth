/**
 * Scoring mode for a round. 'social' rounds let anyone score anyone, with a
 * per-hole last-edit-wins merge (docs/superpowers/specs/2026-10-07-social-round-multi-scorer-design.md).
 * Handicap, competition and scoring-pairs rounds are 'standard' and behave as
 * before. Anything unknown is 'standard'.
 */
export type ScoringMode = 'social' | 'standard';

export function deriveScoringMode(
  round:
    | {
        competition_id?: string | null;
        handicap_source?: string | null;
        scoring_pairs_required?: boolean | null;
      }
    | null
    | undefined,
): ScoringMode {
  if (!round) return 'standard';
  return round.competition_id === null &&
    round.handicap_source === 'none' &&
    round.scoring_pairs_required === false
    ? 'social'
    : 'standard';
}

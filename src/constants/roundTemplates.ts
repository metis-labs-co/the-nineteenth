/**
 * Round Rule Templates
 *
 * Named presets that resolve to a `RoundRulesOverride` payload. Lets organizers
 * apply a common rule set in one click instead of configuring every field
 * individually. The engine reads the same `rules_override` regardless of
 * whether it came from a template or a custom edit — templates are a UX layer.
 *
 * To extend: add a new `RoundTemplateId` to src/types/database/enums.ts, then
 * append an entry here. Keep names stable — saved overrides reference template_id
 * for the "re-edit with same template" UX.
 */

import type { GameType, RoundTemplateId, TeamFormat } from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';

export interface RoundTemplate {
  id: RoundTemplateId;
  title: string;
  /** Short plain-English summary shown in the picker. */
  summary: string;
  /** Bullet list of what this template actually does, shown after selection. */
  rulesSummary: string[];
  /** Icon name (Material Community Icons). */
  icon: string;
  /** Suggested game_type to pair with this template. UI prompts the user if the round has a different game_type. */
  suggestedGameType: GameType;
  /** Suggested team_format (null = not a team round). */
  suggestedTeamFormat: TeamFormat | null;
  /**
   * Whether this template implies `round_format='split'`. If true, the round
   * creation flow also sets sub_match_size as specified in `suggestedSubMatchSize`.
   */
  impliesSplitRound: boolean;
  suggestedSubMatchSize?: 1 | 2 | 3;
  /** The rule override applied when this template is selected. */
  override: RoundRulesOverride;
}

// -----------------------------------------------------------------------------
// Built-in templates
// -----------------------------------------------------------------------------

/**
 * Team Stableford — Best N of M.
 * Every player plays individual Stableford. Team total = sum of the best N
 * individual scores on the team (drops the worst M-N). Team points 2/1/0.
 * Individual scorecards still rank on the individual leaderboard.
 *
 * Matches the golf-trip Round 1 config (best 3 of 4 with 2/1/0 team points).
 */
export const TEAM_STABLEFORD_BEST_N_OF_M: RoundTemplate = {
  id: 'team_stableford_best_n_of_m',
  title: 'Team Stableford — Best N of M',
  summary: 'Individual Stableford. Team total = sum of the best N scores.',
  rulesSummary: [
    'Every player plays individual Stableford',
    'Team total = sum of the best N individual scores (drops the worst)',
    'Winning team earns 2 points, 1 point each on a tie',
    'Individual leaderboard ranks players by cumulative Stableford total',
  ],
  icon: 'account-group-outline',
  suggestedGameType: 'stableford',
  suggestedTeamFormat: 'aggregate',
  impliesSplitRound: false,
  override: {
    template_id: 'team_stableford_best_n_of_m',
    team_aggregation: 'best_n_of_m',
    team_aggregation_config: { n: 3, m: 4 },
    team_points: { win: 2, tie: 1, loss: 0 },
    // Individuals contribute their raw Stableford total to the competition
    // leaderboard (summed across rounds) instead of being converted into
    // positional comp points. Matches the user-stated expectation for
    // best-3-of-4 stableford competitions.
    individual_points: { mode: 'raw_score' },
    contributes_to_individual_leaderboard: true,
    contributes_to_team_leaderboard: true,
    counts_as_qualifying: true,
  },
};

/**
 * Pairs Better Ball.
 * Round is split into 2v2 sub-matches. Each pair's per-hole Stableford points
 * are the better of its two members. Each sub-match awards 1 pt to the winning
 * pair, 0.5 on a tie. Individual Stableford still ranks.
 *
 * Matches golf-trip Round 2.
 */
export const PAIRS_BETTER_BALL: RoundTemplate = {
  id: 'pairs_better_ball',
  title: 'Pairs Better Ball',
  summary: 'Better ball in 2v2 pairs. 1 pt winning pair, 0.5 tie.',
  rulesSummary: [
    'Round is split into 2v2 sub-matches',
    'Per hole, each pair uses its members\' better Stableford score',
    'Winning pair earns 1 point per sub-match (0.5 on a tie)',
    'Individual Stableford totals still contribute to the individual leaderboard',
  ],
  icon: 'account-multiple-outline',
  suggestedGameType: 'stableford',
  suggestedTeamFormat: 'best-ball',
  impliesSplitRound: true,
  suggestedSubMatchSize: 2,
  override: {
    template_id: 'pairs_better_ball',
    team_aggregation: 'pairs_better_ball',
    pair_points: { win: 1, tie: 0.5, loss: 0 },
    contributes_to_individual_leaderboard: true,
    contributes_to_team_leaderboard: true,
    counts_as_qualifying: true,
  },
};

/**
 * Pairs Scramble.
 * Round is split into 2v2 sub-matches where each pair plays scramble
 * (both play best shot of the two). Each sub-match awards 1 pt to the
 * winning pair, 0.5 on a tie. Individual leaderboard is NOT updated
 * (scramble doesn't produce individual scores).
 */
export const PAIRS_SCRAMBLE: RoundTemplate = {
  id: 'pairs_scramble',
  title: 'Pairs Scramble',
  summary: 'Scramble in 2v2 pairs. 1 pt winning pair, 0.5 tie.',
  rulesSummary: [
    'Round is split into 2v2 sub-matches',
    'Each pair plays scramble (best shot of the two, both hit from there)',
    'Winning pair earns 1 point per sub-match (0.5 on a tie)',
    'Does not contribute to the individual leaderboard',
  ],
  icon: 'account-multiple-outline',
  suggestedGameType: 'scramble',
  suggestedTeamFormat: 'scramble',
  impliesSplitRound: true,
  suggestedSubMatchSize: 2,
  override: {
    template_id: 'pairs_scramble',
    team_aggregation: 'scramble',
    pair_points: { win: 1, tie: 0.5, loss: 0 },
    contributes_to_individual_leaderboard: false,
    contributes_to_team_leaderboard: true,
    counts_as_qualifying: false,
  },
};

/**
 * Team Scramble — Fixed Points.
 * Classic scramble. Team points 2/1/0. Individual leaderboard does NOT update
 * from this round (scramble doesn't produce individual scores). Match the
 * golf-trip Round 3 config.
 */
export const TEAM_SCRAMBLE_FIXED_POINTS: RoundTemplate = {
  id: 'team_scramble_fixed_points',
  title: 'Team Scramble — Fixed Points',
  summary: 'Classic scramble. 2 pts winning team, 1 each on tie.',
  rulesSummary: [
    'All team members play from the best shot each stroke',
    'Team net score uses the standard scramble handicap calculation',
    'Winning team earns 2 points, 1 point each on a tie',
    'Does not contribute to the individual leaderboard',
  ],
  icon: 'golf-tee',
  suggestedGameType: 'scramble',
  suggestedTeamFormat: 'scramble',
  impliesSplitRound: false,
  override: {
    template_id: 'team_scramble_fixed_points',
    team_aggregation: 'scramble',
    team_points: { win: 2, tie: 1, loss: 0 },
    contributes_to_individual_leaderboard: false,
    contributes_to_team_leaderboard: true,
    counts_as_qualifying: false,
  },
};

/**
 * Qualifying Match Play.
 * Individual match play where the bracket is auto-seeded from the cumulative
 * individual leaderboard of all qualifying rounds. Bracket style is configured
 * on the competition (standard vs adjacent seeding). No team points.
 *
 * Matches golf-trip Round 4.
 */
export const QUALIFYING_MATCH_PLAY: RoundTemplate = {
  id: 'qualifying_match_play',
  title: 'Qualifying Match Play',
  summary: 'Individual match play seeded from qualifying-round standings.',
  rulesSummary: [
    'Each player plays one 1v1 match',
    'Bracket is auto-seeded from the individual leaderboard of qualifying rounds',
    'Configure bracket style (standard vs adjacent) in competition settings',
    'Round 4 result feeds the competition leaderboard via match play points',
  ],
  icon: 'tournament',
  suggestedGameType: 'match-play',
  suggestedTeamFormat: null,
  impliesSplitRound: false,
  override: {
    template_id: 'qualifying_match_play',
    contributes_to_individual_leaderboard: true,
    contributes_to_team_leaderboard: false,
    counts_as_qualifying: false,
  },
};

// -----------------------------------------------------------------------------
// Registry
// -----------------------------------------------------------------------------
//
// ROUND_TEMPLATES is the source of truth for the `rules_override` payload
// each template represents. With the introduction of `roundPresets.ts`,
// templates are no longer selected directly — they're bundled into presets
// and persisted via `applyPresetToRound`. The finalization engine still
// keys off `rules_override.template_id`, which is why the payloads and
// IDs below remain load-bearing.

export const ROUND_TEMPLATES: Record<RoundTemplateId, RoundTemplate> = {
  team_stableford_best_n_of_m: TEAM_STABLEFORD_BEST_N_OF_M,
  pairs_better_ball: PAIRS_BETTER_BALL,
  pairs_scramble: PAIRS_SCRAMBLE,
  team_scramble_fixed_points: TEAM_SCRAMBLE_FIXED_POINTS,
  qualifying_match_play: QUALIFYING_MATCH_PLAY,
};

export function getRoundTemplate(id: RoundTemplateId): RoundTemplate {
  return ROUND_TEMPLATES[id];
}

/**
 * Round Rules Override Types
 *
 * Per-round scoring rule overrides that sit on top of the competition-level
 * `point_system` config. Stored as JSONB in `rounds.rules_override`.
 *
 * Editing these is gated behind the `advanced_round_rules` Premium feature
 * flag. Applying them during finalization is NOT gated — saved overrides are
 * always honored so downgrades don't retroactively change past results.
 */

import type {
  RoundTemplateId,
  TeamAggregationMethod,
  QualifyingMetric,
  BracketSeedingStyle,
} from './enums';

/**
 * Win / tie / loss point allocation for a round outcome.
 * Used for team points (e.g. 2/1/0) and sub-match pair points (e.g. 1/0.5/0).
 * Values support decimals (0.5 halved).
 */
export interface WinTieLossPoints {
  win: number;
  tie: number;
  loss: number;
}

/**
 * How individual round results convert into competition leaderboard points.
 *
 * - `positional`: classic comp points lookup (1st = 10, 2nd = 8, …). Uses the
 *   competition's `point_system.rules` by default; pass `rules` to override
 *   for this round only.
 * - `raw_score`: the round's raw score (e.g. Stableford total) is the
 *   competition point value. Summed across rounds, this gives a cumulative
 *   stableford / par total. Intended for stableford / par formats where
 *   higher is better — using it with stroke play would invert the standings.
 * - `win_tie_loss`: head-to-head allocation mirroring `team_points`. Position
 *   1 gets `values.win`, ties get `values.tie`, others get `values.loss`.
 */
export type IndividualPointsRule =
  | { mode: 'positional'; rules?: Record<string, number> }
  | { mode: 'raw_score' }
  | { mode: 'win_tie_loss'; values: WinTieLossPoints };

/**
 * Legacy shape that pre-dates the discriminated union (a bare position-points
 * map). Treated as `{ mode: 'positional', rules: <map> }` at finalize time.
 */
export type LegacyIndividualPointsMap = Record<string, number>;

/**
 * Configuration for team aggregation methods that need parameters.
 * Only `best_n_of_m` reads this today; other methods ignore it.
 */
export interface TeamAggregationConfig {
  /** Count of best individual scores to sum (e.g. 3 for "best 3 of 4"). */
  n?: number;
  /** Team size (e.g. 4 for "best 3 of 4"). Informational — engine uses actual team member count. */
  m?: number;
}

/**
 * Optional per-round bonus point. v1 supports a single metric:
 * `combined_match_margin` — the team with the higher net holes-up margin
 * (signed sum of sub-match `final_differential`) across the round's
 * sub-matches earns `points`. Exact tie resolves per `tie`.
 */
export interface MarginBonusConfig {
  enabled: boolean;
  metric: 'combined_match_margin';
  points: number;
  tie: 'split' | 'void' | 'carry';
}

/**
 * Full per-round override. All fields optional — unset means inherit the
 * competition-level default.
 */
export interface RoundRulesOverride {
  /** Template this override was created from (for re-edit UX). */
  template_id?: RoundTemplateId;

  /** How individual scores combine into a team score. */
  team_aggregation?: TeamAggregationMethod;
  team_aggregation_config?: TeamAggregationConfig;

  /** Points awarded to teams based on round result (overrides competition default). */
  team_points?: WinTieLossPoints;
  /** Points awarded per sub-match (pair) outcome — used when round_format='split'. */
  pair_points?: WinTieLossPoints;
  /** Optional bonus point awarded on a round-level margin metric. */
  bonus_points?: MarginBonusConfig;
  /**
   * How individual results contribute to the competition individual leaderboard.
   * See `IndividualPointsRule` for modes. Legacy rounds may persist a bare
   * position-map (`Record<string, number>`) — that shape is normalized to
   * `{ mode: 'positional', rules: <map> }` at finalize time.
   */
  individual_points?: IndividualPointsRule | LegacyIndividualPointsMap;

  /** Whether this round's individual results feed the competition individual leaderboard. */
  contributes_to_individual_leaderboard?: boolean;
  /** Whether this round's team results feed the competition team leaderboard. */
  contributes_to_team_leaderboard?: boolean;
  /** Flag for rounds whose individual totals feed knockout seeding. */
  counts_as_qualifying?: boolean;
}

/** Type guard for runtime validation of JSONB reads. */
export function isRoundRulesOverride(value: unknown): value is RoundRulesOverride {
  if (value === null || typeof value !== 'object') return false;
  // All fields are optional, so any plain object is structurally valid.
  // Full validation happens via zod at the edit boundary, not here.
  return true;
}

// Re-export enum types that are part of the override shape for convenience.
export type {
  RoundTemplateId,
  TeamAggregationMethod,
  QualifyingMetric,
  BracketSeedingStyle,
};

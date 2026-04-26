/**
 * Knockout Seeding — Qualifying Round Helpers
 *
 * Converts round_results rows from a set of qualifying rounds into a seeded
 * player ordering suitable for `generateSeedings(..., 'qualifying', preOrdered)`
 * in src/utils/bracketGeneration.ts.
 *
 * Used by Phase 3 of the per-round rules engine (Premium-gated qualifying
 * knockout seeding). The Phase 1 engine already saves round_results with
 * per-round rule overrides honored, so this helper just aggregates whatever
 * is on disk — no tier check needed here.
 */

import type { QualifyingMetric } from '@/types/database/enums';
import type { RoundResult } from '@/types/database.types';

export interface QualifyingPlayer {
  id: string;
  name: string;
  handicap: number | null;
  /** Cumulative metric value across all qualifying rounds. */
  total: number;
  /** Number of qualifying rounds the player actually participated in. */
  roundsPlayed: number;
}

/**
 * Whether the metric is "higher is better" for ranking.
 * - stableford_points → higher
 * - competition_points → higher
 * - net_strokes → lower
 */
export function isHigherBetterMetric(metric: QualifyingMetric): boolean {
  return metric !== 'net_strokes';
}

/**
 * Aggregate per-player totals across a set of qualifying round_results and
 * return them sorted by the chosen metric. Pass the result to
 * `generateSeedings(..., 'qualifying', preOrdered)` — the function treats
 * preOrdered as the final seed order, so seed 1 is the top qualifier.
 *
 * Rules:
 * - Team results (`is_team_result === true`) are skipped — seeding is per
 *   individual player.
 * - Only results for rounds whose `round_id` is in `qualifyingRoundIds`
 *   are included.
 * - Missing metric value on a row contributes 0 to that player's total
 *   for that round.
 * - Player metadata (name, handicap) is taken from the first matching row
 *   that includes it; pass the populated Player join from the service layer.
 */
export function aggregateQualifyingStandings(
  results: Array<Pick<RoundResult, 'round_id' | 'player_id' | 'is_team_result' | 'raw_score' | 'raw_result_data' | 'competition_points'> & {
    player?: { id: string; name: string; handicap: number | null } | null;
  }>,
  qualifyingRoundIds: string[],
  metric: QualifyingMetric
): QualifyingPlayer[] {
  const roundIdSet = new Set(qualifyingRoundIds);
  const totals = new Map<string, QualifyingPlayer>();

  for (const row of results) {
    if (row.is_team_result) continue;
    if (!row.player_id) continue;
    if (!roundIdSet.has(row.round_id)) continue;

    const value = extractMetricValue(row, metric);
    const existing = totals.get(row.player_id);
    if (existing) {
      existing.total += value;
      existing.roundsPlayed += 1;
      // Refresh name/handicap if the first pass didn't have them
      if (row.player && existing.name === '') existing.name = row.player.name;
      if (row.player && existing.handicap == null && row.player.handicap != null) {
        existing.handicap = row.player.handicap;
      }
    } else {
      totals.set(row.player_id, {
        id: row.player_id,
        name: row.player?.name ?? '',
        handicap: row.player?.handicap ?? null,
        total: value,
        roundsPlayed: 1,
      });
    }
  }

  const higherBetter = isHigherBetterMetric(metric);
  return Array.from(totals.values()).sort((a, b) =>
    higherBetter ? b.total - a.total : a.total - b.total
  );
}

function extractMetricValue(
  row: {
    raw_score: number | null;
    raw_result_data: { stableford_points?: number; net_score?: number };
    competition_points: number;
  },
  metric: QualifyingMetric
): number {
  switch (metric) {
    case 'stableford_points':
      return row.raw_result_data?.stableford_points ?? row.raw_score ?? 0;
    case 'net_strokes':
      return row.raw_result_data?.net_score ?? row.raw_score ?? 0;
    case 'competition_points':
      return row.competition_points ?? 0;
  }
}

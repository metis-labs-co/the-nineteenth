/**
 * Pair Result Finalization (R2 — Pairs Better Ball)
 *
 * For split rounds (`round_format='split'`) with a `pair_points` override,
 * walks the `sub_matches` table and accumulates win/tie/loss points per
 * competition team, then writes one `round_results` team row per team.
 *
 * A sub-match's `team_a_player_ids` side maps to `round.team1_id`; the
 * `team_b_player_ids` side maps to `round.team2_id`. That's the same
 * assumption the existing Ryder-Cup tallies in MatchTab / TeamsTab use — no
 * cross-reference to individual team_members is needed here.
 *
 * Each sub-match awards:
 *   - `pair_points.win`  to the winning side (`a-wins` / `b-wins` / forfeits)
 *   - `pair_points.tie`  to both sides when `halved`
 *   - `pair_points.loss` to the losing side
 *
 * Points across all completed sub-matches sum to each team's round total.
 * `forfeit-a` counts as Team B winning; `forfeit-b` counts as Team A winning
 * (matches the MatchTab aggregation at src/screens/rounds/ViewRoundScreen/tabs/MatchTab.tsx).
 *
 * This persists team rows independently of `finalizeTeamResults` (which
 * handles round-total aggregations). The two orchestrators are mutually
 * exclusive on any given override because `isSupportedTeamAggregation`
 * skips `pairs_better_ball`.
 */

import { supabase } from '@/services/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

import { saveRoundResults } from './roundResultsService';
import type { SubMatch } from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';

export interface FinalizePairResultsInput {
  roundId: string;
  /** Competition team IDs identifying the two sides of the split round. */
  team1Id: string;
  team2Id: string;
  /** Must include `pair_points`. The `pairs_better_ball` aggregation is implied. */
  rulesOverride: RoundRulesOverride | null | undefined;
  /**
   * Mode flag from `competitions.per_round_rules_enabled`. When explicitly
   * `false`, pair persistence is disabled — the competition is running under
   * general rules so the override is ignored.
   */
  perRoundRulesEnabled?: boolean;
  /**
   * Optional pre-fetched sub-matches. When omitted the service fetches
   * them from the `sub_matches` table. Tests typically pass these directly.
   */
  subMatches?: SubMatch[];
}

/**
 * Should this input be handled by finalizePairResults? Keeps the wiring in
 * useRoundFinalization readable.
 */
export function isPairPointsOverride(
  roundFormat: string | null | undefined,
  override: RoundRulesOverride | null | undefined
): boolean {
  if (roundFormat !== 'split') return false;
  return !!override?.pair_points;
}

async function fetchSubMatchesForRound(roundId: string): Promise<SubMatch[]> {
  // Sub-matches aren't in the generated Supabase types yet — same pattern as
  // src/services/subMatches/index.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (supabase.from('sub_matches') as any)
    .select('*')
    .eq('round_id', roundId)) as { data: SubMatch[] | null; error: PostgrestError | null };

  if (error) {
    throw new Error(`Failed to fetch sub-matches for pair finalization: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Orchestrate pair-points persistence for a split round.
 *
 * Returns the number of team rows written (0 or 2). Returns 0 when the
 * override doesn't request pair points, when the round isn't a split round,
 * when team1/team2 aren't set, or when no sub-matches have a result yet.
 */
export async function finalizePairResults(
  input: FinalizePairResultsInput
): Promise<number> {
  const { roundId, team1Id, team2Id, rulesOverride, perRoundRulesEnabled } = input;

  // General-rules mode disables pair-point persistence. Saved overrides stay
  // on disk; they simply aren't applied while mode is off.
  if (perRoundRulesEnabled === false) return 0;

  const pairPoints = rulesOverride?.pair_points;
  if (!pairPoints) return 0;
  if (!team1Id || !team2Id) return 0;

  const subMatches = input.subMatches ?? (await fetchSubMatchesForRound(roundId));
  const completed = subMatches.filter(
    (sm) =>
      (sm.status === 'completed' || sm.status === 'forfeited') && sm.result != null
  );
  if (completed.length === 0) return 0;

  // Accumulate per side
  let team1Points = 0;
  let team2Points = 0;
  let team1Wins = 0;
  let team2Wins = 0;
  let halved = 0;

  for (const sm of completed) {
    // 'a-wins' or 'forfeit-b' → side A (team1) wins
    // 'b-wins' or 'forfeit-a' → side B (team2) wins
    // 'halved'                → both tie
    if (sm.result === 'a-wins' || sm.result === 'forfeit-b') {
      team1Points += pairPoints.win;
      team2Points += pairPoints.loss;
      team1Wins += 1;
    } else if (sm.result === 'b-wins' || sm.result === 'forfeit-a') {
      team1Points += pairPoints.loss;
      team2Points += pairPoints.win;
      team2Wins += 1;
    } else if (sm.result === 'halved') {
      team1Points += pairPoints.tie;
      team2Points += pairPoints.tie;
      halved += 1;
    }
  }

  // Position + raw_result_data for each team row. Positions honor ties —
  // same tie logic as calculateCompetitionPoints.
  const team1Leading = team1Points > team2Points;
  const team2Leading = team2Points > team1Points;
  const tied = team1Points === team2Points;

  // Keep raw_result_data to the declared RoundResultData shape — the
  // team_score field already carries the accumulated pair-points total.
  // Sub-match counts are recoverable from sub_matches directly.
  void halved;
  void team1Wins;
  void team2Wins;

  await saveRoundResults(roundId, [
    {
      roundId,
      teamId: team1Id,
      rawScore: team1Points,
      rawResultData: { team_score: team1Points },
      position: tied ? 1 : team1Leading ? 1 : 2,
      competitionPoints: team1Points,
      isTeamResult: true,
    },
    {
      roundId,
      teamId: team2Id,
      rawScore: team2Points,
      rawResultData: { team_score: team2Points },
      position: tied ? 1 : team2Leading ? 1 : 2,
      competitionPoints: team2Points,
      isTeamResult: true,
    },
  ]);

  return 2;
}

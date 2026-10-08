/**
 * Skins Payout Calculation Functions
 *
 * Functions for calculating final payouts for individual and team skins games.
 */

import type { SkinsGame, SkinsPayout, SkinsResult } from '@/types/database';
import { roundCurrency } from '../currency';
import { calculateBuyIn, calculateHoleValue, calculateTotalPot } from './pot';
import { calculateCurrentCarryover, calculateHole18Split } from './processing';
import { DEFAULT_SKINS_HOLE_COUNTS, type SkinsHoleCounts } from './holeCounts';

/**
 * Minimal participant info for payout calculations
 */
export interface PayoutParticipant {
  id: string;
}

/**
 * Calculated payout data (without database IDs)
 */
export interface CalculatedPayout {
  player_id: string;
  buy_in: number;
  total_winnings: number;
  net_result: number;
  holes_won: number;
  holes_tied: number;
  holes_lost: number;
}

/**
 * Result of final payout calculation with carryover info
 */
export interface FinalPayoutResult {
  /** Payouts for each participant */
  payouts: CalculatedPayout[];
  /** Remaining carryover (always 0 - hole 18 carryover is always split) */
  remainingCarryover: number;
  /** Whether hole 18 carryover was split among participants (always true when there is carryover) */
  hole18CarryoverSplit: boolean;
}

/**
 * Team participant info for payout calculations
 */
export interface TeamPayoutParticipant {
  id: string;
  /** Number of members in the team (for split calculation) */
  member_count: number;
}

/**
 * Calculated team payout data (without database IDs)
 */
export interface CalculatedTeamPayout {
  team_id: string;
  buy_in: number;
  total_winnings: number;
  net_result: number;
  holes_won: number;
  holes_tied: number;
  holes_lost: number;
  /** Per-member split of net result */
  per_member_amount: number;
}

/**
 * Result of final team payout calculation with carryover info
 */
export interface FinalTeamPayoutResult {
  /** Payouts for each team */
  payouts: CalculatedTeamPayout[];
  /** Remaining carryover (always 0 - hole 18 carryover is always split) */
  remainingCarryover: number;
  /** Whether hole 18 carryover was split among teams (always true when there is carryover) */
  hole18CarryoverSplit: boolean;
}

/**
 * Calculate final payouts for all participants in a completed skins game.
 *
 * @param game - The skins game configuration
 * @param results - All hole results
 * @param participants - List of participants
 * @param holeCounts - Holes planned (prices the pot) and played (scales it);
 *   defaults to a full 18 played as planned
 * @returns Array of calculated payouts for each participant
 *
 * @example
 * const payouts = calculateFinalPayouts(game, results, participants);
 * // Returns: [{ player_id: 'p1', buy_in: 22.50, total_winnings: 45, net_result: 22.50, ... }]
 */
export function calculateFinalPayouts(
  game: Pick<SkinsGame, 'pot_type' | 'pot_value' | 'participant_ids'>,
  results: Pick<SkinsResult, 'hole_number' | 'winner_id' | 'is_carryover' | 'payout_amount' | 'carryover_to_next' | 'hole_scores'>[],
  participants: PayoutParticipant[],
  holeCounts?: SkinsHoleCounts
): CalculatedPayout[] {
  const result = calculateFinalPayoutsWithCarryover(game, results, participants, holeCounts);
  return result.payouts;
}

/**
 * Calculate final payouts with carryover handling.
 *
 * Hole 18 carryover is always split evenly among all participants.
 *
 * @param game - The skins game configuration
 * @param results - All hole results (should include all 18 holes)
 * @param participants - List of participants
 * @returns Final payout result with payouts and carryover info
 *
 * @example
 * const result = calculateFinalPayoutsWithCarryover(game, results, participants);
 * // result.hole18CarryoverSplit = true, result.remainingCarryover = 0
 */
/**
 * Build a payout entry per participant and accumulate hole outcomes
 * (wins/ties/losses and banked winnings). Shared by the final settlement
 * and the in-progress standings so the two can never drift.
 */
function accumulateHoleOutcomes(
  results: Pick<SkinsResult, 'hole_number' | 'winner_id' | 'is_carryover' | 'payout_amount' | 'carryover_to_next' | 'hole_scores'>[],
  participants: PayoutParticipant[],
  buyIn: number
): Map<string, CalculatedPayout> {
  const payoutMap = new Map<string, CalculatedPayout>();
  for (const participant of participants) {
    payoutMap.set(participant.id, {
      player_id: participant.id,
      buy_in: buyIn,
      total_winnings: 0,
      net_result: 0,
      holes_won: 0,
      holes_tied: 0,
      holes_lost: 0,
    });
  }

  for (const result of results) {
    const participantIds = Object.keys(result.hole_scores);

    if (result.is_carryover) {
      // All participants in this hole tied
      for (const playerId of participantIds) {
        const payout = payoutMap.get(playerId);
        if (payout) {
          payout.holes_tied += 1;
        }
      }
    } else if (result.winner_id) {
      // One winner, everyone else lost
      for (const playerId of participantIds) {
        const payout = payoutMap.get(playerId);
        if (payout) {
          if (playerId === result.winner_id) {
            payout.holes_won += 1;
            payout.total_winnings += result.payout_amount;
          } else {
            payout.holes_lost += 1;
          }
        }
      }
    }
  }

  return payoutMap;
}

/**
 * The pot actually played for.
 * - Played as planned: the planned pot, calculateTotalPot(type, value,
 *   plannedHoles) — unchanged from today for a full 18.
 * - Ended early: the rounded hole price the per-hole processing paid out
 *   (calculateHoleValue over the planned holes) × holes played, so winnings
 *   sum to this pot exactly. Scaling the pot instead (pot × played/planned)
 *   drifts by a cent per hole on a total pot that doesn't divide evenly.
 */
export function calculatePlayedPot(
  game: Pick<SkinsGame, 'pot_type' | 'pot_value'>,
  holeCounts: SkinsHoleCounts
): number {
  const { plannedHoles, holesPlayed } = holeCounts;
  if (holesPlayed >= plannedHoles) {
    return calculateTotalPot(game.pot_type, game.pot_value, plannedHoles);
  }
  return roundCurrency(calculateHoleValue(game.pot_type, game.pot_value, plannedHoles) * holesPlayed);
}

/**
 * What a SETTLED game actually staked: the sum of its stored buy-ins. Null
 * when the game isn't completed or its payouts aren't written yet — callers
 * then fall back to calculatePlayedPot / a settlement preview. The single
 * "is this game settled?" rule for every skins display.
 */
export function calculateSettledPot(
  game: Pick<SkinsGame, 'status'>,
  payouts: Pick<SkinsPayout, 'buy_in'>[] | null | undefined
): number | null {
  if (game.status !== 'completed' || !payouts || payouts.length === 0) return null;
  return roundCurrency(payouts.reduce((sum, p) => sum + p.buy_in, 0));
}

/**
 * Each participant's buy-in: the played pot split evenly. For a round played
 * as planned this is exactly calculateBuyIn over the planned holes, so a
 * complete 18-hole game prices as before.
 */
function calculateSettlementBuyIn(
  game: Pick<SkinsGame, 'pot_type' | 'pot_value'>,
  participantCount: number,
  holeCounts: SkinsHoleCounts
): number {
  return roundCurrency(calculatePlayedPot(game, holeCounts) / participantCount);
}

export function calculateFinalPayoutsWithCarryover(
  game: Pick<SkinsGame, 'pot_type' | 'pot_value' | 'participant_ids'>,
  results: Pick<SkinsResult, 'hole_number' | 'winner_id' | 'is_carryover' | 'payout_amount' | 'carryover_to_next' | 'hole_scores'>[],
  participants: PayoutParticipant[],
  holeCounts: SkinsHoleCounts = DEFAULT_SKINS_HOLE_COUNTS
): FinalPayoutResult {
  // The remaining carryover is the HIGHEST hole's (calculateCurrentCarryover).
  // Results after the last played hole don't exist at settlement: the
  // end_round_early RPC deletes them when the round is ended.
  const buyIn = calculateSettlementBuyIn(game, participants.length, holeCounts);
  const payoutMap = accumulateHoleOutcomes(results, participants, buyIn);

  // Calculate remaining carryover (from hole 18 if it was tied)
  const remainingCarryover = calculateCurrentCarryover(results);
  let hole18CarryoverSplit = false;

  // Always split hole 18 carryover evenly among participants
  if (remainingCarryover > 0) {
    const splitAmount = calculateHole18Split(remainingCarryover, participants.length);
    for (const payout of payoutMap.values()) {
      payout.total_winnings += splitAmount;
    }
    hole18CarryoverSplit = true;
  }

  // Calculate net results
  const payouts: CalculatedPayout[] = [];
  for (const payout of payoutMap.values()) {
    payout.net_result = roundCurrency(payout.total_winnings - payout.buy_in);
    payouts.push(payout);
  }

  return {
    payouts,
    remainingCarryover: 0,
    hole18CarryoverSplit,
  };
}

/**
 * Result of an in-progress standings calculation
 */
export interface InProgressPayoutResult {
  /** Current standing per participant (as if the game ended now) */
  payouts: CalculatedPayout[];
  /** Carryover still up for grabs on the remaining holes — NOT distributed */
  unsettledCarryover: number;
}

/**
 * Calculate the current standing of an ACTIVE skins game.
 *
 * Same accumulation as the final settlement, except the pending carryover
 * is not split — mid-game it is still winnable on the holes ahead, so it
 * is reported separately instead of being banked to anyone.
 *
 * @param game - The skins game configuration
 * @param results - Hole results so far (partial round)
 * @param participants - List of participants
 * @param holeCounts - Holes planned and played; prices the buy-in exactly as
 *   the settlement will. Defaults to a full 18 played as planned.
 * @returns Standing per participant plus the undistributed carryover
 */
export function calculateInProgressPayouts(
  game: Pick<SkinsGame, 'pot_type' | 'pot_value' | 'participant_ids'>,
  results: Pick<SkinsResult, 'hole_number' | 'winner_id' | 'is_carryover' | 'payout_amount' | 'carryover_to_next' | 'hole_scores'>[],
  participants: PayoutParticipant[],
  holeCounts: SkinsHoleCounts = DEFAULT_SKINS_HOLE_COUNTS
): InProgressPayoutResult {
  const buyIn = calculateSettlementBuyIn(game, participants.length, holeCounts);
  const payoutMap = accumulateHoleOutcomes(results, participants, buyIn);

  const payouts: CalculatedPayout[] = [];
  for (const payout of payoutMap.values()) {
    payout.net_result = roundCurrency(payout.total_winnings - payout.buy_in);
    payouts.push(payout);
  }

  return {
    payouts,
    unsettledCarryover: calculateCurrentCarryover(results),
  };
}

/** One participant's skins net result, for the payouts tabs. */
export interface SkinsNetResult {
  player_id: string;
  net_result: number;
}

/**
 * Net results for a payouts display.
 * - Settled (calculateSettledPot non-null): the stored skins_payouts.
 * - Unsettled, played holes still to come: the live standings
 *   (calculateInProgressPayouts) — the pending carryover is NOT split, exactly
 *   as Review's Skins tab shows it, so the two tabs agree mid-round.
 * - Unsettled, every played hole in: the settlement preview
 *   (calculateFinalPayouts), which splits a carryover left on the last hole.
 */
export function resolveSkinsNetResults(
  game: Pick<SkinsGame, 'status' | 'pot_type' | 'pot_value' | 'participant_ids'>,
  results: Pick<SkinsResult, 'hole_number' | 'winner_id' | 'is_carryover' | 'payout_amount' | 'carryover_to_next' | 'hole_scores'>[],
  storedPayouts: Pick<SkinsPayout, 'player_id' | 'net_result' | 'buy_in'>[] | null | undefined,
  holeCounts: SkinsHoleCounts = DEFAULT_SKINS_HOLE_COUNTS
): SkinsNetResult[] {
  if (storedPayouts && calculateSettledPot(game, storedPayouts) !== null) {
    return storedPayouts
      .filter(
        (p): p is Pick<SkinsPayout, 'net_result' | 'buy_in'> & { player_id: string } => p.player_id !== null
      )
      .map((p) => ({ player_id: p.player_id, net_result: p.net_result }));
  }

  const participants = game.participant_ids.map((id) => ({ id }));
  const stillPlaying = game.status !== 'completed' && results.length < holeCounts.holesPlayed;
  const payouts = stillPlaying
    ? calculateInProgressPayouts(game, results, participants, holeCounts).payouts
    : calculateFinalPayouts(game, results, participants, holeCounts);
  return payouts.map((p) => ({
    player_id: p.player_id,
    net_result: p.net_result,
  }));
}

/**
 * Calculate final payouts for all teams in a completed team skins game.
 *
 * @param game - The skins game configuration
 * @param results - All hole results
 * @param teams - List of teams with member counts
 * @returns Team payout result with payouts and carryover info
 */
export function calculateTeamFinalPayouts(
  game: Pick<SkinsGame, 'pot_type' | 'pot_value' | 'participant_team_ids'>,
  results: Pick<
    SkinsResult,
    | 'hole_number'
    | 'team_winner_id'
    | 'is_carryover'
    | 'payout_amount'
    | 'carryover_to_next'
    | 'hole_scores'
  >[],
  teams: TeamPayoutParticipant[]
): FinalTeamPayoutResult {
  const buyIn = calculateBuyIn(game.pot_type, game.pot_value, teams.length);

  // Initialize payout tracking for each team
  const payoutMap = new Map<string, CalculatedTeamPayout>();
  for (const team of teams) {
    payoutMap.set(team.id, {
      team_id: team.id,
      buy_in: buyIn,
      total_winnings: 0,
      net_result: 0,
      holes_won: 0,
      holes_tied: 0,
      holes_lost: 0,
      per_member_amount: 0,
    });
  }

  // Process each hole result
  for (const result of results) {
    const teamIds = Object.keys(result.hole_scores);

    if (result.is_carryover) {
      // All teams in this hole tied
      for (const teamId of teamIds) {
        const payout = payoutMap.get(teamId);
        if (payout) {
          payout.holes_tied += 1;
        }
      }
    } else if (result.team_winner_id) {
      // One winner, everyone else lost
      for (const teamId of teamIds) {
        const payout = payoutMap.get(teamId);
        if (payout) {
          if (teamId === result.team_winner_id) {
            payout.holes_won += 1;
            payout.total_winnings += result.payout_amount;
          } else {
            payout.holes_lost += 1;
          }
        }
      }
    }
  }

  // Calculate remaining carryover (from hole 18 if it was tied)
  const remainingCarryover = calculateCurrentCarryover(results);
  let hole18CarryoverSplit = false;

  // Always split hole 18 carryover evenly among teams
  if (remainingCarryover > 0) {
    const splitAmount = calculateHole18Split(remainingCarryover, teams.length);
    for (const payout of payoutMap.values()) {
      payout.total_winnings += splitAmount;
    }
    hole18CarryoverSplit = true;
  }

  // Calculate net results and per-member amounts
  const payouts: CalculatedTeamPayout[] = [];
  for (const payout of payoutMap.values()) {
    payout.net_result = roundCurrency(payout.total_winnings - payout.buy_in);

    // Find team to get member count
    const team = teams.find((t) => t.id === payout.team_id);
    const memberCount = team?.member_count ?? 1;
    payout.per_member_amount = roundCurrency(payout.net_result / memberCount);

    payouts.push(payout);
  }

  return {
    payouts,
    remainingCarryover: 0,
    hole18CarryoverSplit,
  };
}

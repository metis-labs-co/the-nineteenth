/**
 * Skins Payout Calculation Functions
 *
 * Functions for calculating final payouts for individual and team skins games.
 */

import type { SkinsGame, SkinsResult } from '@/types/database';
import { roundCurrency } from '../currency';
import { calculateBuyIn } from './pot';
import { calculateCurrentCarryover, calculateHole18Split } from './processing';

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
 * @returns Array of calculated payouts for each participant
 *
 * @example
 * const payouts = calculateFinalPayouts(game, results, participants);
 * // Returns: [{ player_id: 'p1', buy_in: 22.50, total_winnings: 45, net_result: 22.50, ... }]
 */
export function calculateFinalPayouts(
  game: Pick<SkinsGame, 'pot_type' | 'pot_value' | 'participant_ids'>,
  results: Pick<SkinsResult, 'hole_number' | 'winner_id' | 'is_carryover' | 'payout_amount' | 'carryover_to_next' | 'hole_scores'>[],
  participants: PayoutParticipant[]
): CalculatedPayout[] {
  const result = calculateFinalPayoutsWithCarryover(game, results, participants);
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
export function calculateFinalPayoutsWithCarryover(
  game: Pick<SkinsGame, 'pot_type' | 'pot_value' | 'participant_ids'>,
  results: Pick<SkinsResult, 'hole_number' | 'winner_id' | 'is_carryover' | 'payout_amount' | 'carryover_to_next' | 'hole_scores'>[],
  participants: PayoutParticipant[]
): FinalPayoutResult {
  const buyIn = calculateBuyIn(game.pot_type, game.pot_value, participants.length);

  // Initialize payout tracking for each participant
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

  // Process each hole result
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

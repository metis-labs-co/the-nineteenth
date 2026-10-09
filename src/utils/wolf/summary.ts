/**
 * Wolf Game Summary
 *
 * Builds the display summary (standings, net results, hole counts) for a Wolf
 * game. Extracted unchanged from useWolfSummary's memo so it can be unit
 * tested, plus an optional cut to a round's last played hole (rounds ended
 * early).
 */

import type {
  WolfDecisionWithDetails,
  WolfGameSummary,
  WolfGameWithParticipants,
  WolfPayoutWithPlayer,
} from '@/types/database/wolf.types';
import { calculateWolfPayouts } from './payouts';
import {
  calculateWolfStandings,
  filterDecisionsThroughHole,
  getSortedStandings,
} from './standings';

export function buildWolfGameSummary(
  game: WolfGameWithParticipants,
  allDecisions: WolfDecisionWithDetails[],
  payouts: WolfPayoutWithPlayer[],
  lastHoleNumber: number | null = null
): WolfGameSummary {
  const decisions = filterDecisionsThroughHole(allDecisions, lastHoleNumber);

  // Create player name map
  const playerNames: Record<string, string> = {};
  for (const participant of game.participants) {
    playerNames[participant.id] = participant.name;
  }

  // Calculate standings
  const standingsMap = calculateWolfStandings(decisions, game.participant_ids);
  const standings = getSortedStandings(standingsMap, playerNames);

  // Calculate net_result for each standing entry when pot is enabled
  if (game.pot_enabled && game.pot_value_per_point) {
    const payoutCalcs = calculateWolfPayouts(standingsMap, game.pot_value_per_point);
    for (const entry of standings) {
      entry.net_result = payoutCalcs[entry.player_id]?.netResult ?? 0;
    }
  }

  // Count completed holes (have calculated_at) and decided holes
  const holesCompleted = decisions.filter((d) => d.calculated_at !== null).length;
  const holesDecided = decisions.filter((d) => d.decided_at !== null).length;

  return {
    game,
    decisions,
    payouts,
    standings,
    holes_completed: holesCompleted,
    holes_decided: holesDecided,
  };
}

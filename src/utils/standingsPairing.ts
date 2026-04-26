/**
 * Standings-Driven Pairing
 *
 * Converts an ordered list of player IDs (already sorted by competition
 * standings rank — seed 1 first) into 1v1 match-play pairings. Used when a
 * round has `pairing_source = 'current_standings'`.
 *
 * Two styles, mirroring the bracket vocabulary:
 *   - 'standard' — (1,N), (2,N-1), … — top seed plays bottom seed.
 *   - 'adjacent' — (1,2), (3,4), … — closely-matched seeds.
 *
 * Distinct from `bracketGeneration.ts` which produces seeded *bracket trees*
 * for knockout play (and is therefore restricted to 4/8/16/32 player counts to
 * preserve bracket invariants). These functions only emit *first-round*
 * pairings for a single round, so they work for any even count.
 *
 * Throws on odd counts and uneven cross-team rosters — callers (the round
 * wizard) pre-validate before submit so the error surfaces in the UI.
 */

import type { BracketSeedingStyle } from '@/types/database/enums';

export type StandingsPairingStyle = BracketSeedingStyle;

/** A 1v1 pairing emitted by these helpers. Order is (higher seed, lower seed). */
export type StandingsPair = [string, string];

/**
 * Pair an ordered list of player IDs into 1v1 matches.
 *
 * Standard:  [seed1 vs seedN], [seed2 vs seedN-1], …
 * Adjacent:  [seed1 vs seed2], [seed3 vs seed4], …
 *
 * @param orderedPlayerIds  Player IDs in standings rank order (rank 1 first).
 * @param style             'standard' or 'adjacent'.
 * @returns                 Array of [playerA, playerB] pairs.
 * @throws                  Error when the count is odd or below 2 — match play
 *                          needs an even number of players, and the wizard is
 *                          expected to surface the error before this is called.
 */
export function pairFromStandings(
  orderedPlayerIds: string[],
  style: StandingsPairingStyle
): StandingsPair[] {
  if (orderedPlayerIds.length < 2) {
    throw new Error(
      `pairFromStandings requires at least 2 players (got ${orderedPlayerIds.length})`
    );
  }
  if (orderedPlayerIds.length % 2 !== 0) {
    throw new Error(
      `pairFromStandings requires an even number of players (got ${orderedPlayerIds.length})`
    );
  }

  const pairs: StandingsPair[] = [];

  if (style === 'standard') {
    let high = 0;
    let low = orderedPlayerIds.length - 1;
    while (high < low) {
      pairs.push([orderedPlayerIds[high], orderedPlayerIds[low]]);
      high += 1;
      low -= 1;
    }
  } else {
    for (let i = 0; i < orderedPlayerIds.length; i += 2) {
      pairs.push([orderedPlayerIds[i], orderedPlayerIds[i + 1]]);
    }
  }

  return pairs;
}

/**
 * Pair two team rosters cross-team using their per-team standings rank.
 *
 * Standard:  teamA[0] vs teamB[N-1], teamA[1] vs teamB[N-2], …  (top vs bottom)
 * Adjacent:  teamA[0] vs teamB[0],   teamA[1] vs teamB[1],   …  (rank vs rank)
 *
 * Used for `ryder_cup_singles` (1v1 sub-matches between two teams). The result
 * is one pair per slot — caller is expected to write these as sub-matches.
 *
 * @throws Error when the team rosters are not the same size — the wizard
 *         pre-validates so the error surfaces in the UI.
 */
export function pairCrossTeamFromStandings(
  teamAOrdered: string[],
  teamBOrdered: string[],
  style: StandingsPairingStyle
): StandingsPair[] {
  if (teamAOrdered.length === 0 || teamBOrdered.length === 0) {
    throw new Error('pairCrossTeamFromStandings requires both teams to have players');
  }
  if (teamAOrdered.length !== teamBOrdered.length) {
    throw new Error(
      `pairCrossTeamFromStandings requires teams of equal size (got ${teamAOrdered.length} vs ${teamBOrdered.length})`
    );
  }

  const pairs: StandingsPair[] = [];
  const n = teamAOrdered.length;

  if (style === 'standard') {
    for (let i = 0; i < n; i++) {
      pairs.push([teamAOrdered[i], teamBOrdered[n - 1 - i]]);
    }
  } else {
    for (let i = 0; i < n; i++) {
      pairs.push([teamAOrdered[i], teamBOrdered[i]]);
    }
  }

  return pairs;
}

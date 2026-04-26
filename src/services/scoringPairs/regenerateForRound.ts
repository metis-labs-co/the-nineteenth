/**
 * Regenerate Scoring Pairs For A Round
 *
 * Realigns marker (scoring-pair) assignments after the round's pairings
 * change. Used by:
 *   1. The Groups-tab Shuffle action in `SubMatchesTab` — pairings are
 *      regenerated, scoring pairs need to follow the new tee-group bounds.
 *   2. The `EditPairingConfigSheet` re-seed save flow — same need: a fresh
 *      pairing list invalidates the existing marker assignments.
 *
 * Strategy preference (matches the legacy SubMatchesTab inline block):
 *   1. Group-aware reciprocal pairs when we have both fresh tee groups AND
 *      team membership — every pair stays within a tee group, cross-team
 *      pairs preferred.
 *   2. Cross-team match-play pairs when no group context but it's a team
 *      round with two team rosters (e.g. team match play with 4 players).
 *   3. Auto-generate (reciprocal for even, circular for odd) over the flat
 *      player list as the last resort.
 *
 * Failure semantics: this function is intentionally **non-blocking** — the
 * caller is expected to wrap the call in try/catch and log a warning. A
 * failed regen never undoes the upstream pairing change.
 */

import {
  autoGenerateAndSaveScoringPairs,
  createScoringPairs,
  generateTeamMatchPlayPairs,
} from '@/services/scoringPairs';
import { generateGroupAwareScoringPairs } from '@/utils/scoringPairs/generation';

export interface RegenerateScoringPairsTeamPlayer {
  id: string;
  name: string;
  handicap: number | null;
}

export interface RegenerateScoringPairsTeam {
  /** Display name only — used to bucket players for the cross-team pass. */
  name: string;
  players: RegenerateScoringPairsTeamPlayer[];
}

export interface RegenerateScoringPairsForRoundInput {
  roundId: string;
  /** True when the round uses any team format. Drives the cross-team
   *  fallback when group context is missing. */
  isTeamRound: boolean;
  /** Team rosters (with players resolved to id+name+handicap). Empty array
   *  is fine — the function will fall through to the autogen branch. */
  teamsWithMembers: RegenerateScoringPairsTeam[];
  /** Fresh pairing groups, in player-id form. Pass empty when there are no
   *  pairings (e.g. a brand-new round); the function will fall back to
   *  team or autogen pairing. */
  pairings: { playerIds: string[] }[];
  /** All players in the round. Used by the autogen fallback when neither
   *  group context nor team rosters are available. */
  players: { id: string }[];
  /** Optional log prefix so the caller's identity shows up in console
   *  warnings. Defaults to 'regenerateScoringPairsForRound'. */
  logTag?: string;
}

export async function regenerateScoringPairsForRound(
  input: RegenerateScoringPairsForRoundInput
): Promise<void> {
  const {
    roundId,
    isTeamRound,
    teamsWithMembers,
    pairings,
    players,
    logTag = 'regenerateScoringPairsForRound',
  } = input;

  const teamByPlayerId = new Map<string, string>();
  teamsWithMembers.forEach((t) => {
    t.players.forEach((p) => {
      teamByPlayerId.set(p.id, t.name);
    });
  });

  const hasGroupContext = pairings.length > 0 && teamByPlayerId.size > 0;

  if (hasGroupContext) {
    const result = generateGroupAwareScoringPairs(pairings, teamByPlayerId);
    if (result.warnings.length > 0) {
      console.info(`[${logTag}] Group-aware pairs warnings`, result.warnings);
    }
    if (result.pairs.length > 0) {
      await createScoringPairs(roundId, result.pairs);
    }
    return;
  }

  // No group context — fall back to the cross-team or flat autogen path
  // depending on whether team rosters are available.
  const teamA = teamsWithMembers[0]?.players ?? [];
  const teamB = teamsWithMembers[1]?.players ?? [];
  if (isTeamRound && teamA.length > 0 && teamB.length > 0) {
    await generateTeamMatchPlayPairs(
      roundId,
      teamA.map((p) => ({ id: p.id })),
      teamB.map((p) => ({ id: p.id }))
    );
    return;
  }

  if (players.length >= 2) {
    await autoGenerateAndSaveScoringPairs(
      roundId,
      players.map((p) => ({ id: p.id }))
    );
  }
}

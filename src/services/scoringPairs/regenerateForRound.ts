/**
 * Regenerate Scoring Pairs For A Round
 *
 * Realigns marker (scoring-pair) assignments after the round's pairings
 * change. Used by:
 *   1. The Groups-tab Shuffle action in `SubMatchesTab` — pairings are
 *      regenerated, scoring pairs need to follow the new tee-group bounds.
 *   2. The `EditPairingConfigSheet` re-seed save flow — same need: a fresh
 *      pairing list invalidates the existing marker assignments.
 *   3. The split-round sub-match generator — sub-matches define an even
 *      stricter "who's playing whom" boundary than tee groups.
 *
 * Strategy preference (highest priority first):
 *   1. **Sub-match aware** when sub-matches exist. Each sub-match becomes
 *      its own bucket: cross-team reciprocal pairs are generated between
 *      the sub-match's `team_a_player_ids` and `team_b_player_ids`. This
 *      guarantees the scorer is in the same head-to-head as the player
 *      they're marking — exactly what split team rounds (e.g. 2v2 better
 *      ball) require.
 *   2. Group-aware reciprocal pairs when we have both fresh tee groups AND
 *      team membership — every pair stays within a tee group, cross-team
 *      pairs preferred.
 *   3. Cross-team match-play pairs when no group context but it's a team
 *      round with two team rosters (e.g. team match play with 4 players).
 *   4. Auto-generate (reciprocal for even, circular for odd) over the flat
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
import { listSubMatchesForRound } from '@/services/subMatches';
import {
  generateCrossTeamPairs,
  generateGroupAwareScoringPairs,
} from '@/utils/scoringPairs/generation';
import type { ScoringPairCreateInput } from '@/types';

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

/**
 * One sub-match passed to the sub-match-aware generator. Mirrors the
 * shape of `SubMatch` rows but only carries the fields we need so callers
 * outside the rounds layer don't have to import the full DB type.
 */
export interface RegenerateScoringPairsSubMatch {
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
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
  /** Sub-matches for split team rounds. When non-empty, each sub-match is
   *  used as the bucket for cross-team reciprocal pairs — overriding the
   *  pairing/group strategy below. Pass `[]` to explicitly skip the
   *  sub-match path; omit (`undefined`) to let the helper fetch the
   *  current set from the database (covers callers that just wrote new
   *  sub-matches and don't have them in hand). */
  subMatches?: RegenerateScoringPairsSubMatch[];
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
    subMatches,
    players,
    logTag = 'regenerateScoringPairsForRound',
  } = input;

  const teamByPlayerId = new Map<string, string>();
  teamsWithMembers.forEach((t) => {
    t.players.forEach((p) => {
      teamByPlayerId.set(p.id, t.name);
    });
  });

  // Resolve sub-matches: caller-provided wins, otherwise fetch fresh from
  // the DB so post-write callers (e.g. EditPairingConfigSheet after a
  // re-seed) automatically pick up sub-matches they just created. A `[]`
  // explicitly opts out of the fetch.
  let resolvedSubMatches: RegenerateScoringPairsSubMatch[] = subMatches ?? [];
  if (subMatches === undefined) {
    try {
      const rows = await listSubMatchesForRound(roundId);
      resolvedSubMatches = rows.map((r) => ({
        teamAPlayerIds: r.team_a_player_ids,
        teamBPlayerIds: r.team_b_player_ids,
      }));
    } catch (err) {
      console.warn(
        `[${logTag}] Sub-match fetch failed; falling through to group/team strategies`,
        err
      );
      resolvedSubMatches = [];
    }
  }

  // Sub-match-aware generation. Each sub-match becomes its own bucket and
  // we generate reciprocal cross-team pairs inside it (A1↔B1, A2↔B2, …).
  // For uneven sub-match sides we wrap, mirroring the team-match-play
  // semantics — the smaller side's player marks two opponents rather than
  // leaving one unmarked.
  const usableSubMatches = resolvedSubMatches.filter(
    (sm) => sm.teamAPlayerIds.length > 0 && sm.teamBPlayerIds.length > 0
  );

  if (usableSubMatches.length > 0) {
    const allPairs: ScoringPairCreateInput[] = [];
    for (const sm of usableSubMatches) {
      const teamA = sm.teamAPlayerIds.map((id) => ({ id }));
      const teamB = sm.teamBPlayerIds.map((id) => ({ id }));
      const result = generateCrossTeamPairs(teamA, teamB, 'wrap');
      allPairs.push(...result.pairs);
    }
    if (allPairs.length > 0) {
      await createScoringPairs(roundId, allPairs);
    } else {
      console.info(
        `[${logTag}] Sub-match generator produced no pairs (all sub-matches empty)`
      );
    }
    return;
  }

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

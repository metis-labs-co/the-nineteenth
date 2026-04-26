/**
 * Re-seed Round Pairings From Current Standings
 *
 * Shared "fetch standings → write pairings/sub_matches" pipeline used by:
 *   1. The AddRoundScreen wizard at create time, when the organiser picks
 *      pairing_source = 'current_standings' (see useAddRoundForm.ts).
 *   2. The EditPairingConfigSheet at edit time, when the organiser flips a
 *      knob and re-seeds an existing round.
 *
 * Both sites need exactly the same algorithm — fetch the current cumulative
 * leaderboard, then either write a flat list of `pairings` (individual
 * presets) or sub_matches with cross-team pairings (split presets like
 * `ryder_cup_singles`). Lifting it here keeps the two paths in lockstep.
 */

import { generateSubMatches, calculateTeeTime } from '@/utils/pairingAlgorithm';
import type { PairingPlayer } from '@/types';
import {
  pairFromStandings,
  pairCrossTeamFromStandings,
} from '@/utils/standingsPairing';
import { getCurrentCompetitionStandings } from '@/services/api/knockout';
import { replacePairings } from '@/services/pairings';
import { replaceSubMatches } from '@/services/subMatches';
import type {
  BracketSeedingStyle,
  QualifyingMetric,
} from '@/types/database/enums';
import type { TeamWithMembers } from '@/types/database.types';
import type { RoundPresetConfig } from '@/constants/roundPresets';

const DEFAULT_SUB_MATCH_INTERVAL_MINUTES = 8;

export interface ReseedRoundPairingsInput {
  roundId: string;
  competitionId: string;
  /** The new round's number — standings are aggregated from rounds with
   *  `round_number < this`. */
  roundNumber: number;
  /** Six-field config from the round's preset. Drives the split vs combined
   *  branch and the cross-team cardinality (sub_match_size). */
  presetConfig: Pick<RoundPresetConfig, 'round_format' | 'sub_match_size'>;
  pairingStyle: BracketSeedingStyle;
  pairingMetric: QualifyingMetric;
  /** Round-level tee time (HH:MM:SS or HH:MM). Falls back to '07:00' for
   *  sub-match staggering when null. */
  teeTime: string | null;
  /** Required when `presetConfig.round_format === 'split'` — the two team
   *  rosters that are squaring off. The wizard already passes these from
   *  `useTeams(competitionId)`. */
  teams?: TeamWithMembers[];
  /** Already-fetched standings, in seed order. When provided, the helper
   *  skips its own fetch — used by the AddRoundScreen wizard which
   *  pre-validates standings *before* inserting the round so an empty
   *  result aborts before we orphan a row. */
  preFetchedStandings?: { id: string }[];
}

/**
 * Map team-member rows into the PairingPlayer shape expected by
 * `generateSubMatches`. Mirrors the helper in `useAddRoundForm.ts` /
 * `RoundTypeSheet`.
 */
function teamMembersToPairingPlayers(
  members: TeamWithMembers['members']
): PairingPlayer[] {
  return (members ?? [])
    .filter((m) => m.player_id)
    .map((m) => ({
      id: m.player_id,
      name: m.player?.name ?? 'Unknown',
      handicap: m.player?.handicap ?? null,
      handicapIndex: m.player?.handicap_index ?? null,
      gender: m.player?.gender ?? null,
      photoUrl: m.player?.photo_url ?? null,
    }));
}

/**
 * Run the full standings-driven pairing pipeline against an already-existing
 * round row. Throws when standings are empty (no completed prior rounds) so
 * callers can surface the error before silently producing an empty pairing
 * set; the wording matches what the wizard surfaces.
 *
 * Side effects:
 *  - Replaces all existing `pairings` rows for the round (split: false), or
 *    all `sub_matches` rows (split: true). Existing rows are deleted first.
 *  - Does NOT mutate the round's pairing_source / pairing_style / pairing_metric
 *    columns — that's the caller's responsibility (saved separately via
 *    `updateRound`).
 *  - Does NOT regenerate scoring pairs. Use `regenerateScoringPairsForRound`
 *    afterward if the caller wants marker assignments to follow the new
 *    groupings (the SubMatchesTab shuffle path does this; the sheet should
 *    too).
 */
export async function reseedRoundPairings(
  input: ReseedRoundPairingsInput
): Promise<void> {
  const {
    roundId,
    competitionId,
    roundNumber,
    presetConfig,
    pairingStyle,
    pairingMetric,
    teeTime,
    teams,
    preFetchedStandings,
  } = input;

  let standingsOrder: string[];
  if (preFetchedStandings && preFetchedStandings.length > 0) {
    standingsOrder = preFetchedStandings.map((s) => s.id);
  } else {
    const standings = await getCurrentCompetitionStandings(
      competitionId,
      roundNumber,
      pairingMetric
    );
    if (standings.length === 0) {
      throw new Error(
        'Standings-based pairing needs at least one completed prior round in this competition.'
      );
    }
    standingsOrder = standings.map((s) => s.id);
  }

  const isSplit = presetConfig.round_format === 'split';
  const subMatchSize = presetConfig.sub_match_size ?? 1;
  const startTime = (teeTime || '07:00').substring(0, 5);
  const hasTeams = !!teams && teams.length >= 2;

  if (!isSplit) {
    // Combined-format match-play presets — one `pairings` row per pair.
    // pairFromStandings throws on odd counts; the sheet/wizard catches
    // this in their validation pass.
    const matchups = pairFromStandings(standingsOrder, pairingStyle);
    await replacePairings(
      roundId,
      matchups.map(([a, b], slotIndex) => ({
        playerIds: [a, b],
        teeTime: teeTime || null,
        slotIndex,
      }))
    );
    return;
  }

  // Split presets — write `sub_matches` rows. Two shapes:
  //   1. Team split (ryder_cup_singles + future): teams supplied; pair cross-team.
  //   2. Singles split (individual_match_play with split format): no teams; pair
  //      directly from a flat standings list, one player per side.
  //
  // For sub_match_size === 1 we honour pairingStyle exactly — `standard` does
  // top-vs-bottom, `adjacent` does rank-vs-rank. Larger sub_match_size buckets
  // multiple players per side and falls back to the existing `generateSubMatches`
  // bucket-by-rank algorithm (which always behaves like 'adjacent'); pairingStyle
  // is currently a no-op for >1.
  if (!hasTeams) {
    // Singles split — each sub_match is a 1v1 pair, no team affiliation.
    if (subMatchSize !== 1) {
      throw new Error(
        `Singles split presets require sub_match_size === 1 (got ${subMatchSize})`
      );
    }
    const matchups = pairFromStandings(standingsOrder, pairingStyle);
    await replaceSubMatches({
      roundId,
      subMatches: matchups.map(([a, b], sortOrder) => ({
        sortOrder,
        teamAPlayerIds: [a],
        teamBPlayerIds: [b],
        teeTime: calculateTeeTime(startTime, DEFAULT_SUB_MATCH_INTERVAL_MINUTES, sortOrder),
        pairingId: null,
      })),
    });
    return;
  }

  // Team split path — both teams supplied. teams is guaranteed non-empty here.
  const teamAIds = teams![0].members
    .map((m) => m.player_id)
    .filter((id): id is string => Boolean(id));
  const teamBIds = teams![1].members
    .map((m) => m.player_id)
    .filter((id): id is string => Boolean(id));
  const teamASet = new Set(teamAIds);
  const teamBSet = new Set(teamBIds);
  const orderedA = standingsOrder.filter((id) => teamASet.has(id));
  const orderedB = standingsOrder.filter((id) => teamBSet.has(id));
  const haveFullOrderA = orderedA.length === teamAIds.length;
  const haveFullOrderB = orderedB.length === teamBIds.length;

  // For 1v1 cross-team matches we honour pairingStyle precisely — call the
  // dedicated helper rather than relying on generateSubMatches' implicit
  // rank-vs-rank zip, which silently treats 'standard' the same as 'adjacent'.
  if (subMatchSize === 1 && haveFullOrderA && haveFullOrderB) {
    const pairs = pairCrossTeamFromStandings(orderedA, orderedB, pairingStyle);
    await replaceSubMatches({
      roundId,
      subMatches: pairs.map(([a, b], sortOrder) => ({
        sortOrder,
        teamAPlayerIds: [a],
        teamBPlayerIds: [b],
        teeTime: calculateTeeTime(startTime, DEFAULT_SUB_MATCH_INTERVAL_MINUTES, sortOrder),
        pairingId: null,
      })),
    });
    return;
  }

  // Larger buckets (sub_match_size > 1) or partial-roster fallback — defer to
  // the existing snake-draft / pre-ordered bucket algorithm. pairingStyle is a
  // no-op here; it'd take a bucketed cross-team matcher to apply it cleanly.
  const result = generateSubMatches({
    teamAPlayers: teamMembersToPairingPlayers(teams![0].members),
    teamBPlayers: teamMembersToPairingPlayers(teams![1].members),
    subMatchSize,
    startTime,
    intervalMinutes: DEFAULT_SUB_MATCH_INTERVAL_MINUTES,
    preOrderedTeamA: haveFullOrderA ? orderedA : undefined,
    preOrderedTeamB: haveFullOrderB ? orderedB : undefined,
  });

  await replaceSubMatches({
    roundId,
    subMatches: result.subMatches.map((sm) => ({
      sortOrder: sm.sortOrder,
      teamAPlayerIds: sm.teamAPlayerIds,
      teamBPlayerIds: sm.teamBPlayerIds,
      teeTime: sm.teeTime,
      pairingId: null,
    })),
  });
}

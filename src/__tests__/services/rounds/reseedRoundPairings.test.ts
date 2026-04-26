/**
 * reseedRoundPairings — unit tests
 *
 * The helper is a thin orchestrator: fetch standings, then dispatch to
 * either `replacePairings` (combined presets) or `replaceSubMatches` (split
 * presets). Tests focus on:
 *   - Correct branch selection by `presetConfig.round_format`.
 *   - Empty-standings throws with the wizard-matching wording.
 *   - `preFetchedStandings` skips the fetch.
 *   - Split-preset filters standings by team membership before pairing.
 */

import { reseedRoundPairings } from '@/services/rounds/reseedRoundPairings';
import * as standingsApi from '@/services/api/knockout';
import * as pairingsService from '@/services/pairings';
import * as subMatchesService from '@/services/subMatches';
import type { TeamWithMembers } from '@/types/database.types';

jest.mock('@/services/api/knockout');
jest.mock('@/services/pairings');
jest.mock('@/services/subMatches');

const mockedGetStandings = standingsApi.getCurrentCompetitionStandings as jest.Mock;
const mockedReplacePairings = pairingsService.replacePairings as jest.Mock;
const mockedReplaceSubMatches = subMatchesService.replaceSubMatches as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedReplacePairings.mockResolvedValue([]);
  mockedReplaceSubMatches.mockResolvedValue([]);
});

describe('reseedRoundPairings — combined (individual) presets', () => {
  it('fetches standings, then writes 1v1 pairings via replacePairings', async () => {
    mockedGetStandings.mockResolvedValue([
      { id: 'p1', name: 'P1', handicap: 5 },
      { id: 'p2', name: 'P2', handicap: 10 },
      { id: 'p3', name: 'P3', handicap: 15 },
      { id: 'p4', name: 'P4', handicap: 20 },
    ]);

    await reseedRoundPairings({
      roundId: 'round-1',
      competitionId: 'comp-1',
      roundNumber: 2,
      presetConfig: { round_format: 'combined', sub_match_size: null },
      pairingStyle: 'standard',
      pairingMetric: 'competition_points',
      teeTime: '08:00:00',
    });

    expect(mockedGetStandings).toHaveBeenCalledWith(
      'comp-1',
      2,
      'competition_points'
    );
    expect(mockedReplacePairings).toHaveBeenCalledTimes(1);
    expect(mockedReplaceSubMatches).not.toHaveBeenCalled();

    const [roundIdArg, groupsArg] = mockedReplacePairings.mock.calls[0];
    expect(roundIdArg).toBe('round-1');
    expect(groupsArg).toEqual([
      { playerIds: ['p1', 'p4'], teeTime: '08:00:00', slotIndex: 0 },
      { playerIds: ['p2', 'p3'], teeTime: '08:00:00', slotIndex: 1 },
    ]);
  });

  it('emits adjacent pairings when style is adjacent', async () => {
    mockedGetStandings.mockResolvedValue([
      { id: 'p1', name: 'P1', handicap: 5 },
      { id: 'p2', name: 'P2', handicap: 10 },
      { id: 'p3', name: 'P3', handicap: 15 },
      { id: 'p4', name: 'P4', handicap: 20 },
    ]);

    await reseedRoundPairings({
      roundId: 'round-1',
      competitionId: 'comp-1',
      roundNumber: 2,
      presetConfig: { round_format: 'combined', sub_match_size: null },
      pairingStyle: 'adjacent',
      pairingMetric: 'stableford_points',
      teeTime: null,
    });

    const [, groupsArg] = mockedReplacePairings.mock.calls[0];
    expect(groupsArg).toEqual([
      { playerIds: ['p1', 'p2'], teeTime: null, slotIndex: 0 },
      { playerIds: ['p3', 'p4'], teeTime: null, slotIndex: 1 },
    ]);
  });

  it('throws when standings are empty (no completed prior rounds)', async () => {
    mockedGetStandings.mockResolvedValue([]);

    await expect(
      reseedRoundPairings({
        roundId: 'round-1',
        competitionId: 'comp-1',
        roundNumber: 1,
        presetConfig: { round_format: 'combined', sub_match_size: null },
        pairingStyle: 'standard',
        pairingMetric: 'competition_points',
        teeTime: null,
      })
    ).rejects.toThrow(/at least one completed prior round/);

    expect(mockedReplacePairings).not.toHaveBeenCalled();
    expect(mockedReplaceSubMatches).not.toHaveBeenCalled();
  });

  it('skips the fetch when preFetchedStandings is provided', async () => {
    await reseedRoundPairings({
      roundId: 'round-1',
      competitionId: 'comp-1',
      roundNumber: 2,
      presetConfig: { round_format: 'combined', sub_match_size: null },
      pairingStyle: 'standard',
      pairingMetric: 'competition_points',
      teeTime: '08:00:00',
      preFetchedStandings: [
        { id: 'p1' },
        { id: 'p2' },
        { id: 'p3' },
        { id: 'p4' },
      ],
    });

    expect(mockedGetStandings).not.toHaveBeenCalled();
    const [, groupsArg] = mockedReplacePairings.mock.calls[0];
    expect(groupsArg).toEqual([
      { playerIds: ['p1', 'p4'], teeTime: '08:00:00', slotIndex: 0 },
      { playerIds: ['p2', 'p3'], teeTime: '08:00:00', slotIndex: 1 },
    ]);
  });
});

describe('reseedRoundPairings — split (sub-matches) presets', () => {
  function buildTeams(): TeamWithMembers[] {
    return [
      {
        id: 'team-a',
        competition_id: 'comp-1',
        round_id: null,
        name: 'Team A',
        color: null,
        created_at: '',
        updated_at: '',
        members: [
          { id: 'm1', team_id: 'team-a', player_id: 'a1', created_at: '', player: { id: 'a1', name: 'A1', handicap: 5 } } as any,
          { id: 'm2', team_id: 'team-a', player_id: 'a2', created_at: '', player: { id: 'a2', name: 'A2', handicap: 10 } } as any,
        ],
      } as TeamWithMembers,
      {
        id: 'team-b',
        competition_id: 'comp-1',
        round_id: null,
        name: 'Team B',
        color: null,
        created_at: '',
        updated_at: '',
        members: [
          { id: 'm3', team_id: 'team-b', player_id: 'b1', created_at: '', player: { id: 'b1', name: 'B1', handicap: 6 } } as any,
          { id: 'm4', team_id: 'team-b', player_id: 'b2', created_at: '', player: { id: 'b2', name: 'B2', handicap: 12 } } as any,
        ],
      } as TeamWithMembers,
    ];
  }

  it('writes sub_matches via replaceSubMatches in the standings-derived per-team order', async () => {
    // Standings interleaves teams; per-team rank derived from filter:
    //   A=[a1, a2], B=[b1, b2]
    // generateSubMatches with preOrderedTeam{A,B} buckets in slots of
    // sub_match_size and then pairs slot i of A vs slot i of B (rank vs
    // rank). The `pairingStyle` knob only affects standings ordering, not
    // the cross-team pairing for split presets — same behaviour as the
    // wizard pre-refactor.
    mockedGetStandings.mockResolvedValue([
      { id: 'a1', name: 'A1', handicap: 5 },
      { id: 'b1', name: 'B1', handicap: 6 },
      { id: 'a2', name: 'A2', handicap: 10 },
      { id: 'b2', name: 'B2', handicap: 12 },
    ]);

    await reseedRoundPairings({
      roundId: 'round-1',
      competitionId: 'comp-1',
      roundNumber: 2,
      presetConfig: { round_format: 'split', sub_match_size: 1 },
      pairingStyle: 'standard',
      pairingMetric: 'competition_points',
      teeTime: '08:00:00',
      teams: buildTeams(),
    });

    expect(mockedReplaceSubMatches).toHaveBeenCalledTimes(1);
    expect(mockedReplacePairings).not.toHaveBeenCalled();

    const [{ subMatches }] = mockedReplaceSubMatches.mock.calls[0];
    expect(subMatches).toHaveLength(2);
    expect(subMatches[0].teamAPlayerIds).toEqual(['a1']);
    expect(subMatches[0].teamBPlayerIds).toEqual(['b1']);
    expect(subMatches[1].teamAPlayerIds).toEqual(['a2']);
    expect(subMatches[1].teamBPlayerIds).toEqual(['b2']);
  });

  it('throws when split presets are missing team rosters', async () => {
    mockedGetStandings.mockResolvedValue([
      { id: 'a1', name: 'A1', handicap: 5 },
      { id: 'b1', name: 'B1', handicap: 6 },
    ]);

    await expect(
      reseedRoundPairings({
        roundId: 'round-1',
        competitionId: 'comp-1',
        roundNumber: 2,
        presetConfig: { round_format: 'split', sub_match_size: 1 },
        pairingStyle: 'standard',
        pairingMetric: 'competition_points',
        teeTime: null,
        // teams omitted on purpose
      })
    ).rejects.toThrow(/both team rosters/);

    expect(mockedReplaceSubMatches).not.toHaveBeenCalled();
  });
});

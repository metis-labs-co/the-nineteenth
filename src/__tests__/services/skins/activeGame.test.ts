/**
 * Unit tests for the shared skins active-game helpers.
 */

import {
  fetchActiveSkinsGame,
  resolveSkinsParticipants,
} from '@/services/skins/activeGame';
import type { SkinsGame } from '@/types/database/skins.types';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const mockFetchPlayerList = jest.fn();
jest.mock('@/services/api/players', () => ({
  fetchPlayerListByIds: (...args: unknown[]) => mockFetchPlayerList(...args),
}));

jest.mock('@/services/errors', () => ({
  createError: (message: string) => new Error(message),
}));

/** Chainable builder whose terminal `maybeSingle()` resolves `result`. */
function mockActiveGameQuery(result: { data: unknown; error: unknown }) {
  const builder: Record<string, jest.Mock> = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.limit = jest.fn(() => builder);
  builder.maybeSingle = jest.fn(() => Promise.resolve(result));
  mockFrom.mockReturnValue(builder);
  return builder;
}

describe('fetchActiveSkinsGame', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('scopes the query to round_id + active status', async () => {
    const builder = mockActiveGameQuery({ data: null, error: null });
    await fetchActiveSkinsGame({ roundId: 'r1' });
    expect(mockFrom).toHaveBeenCalledWith('skins_games');
    expect(builder.eq).toHaveBeenCalledWith('round_id', 'r1');
    expect(builder.eq).toHaveBeenCalledWith('status', 'active');
  });

  it('scopes the query to sub_match_id when given a sub-match', async () => {
    const builder = mockActiveGameQuery({ data: null, error: null });
    await fetchActiveSkinsGame({ subMatchId: 'sm1' });
    expect(builder.eq).toHaveBeenCalledWith('sub_match_id', 'sm1');
  });

  it('returns the game when found', async () => {
    const game = { id: 'g1', is_team_skins: false } as unknown as SkinsGame;
    mockActiveGameQuery({ data: game, error: null });
    expect(await fetchActiveSkinsGame({ roundId: 'r1' })).toBe(game);
  });

  it('returns null when no active game exists', async () => {
    mockActiveGameQuery({ data: null, error: null });
    expect(await fetchActiveSkinsGame({ roundId: 'r1' })).toBeNull();
  });

  it('throws on a query error', async () => {
    mockActiveGameQuery({ data: null, error: { message: 'boom' } });
    await expect(fetchActiveSkinsGame({ roundId: 'r1' })).rejects.toThrow(
      /Failed to fetch active skins game: boom/
    );
  });
});

describe('resolveSkinsParticipants', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockFetchPlayerList.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('resolves individual participants via fetchPlayerListByIds', async () => {
    const game = {
      id: 'g1',
      is_team_skins: false,
      participant_ids: ['p1', 'p2'],
      participant_team_ids: null,
    } as unknown as SkinsGame;
    mockFetchPlayerList.mockResolvedValue([
      { id: 'p1', name: 'Ann', handicap: 5 },
      { id: 'p2', name: 'Bob', handicap: 2 },
    ]);

    const result = await resolveSkinsParticipants(game);
    expect(mockFetchPlayerList).toHaveBeenCalledWith(['p1', 'p2']);
    expect(result).toMatchObject({
      id: 'g1',
      participants: [
        { id: 'p1', name: 'Ann', handicap: 5 },
        { id: 'p2', name: 'Bob', handicap: 2 },
      ],
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('resolves team participants with members, defaulting missing names', async () => {
    const game = {
      id: 'g1',
      is_team_skins: true,
      participant_ids: [],
      participant_team_ids: ['t1'],
    } as unknown as SkinsGame;
    const inFn = jest.fn().mockResolvedValue({
      data: [
        {
          id: 't1',
          name: 'Eagles',
          team_members: [
            { player_id: 'p1', players: { id: 'p1', name: 'Ann', handicap: 5 } },
            { player_id: 'p2', players: null }, // missing player row
          ],
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue({ select: jest.fn(() => ({ in: inFn })) });

    const result = (await resolveSkinsParticipants(game)) as {
      teams: { id: string; name: string; members: unknown[] }[];
      participants: unknown[];
    };

    expect(mockFrom).toHaveBeenCalledWith('teams');
    expect(result.participants).toEqual([]);
    expect(result.teams).toEqual([
      {
        id: 't1',
        name: 'Eagles',
        members: [
          { id: 'p1', name: 'Ann', handicap: 5 },
          { id: 'p2', name: 'Unknown', handicap: null },
        ],
      },
    ]);
    expect(mockFetchPlayerList).not.toHaveBeenCalled();
  });

  it('logs and yields empty teams when the team fetch errors', async () => {
    const game = {
      id: 'g1',
      is_team_skins: true,
      participant_ids: [],
      participant_team_ids: ['t1'],
    } as unknown as SkinsGame;
    const inFn = jest.fn().mockResolvedValue({ data: null, error: { message: 'nope' } });
    mockFrom.mockReturnValue({ select: jest.fn(() => ({ in: inFn })) });

    const result = (await resolveSkinsParticipants(game)) as { teams: unknown[] };
    expect(result.teams).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });
});

import { addPlayerToRound, removePlayerFromRound, RoundRosterError, rowToPlayer } from './roundRoster';
import { supabase } from '@/services/supabase/client';
import { useScorecardStore } from '@/store/scorecardStore';
import { cancelPendingScorecardSync, debouncedQueueScorecardSync } from '@/store/scorecardSyncDebounce';
import { removePendingSyncByEntityKey } from '@/services/offline/database';

jest.mock('@/services/supabase/client', () => ({ supabase: { rpc: jest.fn(), from: jest.fn() } }));
jest.mock('@/store/scorecardSyncDebounce', () => ({
  cancelPendingScorecardSync: jest.fn(), debouncedQueueScorecardSync: jest.fn(),
}));
jest.mock('@/services/offline/database', () => ({ removePendingSyncByEntityKey: jest.fn() }));
jest.mock('@/services/rounds/roundScoringCoordinator', () => ({
  withRoundScoringWrite: (_id: string, op: () => Promise<unknown>) => op(),
}));
jest.mock('@/store/scorecardStore', () => {
  const state = {
    groupScorecards: new Map([['p2', { id: 'card-p2' }]]),
    ensureTeamMemberScorecards: jest.fn(),
    removePlayerFromRound: jest.fn(),
  };
  return { useScorecardStore: { getState: () => state } };
});

const rpc = supabase.rpc as jest.Mock;
const from = supabase.from as jest.Mock;

function mockRoster(players: { id: string; name: string }[]) {
  from.mockImplementation((table: string) => ({
    select: () => ({
      eq: () =>
        table === 'rounds'
          ? { maybeSingle: async () => ({ data: { id: 'r1', user_id: 'owner', deleted_at: null }, error: null }) }
          : Promise.resolve({
              data: players.map((p) => ({ player_id: p.id, players: { ...p, handicap: 10, handicap_index: null, gender: null } })),
              error: null,
            }),
    }),
  }));
}

beforeEach(() => jest.clearAllMocks());

it('rowToPlayer maps a round_players row', () => {
  expect(rowToPlayer({ player_id: 'p', players: { id: 'p', name: 'Sam', handicap: 12, handicap_index: 9.1, gender: 'male' } } as never))
    .toMatchObject({ id: 'p', name: 'Sam', handicap: 12, handicapIndex: 9.1, gender: 'male' });
  expect(rowToPlayer({ player_id: 'p', players: null } as never)).toBeNull();
});

it('addPlayerToRound calls the RPC then backfills the card', async () => {
  rpc.mockResolvedValue({ error: null });
  mockRoster([{ id: 'owner', name: 'Owner' }, { id: 'p3', name: 'Ben' }]);
  const player = await addPlayerToRound('r1', 'p3');
  expect(rpc).toHaveBeenCalledWith('add_round_player', { p_round_id: 'r1', p_player_id: 'p3' });
  expect(player.id).toBe('p3');
  expect(useScorecardStore.getState().ensureTeamMemberScorecards).toHaveBeenCalledWith([expect.objectContaining({ id: 'p3' })]);
});

it('addPlayerToRound surfaces the server hint and changes nothing locally', async () => {
  rpc.mockResolvedValue({ error: { message: 'This round is full', hint: 'round_full' } });
  await expect(addPlayerToRound('r1', 'p3')).rejects.toMatchObject({ hint: 'round_full' });
  expect(useScorecardStore.getState().ensureTeamMemberScorecards).not.toHaveBeenCalled();
});

it('removePlayerFromRound cancels that card, calls the RPC, drops its queue item and local card', async () => {
  rpc.mockResolvedValue({ error: null });
  await removePlayerFromRound('r1', 'p2');
  expect(cancelPendingScorecardSync).toHaveBeenCalledWith('card-p2');
  expect(rpc).toHaveBeenCalledWith('remove_round_player', { p_round_id: 'r1', p_player_id: 'p2' });
  expect(removePendingSyncByEntityKey).toHaveBeenCalledWith('scorecard:r1:p2');
  expect(useScorecardStore.getState().removePlayerFromRound).toHaveBeenCalledWith('p2');
});

it('removePlayerFromRound re-arms the debounce when the RPC fails', async () => {
  rpc.mockResolvedValue({ error: { message: 'Scores have been submitted', hint: 'round_has_submitted_scorecards' } });
  (cancelPendingScorecardSync as jest.Mock).mockReturnValue(true);
  await expect(removePlayerFromRound('r1', 'p2')).rejects.toBeInstanceOf(RoundRosterError);
  expect(debouncedQueueScorecardSync).toHaveBeenCalledWith('card-p2', expect.any(Function));
  expect(useScorecardStore.getState().removePlayerFromRound).not.toHaveBeenCalled();
});

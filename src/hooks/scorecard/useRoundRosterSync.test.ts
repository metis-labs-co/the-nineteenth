import { renderHook, act } from '@testing-library/react-native';
import { useRoundRosterSync } from './useRoundRosterSync';
import { fetchRoundRoster } from '@/services/rounds/roundRoster';
import { deleteScorecardsByRound, removePendingSyncByEntityKey } from '@/services/offline/database';

jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('@/services/supabase/client', () => {
  const channel = { on: jest.fn().mockReturnThis(), subscribe: jest.fn().mockReturnThis(), send: jest.fn() };
  return { supabase: { channel: jest.fn(() => channel), removeChannel: jest.fn(), auth: { getSession: jest.fn() } } };
});
jest.mock('@/services/rounds/roundRoster', () => ({ fetchRoundRoster: jest.fn() }));
jest.mock('@/services/offline/database', () => ({
  deleteScorecardsByRound: jest.fn(), removePendingSyncByEntityKey: jest.fn(),
}));
jest.mock('@/services/activeRoundSession', () => ({ activeRoundSession: { clear: jest.fn() } }));
jest.mock('@/store/scorecardSyncDebounce', () => ({ cancelPendingScorecardSync: jest.fn() }));
jest.mock('@/services/rounds/roundScoringCoordinator', () => ({
  withRoundScoringWrite: (_id: string, op: () => Promise<unknown>) => op(),
}));
jest.mock('@/context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));

const mockState = {
  currentRoundId: 'r',
  currentPlayers: [{ id: 'owner', name: 'Owner' }, { id: 'me', name: 'Me' }, { id: 'b', name: 'Ben' }],
  groupScorecards: new Map([['b', { id: 'card-b' }]]),
  removePlayerFromRound: jest.fn(),
  ensureTeamMemberScorecards: jest.fn(),
  resetRound: jest.fn(),
};
jest.mock('@/store/scorecardStore', () => ({ useScorecardStore: { getState: () => mockState } }));

const player = (id: string) => ({ id, name: id });
const fetchMock = fetchRoundRoster as jest.Mock;
const args = { roundId: 'r', enabled: true, isOnline: true, currentUserId: 'me', onExit: jest.fn() };

const { supabase } = jest.requireMock('@/services/supabase/client');
const sessionMock = supabase.auth.getSession as jest.Mock;
const removedSnapshot = { round: { id: 'r', userId: 'owner', deletedAt: null }, players: [player('owner'), player('b')] };

beforeEach(() => {
  jest.clearAllMocks();
  args.onExit = jest.fn();
  sessionMock.mockResolvedValue({ data: { session: { user: { id: 'me' } } } });
});

it('removes a player the server no longer has', async () => {
  fetchMock.mockResolvedValue({ round: { id: 'r', userId: 'owner', deletedAt: null }, players: [player('owner'), player('me')] });
  const { result } = renderHook(() => useRoundRosterSync(args));
  await act(() => result.current.refresh());
  expect(removePendingSyncByEntityKey).toHaveBeenCalledWith('scorecard:r:b');
  expect(mockState.removePlayerFromRound).toHaveBeenCalledWith('b');
});

it('exits and clears local data when the user was removed', async () => {
  fetchMock.mockResolvedValue({ round: { id: 'r', userId: 'owner', deletedAt: null }, players: [player('owner'), player('b')] });
  const { result } = renderHook(() => useRoundRosterSync(args));
  await act(() => result.current.refresh());
  expect(deleteScorecardsByRound).toHaveBeenCalledWith('r');
  expect(mockState.resetRound).toHaveBeenCalled();
  expect(args.onExit).toHaveBeenCalledWith('You were removed from this round');
});

it('drops a fetch that started before a local edit (Review Focus #3)', async () => {
  let resolve!: (v: unknown) => void;
  fetchMock.mockReturnValue(new Promise((r) => { resolve = r; }));
  const { result } = renderHook(() => useRoundRosterSync(args));
  let pending!: Promise<void>;
  act(() => { pending = result.current.refresh(); });
  act(() => result.current.markLocalEdit());
  resolve({ round: { id: 'r', userId: 'owner', deletedAt: null }, players: [player('owner'), player('me')] });
  await act(() => pending);
  expect(mockState.removePlayerFromRound).not.toHaveBeenCalled();
});

it('ignores fetch errors', async () => {
  fetchMock.mockRejectedValue(new Error('network'));
  const { result } = renderHook(() => useRoundRosterSync(args));
  await act(() => result.current.refresh());
  expect(mockState.removePlayerFromRound).not.toHaveBeenCalled();
  expect(args.onExit).not.toHaveBeenCalled();
  expect(deleteScorecardsByRound).not.toHaveBeenCalled();
});

it('deduplicates overlapping refreshes that exit', async () => {
  fetchMock.mockResolvedValue(removedSnapshot);
  const { result } = renderHook(() => useRoundRosterSync(args));
  await act(async () => { await Promise.all([result.current.refresh(), result.current.refresh()]); });
  expect(deleteScorecardsByRound).toHaveBeenCalledTimes(1);
  expect(args.onExit).toHaveBeenCalledTimes(1);
});

it('does not exit on exit_unavailable without a matching session', async () => {
  fetchMock.mockResolvedValue({ round: null, players: [] });
  sessionMock.mockResolvedValue({ data: { session: null } });
  const { result } = renderHook(() => useRoundRosterSync(args));
  await act(() => result.current.refresh());
  expect(deleteScorecardsByRound).not.toHaveBeenCalled();
  expect(args.onExit).not.toHaveBeenCalled();
});

it('exits on exit_unavailable with a matching session', async () => {
  fetchMock.mockResolvedValue({ round: null, players: [] });
  const { result } = renderHook(() => useRoundRosterSync(args));
  await act(() => result.current.refresh());
  expect(deleteScorecardsByRound).toHaveBeenCalledWith('r');
  expect(args.onExit).toHaveBeenCalledWith('This round is no longer available');
});

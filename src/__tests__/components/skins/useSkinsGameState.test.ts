/**
 * useSkinsGameState — the round-settings skins card. Holes are priced on the
 * planned count, the pot on the holes played; a settled game shows its stored
 * buy-ins. The auto-finalise passes only the game id, so settlement reads the
 * round's hole counts (fetchSkinsHoleCounts) itself.
 */
import { renderHook } from '@testing-library/react-native';
import { useSkinsGameState } from '@/components/rounds/ViewRound/RoundDetailsTab/components/useSkinsGameState';

const mockState = {
  games: [] as Record<string, unknown>[],
  payouts: [] as { buy_in: number; total_winnings: number }[],
  results: [] as unknown[],
};
const mockFinalize = jest.fn();
const mockRefetchPayouts = jest.fn();
const mockUseSkinsHoleCounts = jest.fn();

jest.mock('@/hooks/useSkins', () => ({
  useSkinsGamesByRound: () => ({ data: mockState.games, isLoading: false }),
  useSkinsPayouts: () => ({ data: mockState.payouts, isLoading: false, refetch: mockRefetchPayouts }),
  useSkinsResults: () => ({ data: mockState.results, isLoading: false }),
  useFinalizeSkinsGame: () => ({ mutateAsync: mockFinalize, isPending: false }),
  useSkinsHoleCounts: (...args: unknown[]) => mockUseSkinsHoleCounts(...args),
}));

const baseGame = {
  id: 'g1',
  round_id: 'r1',
  status: 'active',
  pot_type: 'total_pot',
  pot_value: 90,
  scoring_type: 'gross',
  participant_ids: ['p1', 'p2'],
};

describe('useSkinsGameState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.games = [baseGame];
    mockState.payouts = [];
    mockState.results = [];
    mockFinalize.mockResolvedValue({});
    mockUseSkinsHoleCounts.mockReturnValue({ plannedHoles: 18, holesPlayed: 18 });
  });

  it('prices a full round played as planned exactly as before', () => {
    const { result } = renderHook(() => useSkinsGameState({ roundId: 'r1', roundStatus: 'in-progress' }));

    expect(result.current.perHoleValue).toBe(5); // $90 / 18
    expect(result.current.totalPot).toBe(90);
  });

  it("reads the round's hole counts and prices an ended-early front nine", () => {
    mockUseSkinsHoleCounts.mockReturnValue({ plannedHoles: 9, holesPlayed: 6 });

    const { result } = renderHook(() => useSkinsGameState({ roundId: 'r1', roundStatus: 'in-progress' }));

    expect(mockUseSkinsHoleCounts).toHaveBeenCalledWith('r1');
    expect(result.current.perHoleValue).toBe(10); // $90 / 9
    expect(result.current.totalPot).toBe(60); // $90 × 6/9
  });

  it('shows the stored buy-ins as the pot once the game is settled', () => {
    mockState.games = [{ ...baseGame, status: 'completed', pot_type: 'per_hole', pot_value: 5 }];
    mockState.payouts = [
      { buy_in: 22.5, total_winnings: 25 },
      { buy_in: 22.5, total_winnings: 20 },
    ];
    mockUseSkinsHoleCounts.mockReturnValue({ plannedHoles: 9, holesPlayed: 9 });

    const { result } = renderHook(() => useSkinsGameState({ roundId: 'r1', roundStatus: 'completed' }));

    expect(result.current.perHoleValue).toBe(5);
    expect(result.current.totalPot).toBe(45); // 22.5 + 22.5 (computed at 18 it would read $90)
  });

  it('auto-finalises with the game id only (settlement reads the hole counts)', () => {
    mockState.results = [{ hole_number: 1 }];

    renderHook(() => useSkinsGameState({ roundId: 'r1', roundStatus: 'completed' }));

    expect(mockFinalize).toHaveBeenCalledTimes(1);
    expect(mockFinalize).toHaveBeenCalledWith({ gameId: 'g1' });
  });
});

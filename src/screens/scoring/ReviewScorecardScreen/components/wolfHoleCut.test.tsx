import React from 'react';
import { render, screen, createTestQueryClient } from '@/__tests__/utils/renderHelpers';
import type {
  WolfDecisionWithDetails,
  WolfGameWithParticipants,
  WolfParticipant,
  WolfPayoutWithPlayer,
} from '@/types/database/wolf.types';
import { wolfKeys } from '@/hooks/queryKeys';
import { WolfTabContent } from './WolfTabContent';
import { PayoutsTabContent } from './PayoutsTabContent';
import { useScorecardStore } from '@/store/scorecardStore';
import type { NineType } from '@/types/database/enums';
const mockSettlementProps = jest.fn();
const mockSummary = jest.fn();
const mockSkinsSummary = jest.fn();
jest.mock('@/hooks/wolf', () => ({
  useWolfSummary: (...args: unknown[]) => {
    mockSummary(...args);
    return jest.requireActual('@/hooks/wolf/queries').useWolfSummary(...args);
  },
}));
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: () => {
      throw new Error('Unexpected database access');
    },
  },
}));
jest.mock('@/hooks/useSkins', () => ({
  useSkinsSummary: (...args: unknown[]) => mockSkinsSummary(...args),
}));
jest.mock('@/store/scorecardStore', () => ({ useScorecardStore: jest.fn() }));
jest.mock('@/components/wolf', () => ({
  WolfResultsCard: jest.requireActual('@/components/wolf/WolfResultsCard').WolfResultsCard,
  WolfStandingsCard: () => null,
  WolfSettlementCard: (props: unknown) => {
    mockSettlementProps(props);
    return null;
  },
}));
// Include the whole native list window so both nine subtotals are observable.
jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const React = require('react');
  const FlatList = jest.requireActual('react-native/Libraries/Lists/FlatList').default;
  return {
    __esModule: true,
    default: (props: object) =>
      React.createElement(FlatList, { ...props, initialNumToRender: 100 }),
  };
});

const PLAYERS: WolfParticipant[] = [
  { id: 'p1', name: 'Sam', handicap: 10 },
  { id: 'p2', name: 'Bob', handicap: 12 },
  { id: 'p3', name: 'Ann', handicap: 8 },
];

function game(overrides: Partial<WolfGameWithParticipants> = {}): WolfGameWithParticipants {
  return {
    id: 'w1',
    round_id: 'r1',
    participant_ids: ['p1', 'p2', 'p3'],
    wolf_order: ['p1', 'p2', 'p3'],
    scoring_type: 'gross',
    blind_wolf_enabled: false,
    pot_enabled: false,
    pot_value_per_point: null,
    currency: 'AUD',
    status: 'active',
    disclaimer_accepted_at: null,
    disclaimer_accepted_by: null,
    created_by: 'p1',
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
    completed_at: null,
    participants: PLAYERS,
    ...overrides,
  };
}

/** A decided decision on `hole` awarding `points` (calculated unless told otherwise). */
function decision(
  hole: number,
  points: Record<string, number>,
  calculated = true
): WolfDecisionWithDetails {
  return {
    id: `d${hole}`,
    wolf_game_id: 'w1',
    hole_number: hole,
    wolf_id: 'p1',
    is_blind_wolf: false,
    partner_id: null,
    hole_scores: null,
    is_tie: false,
    wolf_team_won: true,
    points_awarded: points,
    decided_at: '2026-10-07T00:00:00Z',
    calculated_at: calculated ? '2026-10-07T00:00:00Z' : null,
    wolf: PLAYERS[0],
    partner: null,
  };
}

const PAYOUTS: WolfPayoutWithPlayer[] = [
  {
    id: 'pay1',
    wolf_game_id: 'w1',
    player_id: 'p1',
    total_points: 99,
    total_winnings: 99,
    net_result: 66,
    calculated_at: '2026-10-07T00:00:00Z',
    player: { id: 'p1', name: 'Sam' },
  },
];

const props = { wolfGameId: 'w1', isRefreshing: false, onRefresh: jest.fn(), bottomInset: 0 };
const staleDecisions = [decision(10, { p1: 4 }), decision(15, { p3: 2 }), decision(16, { p2: 9 })];
function cachedGame(g = game({ pot_enabled: true, pot_value_per_point: 1 })) {
  const client = createTestQueryClient();
  client.setQueryData(wolfKeys.game('w1'), g);
  client.setQueryData(wolfKeys.decisions('w1'), staleDecisions);
  client.setQueryData(wolfKeys.payouts('w1'), PAYOUTS);
  return client;
}
function setStore(nineType: NineType = 'full', holesPlayed: number | null = null) {
  const state = { nineType, holesPlayed };
  (useScorecardStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: typeof state) => unknown) => selector(state)
  );
  return state;
}
beforeEach(() => {
  jest.clearAllMocks();
  setStore();
  mockSkinsSummary.mockReturnValue({ data: undefined, isLoading: false, refetch: jest.fn() });
});

describe('Review Wolf compatibility (characterization)', () => {
  it('defaults to the original grid and leaves the cached summary uncut', () => {
    render(<WolfTabContent {...props} totalHoles={18} />, { queryClient: cachedGame() });
    expect(screen.getByText('3 of 18 holes completed')).toBeTruthy();
    expect(screen.getByText('FRONT 9')).toBeTruthy();
    expect(screen.getByText('BACK 9')).toBeTruthy();
    expect(mockSettlementProps.mock.calls.at(-1)![0].payouts).toBe(PAYOUTS);
  });
  it('already counts normal nine-hole progress against nine', () => {
    render(<WolfTabContent {...props} totalHoles={9} />, { queryClient: cachedGame() });
    expect(screen.getByText('3 of 9 holes completed')).toBeTruthy();
  });
  it('previews Wolf-only balances from standings while preserving stored settlement rows', () => {
    const client = cachedGame();
    render(<PayoutsTabContent {...props} mode="wolf-only" />, { queryClient: client });
    expect(screen.getByText('+$4.00')).toBeTruthy();
    expect(screen.getByText('-$1.00')).toBeTruthy();
    expect(screen.getByText('-$3.00')).toBeTruthy();
    expect(client.getQueryData(wolfKeys.payouts('w1'))).toBe(PAYOUTS);
    expect(PAYOUTS[0].net_result).toBe(66);
  });
});

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
describe('Review Wolf played holes', () => {
  it('cuts at physical hole fifteen and follows cutoff-only changes with the same cached decisions', () => {
    const client = cachedGame();
    const { rerender } = render(
      <WolfTabContent {...props} totalHoles={6} holeNumbers={range(10, 15)} />,
      { queryClient: client }
    );
    expect(mockSummary).toHaveBeenLastCalledWith('w1', { lastHoleNumber: 15 });
    expect(screen.getByText('2 of 6 holes completed')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.queryByText('16')).toBeNull();
    expect(screen.queryByText('FRONT 9')).toBeNull();
    expect(mockSettlementProps.mock.calls.at(-1)![0].payouts).toBe(PAYOUTS);
    rerender(<WolfTabContent {...props} totalHoles={2} holeNumbers={[11, 10]} />);
    expect(mockSummary).toHaveBeenLastCalledWith('w1', { lastHoleNumber: 11 });
    expect(screen.getByText('1 of 2 holes completed')).toBeTruthy();
    expect(screen.queryByText('15')).toBeNull();
    expect(client.getQueryData(wolfKeys.decisions('w1'))).toBe(staleDecisions);
    expect(client.getQueryData(wolfKeys.payouts('w1'))).toBe(PAYOUTS);
    rerender(<WolfTabContent {...props} totalHoles={18} />);
    expect(mockSummary).toHaveBeenLastCalledWith('w1', { lastHoleNumber: null });
    expect(screen.getByText('3 of 18 holes completed')).toBeTruthy();
  });
  it('keeps explicit empty rows with a null summary cutoff', () => {
    render(<WolfTabContent {...props} totalHoles={18} holeNumbers={[]} />, {
      queryClient: cachedGame(),
    });
    expect(mockSummary).toHaveBeenLastCalledWith('w1', { lastHoleNumber: null });
    expect(screen.queryByText('FRONT 9')).toBeNull();
    expect(screen.queryByText('BACK 9')).toBeNull();
    expect(screen.queryByText('10')).toBeNull();
    expect(screen.getByText('Wolf: 0')).toBeTruthy();
  });
  it('draws normal nine-hole rows and hides progress when complete', () => {
    const client = cachedGame();
    client.setQueryData(
      wolfKeys.decisions('w1'),
      range(10, 18).map((hole) => decision(hole, {}))
    );
    render(<WolfTabContent {...props} totalHoles={9} holeNumbers={range(10, 18)} />, {
      queryClient: client,
    });
    expect(mockSummary).toHaveBeenLastCalledWith('w1', { lastHoleNumber: 18 });
    expect(screen.queryByText('FRONT 9')).toBeNull();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.queryByText('Game In Progress')).toBeNull();
  });
});

describe('Review Wolf payout previews', () => {
  it.each(['wolf-only', 'combined'] as const)(
    'renders retained %s balances and reacts to the store cutoff',
    (mode) => {
      const state = setStore('back9', 6);
      const client = cachedGame();
      if (mode === 'combined')
        mockSkinsSummary.mockReturnValue({
          data: {
            game: { status: 'completed', participants: [{ id: 'p1', name: 'Sam' }], pot_value: 0 },
            results: [],
            payouts: [{ player_id: 'p1', net_result: 5 }],
          },
          isLoading: false,
          refetch: jest.fn(),
        });
      const { rerender } = render(<PayoutsTabContent {...props} mode={mode} skinsGameId="s1" />, {
        queryClient: client,
      });
      expect(mockSummary).toHaveBeenLastCalledWith('w1', { lastHoleNumber: 15 });
      // Retained Wolf points 4/0/2 => +2/-2/0; combined adds the stored $5 skins result.
      expect(screen.getByText(mode === 'combined' ? '+$7.00' : '+$2.00')).toBeTruthy();
      expect(screen.getAllByText('-$2.00').length).toBeGreaterThan(0);
      expect(screen.queryByText('+$4.00')).toBeNull();
      state.holesPlayed = 2;
      rerender(<PayoutsTabContent {...props} mode={mode} skinsGameId="s1" />);
      expect(mockSummary).toHaveBeenLastCalledWith('w1', { lastHoleNumber: 11 });
      expect(screen.getByText(mode === 'combined' ? '+$7.67' : '+$2.67')).toBeTruthy();
      expect(screen.getAllByText('-$1.33').length).toBeGreaterThan(0);
      expect(client.getQueryData(wolfKeys.decisions('w1'))).toBe(staleDecisions);
      expect(client.getQueryData(wolfKeys.payouts('w1'))).toBe(PAYOUTS);
      expect(PAYOUTS[0].net_result).toBe(66);
      state.holesPlayed = null;
      rerender(<PayoutsTabContent {...props} mode={mode} skinsGameId="s1" />);
      expect(mockSummary).toHaveBeenLastCalledWith('w1', { lastHoleNumber: null });
      expect(screen.getAllByText('+$4.00').length).toBeGreaterThan(0);
    }
  );
  it('passes a null cutoff for a normal nine-hole round', () => {
    setStore('back9');
    render(<PayoutsTabContent {...props} mode="wolf-only" />, { queryClient: cachedGame() });
    expect(mockSummary).toHaveBeenLastCalledWith('w1', { lastHoleNumber: null });
  });
  it('keeps skins-only mode independent of Wolf data and forwards its hole counts', () => {
    setStore('back9', 6);
    mockSkinsSummary.mockReturnValue({
      data: {
        game: { status: 'completed', participants: [{ id: 'p1', name: 'Sam' }] },
        results: [],
        payouts: [{ player_id: 'p1', net_result: 5 }],
      },
      isLoading: false,
      refetch: jest.fn(),
    });
    render(
      <PayoutsTabContent
        {...props}
        mode="skins-only"
        skinsGameId="s1"
        holeCounts={{ plannedHoles: 9, holesPlayed: 6 }}
      />
    );
    expect(mockSummary).toHaveBeenLastCalledWith(undefined, { lastHoleNumber: 15 });
    expect(mockSkinsSummary).toHaveBeenLastCalledWith('s1', { plannedHoles: 9, holesPlayed: 6 });
    expect(screen.getByText('+$5.00')).toBeTruthy();
  });
});

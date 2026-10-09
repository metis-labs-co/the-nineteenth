import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { buildWolfGameSummary } from '@/utils/wolf';
import type {
  WolfDecisionWithDetails,
  WolfGameWithParticipants,
  WolfParticipant,
  WolfPayoutWithPlayer,
} from '@/types/database/wolf.types';
import { WolfTab } from './WolfTab';
const mockSettlementProps = jest.fn();
jest.mock('@tabler/icons-react-native', () => ({ IconDog: () => null }));
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

const summary = (completed = 5) =>
  buildWolfGameSummary(
    game(),
    Array.from({ length: completed }, (_, i) => decision(i + 1, {})),
    []
  );

beforeEach(() => jest.clearAllMocks());
describe('WolfTab compatibility (characterization)', () => {
  it('defaults to eighteen holes and the original result grid', () => {
    render(<WolfTab wolfSummary={summary()} hasWolfGame />);
    expect(screen.getByText('5 of 18 holes completed')).toBeTruthy();
    expect(screen.getByText('FRONT 9')).toBeTruthy();
    expect(screen.getByText('BACK 9')).toBeTruthy();
  });
  it('forwards stored settlements without replacing them with preview amounts', () => {
    const storedSummary = buildWolfGameSummary(
      game({ status: 'completed', pot_enabled: true, pot_value_per_point: 1 }),
      [decision(10, { p1: 4 })],
      PAYOUTS
    );
    render(<WolfTab wolfSummary={storedSummary} hasWolfGame />);
    expect(mockSettlementProps.mock.calls.at(-1)![0].payouts).toBe(PAYOUTS);
    expect(screen.queryByText('Game In Progress')).toBeNull();
  });
});

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
describe('WolfTab played holes', () => {
  it.each([range(1, 6), range(10, 15), range(10, 18)].map((holes) => [holes]))(
    'draws and counts only physical holes %j',
    (holeNumbers) => {
      render(<WolfTab wolfSummary={summary()} hasWolfGame holeNumbers={holeNumbers} />);
      expect(screen.getByText(`5 of ${holeNumbers.length} holes completed`)).toBeTruthy();
      expect(screen.getByText(String(holeNumbers[0]))).toBeTruthy();
      expect(screen.getByText(String(holeNumbers.at(-1)))).toBeTruthy();
      expect(screen.queryByText(holeNumbers[0] === 10 ? 'FRONT 9' : 'BACK 9')).toBeNull();
      if (holeNumbers.length === 6)
        expect(screen.queryByText(String(holeNumbers.at(-1)! + 1))).toBeNull();
    }
  );
  it('keeps the eighteen-hole fallback for an explicit empty array', () => {
    render(<WolfTab wolfSummary={summary()} hasWolfGame holeNumbers={[]} />);
    expect(screen.getByText('5 of 18 holes completed')).toBeTruthy();
    expect(screen.getByText('FRONT 9')).toBeTruthy();
    expect(screen.getByText('BACK 9')).toBeTruthy();
  });
  it.each([range(1, 6), range(10, 18)].map((holes) => [holes]))(
    'hides progress when all %j played holes are complete',
    (holeNumbers) => {
      render(
        <WolfTab wolfSummary={summary(holeNumbers.length)} hasWolfGame holeNumbers={holeNumbers} />
      );
      expect(screen.queryByText('Game In Progress')).toBeNull();
    }
  );
  it('updates rows and progress when only the played numbers change, leaving the server summary intact', () => {
    const uncutSummary = buildWolfGameSummary(
      game({ pot_enabled: true, pot_value_per_point: 1 }),
      [decision(10, { p1: 4 }), decision(15, { p3: 2 }), decision(16, { p2: 9 })],
      PAYOUTS
    );
    const { rerender } = render(
      <WolfTab wolfSummary={uncutSummary} hasWolfGame holeNumbers={range(10, 15)} />
    );
    expect(screen.getByText('3 of 6 holes completed')).toBeTruthy();
    expect(screen.queryByText('16')).toBeNull();
    expect(mockSettlementProps.mock.calls.at(-1)![0].payouts).toBe(PAYOUTS);
    rerender(<WolfTab wolfSummary={uncutSummary} hasWolfGame holeNumbers={range(10, 11)} />);
    expect(screen.queryByText('15')).toBeNull();
    expect(screen.queryByText('Game In Progress')).toBeNull();
    expect(uncutSummary.decisions).toHaveLength(3);
    expect(uncutSummary.standings[0].player_id).toBe('p2');
    expect(mockSettlementProps.mock.calls.at(-1)![0].payouts).toBe(PAYOUTS);
  });
});

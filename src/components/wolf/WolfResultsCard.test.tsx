/**
 * WolfResultsCard rows. With no holeNumbers the table is the fixed 1–18 grid
 * it has always been; with the played hole numbers it shows only those rows
 * (and only their totals in the legend).
 */
import React from 'react';
import { render, screen, waitFor } from '@/__tests__/utils/renderHelpers';
import { WolfResultsCard, buildWolfResultRows, type WolfResultRow } from './WolfResultsCard';
import type {
  WolfDecisionWithDetails,
  WolfGameWithParticipants,
  WolfParticipant,
} from '@/types/database/wolf.types';

// Render the native list's whole window so default-grid and legend parity are observable.
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

const GAME: WolfGameWithParticipants = {
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
};

function decision(hole: number, wolfTeamWon: boolean): WolfDecisionWithDetails {
  return {
    id: `d${hole}`,
    wolf_game_id: 'w1',
    hole_number: hole,
    wolf_id: 'p1',
    is_blind_wolf: false,
    partner_id: null,
    hole_scores: null,
    is_tie: false,
    wolf_team_won: wolfTeamWon,
    points_awarded: { p1: 2 },
    decided_at: '2026-10-07T00:00:00Z',
    calculated_at: '2026-10-07T00:00:00Z',
    wolf: PLAYERS[0],
    partner: null,
  };
}

describe('WolfResultsCard default behavior (characterization)', () => {
  it('renders holes 1–18, both subtotals, and counts wolf/pack/ties over all decisions', async () => {
    render(
      <WolfResultsCard
        wolfGame={GAME}
        decisions={[
          decision(3, true),
          decision(18, false),
          { ...decision(15, true), is_tie: true },
          { ...decision(1, false), calculated_at: null },
        ]}
      />
    );
    await waitFor(() => expect(screen.getByText('Tie: 1')).toBeTruthy());
    expect(screen.getByText('FRONT 9')).toBeTruthy();
    expect(screen.getByText('BACK 9')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('Wolf: 1')).toBeTruthy();
    expect(screen.getByText('Pack: 1')).toBeTruthy();
  });
});
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const holeNumbersOf = (rows: WolfResultRow[]) =>
  rows.flatMap((r) => (r.type === 'hole' ? [r.holeNumber] : []));
const subtotals = (rows: WolfResultRow[]) =>
  rows.flatMap((r) => (r.type === 'subtotal' ? [[r.label, r.holeRange]] : []));

describe('buildWolfResultRows', () => {
  it('builds the fixed 1–18 grid with both subtotals when not narrowed (characterization)', () => {
    const rows = buildWolfResultRows(new Map());

    expect(rows).toHaveLength(22);
    expect(rows[0]).toEqual({ type: 'header' });
    expect(holeNumbersOf(rows)).toEqual(range(1, 18));
    expect(rows[10]).toEqual({ type: 'subtotal', label: 'FRONT 9', holeRange: '1-9' });
    expect(rows[20]).toEqual({ type: 'subtotal', label: 'BACK 9', holeRange: '10-18' });
    expect(rows[21]).toEqual({ type: 'legend' });
  });

  it('shows holes 1–6 and only the front subtotal for a round ended after 6', () => {
    const rows = buildWolfResultRows(new Map(), range(1, 6));

    expect(rows).toHaveLength(9);
    expect(holeNumbersOf(rows)).toEqual(range(1, 6));
    expect(subtotals(rows)).toEqual([['FRONT 9', '1-6']]);
  });

  it('shows holes 10–15 and only the back subtotal for a back-9 round ended after 6', () => {
    const rows = buildWolfResultRows(new Map(), [15, 10, 11, 12, 13, 14]);

    expect(holeNumbersOf(rows)).toEqual(range(10, 15));
    expect(subtotals(rows)).toEqual([['BACK 9', '10-15']]);
  });

  it('attaches each listed hole its decision', () => {
    const d3 = decision(3, true);
    const rows = buildWolfResultRows(new Map([[3, d3]]), range(1, 6));

    expect(rows[3]).toEqual({ type: 'hole', holeNumber: 3, decision: d3 });
    expect(rows[1]).toEqual({ type: 'hole', holeNumber: 1, decision: null });
  });
});

describe('WolfResultsCard holeNumbers', () => {
  it('renders only the played rows and totals only their decisions', () => {
    // Hole 3: wolf won. Hole 8 (after the end): pack won — must not count.
    render(
      <WolfResultsCard
        wolfGame={GAME}
        decisions={[decision(3, true), decision(8, false)]}
        holeNumbers={range(1, 6)}
      />
    );

    expect(screen.getByText('FRONT 9')).toBeTruthy();
    expect(screen.queryByText('BACK 9')).toBeNull();
    expect(screen.queryByText('7')).toBeNull();
    expect(screen.getByText('Wolf: 1')).toBeTruthy();
    expect(screen.getByText('Pack: 0')).toBeTruthy();
  });
});

describe('WolfResultsCard membership edge cases', () => {
  it('keeps an explicit empty list empty in rows and legend', () => {
    expect(buildWolfResultRows(new Map(), [])).toEqual([{ type: 'header' }, { type: 'legend' }]);
    render(<WolfResultsCard wolfGame={GAME} decisions={[decision(3, true)]} holeNumbers={[]} />);
    expect(screen.queryByText('FRONT 9')).toBeNull();
    expect(screen.queryByText('BACK 9')).toBeNull();
    expect(screen.queryByText('3')).toBeNull();
    expect(screen.getByText('Wolf: 0')).toBeTruthy();
    expect(screen.getByText('Pack: 0')).toBeTruthy();
    expect(screen.getByText('Tie: 0')).toBeTruthy();
  });

  it('counts only listed back-nine wins and ties, preserving physical-hole wolf rotation', () => {
    render(
      <WolfResultsCard
        wolfGame={GAME}
        decisions={[
          decision(10, true),
          decision(15, false),
          { ...decision(14, true), is_tie: true },
          { ...decision(11, false), calculated_at: null },
          decision(1, false),
          { ...decision(16, true), is_tie: true },
        ]}
        holeNumbers={[15, 10, 11, 12, 13, 14]}
      />
    );
    expect(screen.queryByText('FRONT 9')).toBeNull();
    expect(screen.getByText('BACK 9')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.queryByText('16')).toBeNull();
    expect(screen.getByText('Wolf: 1')).toBeTruthy();
    expect(screen.getByText('Pack: 1')).toBeTruthy();
    expect(screen.getByText('Tie: 1')).toBeTruthy();
    // Holes 10–15 rotate Sam, Bob, Ann twice, as the unchanged full card does.
    expect(screen.getAllByText('Sam')).toHaveLength(2);
    expect(screen.getAllByText('Bob')).toHaveLength(2);
    expect(screen.getAllByText('Ann')).toHaveLength(2);
  });

  it('updates the rows and legend when only the listed holes change', () => {
    const decisions = [decision(3, true), decision(8, false)];
    const { rerender } = render(
      <WolfResultsCard wolfGame={GAME} decisions={decisions} holeNumbers={range(1, 6)} />
    );
    expect(screen.getByText('Pack: 0')).toBeTruthy();
    rerender(<WolfResultsCard wolfGame={GAME} decisions={decisions} holeNumbers={range(1, 9)} />);
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('Pack: 1')).toBeTruthy();
  });
});

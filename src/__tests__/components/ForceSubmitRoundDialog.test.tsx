// src/__tests__/components/ForceSubmitRoundDialog.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ForceSubmitRoundDialog, { getIncompletePlayers } from '@/components/rounds/ForceSubmitRoundDialog';
import * as rd from '@/hooks/useRoundDetails';

jest.mock('@/hooks/useRoundDetails');

describe('getIncompletePlayers', () => {
  it('returns scorecards with non-terminal status, name from nested player, holes from scores', () => {
    const scorecards = [
      { player_id: 'p1', status: 'completed', scores: { '1': {}, '2': {} }, player: { name: 'Alice' } },
      { player_id: 'p2', status: 'in-progress', scores: { '1': {}, '2': {}, '3': {} }, player: { name: 'Bob' } },
      { player_id: 'p3', status: 'pending', scores: {}, player: null },
    ];
    expect(getIncompletePlayers(scorecards as never)).toEqual([
      { playerId: 'p2', playerName: 'Bob', holesPlayed: 3 },
      { playerId: 'p3', playerName: 'Unknown player', holesPlayed: 0 },
    ]);
  });

  it('deduplicates by player_id, keeping the first occurrence', () => {
    const scorecards = [
      { player_id: 'p1', status: 'in-progress', scores: { '1': {}, '2': {} }, player: { name: 'Alice' } },
      { player_id: 'p1', status: 'in-progress', scores: { '1': {} }, player: { name: 'Alice' } },
    ];
    expect(getIncompletePlayers(scorecards as never)).toEqual([
      { playerId: 'p1', playerName: 'Alice', holesPlayed: 2 },
    ]);
  });

  it('uses Unknown player when player field is missing', () => {
    const scorecards = [
      { player_id: 'p1', status: 'in-progress', scores: {}, player: undefined },
    ];
    expect(getIncompletePlayers(scorecards as never)).toEqual([
      { playerId: 'p1', playerName: 'Unknown player', holesPlayed: 0 },
    ]);
  });
});

describe('ForceSubmitRoundDialog', () => {
  afterEach(() => jest.restoreAllMocks());

  function mockHooks() {
    // useRoundPlayers is no longer used by the dialog; no mock needed for it.
    (rd.useRoundScorecards as jest.Mock).mockReturnValue({
      data: [
        { player_id: 'p1', status: 'completed', scores: { '1': {} }, player: { name: 'Alice' } },
        { player_id: 'p2', status: 'in-progress', scores: { '1': {}, '2': {} }, player: { name: 'Bob' } },
      ],
    });
  }

  it('lists incomplete players and fires onConfirm', () => {
    mockHooks();
    const onConfirm = jest.fn();
    const { getByText } = render(
      <ForceSubmitRoundDialog visible roundId="r1" onConfirm={onConfirm} onCancel={jest.fn()} />
    );
    expect(getByText('Bob')).toBeTruthy();
    fireEvent.press(getByText('Submit Round'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('fires onCancel', () => {
    mockHooks();
    const onCancel = jest.fn();
    const { getByText } = render(
      <ForceSubmitRoundDialog visible roundId="r1" onConfirm={jest.fn()} onCancel={onCancel} />
    );
    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows hint when there are no completed scorecards', () => {
    (rd.useRoundScorecards as jest.Mock).mockReturnValue({
      data: [
        { player_id: 'p1', status: 'in-progress', scores: { '1': {} }, player: { name: 'Alice' } },
      ],
    });
    const { getByText } = render(
      <ForceSubmitRoundDialog visible roundId="r1" onConfirm={jest.fn()} onCancel={jest.fn()} />
    );
    // Hint text is the user-visible guard for zero completed scorecards (FIX 2)
    expect(getByText('At least one player needs a completed scorecard.')).toBeTruthy();
  });
});

// src/__tests__/components/ForceSubmitRoundDialog.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ForceSubmitRoundDialog, { getIncompletePlayers } from '@/components/rounds/ForceSubmitRoundDialog';
import * as rd from '@/hooks/useRoundDetails';

jest.mock('@/hooks/useRoundDetails');

describe('getIncompletePlayers', () => {
  it('returns roster players whose card is missing or non-terminal, with holes played', () => {
    const roundPlayers = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Cara' },
    ];
    const scorecards = [
      { player_id: 'p1', status: 'completed', scores: { '1': {}, '2': {} } },
      { player_id: 'p2', status: 'in-progress', scores: { '1': {}, '2': {}, '3': {} } },
      // p3 has no scorecard
    ];
    expect(getIncompletePlayers(roundPlayers as never, scorecards as never)).toEqual([
      { playerId: 'p2', playerName: 'Bob', holesPlayed: 3 },
      { playerId: 'p3', playerName: 'Cara', holesPlayed: 0 },
    ]);
  });
});

describe('ForceSubmitRoundDialog', () => {
  afterEach(() => jest.restoreAllMocks());

  function mockHooks() {
    (rd.useRoundPlayers as jest.Mock).mockReturnValue({
      data: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
    });
    (rd.useRoundScorecards as jest.Mock).mockReturnValue({
      data: [{ player_id: 'p1', status: 'completed', scores: { '1': {} } }],
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
});

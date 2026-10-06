// src/__tests__/components/ForceSubmitRoundDialog.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ForceSubmitRoundDialog, { getIncompletePlayers } from '@/components/rounds/ForceSubmitRoundDialog';
import * as rd from '@/hooks/useRoundDetails';

jest.mock('@/hooks/useRoundDetails');

describe('getIncompletePlayers', () => {
  const full = (n: number) => {
    const s: Record<string, unknown> = {};
    for (let h = 1; h <= n; h++) s[String(h)] = {};
    return s;
  };
  it('flags only players whose card is missing holes', () => {
    const scorecards = [
      { player_id: 'p1', status: 'in-progress', scores: full(18), player: { name: 'Full' } },
      { player_id: 'p2', status: 'in-progress', scores: full(3), player: { name: 'Partial' } },
    ];
    expect(getIncompletePlayers(scorecards as never, 18)).toEqual([
      { playerId: 'p2', playerName: 'Partial', holesPlayed: 3 },
    ]);
  });
});

describe('ForceSubmitRoundDialog', () => {
  afterEach(() => jest.restoreAllMocks());

  const full = (n: number) => {
    const s: Record<string, unknown> = {};
    for (let h = 1; h <= n; h++) s[String(h)] = {};
    return s;
  };

  function mockHooks() {
    (rd.useRoundDetails as jest.Mock).mockReturnValue({
      data: { nine_type: 'full' },
    });
    (rd.useRoundScorecards as jest.Mock).mockReturnValue({
      data: [
        { player_id: 'p1', status: 'completed', scores: full(18), player: { name: 'Alice' } },
        { player_id: 'p2', status: 'in-progress', scores: full(2), player: { name: 'Bob' } },
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

  it('submit is enabled even when no cards are full', () => {
    (rd.useRoundDetails as jest.Mock).mockReturnValue({
      data: { nine_type: 'full' },
    });
    (rd.useRoundScorecards as jest.Mock).mockReturnValue({
      data: [
        { player_id: 'p1', status: 'in-progress', scores: { '1': {} }, player: { name: 'Alice' } },
      ],
    });
    const onConfirm = jest.fn();
    const { getByText } = render(
      <ForceSubmitRoundDialog visible roundId="r1" onConfirm={onConfirm} onCancel={jest.fn()} />
    );
    fireEvent.press(getByText('Submit Round'));
    expect(onConfirm).toHaveBeenCalled();
  });
});

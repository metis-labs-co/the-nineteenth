// src/__tests__/components/RoundLeaderboardDnf.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { RoundLeaderboard } from '@/components/leaderboard/RoundLeaderboard';
import * as lb from '@/hooks/useRoundLeaderboard';

jest.mock('@/hooks/useRoundLeaderboard');

const baseMeta = {
  gameType: 'stableford', isTeamRound: false, teamFormat: null, roundFormat: 'individual',
  subMatchSize: null, rulesOverride: null, roundId: 'r1', roundNumber: 1, status: 'completed',
};

function mockData(over: Partial<ReturnType<typeof makeData>> = {}) {
  return makeData(over);
}
function makeData(over: object) {
  return {
    entries: [{ playerId: 'p1', isTeamResult: false, bypassed: false, scoreData: { type: 'stableford', totalPoints: 30 } }],
    teamEntries: [],
    individualEntries: [{ playerId: 'p1', isTeamResult: false, bypassed: false, scoreData: { type: 'stableford', totalPoints: 30 } }],
    dnfEntries: [{ playerId: 'p2', playerName: 'Bob' }],
    metadata: baseMeta,
    ...over,
  };
}

describe('RoundLeaderboard DNF section', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renders DNF names when round is completed and dnfEntries exist', () => {
    (lb.useRoundLeaderboard as jest.Mock).mockReturnValue({
      data: mockData(), isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });
    const { getByText } = render(
      <RoundLeaderboard roundId="r1" gameType="stableford" isTeamRound={false} testID="lb" />
    );
    expect(getByText('Did Not Finish')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
  });

  it('does NOT render the DNF section while the round is in-progress', () => {
    (lb.useRoundLeaderboard as jest.Mock).mockReturnValue({
      data: mockData({ metadata: { ...baseMeta, status: 'in-progress' } }),
      isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });
    const { queryByText } = render(
      <RoundLeaderboard roundId="r1" gameType="stableford" isTeamRound={false} testID="lb" />
    );
    expect(queryByText('Did Not Finish')).toBeNull();
  });
});

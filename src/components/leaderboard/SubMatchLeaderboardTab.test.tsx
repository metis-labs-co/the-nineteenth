import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { SubMatchLeaderboardTab } from './SubMatchLeaderboardTab';

jest.mock('@/hooks/rounds', () => ({
  useSubMatches: () => ({ data: [], isLoading: false }),
}));
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({ teams: [], isLoading: false }),
}));

describe('SubMatchLeaderboardTab (decoupled)', () => {
  it('renders the empty state with an injected getStrokes and no scorecard store', () => {
    const getStrokes = jest.fn(() => undefined);
    render(
      <SubMatchLeaderboardTab
        roundId="r1"
        gameType="alt-shot"
        teamFormat="alt-shot"
        holes={[]}
        getStrokes={getStrokes}
        isRefreshing={false}
        onRefresh={() => {}}
        bottomInset={0}
      />
    );
    expect(screen.getByText('No Sub-Matches')).toBeTruthy();
  });
});

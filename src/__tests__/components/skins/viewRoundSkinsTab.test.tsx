/**
 * ViewRound SkinsTab passes the round's hole counts to the results card.
 */
import React from 'react';
import { render } from '@/__tests__/utils/renderHelpers';
import { SkinsTab } from '@/screens/rounds/ViewRoundScreen/tabs/SkinsTab';

const mockUseSkinsHoleCounts = jest.fn();
jest.mock('@/hooks/skins', () => ({
  useSkinsGamesByRound: () => ({ data: [] }),
  useSkinsHoleCounts: (...args: unknown[]) => mockUseSkinsHoleCounts(...args),
}));

const mockSkinsResultsCard = jest.fn((_props: Record<string, unknown>) => null);
jest.mock('@/components/skins', () => ({
  SkinsResultsCard: (props: Record<string, unknown>) => mockSkinsResultsCard(props),
}));

describe('ViewRound SkinsTab', () => {
  it("prices the results card on the round's hole counts", () => {
    mockUseSkinsHoleCounts.mockReturnValue({ plannedHoles: 9, holesPlayed: 6 });

    render(
      <SkinsTab
        roundId="r1"
        results={[]}
        potType="total_pot"
        potValue={90}
        scoringType="gross"
        participants={[]}
        isTeamSkins={false}
        parValues={{}}
      />
    );

    expect(mockUseSkinsHoleCounts).toHaveBeenCalledWith('r1');
    expect(mockSkinsResultsCard).toHaveBeenCalledWith(
      expect.objectContaining({ holeCounts: { plannedHoles: 9, holesPlayed: 6 } })
    );
  });
});

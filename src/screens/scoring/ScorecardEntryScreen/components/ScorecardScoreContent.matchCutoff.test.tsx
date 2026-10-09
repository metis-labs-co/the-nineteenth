import React from 'react';
import { render } from '@/__tests__/utils/renderHelpers';
import { create18Holes, createTeamWithMembers } from '@/__tests__/utils/testFixtures';
import { ScorecardScoreContent, type ScorecardScoreContentProps } from './ScorecardScoreContent';
import { useScorecardStore } from '@/store/scorecardStore';
import { TeamMatchPlayScoreView } from '@/components/scorecard';

jest.mock('@/components/scorecard', () => ({ TeamMatchPlayScoreView: jest.fn(() => null) }));
jest.mock('@/components/scorecard/AltShotScoreCard', () => ({ AltShotScoreCard: () => null }));
jest.mock('@/components/wolf', () => ({ WolfDecisionPrompt: () => null }));
jest.mock('@/services/courses', () => ({ getTeeColor: jest.fn() }));
jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: (selector: (state: object) => unknown) => selector({}),
}));
jest.mock('@/store/scorecardStore', () => ({ useScorecardStore: jest.fn() }));

const planned = create18Holes();
const props: ScorecardScoreContentProps = {
  currentHoleData: planned[0],
  currentHole: 1,
  holes: planned,
  gameType: 'match-play',
  currentPlayers: [],
  playersToScore: [],
  scoringPairsEnabled: false,
  isTeamRound: true,
  teamFormat: 'match-play-team',
  teams: [createTeamWithMembers({ id: 'a' }), createTeamWithMembers({ id: 'b' })],
  onScoreSelect: jest.fn(),
  onStatsUpdate: jest.fn(),
  onPlayerPress: jest.fn(),
  getPlayerScore: jest.fn(),
  getTeamScore: jest.fn(),
  handleTeamScoreSelect: jest.fn(),
  handleBestBallScoreSelect: jest.fn(),
  handleTeamMatchPlayScoreSelect: jest.fn(),
  setSelectedContributor: jest.fn(),
  selectedContributor: undefined,
  teamMatchPlayResults: new Map(),
  playerScoresMap: new Map(),
};

function setStore(holes: typeof planned, holesPlayed: number | null, nineType = 'full') {
  jest
    .mocked(useScorecardStore)
    .mockImplementation((selector: any) => selector({ holes, holesPlayed, nineType }));
}

it.each([18, 9])(
  'forwards store cutoff with %i planned holes even when rendering only three holes',
  (count) => {
    const storeHoles = planned.slice(count === 9 ? 9 : 0);
    setStore(storeHoles, 3, count === 9 ? 'back9' : 'full');
    render(<ScorecardScoreContent {...props} holes={storeHoles.slice(0, 3)} />);
    expect(TeamMatchPlayScoreView).toHaveBeenLastCalledWith(
      expect.objectContaining({ totalHoles: count, plannedHoles: storeHoles, holesPlayed: 3 }),
      undefined
    );
  }
);

it('preserves planned nine fallback when ended context is temporarily missing', () => {
  setStore([], 3, 'back9');
  render(<ScorecardScoreContent {...props} holes={planned.slice(9, 12)} />);
  expect(TeamMatchPlayScoreView).toHaveBeenLastCalledWith(
    expect.objectContaining({ totalHoles: 9, plannedHoles: [], holesPlayed: 3 }),
    undefined
  );
});

it('forwards a null cutoff with planned store context', () => {
  setStore(planned, null);
  render(<ScorecardScoreContent {...props} />);
  expect(TeamMatchPlayScoreView).toHaveBeenLastCalledWith(
    expect.objectContaining({ totalHoles: 18, plannedHoles: planned, holesPlayed: null }),
    undefined
  );
});

it.each([null, 0, -1, 1.5, NaN, Infinity])(
  'preserves the original props count with normal/invalid end marker %s',
  (marker) => {
    setStore(planned, marker);
    render(<ScorecardScoreContent {...props} holes={planned.slice(0, 9)} />);
    expect(TeamMatchPlayScoreView).toHaveBeenLastCalledWith(
      expect.objectContaining({ totalHoles: 9 }),
      undefined
    );
  }
);

it('preserves the original empty props count without an end marker', () => {
  setStore([], null);
  render(<ScorecardScoreContent {...props} holes={[]} />);
  expect(TeamMatchPlayScoreView).toHaveBeenLastCalledWith(
    expect.objectContaining({ totalHoles: 0 }),
    undefined
  );
});

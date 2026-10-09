import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { NineType } from '@/types/database/enums';
import ViewRoundScreen from './index';
import { useViewRoundScreen } from './useViewRoundScreen';
import type { TabKey } from './types';

const mockScorecardProps = jest.fn();
const mockStatsProps = jest.fn();
const mockTableProps = jest.fn();
const mockDisplayProps = jest.fn();
const mockBoardProps = jest.fn();
const mockWolfProps = jest.fn();
const mockEditorProps = jest.fn();

jest.mock('./useViewRoundScreen', () => ({ useViewRoundScreen: jest.fn() }));
jest.mock('@/components/rounds/ViewRound', () => ({
  RoundDetailsTab: () => null,
  RoundScorecardTab: (props: Record<string, unknown>) => {
    mockScorecardProps(props);
    const { RoundScorecardTab } = jest.requireActual('@/components/rounds/ViewRound/RoundScorecardTab');
    return <RoundScorecardTab {...props} />;
  },
}));
jest.mock('./tabs/StatsTab', () => ({
  StatsTab: (props: Record<string, unknown>) => {
    mockStatsProps(props);
    const { StatsTab } = jest.requireActual('./tabs/StatsTab');
    return <StatsTab {...props} />;
  },
}));
jest.mock('@/components/scorecard', () => ({
  ...jest.requireActual('@/components/scorecard'),
  ScorecardTable: (props: Record<string, unknown>) => { mockTableProps(props); return null; },
}));
jest.mock('@/components/scorecard/MatchPlayScorecardTable', () => ({
  MatchPlayScorecardTable: (props: Record<string, unknown>) => { mockTableProps(props); return null; },
}));
jest.mock('@/components/leaderboard', () => ({
  RoundSubMatchLeaderboard: (props: Record<string, unknown>) => { mockBoardProps(props); return null; },
}));
jest.mock('./tabs/ScrambleTeamScoreTab', () => ({
  ScrambleTeamScoreTab: (props: Record<string, unknown>) => { mockDisplayProps(props); return null; },
}));
jest.mock('./tabs/ScrambleLeaderboardTab', () => ({
  ScrambleLeaderboardTab: (props: Record<string, unknown>) => { mockDisplayProps(props); return null; },
}));
jest.mock('./tabs/ShambleTeamScoresTab', () => ({
  ShambleTeamScoresTab: (props: Record<string, unknown>) => { mockDisplayProps(props); return null; },
}));
jest.mock('./tabs/ScrambleContributionsTab', () => ({
  ScrambleContributionsTab: (props: Record<string, unknown>) => { mockDisplayProps(props); return null; },
}));
jest.mock('@/components/features/shots/ShotLogList', () => ({
  ShotLogList: (props: Record<string, unknown>) => { mockDisplayProps(props); return null; },
}));
jest.mock('./tabs/WolfTab', () => ({
  WolfTab: (props: Record<string, unknown>) => { mockWolfProps(props); return null; },
}));
jest.mock('./EditStatsModal', () => ({
  EditStatsModal: (props: Record<string, unknown>) => { mockEditorProps(props); return null; },
}));
jest.mock('@/hooks/shots', () => ({ useDeleteShot: () => ({}), useSetShotClub: () => ({}) }));
jest.mock('@/hooks/queries/useBag', () => ({ useBag: () => ({ data: [] }) }));
jest.mock('@/hooks/useSocialAccess', () => ({ useSocialAccess: () => ({ isRestricted: false }) }));
jest.mock('../../admin/AddRoundScreen/components', () => ({ CourseSelectionModal: () => null }));
jest.mock('@/components/leagues/TagToLeagueBottomSheet', () => ({ TagToLeagueBottomSheet: () => null }));
jest.mock('@/components/features/bag/BagClubPickerSheet', () => ({ BagClubPickerSheet: () => null }));
jest.mock('@/components/subscription/FeatureLockCompact', () => ({
  FeatureLockCompact: ({ children }: { children: React.ReactNode }) => children,
}));

const holes = create18Holes();
const fullNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const backNumbers = [10, 11, 12, 13, 14, 15, 16, 17, 18];
const props = {} as React.ComponentProps<typeof ViewRoundScreen>;
const mockVm = {
  roundId: 'round-1',
  round: { id: 'round-1', status: 'completed', game_type: 'stableford', nine_type: 'full' as NineType,
    holes_played: null as number | null, course: { id: 'course-1', name: 'Course', holes, start_hole: 10 } },
  user: { id: 'p1' },
  userScorecardId: 'card-1',
  scorecards: [{ id: 'card-1', player_id: 'p1', player: { id: 'p1', name: 'Sam', handicap: 12 },
    scores: { '1': { strokes: 4 }, '10': { strokes: 4 }, '16': { strokes: 8 } } }],
  roundPlayers: [],
  tabs: [],
  activeTab: 'scorecard' as TabKey,
  statsVisibility: { showPutts: false, showFairwayHit: false, showGreenInRegulation: false,
    showBunkerShots: false, showHazards: false },
  getHeaderTitle: () => 'Round',
  getPlayerScore: () => undefined,
  isMatchPlayRound: true,
  isTeamMatchPlayRound: false,
  isSplitRound: false,
  isScrambleRound: true,
  isShambleRound: true,
  hasWolfGame: true,
  wolfSummary: { gameId: 'wolf-1' },
  matchPlayPlayers: { player1: { id: 'p1', name: 'Sam' }, player2: { id: 'p2', name: 'Ann' } },
};

type VmFixture = typeof mockVm;
function setVm(activeTab: TabKey, nineType: NineType = 'full', holesPlayed: number | null = null,
  overrides: Partial<VmFixture> = {}) {
  const vm = { ...mockVm, activeTab, round: { ...mockVm.round, nine_type: nineType, holes_played: holesPlayed }, ...overrides };
  jest.mocked(useViewRoundScreen).mockReturnValue(vm as unknown as ReturnType<typeof useViewRoundScreen>);
  return vm;
}
function holeNumbers(value: { number: number }[]) { return value.map(h => h.number); }
function lastProps(spy: jest.Mock) { return spy.mock.calls.at(-1)![0]; }

describe('ViewRound ordinary routing', () => {
  it('keeps full metadata at the scorecard boundary and planned holes at the shared table', () => {
    setVm('scorecard');
    render(<ViewRoundScreen {...props} />);
    expect(lastProps(mockScorecardProps).holes).toBe(holes);
    expect(holeNumbers(lastProps(mockTableProps).holes)).toEqual(fullNumbers);
    expect(lastProps(mockTableProps).holesPlayed).toBeNull();
    expect(lastProps(mockTableProps).startHole).toBe(10);
  });

  it('renders ordinary back-nine stats with the original course metadata', () => {
    setVm('stats', 'back9');
    render(<ViewRoundScreen {...props} />);
    expect(lastProps(mockStatsProps).holes).toBe(holes);
    expect(screen.queryByText('OUT')).toBeNull();
    expect(screen.getByText('IN')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
  });

  it('keeps the ordinary full singles match and its display offset', () => {
    setVm('match');
    render(<ViewRoundScreen {...props} />);
    expect(holeNumbers(lastProps(mockTableProps).holes)).toEqual(fullNumbers);
    expect(lastProps(mockTableProps)).toMatchObject({ holesPlayed: null, startHole: 10 });
  });

  it.each(['teamScores', 'scrambleContributions', 'shots'] as const)(
    'keeps physical back-nine numbers for ordinary %s', tab => {
      setVm(tab, 'back9');
      render(<ViewRoundScreen {...props} />);
      const received = lastProps(mockDisplayProps);
      expect(tab === 'shots' ? received.holeNumbers : holeNumbers(received.holes)).toEqual(backNumbers);
      if (tab === 'shots') expect(received.totalHoles).toBe(9);
    }
  );

  it.each(['scrambleTeamScore', 'scrambleLeaderboard'] as const)(
    'keeps ordinary full holes for %s', tab => {
      setVm(tab);
      render(<ViewRoundScreen {...props} />);
      expect(holeNumbers(lastProps(mockDisplayProps).holes)).toEqual(fullNumbers);
    }
  );

  it.each([{ isSplitRound: true }, { isTeamMatchPlayRound: true }])(
    'preserves the self-fetching match board for %s', overrides => {
      setVm('match', 'back9', 6, overrides);
      render(<ViewRoundScreen {...props} />);
      expect(mockTableProps).not.toHaveBeenCalled();
      expect(lastProps(mockBoardProps)).toMatchObject({ roundId: 'round-1', competitionId: null, currentUserId: 'p1' });
    }
  );

  it('preserves the Wolf summary branch', () => {
    setVm('wolf', 'back9', 6);
    render(<ViewRoundScreen {...props} />);
    expect(lastProps(mockWolfProps)).toEqual({ wolfSummary: mockVm.wolfSummary, hasWolfGame: true });
  });

  it('keeps the C5a current shape, current card and original full course metadata through cutoff changes', () => {
    setVm('stats', 'back9', 6);
    const ui = render(<ViewRoundScreen {...props} />);
    expect(lastProps(mockEditorProps)).toMatchObject({
      roundShape: { nine_type: 'back9', holes_played: 6 }, scorecard: mockVm.scorecards[0], holes,
    });
    const freshCard = { ...mockVm.scorecards[0], scores: { '1': { strokes: 5 }, '10': { strokes: 7 }, '16': { strokes: 9 } } };
    setVm('stats', 'back9', 2, { scorecards: [freshCard] });
    ui.rerender(<ViewRoundScreen {...props} />);
    expect(lastProps(mockEditorProps).scorecard).toBe(freshCard);
    expect(lastProps(mockEditorProps).holes).toBe(holes);
    expect(lastProps(mockEditorProps).roundShape).toEqual({ nine_type: 'back9', holes_played: 2 });
  });
});

describe('ViewRound ended scorecards', () => {
  it.each(['full', 'back9'] as const)(
    'keeps the %s planned shared-table context while forwarding cutoff-only refreshes', nineType => {
      setVm('scorecard', nineType, 6);
      const ui = render(<ViewRoundScreen {...props} />);
      expect(lastProps(mockScorecardProps).holes).toBe(holes);
      expect(holeNumbers(lastProps(mockTableProps).holes)).toEqual(nineType === 'full' ? fullNumbers : backNumbers);
      expect(lastProps(mockTableProps)).toMatchObject({ holesPlayed: 6, startHole: 10 });
      setVm('scorecard', nineType, 2);
      ui.rerender(<ViewRoundScreen {...props} />);
      expect(holeNumbers(lastProps(mockTableProps).holes)).toEqual(nineType === 'full' ? fullNumbers : backNumbers);
      expect(lastProps(mockTableProps).holesPlayed).toBe(2);
    }
  );
});

describe('ViewRound ended stats', () => {
  it.each(['full', 'back9'] as const)(
    'renders retained %s physical rows and follows cutoff-only changes', nineType => {
      setVm('stats', nineType, 6);
      const ui = render(<ViewRoundScreen {...props} />);
      expect(screen.queryByText(nineType === 'full' ? '7' : '16')).toBeNull();
      expect(screen.getByText(nineType === 'full' ? '6' : '15')).toBeTruthy();
      expect(lastProps(mockStatsProps).holes).toBe(holes);
      expect(lastProps(mockStatsProps)).toMatchObject({ nineType, holesPlayed: 6 });
      setVm('stats', nineType, 2);
      ui.rerender(<ViewRoundScreen {...props} />);
      expect(screen.queryByText(nineType === 'full' ? '6' : '15')).toBeNull();
      expect(screen.getByText(nineType === 'full' ? '2' : '11')).toBeTruthy();
      expect(lastProps(mockStatsProps).holesPlayed).toBe(2);
    }
  );
});

describe('ViewRound singles match context', () => {
  it.each(['full', 'back9'] as const)(
    'retains the %s planned match length and forwards changing cutoffs', nineType => {
      setVm('match', nineType, 6);
      const ui = render(<ViewRoundScreen {...props} />);
      expect(holeNumbers(lastProps(mockTableProps).holes)).toEqual(nineType === 'full' ? fullNumbers : backNumbers);
      expect(lastProps(mockTableProps)).toMatchObject({ holesPlayed: 6, startHole: 10 });
      setVm('match', nineType, 2);
      ui.rerender(<ViewRoundScreen {...props} />);
      expect(holeNumbers(lastProps(mockTableProps).holes)).toEqual(nineType === 'full' ? fullNumbers : backNumbers);
      expect(lastProps(mockTableProps).holesPlayed).toBe(2);
      setVm('match', nineType);
      ui.rerender(<ViewRoundScreen {...props} />);
      expect(holeNumbers(lastProps(mockTableProps).holes)).toEqual(nineType === 'full' ? fullNumbers : backNumbers);
      expect(lastProps(mockTableProps).holesPlayed).toBeNull();
    }
  );
});

describe('ViewRound played display context', () => {
  it.each(['teamScores', 'scrambleTeamScore', 'scrambleLeaderboard', 'scrambleContributions', 'shots'] as const)(
    'routes retained physical numbers to %s and updates them when only the cutoff changes', tab => {
      setVm(tab, 'back9', 6);
      const ui = render(<ViewRoundScreen {...props} />);
      const receivedNumbers = () => {
        const received = lastProps(mockDisplayProps);
        return tab === 'shots' ? received.holeNumbers : holeNumbers(received.holes);
      };
      expect(receivedNumbers()).toEqual([10, 11, 12, 13, 14, 15]);
      if (tab === 'shots') expect(lastProps(mockDisplayProps).totalHoles).toBe(6);
      setVm(tab, 'back9', 2);
      ui.rerender(<ViewRoundScreen {...props} />);
      expect(receivedNumbers()).toEqual([10, 11]);
      if (tab === 'shots') expect(lastProps(mockDisplayProps).totalHoles).toBe(2);
      setVm(tab, 'back9');
      ui.rerender(<ViewRoundScreen {...props} />);
      expect(receivedNumbers()).toEqual(backNumbers);
      if (tab === 'shots') expect(lastProps(mockDisplayProps).totalHoles).toBe(9);
      setVm(tab, 'full', 6);
      ui.rerender(<ViewRoundScreen {...props} />);
      expect(receivedNumbers()).toEqual([1, 2, 3, 4, 5, 6]);
      setVm(tab);
      ui.rerender(<ViewRoundScreen {...props} />);
      expect(receivedNumbers()).toEqual(fullNumbers);
    }
  );
});

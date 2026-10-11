import React from 'react';
import { fireEvent, render, screen, within } from '@/__tests__/utils/renderHelpers';
import ViewRoundScreen from './index';
import { useViewRoundScreen } from './useViewRoundScreen';

jest.mock('./useViewRoundScreen', () => ({ useViewRoundScreen: jest.fn() }));
jest.mock('@/components/rounds/ViewRound', () => ({ RoundDetailsTab: () => null, RoundScorecardTab: () => null }));
jest.mock('./EditStatsModal', () => ({ EditStatsModal: () => null }));
jest.mock('@/hooks/shots', () => ({ useDeleteShot: () => ({}), useSetShotClub: () => ({}) }));
jest.mock('@/hooks/queries/useBag', () => ({ useBag: () => ({ data: [] }) }));
jest.mock('@/hooks/useSocialAccess', () => ({ useSocialAccess: () => ({ isRestricted: false }) }));
jest.mock('../../admin/AddRoundScreen/components', () => ({ CourseSelectionModal: () => null }));
jest.mock('@/components/leagues/TagToLeagueBottomSheet', () => ({ TagToLeagueBottomSheet: () => null }));
jest.mock('@/components/features/bag/BagClubPickerSheet', () => ({ BagClubPickerSheet: () => null }));
jest.mock('@/components/subscription/FeatureLockCompact', () => ({
  FeatureLockCompact: ({ children }: { children: React.ReactNode }) => children,
}));

const props = {} as React.ComponentProps<typeof ViewRoundScreen>;
const handleEndRoundEarlyPress = jest.fn();

function setVm(
  round: Record<string, unknown> = {},
  vmOverrides: Record<string, unknown> = {}
) {
  const vm = {
    roundId: 'round-1',
    round: {
      id: 'round-1',
      status: 'in-progress',
      competition_id: null,
      game_type: 'stableford',
      nine_type: 'full',
      holes_played: null,
      course: { id: 'c1', name: 'Course', holes: [] },
      ...round,
    },
    user: { id: 'p1' },
    scorecards: [],
    roundPlayers: [],
    tabs: [],
    activeTab: 'scorecard',
    isUserPlaying: true,
    roundReadyToScore: true,
    userScorecardSubmitted: false,
    getHeaderTitle: () => 'Round',
    handleScoreRound: jest.fn(),
    handleEndRoundEarlyPress,
    ...vmOverrides,
  };
  jest.mocked(useViewRoundScreen).mockReturnValue(vm as unknown as ReturnType<typeof useViewRoundScreen>);
}

describe('ViewRound "End round early" shortcut', () => {
  beforeEach(() => handleEndRoundEarlyPress.mockClear());

  it('shows for an in-progress standalone round the user is playing and has not submitted', () => {
    setVm();
    render(<ViewRoundScreen {...props} />);
    fireEvent.press(screen.getByLabelText('End round early'));
    expect(handleEndRoundEarlyPress).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a competition round', { competition_id: 'comp-1' }, {}],
    ['a completed round', { status: 'completed' }, {}],
    ['an ended round', { holes_played: 6 }, {}],
    ['a submitted scorecard', {}, { userScorecardSubmitted: true }],
    ['a user who is not playing', {}, { isUserPlaying: false }],
    ['a round not ready to score', {}, { roundReadyToScore: false }],
  ])('is hidden for %s', (_label, round, vm) => {
    setVm(round, vm);
    render(<ViewRoundScreen {...props} />);
    expect(screen.queryByLabelText('End round early')).toBeNull();
  });

  it('renders End round early and Continue Scoring as children of one row', () => {
    setVm();
    render(<ViewRoundScreen {...props} />);
    const row = screen.getByTestId('score-actions-row');
    expect(within(row).getByLabelText('End round early')).toBeTruthy();
    expect(within(row).getByLabelText('Score this round')).toBeTruthy();
  });

  it('renders Continue Scoring on its own, with no row, when End round early is hidden', () => {
    setVm({ competition_id: 'comp-1' });
    render(<ViewRoundScreen {...props} />);
    expect(screen.queryByTestId('score-actions-row')).toBeNull();
    expect(screen.getByLabelText('Score this round')).toBeTruthy();
  });
});

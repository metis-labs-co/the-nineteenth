/**
 * PlayerScorecardScreen — live footer validates planned holes; ended rounds
 * submit from Review / Match Play Scorecard.
 */
import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import PlayerScorecardScreen from './index';
import type { Hole } from '@/types';

const mockFinalizeRound = jest.fn();
jest.mock('@/hooks/rounds/useFinalizeSubmittedRound', () => ({
  useFinalizeSubmittedRound: () => mockFinalizeRound,
}));

jest.mock('@/hooks/useStatsVisibilityWithTier', () => ({
  useStatsVisibilityWithTier: () => ({ showFairwayHit: false, showGreenInRegulation: false }),
}));

let mockIsReadOnly = false;
jest.mock('./hooks', () => ({
  usePlayerScorecard: () => ({
    player: { id: 'player-1', name: 'Ann', handicap: 10 },
    scorecard: { id: 'sc-1', playerId: 'player-1', scores: {} },
    playerStats: {},
    front9Holes: [],
    back9Holes: [],
    isLoading: false,
    isInitialized: true,
    isError: false,
    refetch: jest.fn(),
    isReadOnly: mockIsReadOnly,
    startHole: 1,
    isMultiBall: false,
    ballCount: 1,
    multiBallFront9: [],
    multiBallBack9: [],
    multiBallStats: null,
  }),
}));

jest.mock('./components', () => ({
  ScorecardPlayerHeader: () => null,
  ScorecardTable: () => null,
  ScorecardLoadingState: () => null,
  ScorecardLoadError: () => null,
  ScorecardPlayerNotFound: () => null,
  ScorecardNoScores: () => null,
}));

const HOLES = Array.from({ length: 18 }, (_, i) => ({
  number: i + 1,
  par: 4,
  strokeIndex: i + 1,
})) as unknown as Hole[];

const mockStoreState: Record<string, unknown> = {};
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: Object.assign(() => mockStoreState, { getState: () => mockStoreState }),
}));

function setStore(holesPlayed: number | null | undefined, completed = 18) {
  Object.assign(mockStoreState, {
    holes: HOLES, getCompletedHolesCount: () => completed,
    submitScorecards: jest.fn(), setCurrentHole: jest.fn(),
    groupScorecards: new Map(), resetRound: jest.fn(), holesPlayed,
  });
}

// Portal / Dialog aren't in the global react-native-paper mock.
jest.mock('react-native-paper', () => {
  const ReactLib = require('react');
  const actualModule = jest.requireActual('react-native-paper');
  const { View: RNView, Text: RNTextInner } = require('react-native');
  const Dialog = ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? ReactLib.createElement(RNView, null, children) : null;
  Dialog.Title = ({ children }: { children: React.ReactNode }) =>
    ReactLib.createElement(RNTextInner, null, children);
  Dialog.Content = ({ children }: { children: React.ReactNode }) =>
    ReactLib.createElement(RNView, null, children);
  Dialog.Actions = ({ children }: { children: React.ReactNode }) =>
    ReactLib.createElement(RNView, null, children);
  return {
    ...actualModule,
    Text: ({ children, style, ...props }: { children: React.ReactNode; style?: unknown }) =>
      ReactLib.createElement(RNTextInner, { style, ...props }, children),
    Portal: ({ children }: { children: React.ReactNode }) => ReactLib.createElement(RNView, null, children),
    Dialog,
  };
});

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn().mockReturnValue(() => {}),
} as any;
const mockRoute = { params: { playerId: 'player-1', roundId: 'round-1' } } as any;

describe('PlayerScorecardScreen — Submit footer', () => {
  beforeEach(() => { mockIsReadOnly = false; });

  it.each([null, undefined, 0, -3, 2.5, NaN])('shows the ordinary footer for an unset or invalid marker (%s)', (marker) => {
    setStore(marker);
    render(<PlayerScorecardScreen navigation={mockNavigation} route={mockRoute} />);
    expect(screen.getByText('Submit Scorecard')).toBeTruthy();
    expect(screen.queryByText('Complete all holes to submit')).toBeNull();
  });

  it('gates the ordinary footer on all planned holes', () => {
    setStore(null, 6);
    render(<PlayerScorecardScreen navigation={mockNavigation} route={mockRoute} />);
    expect(screen.getByText('Submit Scorecard')).toBeDisabled();
    expect(screen.getByText('Complete all holes to submit')).toBeTruthy();
  });

  it('hides the Submit footer once the round has been ended early', () => {
    setStore(6, 6);
    render(<PlayerScorecardScreen navigation={mockNavigation} route={mockRoute} />);
    expect(screen.queryByText('Submit Scorecard')).toBeNull();
    expect(screen.queryByText('Complete all holes to submit')).toBeNull();
  });

  it('updates the footer when only the local cutoff changes', () => {
    setStore(null, 6);
    const view = () => <PlayerScorecardScreen navigation={mockNavigation} route={mockRoute} />;
    const { rerender } = render(view());
    expect(screen.getByText('Complete all holes to submit')).toBeTruthy();
    mockStoreState.holesPlayed = 6;
    rerender(view());
    expect(screen.queryByText('Submit Scorecard')).toBeNull();
    expect(screen.queryByText('Complete all holes to submit')).toBeNull();
    mockStoreState.holesPlayed = 2.5;
    rerender(view());
    expect(screen.getByText('Submit Scorecard')).toBeDisabled();
    expect(screen.getByText('Complete all holes to submit')).toBeTruthy();
  });

  it.each([null, 6])('hides the footer in read-only mode (%s)', (marker) => {
    setStore(marker, 6);
    mockIsReadOnly = true;
    render(<PlayerScorecardScreen navigation={mockNavigation} route={mockRoute} />);
    expect(screen.queryByText('Submit Scorecard')).toBeNull();
    expect(screen.queryByText('Complete all holes to submit')).toBeNull();
  });
});

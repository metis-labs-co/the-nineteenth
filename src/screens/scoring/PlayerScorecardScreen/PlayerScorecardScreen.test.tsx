/**
 * PlayerScorecardScreen — submitting from a player's scorecard finalises the
 * round through the shared submit step (status → results → skins, or queued
 * offline) instead of marking the round completed after a single card.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@/__tests__/utils/renderHelpers';
import { supabase } from '@/services/supabase/client';
import PlayerScorecardScreen from './index';
import type { Hole } from '@/types';

const mockFinalizeRound = jest.fn();
jest.mock('@/hooks/rounds/useFinalizeSubmittedRound', () => ({
  useFinalizeSubmittedRound: () => mockFinalizeRound,
}));

// The pre-change screen imported this from the barrel; keeps the red step rendering.
jest.mock('@/hooks', () => ({
  useFinalizeSkinsForRound: () => ({
    finalizeSkinsForRound: jest.fn().mockResolvedValue({ finalized: false }),
  }),
}));

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
    })),
  },
}));

jest.mock('@/hooks/useStatsVisibilityWithTier', () => ({
  useStatsVisibilityWithTier: () => ({ showFairwayHit: false, showGreenInRegulation: false }),
}));

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
    isReadOnly: false,
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

const mockSubmitScorecards = jest.fn();
const mockStoreState = {
  holes: HOLES,
  getCompletedHolesCount: () => 18,
  submitScorecards: (...args: unknown[]) => mockSubmitScorecards(...args),
  setCurrentHole: jest.fn(),
  groupScorecards: new Map(),
  resetRound: jest.fn(),
};
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: Object.assign(() => mockStoreState, { getState: () => mockStoreState }),
}));

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

describe('PlayerScorecardScreen submit', () => {
  beforeEach(() => {
    mockSubmitScorecards.mockResolvedValue(undefined);
    mockFinalizeRound.mockResolvedValue({ completed: false, queued: false });
  });

  it('finalises the round through the shared submit step instead of writing the status itself', async () => {
    render(<PlayerScorecardScreen navigation={mockNavigation} route={mockRoute} />);

    await act(async () => {
      fireEvent.press(screen.getByText('Submit Scorecard'));
    });

    expect(mockSubmitScorecards).toHaveBeenCalledWith({ playerIds: ['player-1'] });
    expect(mockFinalizeRound).toHaveBeenCalledWith('round-1');
    expect(supabase.from).not.toHaveBeenCalledWith('rounds');
    expect(mockNavigation.reset).toHaveBeenCalled();
  });
});

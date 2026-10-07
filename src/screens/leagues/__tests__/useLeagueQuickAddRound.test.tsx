/**
 * useLeagueQuickAddRound — league rounds need a complete 18 (I12).
 *
 * A partial card must be stopped at review, before handleConfirmSave creates
 * the round and scorecard, and the preview must not show a differential for
 * it. Today, with a rated tee, a part-filled card saves successfully: the
 * preview shows about −39.3 (gross 29 against CR 72.5 / slope 125) and the
 * league row is tagged with that differential. A course with fewer than 18 holes is rejected at
 * selection — it could never produce a complete league card.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLeagueQuickAddRound } from '../LeagueQuickAddRoundScreen/useLeagueQuickAddRound';
import { create18Holes } from '@/__tests__/utils/testFixtures';

const mockShowAlert = jest.fn();
const mockMutateAsync = jest.fn();
const mockFrom = jest.fn();
const mockGetCurrentUser = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('@/hooks/useConfirmationDialog', () => ({
  useConfirmationDialog: () => ({ showAlert: mockShowAlert, dialogConfig: null, dismissDialog: jest.fn() }),
}));

jest.mock('@/hooks/useLeagues', () => ({
  useLeaguePlayers: () => ({ data: [] }),
}));

jest.mock('@/hooks/scorecard/useQuickScoreSubmit', () => ({
  useQuickScoreSubmit: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
  getCurrentUser: () => mockGetCurrentUser(),
}));

// create18Holes: par 72.
const HOLES = create18Holes();
const TEE = { name: 'Blue', color: 'blue', courseRating: 72.5, slopeRating: 125 };
const PLAYER = { id: 'player-1', name: 'Sam', handicap: 18, gender: 'male' as const };
const INCOMPLETE_MESSAGE = 'Enter a score for all 18 holes to add this round to a league.';
const SHORT_COURSE_MESSAGE = 'League rounds need an 18-hole course. Please select a different course.';

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

type HookResult = { current: ReturnType<typeof useLeagueQuickAddRound> };

function renderWizard(): HookResult {
  const { result } = renderHook(() => useLeagueQuickAddRound({ leagueId: 'league-1' }), {
    wrapper: makeWrapper(),
  });
  act(() => result.current.handleSelectPlayer(PLAYER));
  return result;
}

/** Walk the wizard to the score-entry step on the 18-hole course. */
function renderAtScoreEntry(): HookResult {
  const result = renderWizard();
  act(() =>
    result.current.handleSelectCourse({
      courseId: 'course-1',
      courseName: 'Test Course',
      clubName: 'Test Club',
      holes: HOLES,
      tees: [TEE],
    }),
  );
  act(() => result.current.handleSelectTee(TEE));
  return result;
}

/** Tap "+" until each listed hole reads one over par. */
function scoreBogeys(result: HookResult, holeNumbers: number[]) {
  act(() => {
    for (const n of holeNumbers) {
      for (let i = 0; i < HOLES[n - 1].par + 1; i++) result.current.incrementScore(n);
    }
  });
}

describe('useLeagueQuickAddRound — complete 18 required', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts an 18-hole course (I12 lock)', () => {
    const result = renderAtScoreEntry();

    expect(result.current.step).toBe('scores');
    expect(mockShowAlert).not.toHaveBeenCalled();
  });

  it('reaches review with a complete card and previews its differential (I12 lock)', () => {
    const result = renderAtScoreEntry();
    scoreBogeys(result, range(1, 18));

    act(() => result.current.handleGoToReview());

    expect(result.current.step).toBe('review');
    // (113 / 125) × (90 − 72.5) = 15.8
    expect(result.current.handicapDifferential).toBe(15.8);
    expect(mockShowAlert).not.toHaveBeenCalled();
  });

  it('rejects a course with fewer than 18 holes', () => {
    const result = renderWizard();

    act(() =>
      result.current.handleSelectCourse({
        courseId: 'course-9',
        courseName: 'Nine Hole Course',
        clubName: 'Test Club',
        holes: HOLES.slice(0, 9),
        tees: [TEE],
      }),
    );

    expect(result.current.step).toBe('course');
    expect(result.current.selectedCourse).toBeNull();
    expect(mockShowAlert).toHaveBeenCalledWith('Course Not Eligible', SHORT_COURSE_MESSAGE);
  });

  it('blocks review until all 18 holes are scored', () => {
    const result = renderAtScoreEntry();
    scoreBogeys(result, range(1, 6));

    act(() => result.current.handleGoToReview());

    expect(result.current.step).toBe('scores');
    expect(mockShowAlert).toHaveBeenCalledWith('Incomplete Round', INCOMPLETE_MESSAGE);
  });

  it('previews no differential for a part-filled card', () => {
    const result = renderAtScoreEntry();
    scoreBogeys(result, range(1, 6));

    // Before the gate: gross 29 → (113 / 125) × (29 − 72.5) = −39.3
    expect(result.current.handicapDifferential).toBeNull();
  });

  it('never writes a round or scorecard for a part-filled card on save', async () => {
    const result = renderAtScoreEntry();
    scoreBogeys(result, range(1, 6));

    await act(async () => {
      await result.current.handleConfirmSave();
    });

    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockShowAlert).toHaveBeenCalledWith('Incomplete Round', INCOMPLETE_MESSAGE);
  });
});

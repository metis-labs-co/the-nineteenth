/**
 * useViewRoundHandlers — the derived header title for a solo standalone round.
 * A round ended early never counts toward the handicap index, so it is a
 * "Practice Round" whatever its handicap source (spec R22).
 */
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundWithCourse } from '@/hooks/useRoundDetails';
import { useViewRoundHandlers } from './useViewRoundHandlers';

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));


// Minimal round factory — only the fields getHeaderTitle reads matter.
function makeRound(overrides: Partial<RoundWithCourse> = {}): RoundWithCourse {
  return {
    id: 'round-1',
    name: null,
    competition_id: null,
    status: 'completed',
    nine_type: 'full',
    handicap_source: 'profile',
    holes_played: null,
    ...overrides,
  } as unknown as RoundWithCourse;
}

function headerTitle(
  round: RoundWithCourse,
  overrides: Partial<Parameters<typeof useViewRoundHandlers>[0]> = {}
) {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const noop = jest.fn();
  const { result } = renderHook(
    () =>
      useViewRoundHandlers({
        roundId: 'round-1',
        navigation: {} as NativeStackNavigationProp<
          RootStackParamList,
          'ViewRound'
        >,
        isStandalone: true,
        isMatchPlayRound: false,
        isTeamMatchPlayRound: false,
        hasSkinsGame: false,
        hasWolfGame: false,
        round,
        scorecards: [],
        roundPlayers: [{ id: 'player-1' }],
        refetchRound: noop,
        refetchScorecards: noop,
        refetchPlayers: noop,
        refetchMatchPlay: noop,
        refetchSkinsResults: noop,
        refetchSkinsGame: noop,
        refetchWolfSummary: noop,
        setShowCourseModal: noop,
        setCourseSearchQuery: noop,
        setShowTagLeagueSheet: noop,
        ...overrides,
      }),
    { wrapper }
  );
  return result.current.getHeaderTitle();
}

describe('useViewRoundHandlers — solo round header title', () => {
  it('titles a solo round by its handicap source (locks current behaviour)', () => {
    expect(headerTitle(makeRound())).toBe('Handicap Round');
    expect(headerTitle(makeRound({ handicap_source: 'none' }))).toBe(
      'Practice Round'
    );
  });
});

describe('ordinary header compatibility', () => {
  it.each(['profile', 'calculated', 'none', null, undefined] as const)(
    'keeps source %s titles',
    (source) => {
      expect(headerTitle(makeRound({ handicap_source: source }))).toBe(
        source && source !== 'none' ? 'Handicap Round' : 'Practice Round'
      );
    }
  );
  it.each([0, -1, 1.5, NaN])('keeps invalid marker %s ordinary', (marker) => {
    expect(headerTitle(makeRound({ holes_played: marker }))).toBe(
      'Handicap Round'
    );
  });
  it('preserves custom names and competition titles even with end metadata', () => {
    expect(
      headerTitle(makeRound({ name: ' Sunday golf ', holes_played: 6 }))
    ).toBe('Sunday golf');
    expect(
      headerTitle(makeRound({ round_number: 2, holes_played: 6 }), {
        isStandalone: false,
      })
    ).toBe('Round 2');
    expect(
      headerTitle(makeRound({ holes_played: 6 }), {
        roundPlayers: [{ id: 'p1' }, { id: 'p2' }],
      })
    ).toBe('Match');
  });
  it.each([
    { hasSkinsGame: true, title: 'Skins Match' },
    { hasWolfGame: true, title: 'Wolf Game' },
    { hasSkinsGame: true, hasWolfGame: true, title: 'Skins & Wolf' },
  ])('preserves side-game title $title', ({ title, ...overrides }) => {
    expect(headerTitle(makeRound({ holes_played: 6 }), overrides)).toBe(title);
  });
});

describe('useViewRoundHandlers — scoring routes', () => {
  function handlers(overrides: Partial<Parameters<typeof useViewRoundHandlers>[0]> = {}) {
    const navigate = jest.fn();
    const noop = jest.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useViewRoundHandlers({
          roundId: 'round-1',
          navigation: { navigate } as unknown as NativeStackNavigationProp<RootStackParamList, 'ViewRound'>,
          isStandalone: true,
          isMatchPlayRound: false,
          isTeamMatchPlayRound: false,
          hasSkinsGame: false,
          hasWolfGame: false,
          round: makeRound({ status: 'in-progress', team1_id: 't1', team2_id: 't2' } as Partial<RoundWithCourse>),
          scorecards: [],
          roundPlayers: [],
          refetchRound: noop,
          refetchScorecards: noop,
          refetchPlayers: noop,
          refetchMatchPlay: noop,
          refetchSkinsResults: noop,
          refetchSkinsGame: noop,
          refetchWolfSummary: noop,
          setShowCourseModal: noop,
          setCourseSearchQuery: noop,
          setShowTagLeagueSheet: noop,
          ...overrides,
        }),
      { wrapper }
    );
    return { result, navigate };
  }

  it('keeps handleScoreRound params unchanged (no openEndRoundEarly)', () => {
    const { result, navigate } = handlers();
    result.current.handleScoreRound();
    expect(navigate).toHaveBeenCalledWith('Scorecard', { roundId: 'round-1', competitionId: 'standalone' });
  });

  it.each([
    ['Scorecard', {}, { roundId: 'round-1', competitionId: 'standalone' }],
    [
      'MatchPlayScoring',
      { isMatchPlayRound: true },
      { roundId: 'round-1', player1Id: undefined, player2Id: undefined },
    ],
    [
      'TeamMatchPlayScoring',
      { isTeamMatchPlayRound: true },
      { roundId: 'round-1', team1Id: 't1', team2Id: 't2' },
    ],
  ])('handleEndRoundEarlyPress routes to %s with openEndRoundEarly', (screenName, overrides, params) => {
    const { result, navigate } = handlers(overrides);
    result.current.handleEndRoundEarlyPress();
    expect(navigate).toHaveBeenCalledWith(screenName, { ...params, openEndRoundEarly: true });
  });
});

describe('ended solo round header title', () => {
  it.each(['profile', 'calculated', 'none', null, undefined] as const)(
    'titles valid ended source %s Practice',
    (source) => {
      expect(
        headerTitle(makeRound({ handicap_source: source, holes_played: 6 }))
      ).toBe('Practice Round');
    }
  );
});

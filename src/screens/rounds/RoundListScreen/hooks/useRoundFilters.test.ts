/**
 * Covers the screen-wide scope filter: it must narrow both the active and the
 * completed lists, and compose with the Recent Rounds type filter.
 */

import { renderHook, act } from '@testing-library/react-native';
import {
  useRoundFilters,
  matchesRoundScope,
  isCompetitionRoundItem,
} from './useRoundFilters';
import type { RoundItem, RoundListData, RoundTypeFilter } from '../types';

function round(overrides: Partial<RoundItem> & { id: string }): RoundItem {
  return {
    course: { id: 'course-1', name: 'Royal Melbourne' },
    status: 'completed',
    gameType: 'stableford',
    roundNumber: 1,
    totalRounds: 1,
    holesCompleted: 18,
    totalHoles: 18,
    isStandalone: true,
    ...overrides,
  } as RoundItem;
}

const data: RoundListData = {
  active: [
    round({ id: 'social-active', status: 'upcoming' }),
    round({
      id: 'comp-active',
      status: 'upcoming',
      isStandalone: false,
      competition: { id: 'comp-1', name: 'Winter Cup' },
    }),
  ],
  history: [
    round({ id: 'social-done', handicapSource: 'none' }),
    round({
      id: 'comp-done',
      isStandalone: false,
      competition: { id: 'comp-1', name: 'Winter Cup' },
      handicapSource: 'profile',
    }),
  ],
};

describe('matchesRoundScope', () => {
  it('lets everything through on "all"', () => {
    expect(matchesRoundScope(true, 'all')).toBe(true);
    expect(matchesRoundScope(false, 'all')).toBe(true);
  });

  it('keeps only competition rounds on "comps"', () => {
    expect(matchesRoundScope(true, 'comps')).toBe(true);
    expect(matchesRoundScope(false, 'comps')).toBe(false);
  });

  it('keeps only social rounds on "social"', () => {
    expect(matchesRoundScope(true, 'social')).toBe(false);
    expect(matchesRoundScope(false, 'social')).toBe(true);
  });
});

describe('isCompetitionRoundItem', () => {
  it('treats an explicitly standalone round as social', () => {
    expect(isCompetitionRoundItem(round({ id: 'a', isStandalone: true }))).toBe(false);
  });

  it('treats isStandalone false as a competition round', () => {
    expect(isCompetitionRoundItem(round({ id: 'a', isStandalone: false }))).toBe(true);
  });

  it('treats a round carrying a competition as a competition round', () => {
    const item = round({
      id: 'a',
      isStandalone: undefined,
      competition: { id: 'comp-1', name: 'Winter Cup' },
    });
    expect(isCompetitionRoundItem(item)).toBe(true);
  });
});

describe('useRoundFilters', () => {
  it('shows both social and competition rounds by default', () => {
    const { result } = renderHook(() => useRoundFilters(data));

    expect(result.current.roundScope).toBe('all');
    expect(result.current.activeRounds.map((r) => r.id)).toEqual([
      'social-active',
      'comp-active',
    ]);
    expect(result.current.filteredHistoryRounds.map((r) => r.id)).toEqual([
      'social-done',
      'comp-done',
    ]);
  });

  it('scopes the active list as well as history, not just Recent Rounds', () => {
    const { result } = renderHook(() => useRoundFilters(data));

    act(() => result.current.setRoundScope('social'));

    expect(result.current.activeRounds.map((r) => r.id)).toEqual(['social-active']);
    expect(result.current.filteredHistoryRounds.map((r) => r.id)).toEqual(['social-done']);
  });

  it('narrows to competition rounds on "comps"', () => {
    const { result } = renderHook(() => useRoundFilters(data));

    act(() => result.current.setRoundScope('comps'));

    expect(result.current.activeRounds.map((r) => r.id)).toEqual(['comp-active']);
    expect(result.current.filteredHistoryRounds.map((r) => r.id)).toEqual(['comp-done']);
  });

  it('applies the type filter within the current scope', () => {
    const { result } = renderHook(() => useRoundFilters(data));

    act(() => result.current.setRoundScope('comps'));
    act(() => result.current.setRoundTypeFilter('practice'));

    // The only practice round is social, so a comps scope leaves nothing.
    expect(result.current.filteredHistoryRounds).toEqual([]);

    act(() => result.current.setRoundTypeFilter('handicap'));
    expect(result.current.filteredHistoryRounds.map((r) => r.id)).toEqual(['comp-done']);
  });

  it('honours an initial scope', () => {
    const { result } = renderHook(() => useRoundFilters(data, 'all', 'social'));

    expect(result.current.roundScope).toBe('social');
    expect(result.current.filteredHistoryRounds.map((r) => r.id)).toEqual(['social-done']);
  });
});

function filteredIds(history: RoundItem[], filter: RoundTypeFilter): string[] {
  const { result } = renderHook(() =>
    useRoundFilters({ active: [], history }, filter)
  );
  return result.current.filteredHistoryRounds.map((r) => r.id);
}

describe('ordinary round type compatibility', () => {
  const history = ['profile', 'calculated', 'none', null, undefined].map(
    (source, index) =>
      round({
        id: `source-${index}`,
        handicapSource: source,
        nineType: 'back9',
        totalHoles: 9,
      })
  );
  it('preserves all source defaults and all/nine filters', () => {
    expect(filteredIds(history, 'handicap')).toEqual([
      'source-0',
      'source-1',
      'source-3',
      'source-4',
    ]);
    expect(filteredIds(history, 'practice')).toEqual(['source-2']);
    expect(filteredIds(history, 'all')).toEqual(history.map((r) => r.id));
    expect(filteredIds(history, 'ninehole')).toEqual(history.map((r) => r.id));
  });
  it.each([0, -1, 1.5, NaN])('keeps invalid marker %s ordinary', (marker) => {
    const history = [
      round({
        id: 'invalid',
        handicapSource: 'profile',
        nineType: 'back9',
        holesPlayed: marker,
      }),
    ];
    expect(filteredIds(history, 'handicap')).toEqual(['invalid']);
    expect(filteredIds(history, 'practice')).toEqual([]);
    expect(filteredIds(history, 'ninehole')).toEqual(['invalid']);
  });
});

describe('useRoundFilters — rounds ended early', () => {
  // Every round is a completed standalone round. The two `ended-*` rounds were
  // ended after 6 holes (RoundListCardData.holesPlayed, B9a).
  const endedData: RoundListData = {
    active: [],
    history: [
      round({
        id: 'full-handicap',
        handicapSource: 'profile',
        nineType: 'full',
      }),
      round({
        id: 'ended-full',
        handicapSource: 'profile',
        nineType: 'full',
        holesPlayed: 6,
      }),
      round({
        id: 'back9',
        handicapSource: 'profile',
        nineType: 'back9',
        totalHoles: 9,
      }),
      round({
        id: 'ended-back9',
        handicapSource: 'profile',
        nineType: 'back9',
        totalHoles: 9,
        holesPlayed: 6,
      }),
      round({ id: 'practice', handicapSource: 'none', nineType: 'full' }),
    ],
  };

  function filteredIds(filter: RoundTypeFilter): string[] {
    const { result } = renderHook(() => useRoundFilters(endedData, filter));
    return result.current.filteredHistoryRounds.map((r) => r.id);
  }

  it('keeps every round under "all" (locks current behaviour)', () => {
    expect(filteredIds('all')).toEqual([
      'full-handicap',
      'ended-full',
      'back9',
      'ended-back9',
      'practice',
    ]);
  });

  it('lists ended-early rounds under Practice, never under Handicap', () => {
    // Before: handicap = all four 'profile' rounds; practice = ['practice'].
    expect(filteredIds('handicap')).toEqual(['full-handicap', 'back9']);
    expect(filteredIds('practice')).toEqual([
      'ended-full',
      'ended-back9',
      'practice',
    ]);
  });

  it('keeps ended-early rounds out of the 9-hole filter', () => {
    // Before: ['back9', 'ended-back9'].
    expect(filteredIds('ninehole')).toEqual(['back9']);
  });
});

describe('ended marker type-filter consistency', () => {
  it.each(['profile', 'calculated', 'none', null, undefined])(
    'makes ended source %s Practice and preserves raw metadata',
    (handicapSource) => {
      const history = [
        round({
          id: 'ended',
          handicapSource,
          nineType: 'back9',
          holesPlayed: 6,
        }),
      ];
      expect(filteredIds(history, 'practice')).toEqual(['ended']);
      expect(filteredIds(history, 'handicap')).toEqual([]);
      expect(filteredIds(history, 'ninehole')).toEqual([]);
      expect(history[0].holesPlayed).toBe(6);
    }
  );
  it('keeps full eighteen ended at nine outside the nine category', () => {
    const history = [
      round({
        id: 'ended18',
        handicapSource: 'profile',
        nineType: 'full',
        holesPlayed: 9,
      }),
    ];
    expect(filteredIds(history, 'ninehole')).toEqual([]);
    expect(filteredIds(history, 'practice')).toEqual(['ended18']);
  });
  it('keeps side-game, multiplayer and match-play filters unchanged for ended rounds', () => {
    const history = [
      round({ id: 'skins', hasSkins: true, holesPlayed: 6 }),
      round({ id: 'wolf', hasWolf: true, holesPlayed: 6 }),
      round({
        id: 'match',
        players: [
          { id: 'p1', name: 'Sam' },
          { id: 'p2', name: 'Ann' },
        ],
        gameType: 'match-play',
        holesPlayed: 6,
      }),
    ];
    expect(filteredIds(history, 'skins')).toEqual(['skins']);
    expect(filteredIds(history, 'wolf')).toEqual(['wolf']);
    expect(filteredIds(history, 'match')).toEqual(['match']);
    expect(filteredIds(history, 'matchplay')).toEqual(['match']);
  });
});

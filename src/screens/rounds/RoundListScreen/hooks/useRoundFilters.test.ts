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
import type { RoundItem, RoundListData } from '../types';

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

/**
 * Covers the "not played" rule: a competition round whose scheduled date
 * passed while it was still upcoming.
 */

import { isNotPlayedRound, splitActiveAndHistory } from './notPlayedRounds';
import type { RoundItem } from '../types';

const TODAY = '2026-09-02';

function comp(overrides: Partial<RoundItem> = {}): RoundItem {
  return {
    id: 'round-1',
    course: { id: 'course-1', name: 'Royal Melbourne' },
    competition: { id: 'comp-1', name: 'Winter Cup' },
    isStandalone: false,
    status: 'upcoming',
    date: '2026-08-01',
    gameType: 'stableford',
    roundNumber: 1,
    totalRounds: 4,
    holesCompleted: 0,
    totalHoles: 18,
    ...overrides,
  } as RoundItem;
}

describe('isNotPlayedRound', () => {
  it('flags a competition round scheduled before today and never started', () => {
    expect(isNotPlayedRound(comp(), TODAY)).toBe(true);
  });

  it('leaves a future competition round alone', () => {
    expect(isNotPlayedRound(comp({ date: '2026-09-20' }), TODAY)).toBe(false);
  });

  it("leaves today's round alone — it can still be played", () => {
    expect(isNotPlayedRound(comp({ date: TODAY }), TODAY)).toBe(false);
  });

  it('does not flag a round somebody already started', () => {
    expect(isNotPlayedRound(comp({ status: 'in-progress' }), TODAY)).toBe(false);
  });

  it('does not flag a completed round', () => {
    expect(isNotPlayedRound(comp({ status: 'completed' }), TODAY)).toBe(false);
  });

  it('does not flag standalone rounds — the owner can still start or delete them', () => {
    const standalone = comp({ isStandalone: true, competition: undefined });
    expect(isNotPlayedRound(standalone, TODAY)).toBe(false);
  });

  it('does not flag an undated competition round', () => {
    expect(isNotPlayedRound(comp({ date: null }), TODAY)).toBe(false);
  });

  it('reads the date off an ISO timestamp', () => {
    expect(isNotPlayedRound(comp({ date: '2026-08-01T22:00:00.000Z' }), TODAY)).toBe(true);
  });

  it('formats a Date in local time rather than slicing a UTC string', () => {
    // Local midnight on the 1st; a UTC slice would read the 31st west of UTC.
    const localDate = new Date(2026, 7, 1);
    expect(isNotPlayedRound(comp({ date: localDate }), TODAY)).toBe(true);
    expect(isNotPlayedRound(comp({ date: new Date(2026, 8, 20) }), TODAY)).toBe(false);
  });

  it('ignores an unparseable date string rather than guessing', () => {
    expect(isNotPlayedRound(comp({ date: 'not a date' }), TODAY)).toBe(false);
  });

  it('defaults to the current local day when no "today" is passed', () => {
    expect(isNotPlayedRound(comp({ date: '2000-01-01' }))).toBe(true);
    expect(isNotPlayedRound(comp({ date: '2999-01-01' }))).toBe(false);
  });
});

describe('splitActiveAndHistory', () => {
  it('sends a not-played competition round to history, not the upcoming list', () => {
    const missed = comp({ id: 'missed', date: '2026-08-01' });
    const { active, history } = splitActiveAndHistory([missed], TODAY);

    expect(active).toEqual([]);
    expect(history.map((r) => r.id)).toEqual(['missed']);
  });

  it('marks the round so the card can show why it has no score', () => {
    const missed = comp({ id: 'missed', date: '2026-08-01' });
    splitActiveAndHistory([missed], TODAY);

    expect(missed.notPlayed).toBe(true);
  });

  it('keeps future competition rounds in the active list', () => {
    const upcoming = comp({ id: 'upcoming', date: '2026-09-20' });
    const { active, history } = splitActiveAndHistory([upcoming], TODAY);

    expect(active.map((r) => r.id)).toEqual(['upcoming']);
    expect(history).toEqual([]);
    expect(upcoming.notPlayed).toBeUndefined();
  });

  it('keeps a past-dated standalone round actionable', () => {
    const stale = comp({
      id: 'stale-social',
      date: '2026-08-01',
      isStandalone: true,
      competition: undefined,
    });
    const { active, history } = splitActiveAndHistory([stale], TODAY);

    expect(active.map((r) => r.id)).toEqual(['stale-social']);
    expect(history).toEqual([]);
  });

  it('orders history most recent first, interleaving played and not-played', () => {
    const { history } = splitActiveAndHistory(
      [
        comp({ id: 'missed-aug', date: '2026-08-01' }),
        comp({ id: 'played-jul', date: '2026-07-01', status: 'completed' }),
        comp({ id: 'played-sep', date: '2026-09-01', status: 'completed' }),
      ],
      TODAY
    );

    expect(history.map((r) => r.id)).toEqual(['played-sep', 'missed-aug', 'played-jul']);
  });

  it('puts in-progress rounds at the head of the active list', () => {
    const { active } = splitActiveAndHistory(
      [
        comp({ id: 'later', date: '2026-09-20' }),
        comp({ id: 'live', date: '2026-09-25', status: 'in-progress' }),
      ],
      TODAY
    );

    expect(active.map((r) => r.id)).toEqual(['live', 'later']);
  });
});

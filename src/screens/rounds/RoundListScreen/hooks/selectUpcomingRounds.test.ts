/**
 * Covers the "next round per competition" rule for the upcoming section.
 */

import { selectUpcomingRounds } from './selectUpcomingRounds';
import type { RoundItem } from '../types';

function round(overrides: Partial<RoundItem> & { id: string }): RoundItem {
  return {
    course: { id: 'course-1', name: 'Royal Melbourne' },
    status: 'upcoming',
    gameType: 'stableford',
    roundNumber: 1,
    totalRounds: 1,
    holesCompleted: 0,
    totalHoles: 18,
    isStandalone: true,
    ...overrides,
  } as RoundItem;
}

function comp(id: string, competitionId: string, date: string | null, roundNumber = 1): RoundItem {
  return round({
    id,
    date,
    roundNumber,
    isStandalone: false,
    competition: { id: competitionId, name: 'Winter Cup' },
  });
}

describe('selectUpcomingRounds', () => {
  it('drops in-progress rounds (they render in the carousel)', () => {
    const result = selectUpcomingRounds([
      round({ id: 'a', status: 'in-progress' }),
      round({ id: 'b', status: 'upcoming' }),
    ]);

    expect(result.map((r) => r.id)).toEqual(['b']);
  });

  it('keeps every standalone upcoming round', () => {
    const result = selectUpcomingRounds([
      round({ id: 'a', date: '2026-09-10' }),
      round({ id: 'b', date: '2026-09-11' }),
      round({ id: 'c', date: '2026-09-12' }),
    ]);

    expect(result.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps only the earliest upcoming round per competition', () => {
    // Date-descending, matching the order useRoundList returns.
    const result = selectUpcomingRounds([
      comp('r3', 'comp-1', '2026-10-01', 3),
      comp('r2', 'comp-1', '2026-09-15', 2),
      comp('r1', 'comp-1', '2026-09-05', 1),
    ]);

    expect(result.map((r) => r.id)).toEqual(['r1']);
  });

  it('picks the next round independently for each competition', () => {
    const result = selectUpcomingRounds([
      comp('a2', 'comp-a', '2026-10-01', 2),
      comp('b2', 'comp-b', '2026-09-20', 2),
      comp('a1', 'comp-a', '2026-09-05', 1),
      comp('b1', 'comp-b', '2026-09-10', 1),
    ]);

    expect(result.map((r) => r.id).sort()).toEqual(['a1', 'b1']);
  });

  it('preserves the incoming order of the rounds it keeps', () => {
    const result = selectUpcomingRounds([
      round({ id: 'solo-late', date: '2026-10-01' }),
      comp('r2', 'comp-1', '2026-09-15', 2),
      comp('r1', 'comp-1', '2026-09-05', 1),
      round({ id: 'solo-early', date: '2026-09-01' }),
    ]);

    expect(result.map((r) => r.id)).toEqual(['solo-late', 'r1', 'solo-early']);
  });

  it('sorts undated competition rounds last, so a dated one wins', () => {
    const result = selectUpcomingRounds([
      comp('undated', 'comp-1', null, 1),
      comp('dated', 'comp-1', '2026-09-15', 2),
    ]);

    expect(result.map((r) => r.id)).toEqual(['dated']);
  });

  it('falls back to round number when neither round has a date', () => {
    const result = selectUpcomingRounds([
      comp('r2', 'comp-1', null, 2),
      comp('r1', 'comp-1', null, 1),
    ]);

    expect(result.map((r) => r.id)).toEqual(['r1']);
  });

  it('keeps competition rounds whose competition failed to join', () => {
    // isStandalone false but no competition object — grouping is impossible,
    // so the round is kept rather than silently hidden.
    const orphan = round({ id: 'orphan', isStandalone: false, competition: undefined });

    expect(selectUpcomingRounds([orphan]).map((r) => r.id)).toEqual(['orphan']);
  });
});

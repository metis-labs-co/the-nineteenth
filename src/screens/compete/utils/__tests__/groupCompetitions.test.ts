import { groupCompetitions, type CompetitionItem } from '../groupCompetitions';

const NOW = new Date('2026-06-11T10:00:00Z');

function comp(overrides: Partial<CompetitionItem>): CompetitionItem {
  return {
    id: 'c1',
    name: 'Test Comp',
    status: 'active',
    rounds: 1,
    players: 4,
    isOrganizer: true,
    startDate: null,
    ...overrides,
  };
}

describe('groupCompetitions', () => {
  it('puts in-progress statuses in active regardless of date', () => {
    const result = groupCompetitions(
      [comp({ id: 'a', status: 'in_progress', startDate: '2026-07-01' })],
      [],
      NOW
    );
    expect(result.active.map((c) => c.id)).toEqual(['a']);
    expect(result.upcoming).toEqual([]);
  });

  it('puts past/today start dates in active and future dates in upcoming', () => {
    const result = groupCompetitions(
      [
        comp({ id: 'past', status: 'upcoming', startDate: '2026-06-01' }),
        comp({ id: 'today', status: 'upcoming', startDate: '2026-06-11' }),
        comp({ id: 'future', status: 'upcoming', startDate: '2026-06-20' }),
      ],
      [],
      NOW
    );
    expect(result.active.map((c) => c.id)).toEqual(['past', 'today']);
    expect(result.upcoming.map((c) => c.id)).toEqual(['future']);
  });

  it('puts drafts without a start date in upcoming', () => {
    const result = groupCompetitions(
      [comp({ id: 'd', status: 'draft', startDate: null })],
      [],
      NOW
    );
    expect(result.upcoming.map((c) => c.id)).toEqual(['d']);
  });

  it('groups completed and excludes cancelled', () => {
    const result = groupCompetitions(
      [
        comp({ id: 'done', status: 'completed', startDate: '2026-05-01' }),
        comp({ id: 'gone', status: 'cancelled', startDate: '2026-05-01' }),
      ],
      [],
      NOW
    );
    expect(result.completed.map((c) => c.id)).toEqual(['done']);
    expect(result.active).toEqual([]);
    expect(result.upcoming).toEqual([]);
  });

  it('merges my and joined lists, preferring the organizer copy on duplicate ids', () => {
    const result = groupCompetitions(
      [comp({ id: 'dup', isOrganizer: true })],
      [comp({ id: 'dup', isOrganizer: false }), comp({ id: 'j1', isOrganizer: false })],
      NOW
    );
    const dup = result.active.find((c) => c.id === 'dup');
    expect(dup?.isOrganizer).toBe(true);
    expect(result.active).toHaveLength(2);
  });

  it('sorts active/upcoming earliest-first (null dates last) and completed most-recent-first', () => {
    const result = groupCompetitions(
      [
        comp({ id: 'u2', status: 'upcoming', startDate: '2026-08-01' }),
        comp({ id: 'u1', status: 'upcoming', startDate: '2026-07-01' }),
        comp({ id: 'u3', status: 'draft', startDate: null }),
        comp({ id: 'done1', status: 'completed', startDate: '2026-01-01' }),
        comp({ id: 'done2', status: 'completed', startDate: '2026-03-01' }),
      ],
      [],
      NOW
    );
    expect(result.upcoming.map((c) => c.id)).toEqual(['u1', 'u2', 'u3']);
    expect(result.completed.map((c) => c.id)).toEqual(['done2', 'done1']);
  });

  it('handles undefined inputs', () => {
    const result = groupCompetitions(undefined, undefined, NOW);
    expect(result).toEqual({ active: [], upcoming: [], completed: [] });
  });

  /**
   * Regression: on Australian devices (UTC+10/+11) the local morning of a start
   * date falls on the *previous* UTC day.  The comp must be classified as active
   * as soon as the local calendar day matches the startDate, not only after UTC
   * midnight of that date.
   *
   * We construct `now` from LOCAL components (new Date(year, month, day, ...)) so
   * the test is timezone-independent: the local date of NOW_MORNING is always
   * June 12 regardless of where CI runs.
   */
  it('classifies a comp as active on its start day even when local morning precedes UTC midnight (timezone regression)', () => {
    // Local June 12, 07:00 — on UTC+10 this is 2026-06-11T21:00Z (UTC still June 11)
    const NOW_MORNING = new Date(2026, 5, 12, 7, 0, 0); // month is 0-indexed

    const result = groupCompetitions(
      [
        comp({ id: 'starts-today', status: 'upcoming', startDate: '2026-06-12' }),
        comp({ id: 'starts-tomorrow', status: 'upcoming', startDate: '2026-06-13' }),
      ],
      [],
      NOW_MORNING
    );

    expect(result.active.map((c) => c.id)).toEqual(['starts-today']);
    expect(result.upcoming.map((c) => c.id)).toEqual(['starts-tomorrow']);
  });
});

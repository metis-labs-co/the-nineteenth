import {
  computeUpcomingWithin24h,
  computeUpcomingForList,
  computeUpcomingRwcWithin24h,
  computeNextCompetitionWithin7Days,
  computeCompetitionDays,
} from '@/hooks/home/useHomeData';
import type { RoundItem } from '@/screens/rounds/RoundListScreen/types';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

const baseRound = (over: Partial<RoundItem>): RoundItem =>
  ({
    id: 'r',
    status: 'upcoming',
    date: '2026-05-04',
    teeTime: '08:00:00',
    course: { id: 'c', name: 'Course', clubs: { latitude: -37.81, longitude: 144.96 } } as any,
    competition: null,
    gameType: 'stableford',
    roundNumber: 1,
    totalRounds: 1,
    holesCompleted: 0,
    totalHoles: 18,
    ...over,
  }) as any;

describe('useHomeData helpers', () => {
  const now = new Date('2026-05-04T07:00:00');

  it('picks the next round when within 24h', () => {
    const rounds = [
      baseRound({ id: 'r1', date: '2026-05-04', teeTime: '08:00:00' }),
      baseRound({ id: 'r2', date: '2026-05-09', teeTime: '08:00:00' }),
    ];
    const picked = computeUpcomingWithin24h(rounds, now);
    expect(picked?.id).toBe('r1');
  });

  it('returns null when nothing within 24h', () => {
    const rounds = [
      baseRound({ id: 'r1', date: '2026-05-09', teeTime: '08:00:00' }),
    ];
    expect(computeUpcomingWithin24h(rounds, now)).toBeNull();
  });

  it('removes the picked round from the list', () => {
    const rounds = [
      baseRound({ id: 'r1', date: '2026-05-04', teeTime: '08:00:00' }),
      baseRound({ id: 'r2', date: '2026-05-09', teeTime: '08:00:00' }),
    ];
    const list = computeUpcomingForList(rounds, 'r1');
    expect(list.map((r) => r.id)).toEqual(['r2']);
  });
});

const rwcRound = (over: Partial<RoundWithCourse>): RoundWithCourse =>
  ({
    id: 'r',
    status: 'upcoming',
    date: '2026-05-04',
    tee_time: '08:00:00',
    course: { id: 'c', name: 'Course', clubs: { name: 'Club' } } as any,
    competition: null,
    ...over,
  }) as unknown as RoundWithCourse;

describe('computeUpcomingRwcWithin24h', () => {
  const now = new Date('2026-05-04T07:00:00');

  it('picks the next RoundWithCourse within 24h', () => {
    const rounds = [
      rwcRound({ id: 'rwc1', date: '2026-05-04', tee_time: '18:11:00' }),
      rwcRound({ id: 'rwc2', date: '2026-05-09', tee_time: '08:00:00' }),
    ];
    const picked = computeUpcomingRwcWithin24h(rounds, now);
    expect(picked?.id).toBe('rwc1');
  });

  it('returns null when nothing within 24h', () => {
    expect(
      computeUpcomingRwcWithin24h(
        [rwcRound({ id: 'rwc1', date: '2026-05-09', tee_time: '08:00:00' })],
        now,
      ),
    ).toBeNull();
  });
});

describe('computeNextCompetitionWithin7Days', () => {
  const now = new Date('2026-06-22T07:00:00'); // Monday

  const compRound = (over: Partial<RoundWithCourse>): RoundWithCourse =>
    rwcRound({
      competition: { id: `comp-${over.id ?? 'x'}`, name: 'Saturday Medal' },
      ...over,
    });

  it('picks the earliest competition round within 7 days', () => {
    const rounds = [
      compRound({ id: 'fri', date: '2026-06-26', tee_time: '08:30:00' }),
      compRound({ id: 'sun', date: '2026-06-28', tee_time: '08:00:00' }),
    ];
    expect(computeNextCompetitionWithin7Days(rounds, now, null)?.id).toBe('fri');
  });

  it('ignores standalone (non-competition) rounds', () => {
    const rounds = [
      rwcRound({ id: 'solo', date: '2026-06-25', tee_time: '08:00:00', competition: null }),
      compRound({ id: 'fri', date: '2026-06-26', tee_time: '08:30:00' }),
    ];
    expect(computeNextCompetitionWithin7Days(rounds, now, null)?.id).toBe('fri');
  });

  it('excludes the hero round by id', () => {
    const rounds = [
      compRound({ id: 'today', date: '2026-06-22', tee_time: '12:00:00' }),
      compRound({ id: 'fri', date: '2026-06-26', tee_time: '08:30:00' }),
    ];
    expect(computeNextCompetitionWithin7Days(rounds, now, 'today')?.id).toBe('fri');
  });

  it('includes a round on the +7d boundary', () => {
    const rounds = [
      compRound({ id: 'edge', date: '2026-06-29', tee_time: '06:00:00' }), // within 7d of Mon 07:00
    ];
    expect(computeNextCompetitionWithin7Days(rounds, now, null)?.id).toBe('edge');
  });

  it('excludes a round beyond 7 days', () => {
    const rounds = [
      compRound({ id: 'far', date: '2026-07-05', tee_time: '08:00:00' }),
    ];
    expect(computeNextCompetitionWithin7Days(rounds, now, null)).toBeNull();
  });

  it('excludes a round earlier today whose tee time has passed', () => {
    const rounds = [
      compRound({ id: 'passed', date: '2026-06-22', tee_time: '06:00:00' }),
    ];
    expect(computeNextCompetitionWithin7Days(rounds, now, null)).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(computeNextCompetitionWithin7Days([], now, null)).toBeNull();
  });
});

describe('computeCompetitionDays', () => {
  const dayRound = (over: Partial<RoundWithCourse>): RoundWithCourse =>
    ({
      id: 'r',
      status: 'upcoming',
      date: '2026-06-26',
      tee_time: '08:00:00',
      course: {
        id: 'c',
        name: 'Course',
        clubs: { name: 'Club', latitude: -37.81, longitude: 144.96 },
      } as any,
      competition: { id: 'comp-1', name: 'Winter Classic' },
      ...over,
    }) as unknown as RoundWithCourse;

  it('returns [] when competitionId is null', () => {
    expect(computeCompetitionDays([dayRound({})], null)).toEqual([]);
  });

  it('keeps only rounds of the target competition', () => {
    const rounds = [
      dayRound({ id: 'a', date: '2026-06-26' }),
      dayRound({ id: 'b', date: '2026-06-27', competition: { id: 'comp-2', name: 'Other' } }),
    ];
    const days = computeCompetitionDays(rounds, 'comp-1');
    expect(days.map((d) => d.dateIso)).toEqual(['2026-06-26']);
  });

  it('dedupes by date and sorts ascending', () => {
    const rounds = [
      dayRound({ id: 'b', date: '2026-06-28' }),
      dayRound({ id: 'a', date: '2026-06-26' }),
      dayRound({ id: 'a2', date: '2026-06-26' }), // duplicate day
    ];
    const days = computeCompetitionDays(rounds, 'comp-1');
    expect(days.map((d) => d.dateIso)).toEqual(['2026-06-26', '2026-06-28']);
  });

  it('drops rounds with no resolvable club coordinates', () => {
    const rounds = [
      dayRound({
        id: 'nocoord',
        date: '2026-06-26',
        course: { id: 'c', name: 'Course', clubs: { name: 'Club' } } as any,
      }),
      dayRound({ id: 'ok', date: '2026-06-27' }),
    ];
    const days = computeCompetitionDays(rounds, 'comp-1');
    expect(days.map((d) => d.dateIso)).toEqual(['2026-06-27']);
    expect(days[0]).toEqual({ dateIso: '2026-06-27', lat: -37.81, lng: 144.96 });
  });

  it('resolves coordinates from raw location GeoJSON when lat/lng absent', () => {
    const rounds = [
      dayRound({
        id: 'geo',
        date: '2026-06-26',
        course: {
          id: 'c',
          name: 'Course',
          clubs: { name: 'Club', location: { type: 'Point', coordinates: [151.2, -33.86] } },
        } as any,
      }),
    ];
    const days = computeCompetitionDays(rounds, 'comp-1');
    expect(days).toEqual([{ dateIso: '2026-06-26', lat: -33.86, lng: 151.2 }]);
  });
});

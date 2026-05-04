import {
  computeUpcomingWithin24h,
  computeUpcomingForList,
  computeUpcomingRwcWithin24h,
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

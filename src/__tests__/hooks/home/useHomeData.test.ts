import { computeUpcomingWithin24h, computeUpcomingForList } from '@/hooks/home/useHomeData';
import type { RoundItem } from '@/screens/rounds/RoundListScreen/types';

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

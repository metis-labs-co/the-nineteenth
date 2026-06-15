import { buildAvailableRounds, type AvailableRoundSource } from '../availableRounds';

const src = (over: Partial<AvailableRoundSource>): AvailableRoundSource => ({
  id: 'r1',
  status: 'upcoming',
  competition_id: null,
  competitionName: null,
  courseName: 'Royal Melbourne',
  tee_time: null,
  game_type: 'stableford',
  is_team_round: false,
  ...over,
});

describe('buildAvailableRounds', () => {
  it('maps source rounds to WatchAvailableRound shape, formatting tee time to HH:MM', () => {
    const [r] = buildAvailableRounds(
      [],
      [src({ id: 'r1', tee_time: '13:20:00', competition_id: 'c1', competitionName: 'Sat Comp' })],
    );
    expect(r).toEqual({
      roundId: 'r1',
      competitionId: 'c1',
      title: 'Sat Comp',
      teeTime: '13:20',
      status: 'upcoming',
      gameType: 'stableford',
      isTeamRound: false,
    });
  });

  it('falls back to course name then "Round" for the title', () => {
    const [a, b] = buildAvailableRounds(
      [],
      [
        src({ id: 'a', competitionName: null, courseName: 'Kingston Heath' }),
        src({ id: 'b', competitionName: null, courseName: null }),
      ],
    );
    expect(a.title).toBe('Kingston Heath');
    expect(b.title).toBe('Round');
  });

  it('orders in-progress first, then upcoming by tee time, with null tee times last', () => {
    const result = buildAvailableRounds(
      [src({ id: 'live', status: 'in-progress', tee_time: null })],
      [
        src({ id: 'late', status: 'upcoming', tee_time: '14:00:00' }),
        src({ id: 'noTime', status: 'upcoming', tee_time: null }),
        src({ id: 'early', status: 'upcoming', tee_time: '08:30:00' }),
      ],
    );
    expect(result.map((r) => r.roundId)).toEqual(['live', 'early', 'late', 'noTime']);
  });

  it('de-dupes by roundId, keeping the in-progress entry over an upcoming duplicate', () => {
    const result = buildAvailableRounds(
      [src({ id: 'dup', status: 'in-progress' })],
      [src({ id: 'dup', status: 'upcoming' })],
    );
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('in-progress');
  });

  it('handles a missing tee_time as null', () => {
    const [r] = buildAvailableRounds([], [src({ tee_time: undefined })]);
    expect(r.teeTime).toBeNull();
  });
});

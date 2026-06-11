import {
  buildMatesLeaderboard,
  type MateProfile,
  type WeeklyScorecardRow,
} from '@/hooks/home/matesLeaderboard';

const profiles = new Map<string, MateProfile>([
  ['me', { name: 'Sam', photoUrl: null }],
  ['f1', { name: 'Mia', photoUrl: 'https://example.com/mia.jpg' }],
  ['f2', { name: 'Jess', photoUrl: null }],
]);

function row(playerId: string, points: number | null, roundId: string): WeeklyScorecardRow {
  return { player_id: playerId, total_points: points, round_id: roundId };
}

describe('buildMatesLeaderboard', () => {
  it('keeps each player best round and sorts by points descending', () => {
    const result = buildMatesLeaderboard(
      [row('me', 31, 'r1'), row('f1', 34, 'r2'), row('f1', 38, 'r3'), row('f2', 22, 'r4')],
      profiles,
      'me'
    );
    expect(result.map((e) => [e.playerId, e.points, e.roundId])).toEqual([
      ['f1', 38, 'r3'],
      ['me', 31, 'r1'],
      ['f2', 22, 'r4'],
    ]);
  });

  it('flags the current user', () => {
    const result = buildMatesLeaderboard([row('me', 31, 'r1'), row('f1', 38, 'r2')], profiles, 'me');
    expect(result.find((e) => e.playerId === 'me')?.isCurrentUser).toBe(true);
    expect(result.find((e) => e.playerId === 'f1')?.isCurrentUser).toBe(false);
  });

  it('carries name and photoUrl from the profile map', () => {
    const result = buildMatesLeaderboard([row('f1', 38, 'r2')], profiles, 'me');
    expect(result[0]).toMatchObject({ name: 'Mia', photoUrl: 'https://example.com/mia.jpg' });
  });

  it('breaks point ties by name ascending for stable output', () => {
    const result = buildMatesLeaderboard(
      [row('f2', 30, 'r1'), row('f1', 30, 'r2')],
      profiles,
      'me'
    );
    expect(result.map((e) => e.name)).toEqual(['Jess', 'Mia']);
  });

  it('omits players with no rows and skips null points', () => {
    const result = buildMatesLeaderboard([row('me', null, 'r1'), row('f1', 20, 'r2')], profiles, 'me');
    expect(result.map((e) => e.playerId)).toEqual(['f1']);
  });

  it('ignores rows for players not in the profile map', () => {
    const result = buildMatesLeaderboard([row('stranger', 40, 'r9'), row('f1', 20, 'r2')], profiles, 'me');
    expect(result.map((e) => e.playerId)).toEqual(['f1']);
  });

  it('returns an empty array for empty input', () => {
    expect(buildMatesLeaderboard([], profiles, 'me')).toEqual([]);
  });
});

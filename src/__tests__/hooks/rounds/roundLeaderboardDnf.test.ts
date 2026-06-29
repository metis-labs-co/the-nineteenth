import { computeDnfEntries } from '@/hooks/rounds/leaderboard';

describe('computeDnfEntries', () => {
  it('returns roster players with a non-terminal card and no result row', () => {
    const scorecards = [
      { player_id: 'p1', status: 'completed', players: { name: 'Alice' } },
      { player_id: 'p2', status: 'in-progress', players: { name: 'Bob' } },
      { player_id: 'p3', status: 'not-started', players: { name: 'Cara' } },
    ];
    const results = [
      { player_id: 'p1', is_team_result: false, teams: null },
    ];

    const dnf = computeDnfEntries(scorecards as never, results as never);

    expect(dnf).toEqual([
      { playerId: 'p2', playerName: 'Bob' },
      { playerId: 'p3', playerName: 'Cara' },
    ]);
  });

  it('excludes players covered by a team result row', () => {
    const scorecards = [
      { player_id: 'p2', status: 'in-progress', players: { name: 'Bob' } },
    ];
    const results = [
      { player_id: null, is_team_result: true, teams: { team_members: [{ player_id: 'p2' }] } },
    ];

    expect(computeDnfEntries(scorecards as never, results as never)).toEqual([]);
  });

  it('returns empty when every player has a terminal card', () => {
    const scorecards = [
      { player_id: 'p1', status: 'completed', players: { name: 'Alice' } },
      { player_id: 'p2', status: 'confirmed', players: { name: 'Bob' } },
    ];
    expect(computeDnfEntries(scorecards as never, [] as never)).toEqual([]);
  });
});

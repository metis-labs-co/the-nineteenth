import { groupGreenCoords, trimLeaderboard } from '../snapshot';

describe('groupGreenCoords', () => {
  it('groups green coords by hole and type, ignoring any tee poi', () => {
    const out = groupGreenCoords([
      { hole: 1, poiType: 'green_center', latitude: 1, longitude: 2 },
      { hole: 1, poiType: 'green_front', latitude: 3, longitude: 4 },
      { hole: 1, poiType: 'tee_back', latitude: 9, longitude: 9 },
      { hole: 2, poiType: 'green_back', latitude: 5, longitude: 6 },
    ]);
    expect(out.get(1)).toEqual({ center: { latitude: 1, longitude: 2 }, front: { latitude: 3, longitude: 4 } });
    expect(out.get(2)).toEqual({ back: { latitude: 5, longitude: 6 } });
  });
});

describe('trimLeaderboard', () => {
  const board = [
    { rank: 1, name: 'A', detail: '12', playerId: 'a' },
    { rank: 2, name: 'B', detail: '10', playerId: 'b' },
    { rank: 3, name: 'C', detail: '9', playerId: 'c' },
    { rank: 4, name: 'D', detail: '7', playerId: 'd' },
    { rank: 5, name: 'Me', detail: '6', playerId: 'me' },
    { rank: 6, name: 'F', detail: '4', playerId: 'f' },
  ];
  it('returns top 3 plus the current user and one neighbour each side, sorted, deduped', () => {
    const out = trimLeaderboard(board, 'me');
    expect(out.map((r) => r.name)).toEqual(['A', 'B', 'C', 'D', 'Me', 'F']);
    expect(out.find((r) => r.name === 'Me')?.isCurrentUser).toBe(true);
  });
  it('returns just the top 3 when the user is absent', () => {
    const out = trimLeaderboard(board.slice(0, 3), 'ghost');
    expect(out.map((r) => r.name)).toEqual(['A', 'B', 'C']);
    expect(out.every((r) => !r.isCurrentUser)).toBe(true);
  });
});

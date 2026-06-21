import { resolveAltShotSubMatchOutcome } from './pairPointsCalculation';
import type { Hole } from '@/types/database.types';

// 2 holes; hole 1 is hardest (strokeIndex 1).
const holes: Hole[] = [
  { number: 1, par: 4, strokeIndex: 1 } as Hole,
  { number: 2, par: 4, strokeIndex: 2 } as Hole,
];

// Side A = p1(9)+p2(11) -> 10.0 ; Side B = p3(8)+p4(13) -> 10.5
// diff = round(0.5) = 1 stroke to side B (the higher handicap side).
const dailyHandicaps = new Map([
  ['p1', 9],
  ['p2', 11],
  ['p3', 8],
  ['p4', 13],
]);

describe('resolveAltShotSubMatchOutcome', () => {
  it('gives the higher-handicap side its differential stroke and decides on total net', () => {
    // Side A one ball: 4 + 4 = 8 gross, no strokes -> net 8.
    // Side B one ball: 5 + 4 = 9 gross, minus 1 differential stroke -> net 8.
    // Equal nets -> halved.
    const grossByPlayer: Record<string, Record<number, number>> = {
      p1: { 1: 4, 2: 4 },
      p3: { 1: 5, 2: 4 },
    };
    const getGross = (playerId: string, hole: Hole) =>
      grossByPlayer[playerId]?.[hole.number] ?? null;

    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['p1', 'p2'],
      teamBPlayerIds: ['p3', 'p4'],
      holes,
      getGross,
      dailyHandicaps,
    });
    expect(outcome).toBe('halved');
  });

  it('side A wins when its net total is lower', () => {
    const grossByPlayer: Record<string, Record<number, number>> = {
      p1: { 1: 4, 2: 4 }, // A net 8
      p3: { 1: 6, 2: 5 }, // B gross 11 - 1 = net 10
    };
    const getGross = (playerId: string, hole: Hole) =>
      grossByPlayer[playerId]?.[hole.number] ?? null;

    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['p1', 'p2'],
      teamBPlayerIds: ['p3', 'p4'],
      holes,
      getGross,
      dailyHandicaps,
    });
    expect(outcome).toBe('a-wins');
  });

  it('returns null when a side has no usable scores', () => {
    const getGross = () => null;
    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['p1', 'p2'],
      teamBPlayerIds: ['p3', 'p4'],
      holes,
      getGross,
      dailyHandicaps,
    });
    expect(outcome).toBeNull();
  });
});

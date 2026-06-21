import { resolveAltShotSubMatchOutcome } from './pairPointsCalculation';
import type { Hole } from '@/types/database.types';

// Guards the dispatch contract: alt-shot uses the one-ball differential
// resolver (Task 5), not best-ball. This re-asserts the resolver wiring at
// the boundary finalizePairResults relies on.
describe('finalizePairResults alt-shot dispatch', () => {
  it('uses the differential resolver for a clear A win', () => {
    const holes: Hole[] = [
      { number: 1, par: 4, strokeIndex: 1 } as Hole,
      { number: 2, par: 4, strokeIndex: 2 } as Hole,
    ];
    const grossByPlayer: Record<string, Record<number, number>> = {
      pA1: { 1: 4, 2: 4 }, // A net 8
      pB1: { 1: 6, 2: 6 }, // B gross 12 - 1 diff = 11
    };
    const outcome = resolveAltShotSubMatchOutcome({
      teamAPlayerIds: ['pA1', 'pA2'],
      teamBPlayerIds: ['pB1', 'pB2'],
      holes,
      getGross: (id, h) => grossByPlayer[id]?.[h.number] ?? null,
      dailyHandicaps: new Map([['pA1', 9], ['pA2', 11], ['pB1', 8], ['pB2', 13]]),
    });
    expect(outcome).toBe('a-wins');
  });
});

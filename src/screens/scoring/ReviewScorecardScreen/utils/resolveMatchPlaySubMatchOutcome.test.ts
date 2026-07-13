import { resolveMatchPlaySubMatchOutcome } from './subMatchLeaderboard';
import type { Hole } from '@/types';
import type { SubMatchSides, GetStrokes } from './subMatchLeaderboard';

function hole(number: number, par = 4, strokeIndex = number): Hole {
  return { number, par, strokeIndex } as Hole;
}

// 3 holes, stroke index 1..3 ascending. Equal (0) handicaps => gross === net,
// so results below are fully deterministic.
const HOLES: Hole[] = [hole(1), hole(2), hole(3)];

const sides: SubMatchSides = {
  a: [{ id: 'a1', name: 'Sam', handicap: 0 }],
  b: [{ id: 'b1', name: 'Bob', handicap: 0 }],
};

/** Build a GetStrokes from a `${playerId}-${holeNumber}` fixture map. */
function fixtureGetStrokes(map: Record<string, number>): GetStrokes {
  return (playerId, holeNumber) => map[`${playerId}-${holeNumber}`];
}

const noPersisted = {
  status: 'in_progress',
  result: null,
  final_differential: null,
  final_holes_remaining: null,
};

describe('resolveMatchPlaySubMatchOutcome', () => {
  it('resolves a holes-up closeout winner even when no result is persisted', () => {
    // Sam (a1) wins holes 1 & 2 (3 vs 5): 2 up with 1 to play => closed out.
    const getStrokes = fixtureGetStrokes({
      'a1-1': 3,
      'b1-1': 5,
      'a1-2': 3,
      'b1-2': 5,
    });
    const result = resolveMatchPlaySubMatchOutcome({
      sm: noPersisted,
      sides,
      holes: HOLES,
      getStrokes,
    });
    expect(result).toBe('a-wins');
  });

  it('lets a decisive live result override a stale non-manual persisted result', () => {
    // Bob (b1) wins holes 1 & 2 (3 vs 5): 2 up with 1 to play => closed out,
    // decisively for side B — but the stored row still says A won and was
    // never manually overridden.
    const getStrokes = fixtureGetStrokes({
      'a1-1': 5,
      'b1-1': 3,
      'a1-2': 5,
      'b1-2': 3,
    });
    const result = resolveMatchPlaySubMatchOutcome({
      sm: {
        status: 'completed',
        result: 'a-wins',
        final_differential: 2,
        final_holes_remaining: 1,
        manual_result: false,
      },
      sides,
      holes: HOLES,
      getStrokes,
    });
    expect(result).toBe('b-wins');
  });

  it('treats a manually-entered result as authoritative over the scores', () => {
    // Same decisive-for-B scores as above, but this time the stored result was
    // a manual organiser override — it must win outright.
    const getStrokes = fixtureGetStrokes({
      'a1-1': 5,
      'b1-1': 3,
      'a1-2': 5,
      'b1-2': 3,
    });
    const result = resolveMatchPlaySubMatchOutcome({
      sm: {
        status: 'completed',
        result: 'a-wins',
        final_differential: 2,
        final_holes_remaining: 1,
        manual_result: true,
      },
      sides,
      holes: HOLES,
      getStrokes,
    });
    expect(result).toBe('a-wins');
  });

  it('resolves a halved match', () => {
    // Sam wins hole 1, Bob wins hole 2, hole 3 is tied: all square after 3.
    const getStrokes = fixtureGetStrokes({
      'a1-1': 3,
      'b1-1': 5,
      'a1-2': 5,
      'b1-2': 3,
      'a1-3': 4,
      'b1-3': 4,
    });
    const result = resolveMatchPlaySubMatchOutcome({
      sm: noPersisted,
      sides,
      holes: HOLES,
      getStrokes,
    });
    expect(result).toBe('halved');
  });

  it('returns null when there are no scores at all', () => {
    const result = resolveMatchPlaySubMatchOutcome({
      sm: noPersisted,
      sides,
      holes: HOLES,
      getStrokes: () => undefined,
    });
    expect(result).toBeNull();
  });
});

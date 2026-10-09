import { createRoundScoringContext } from '@/services/rounds/roundScoringContext';
import { RoundScoringWriteError } from '@/services/rounds/roundScoringErrors';
import type { Hole, Scorecard, TeeBox } from '@/types';
import { calculatePlayerTotals } from '@/store/utils/scorecardCalculations';
import { getStrokesReceived } from '@/utils/scoring';
import { calculateHandicapData } from '@/services/offline/sync/scorecardSync';

const holes: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: 4,
  strokeIndex: i + 1,
}));
const tee: TeeBox = {
  name: 'Captured',
  color: 'red',
  slopeRating: 130,
  courseRating: 75,
  slopeRatingFront9: 115,
  courseRatingFront9: 38,
  slopeRatingBack9: 140,
  courseRatingBack9: 40,
};
function card(overrides: Partial<Scorecard> = {}): Scorecard {
  return {
    id: 'local',
    roundId: 'r',
    playerId: 'p',
    player: {
      id: 'p',
      name: 'Historical',
      email: '',
      handicap: 44,
      gender: 'male',
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
    scores: { 10: { strokes: 4 }, 11: { strokes: 5 } },
    totalGross: 9,
    totalNet: 9,
    status: 'confirmed',
    submittedAt: new Date('2026-10-01'),
    submittedBy: 'owner',
    createdAt: new Date(0),
    updatedAt: new Date(0),
    playerHandicap: -2,
    playerGender: 'female',
    teeData: tee,
    coursePar: 36,
    syncHoles: holes.slice(9),
    syncGameType: 'stroke',
    syncNineType: 'back9',
    holesPlayed: 6,
    ...overrides,
  };
}

describe('existing frozen calculation basis characterization', () => {
  it.each([-2, 0, 17])('recorded female back-nine HI %s agrees with the snapshot', (hi) => {
    const source = card({ playerHandicap: hi });
    const projection = {
      ...source,
      player: { ...source.player!, handicap: hi, gender: 'female' as const },
    };
    const totals = calculatePlayerTotals(projection, holes.slice(9), 'stroke', {
      handicapSource: 'profile',
      selectedTee: tee,
      nineType: 'back9',
    });
    const snapshot = calculateHandicapData(source);
    expect(snapshot.gaHandicapUsed).toBe(hi);
    expect(snapshot.courseRatingUsed).toBe(40);
    expect(snapshot.slopeRatingUsed).toBe(140);
    // Both scored holes have low SI and receive the first two strokes when DHC > 9.
    const dhc = snapshot.dailyHandicapUsed!;
    const strokes = [10, 11].reduce((sum, si) => sum + getStrokesReceived(dhc, si), 0);
    expect(totals.net).toBe(9 - strokes);
    expect(source.player?.handicap).toBe(44);
    expect(snapshot.handicapDifferential).toBeNull();
  });
});

it.each([undefined, null, 'profile', 'calculated'] as const)(
  'legacy source %s keeps recorded HI/rating calculation',
  (source) => {
    const input = Object.assign(card({ playerHandicap: 0 }), { syncHandicapSource: source });
    const result = calculateHandicapData(input);
    expect(result).toMatchObject({
      gaHandicapUsed: 0,
      dailyHandicapUsed: 4,
      courseRatingUsed: 40,
      slopeRatingUsed: 140,
      handicapDifferential: null,
    });
  }
);

describe('pure shape context repair', () => {
  const rebuild = () => createRoundScoringContext('r', {});
  it.each([-2, 0, 17])(
    'uses frozen female calculated HI %s without changing original player or submission',
    (hi) => {
      const source = card({ playerHandicap: hi, syncHandicapSource: 'calculated' });
      const result = rebuild()(source, new Set([10, 11]), { nine_type: 'back9', holes_played: 2 });
      expect(result.player).toBe(source.player);
      expect(result).toMatchObject({
        status: 'confirmed',
        submittedAt: source.submittedAt,
        submittedBy: 'owner',
        playerHandicap: hi,
        playerGender: 'female',
        teeData: tee,
        syncHandicapSource: 'calculated',
        coursePar: 36,
      });
      const snapshot = calculateHandicapData(result);
      expect(result.totalNet).toBe(
        9 -
          getStrokesReceived(snapshot.dailyHandicapUsed!, 10) -
          getStrokesReceived(snapshot.dailyHandicapUsed!, 11)
      );
    }
  );
  it('rebuilds independent sources from their own values and never projects a player into persistence', () => {
    const source = card();
    const callback = rebuild();
    const first = callback(source, new Set([10]), { nine_type: 'back9', holes_played: 2 });
    const second = callback({ ...source, scores: { 10: { strokes: 3 } } }, new Set([10]), {
      nine_type: 'back9',
      holes_played: 2,
    });
    expect(first.totalGross).toBe(4);
    expect(second.totalGross).toBe(3);
    expect(source.scores[11]).toEqual({ strokes: 5 });
  });
  it.each(['par', 'SI', 'tee', 'HI', 'game', 'par mismatch'] as const)(
    'refuses missing/incompatible %s without current profile invention',
    (missing) => {
      const source = card();
      if (missing === 'par')
        source.syncHoles = [{ number: 10, par: 0 as Hole['par'], strokeIndex: 1 }];
      if (missing === 'SI') source.syncHoles = [{ number: 10, par: 4, strokeIndex: 0 }];
      if (missing === 'tee') source.teeData = null;
      if (missing === 'HI') source.playerHandicap = null;
      if (missing === 'game') source.syncGameType = undefined;
      if (missing === 'par mismatch') source.coursePar = 72;
      expect(() =>
        rebuild()(source, new Set([10]), { nine_type: 'back9', holes_played: 2 })
      ).toThrow(RoundScoringWriteError);
    }
  );
  it('filters an unended full to front9 and deliberately recomputes planned par', () => {
    const source = card({
      syncHoles: holes,
      syncNineType: 'full',
      coursePar: 72,
      holesPlayed: null,
      scores: { 1: { strokes: 4 }, 10: { strokes: 5 } },
    });
    const result = rebuild()(source, new Set([1, 10]), { nine_type: 'front9', holes_played: null });
    expect(result.coursePar).toBe(36);
    expect(result.syncHoles).toEqual(holes.slice(0, 9));
    expect(result.scores).toEqual({ 1: { strokes: 4 } });
    expect(result.holesPlayed).toBeNull();
  });
  it('recomputes context for same N but different planned nine', () => {
    const source = card({
      syncHoles: holes,
      syncNineType: 'full',
      coursePar: 72,
      holesPlayed: 2,
      scores: { 1: { strokes: 4 } },
    });
    const result = rebuild()(source, new Set([1]), { nine_type: 'front9', holes_played: 2 });
    expect(result.coursePar).toBe(36);
    expect(result.syncNineType).toBe('front9');
    expect(calculateHandicapData(result).courseRatingUsed).toBe(38);
  });
  it('cannot expand back9-only metadata into full, even with a generic larger list', () => {
    const callback = createRoundScoringContext('r', { holes, gameType: 'stroke' });
    expect(() => callback(card(), new Set([10]), { nine_type: 'full', holes_played: 2 })).toThrow(
      /context/i
    );
  });
  it('accepts real physical-nine metadata labeled full for NULL', () => {
    const source = card({
      syncHoles: holes.slice(0, 9),
      syncNineType: 'full',
      coursePar: 36,
      holesPlayed: null,
      scores: { 1: { strokes: 4 } },
    });
    expect(
      rebuild()(source, new Set([1]), { nine_type: 'full', holes_played: null }).syncHoles
    ).toHaveLength(9);
  });
  it('repairs queue-only none without an invented HI or gender', () => {
    const source = card({
      playerHandicap: null,
      playerGender: undefined,
      syncHandicapSource: 'none',
      scores: { 10: { strokes: 10 } },
    });
    const result = rebuild()(source, new Set([10]), { nine_type: 'back9', holes_played: 2 });
    expect(result).toMatchObject({
      playerHandicap: null,
      totalGross: 6,
      totalNet: 6,
      syncHandicapSource: 'none',
    });
    expect(result.playerGender).toBeUndefined();
    expect(calculateHandicapData(result).dailyHandicapUsed).toBe(0);
  });
  it('fills missing metadata only from compatible frozen evidence, never scores', () => {
    const source = card({ playerHandicap: null, syncHandicapSource: undefined });
    const evidence = card({ syncHandicapSource: 'none', scores: { 10: { strokes: 8 } } });
    const callback = createRoundScoringContext('r', { sources: [evidence] });
    const result = callback(source, new Set([10]), { nine_type: 'back9', holes_played: 2 });
    expect(result).toMatchObject({ playerHandicap: -2, syncHandicapSource: 'none', totalGross: 4 });
    expect(() =>
      callback({ ...source, teeData: { ...tee, courseRating: 80 } }, new Set([10]), {
        nine_type: 'back9',
        holes_played: 2,
      })
    ).toThrow(/context/i);
    expect(() =>
      callback({ ...source, submittedAt: new Date('2026-10-03') }, new Set([10]), {
        nine_type: 'back9',
        holes_played: 2,
      })
    ).toThrow(/context/i);
  });
  it('uses proven current live none context for an active source, preserving absent HI', () => {
    const source = card({
      status: 'in-progress',
      submittedAt: undefined,
      submittedBy: undefined,
      holesPlayed: null,
      syncHoles: undefined,
      syncGameType: undefined,
      teeData: undefined,
      playerHandicap: undefined,
      playerGender: undefined,
      coursePar: undefined,
      syncNineType: undefined,
    });
    const callback = createRoundScoringContext('r', {
      getLiveContext: () => ({
        player: source.player!,
        handicapSource: 'none',
        nineType: 'back9',
        teeData: tee,
        holes,
        gameType: 'stroke',
      }),
    });
    expect(callback(source, new Set([10]), { nine_type: 'back9', holes_played: 2 })).toMatchObject({
      syncHandicapSource: 'none',
      playerHandicap: undefined,
      totalNet: 4,
    });
  });
  it('refuses NULL over a source final end with a structured local error', () => {
    expect(() =>
      rebuild()(card(), new Set([10]), { nine_type: 'back9', holes_played: null })
    ).toThrow(expect.objectContaining({ kind: 'local_end_pending' }));
  });
  it('accepts guarded live fallback for a current active ended source without inventing historical context', () => {
    const source = card({
      status: 'in-progress',
      submittedAt: undefined,
      submittedBy: undefined,
      syncHoles: undefined,
      syncGameType: undefined,
      teeData: undefined,
      playerHandicap: undefined,
      playerGender: undefined,
      coursePar: undefined,
      syncNineType: undefined,
    });
    const callback = createRoundScoringContext('r', {
      getLiveContext: () => ({
        player: source.player!,
        handicapSource: 'none',
        nineType: 'back9',
        teeData: tee,
        holes,
        gameType: 'stroke',
      }),
    });
    expect(
      callback(source, new Set([10]), { nine_type: 'back9', holes_played: 2 }).syncHandicapSource
    ).toBe('none');
    expect(() =>
      createRoundScoringContext('r', {})(source, new Set([10]), {
        nine_type: 'back9',
        holes_played: 2,
      })
    ).toThrow(/context/i);
  });
  it('does not mix a changed live basis with partial captured inputs', () => {
    const source = card({
      status: 'in-progress',
      submittedAt: undefined,
      submittedBy: undefined,
      syncGameType: undefined,
    });
    const callback = createRoundScoringContext('r', {
      getLiveContext: () => ({
        player: source.player!,
        handicapSource: 'profile',
        nineType: 'back9',
        teeData: tee,
        holes,
        gameType: 'stroke',
      }),
    });
    expect(() => callback(source, new Set([10]), { nine_type: 'back9', holes_played: 2 })).toThrow(
      expect.objectContaining({ kind: 'context_changed' })
    );
  });
  it('complete recorded active-ended context takes priority over today’s live player', () => {
    const getLiveContext = jest.fn();
    const callback = createRoundScoringContext('r', { getLiveContext });
    const source = card({ status: 'in-progress', submittedAt: undefined, submittedBy: undefined });
    expect(
      callback(source, new Set([10]), { nine_type: 'back9', holes_played: 2 }).playerHandicap
    ).toBe(-2);
    expect(getLiveContext).not.toHaveBeenCalled();
  });
  it.each(['none', 'profile'] as const)(
    'fills only missing original nine from guarded active-ended %s context',
    (handicapSource) => {
      const source = card({
        status: 'in-progress',
        submittedAt: undefined,
        submittedBy: undefined,
        syncNineType: undefined,
        syncHandicapSource: handicapSource,
      });
      const getLiveContext = jest.fn(() => ({
        player: { ...source.player!, handicap: -2, gender: 'female' as const },
        handicapSource,
        nineType: 'back9' as const,
        teeData: tee,
        holes: holes.slice(9),
        gameType: 'stroke' as const,
      }));
      const callback = createRoundScoringContext('r', { getLiveContext });
      const result = callback(source, new Set([10]), { nine_type: 'back9', holes_played: 2 });
      expect(result).toMatchObject({ syncNineType: 'back9', playerHandicap: -2 });
      expect(result.player).toBe(source.player);
      expect(getLiveContext).toHaveBeenCalledWith(source);
      expect(() =>
        callback({ ...source, status: 'confirmed' }, new Set([10]), {
          nine_type: 'back9',
          holes_played: 2,
        })
      ).toThrow(expect.objectContaining({ kind: 'context_missing' }));
    }
  );
  it('rejects a partial declared planned list even when played numbers happen to fit', () => {
    expect(() =>
      rebuild()(card({ syncHoles: holes.slice(9, 12), coursePar: 12 }), new Set([10]), {
        nine_type: 'back9',
        holes_played: 2,
      })
    ).toThrow(/context/i);
  });

  it('rejects conflicting compatible donors instead of assembling a mixed historical basis', () => {
    const source = card({ playerHandicap: undefined, playerGender: undefined });
    const callback = createRoundScoringContext('r', {
      sources: [card({ playerHandicap: 10 }), card({ playerHandicap: 20 })],
    });
    expect(() => callback(source, new Set([10]), { nine_type: 'back9', holes_played: 2 })).toThrow(
      expect.objectContaining({ kind: 'context_changed' })
    );
  });
  it('checks original captured par before a genuine nine correction', () => {
    const source = card({ syncNineType: 'full', syncHoles: holes, coursePar: 36 });
    expect(() => rebuild()(source, new Set([1]), { nine_type: 'front9', holes_played: 2 })).toThrow(
      expect.objectContaining({ kind: 'context_changed' })
    );
  });
});

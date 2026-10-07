// src/utils/handicapEligibility.test.ts
//
// The card-level handicap completeness gate (I12). A differential is only
// produced for a card that scores every planned hole of its nine type; legacy
// cards with no per-hole data keep the old gross-only behaviour.
import { isCompleteForHandicap } from './handicapEligibility';
import { PICKUP_SCORE } from '@/constants/scoring';

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

/** `{ strokes }` on each listed hole, keyed by number as the store does. */
function scored(holes: number[], strokes = 4): Record<number, unknown> {
  const scores: Record<number, unknown> = {};
  for (const hole of holes) scores[hole] = { strokes };
  return scores;
}

describe('isCompleteForHandicap', () => {
  describe('legacy cards with no per-hole data', () => {
    it.each([null, undefined, {}])('treats %p as complete (gross-only rule)', (scores) => {
      expect(isCompleteForHandicap(scores, 'full')).toBe(true);
      expect(isCompleteForHandicap(scores, 'back9')).toBe(true);
    });
  });

  describe('18-hole rounds', () => {
    it('is complete when all 18 holes are scored', () => {
      expect(isCompleteForHandicap(scored(range(1, 18)), 'full')).toBe(true);
    });

    it('is incomplete when one hole is missing', () => {
      expect(isCompleteForHandicap(scored(range(1, 17)), 'full')).toBe(false);
    });

    it('is incomplete for a round ended after 6 holes', () => {
      expect(isCompleteForHandicap(scored(range(1, 6)), 'full')).toBe(false);
    });

    it('treats a zero-stroke hole as unscored', () => {
      const scores = scored(range(1, 18));
      scores[7] = { strokes: 0 };
      expect(isCompleteForHandicap(scores, 'full')).toBe(false);
    });

    it('treats a did-not-attempt hole (strokes 0) as unscored', () => {
      const scores = scored(range(1, 18));
      scores[7] = { strokes: 0, didNotAttempt: true };
      expect(isCompleteForHandicap(scores, 'full')).toBe(false);
    });

    it('treats a null hole entry as unscored', () => {
      const scores = scored(range(1, 18));
      scores[7] = null;
      expect(isCompleteForHandicap(scores, 'full')).toBe(false);
    });

    it('counts a pickup as scored', () => {
      const scores = scored(range(1, 18));
      scores[7] = { strokes: PICKUP_SCORE };
      expect(isCompleteForHandicap(scores, 'full')).toBe(true);
    });
  });

  describe('9-hole rounds', () => {
    it('judges a front-9 card on holes 1–9 only', () => {
      expect(isCompleteForHandicap(scored(range(1, 9)), 'front9')).toBe(true);
    });

    it('judges a back-9 card on holes 10–18 only', () => {
      expect(isCompleteForHandicap(scored(range(10, 18)), 'back9')).toBe(true);
    });

    it('is incomplete for a back-9 round ended after 6 holes (10–15)', () => {
      expect(isCompleteForHandicap(scored(range(10, 15)), 'back9')).toBe(false);
    });

    it('is incomplete for a back-9 round whose scores sit on holes 1–9', () => {
      expect(isCompleteForHandicap(scored(range(1, 9)), 'back9')).toBe(false);
    });

    it('ignores scores outside the planned nine', () => {
      const scores = scored(range(1, 9));
      scores[10] = { strokes: 5 };
      expect(isCompleteForHandicap(scores, 'front9')).toBe(true);
    });

    it('reads the planned holes from the nine type, not from what was scored', () => {
      // A front-9 card judged as an 18-hole round is incomplete.
      expect(isCompleteForHandicap(scored(range(1, 9)), 'full')).toBe(false);
    });
  });

  describe('score shapes', () => {
    it('accepts bare numbers', () => {
      const scores: Record<number, number> = {};
      for (const hole of range(1, 9)) scores[hole] = 5;
      expect(isCompleteForHandicap(scores, 'front9')).toBe(true);
    });

    it('accepts string keys from Supabase JSONB', () => {
      const scores: Record<string, { strokes: number }> = {};
      for (const hole of range(10, 18)) scores[String(hole)] = { strokes: 5 };
      expect(isCompleteForHandicap(scores, 'back9')).toBe(true);
    });

    it('rejects strokes stored as a string (mirrors the server predicate)', () => {
      const scores = scored(range(1, 9));
      scores[4] = { strokes: '5' };
      expect(isCompleteForHandicap(scores, 'front9')).toBe(false);
    });

    it('counts a multi-ball hole as scored when any ball has strokes', () => {
      const scores = scored(range(1, 9));
      scores[3] = { balls: [{ strokes: 0 }, { strokes: 5 }] };
      expect(isCompleteForHandicap(scores, 'front9')).toBe(true);
    });

    it('treats a multi-ball hole with no scored ball as unscored', () => {
      const scores = scored(range(1, 9));
      scores[3] = { balls: [{ strokes: 0 }, { strokes: 0 }] };
      expect(isCompleteForHandicap(scores, 'front9')).toBe(false);
    });
  });
});

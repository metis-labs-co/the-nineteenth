import { MatchPlayEngine } from './MatchPlayEngine';
import { calculateAllData } from '@/components/scorecard/MatchPlayScorecardTable/utils';
import type { Hole } from '@/types/database/base';
import type { ScorecardWithHandicap, CourseHoleData } from '../types';

// Single divergence hole: SI 3, equal gross 5, handicap difference of 5
// (playing handicaps 19 vs 14 — see verification note below).
//
// Difference method (current, correct behaviour): only the 5-stroke
// difference is allocated, entirely to the higher-handicap player, via
// getStrokesReceived(diff=5, SI=3) -> 1 stroke to player1, 0 to player2.
// Net scores: player1 = 5-1 = 4, player2 = 5-0 = 5 -> player1 wins the hole.
//
// Old (pre-difference-method) behaviour, for context on why this hole is a
// "divergence" case worth locking in: each player received strokes from
// their OWN full handicap independently — getStrokesReceived(19, SI=3) -> 1
// stroke, and getStrokesReceived(14, SI=3) -> 1 stroke — so both players
// would net to 4 and the hole would be HALVED. This fixture is the case
// where the two methods disagree, which is exactly why both current call
// sites (display path and engine) must be verified to agree with each other.
//
// Playing-handicap identity verification (per task brief Step 1):
// The brief assumed `getPlayingHandicap` at slope 113 / course rating = par is
// an identity function. Verified via a scratch test invoking
// `calculateGADailyHandicap` and `getPlayingHandicap` directly with
// { gaHandicap: 20/15, slopeRating: 113, courseRating: 4, par: 4 }:
//   - calculateGADailyHandicap(20, ...) -> { dailyHandicap: 19, courseHandicap: 20 }
//   - calculateGADailyHandicap(15, ...) -> { dailyHandicap: 14, courseHandicap: 15 }
//   - getPlayingHandicap(20, 113, 4, 4, 'match-play') -> 19
//   - getPlayingHandicap(15, 113, 4, 4, 'match-play') -> 14
// This is NOT an identity: the WHS daily-handicap formula applies the
// GA_HANDICAP_MULTIPLIER (0.93) and the default male consistency factor
// (0.9986) even when the course-rating adjustment term is zero, so raw
// handicap 20 -> playing handicap 19, and raw handicap 15 -> playing
// handicap 14 (courseHandicap, the intermediate value, IS the identity —
// dailyHandicap is not). The difference (5) and its relationship to stroke
// index 3 are preserved, so the divergence property still holds.
// Therefore: the engine fixture below supplies the RAW handicaps (20, 15) and
// lets the engine convert them internally, while the display-path fixture
// supplies the PLAYING handicaps the engine actually computes (19, 14) —
// the same values, just entering each path at the point where that path
// expects them.
const hole: Hole = { number: 1, par: 4, strokeIndex: 3 };
const holes: Hole[] = [hole];

// --- Display path ---
const scores: Record<string, number> = { 'p1-1': 5, 'p2-1': 5 };
const getPlayerScore = (playerId: string, holeNumber: number): number | undefined =>
  scores[`${playerId}-${holeNumber}`];

// --- Engine path (raw handicaps; engine derives playing handicaps 19 / 14) ---
const makeScorecard = (handicap: number): ScorecardWithHandicap => ({
  handicap,
  scorecard: {
    player_id: handicap === 20 ? 'p1' : 'p2',
    // Only the fields the engine reads (scores keyed by hole number) matter.
    scores: { '1': { strokes: 5 } },
  } as unknown as ScorecardWithHandicap['scorecard'],
});

const courseData: CourseHoleData = {
  holes,
  par: 4,
  slopeRating: 113,
  courseRating: 4,
};

describe('match play parity — display path vs engine', () => {
  it('both give the divergence hole to the higher-handicap player', () => {
    // Display path receives playing handicaps directly (19, 14) — the same
    // values the engine computes internally from raw handicaps (20, 15).
    const display = calculateAllData(holes, 'p1', 'p2', getPlayerScore, 19, 14);
    expect(display.holeResults[1].winner).toBe('player1');

    const engine = new MatchPlayEngine();
    const result = engine.calculateMatch(makeScorecard(20), makeScorecard(15), courseData);
    expect(result.holeResults[0].result).toBe('player1');
  });
});

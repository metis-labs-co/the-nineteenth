/**
 * Round-achievement event payload for a submitted scorecard.
 *
 * Extracted from useScoreSubmission.checkRoundAchievements so the payload
 * rules are unit-testable without the submit hook.
 */
import type { AchievementEventData } from '@/types/database/achievement.types';

/** Per-scorecard counts gathered by useScoreSubmission's calculateScoreStats. */
export interface RoundAchievementScoreStats {
  birdies: number;
  eagles: number;
  pars: number;
  bogeys: number;
  doubleBogeys: number;
  albatross: number;
  holeInOne: boolean;
  totalGross: number;
  /** Holes actually scored on the card. */
  holesPlayed: number;
}

export interface RoundAchievementEventParams {
  roundId: string;
  gameType: string;
  courseId: string | undefined;
  isCompetition: boolean;
  scoreStats: RoundAchievementScoreStats;
  /** The store's live net total (stableford overloads it with points). */
  totalNet: number | undefined;
  /** The round was ended early (store `holesPlayed` set). */
  endedEarly?: boolean;
}

export function buildRoundAchievementEventData(
  params: RoundAchievementEventParams
): AchievementEventData {
  const {
    roundId,
    gameType,
    courseId,
    isCompetition,
    scoreStats,
    totalNet,
    endedEarly = false,
  } = params;
  return {
    round_id: roundId,
    game_type: gameType,
    course_id: courseId,
    is_competition: isCompetition,
    // 18_HOLES_OF_GLORY / NINE_HOLE_SPECIALIST read only hole_count (=== 18 /
    // === 9). An early-ended round counts towards neither — not even an
    // 18-hole round ended after exactly 9 — so it sends no hole_count.
    hole_count: endedEarly ? undefined : scoreStats.holesPlayed,
    // A short total would trip the score-threshold achievements (LOW_SCORER on
    // gross, NET_MASTER on net), so an early-ended round sends neither.
    gross_score: endedEarly ? undefined : scoreStats.totalGross,
    net_score: endedEarly ? undefined : totalNet || undefined,
    birdies: scoreStats.birdies,
    eagles: scoreStats.eagles,
    albatrosses: scoreStats.albatross,
    pars: scoreStats.pars,
    bogeys: scoreStats.bogeys,
    double_bogeys: scoreStats.doubleBogeys,
    hole_in_one: scoreStats.holeInOne,
  };
}

import type { GameType } from '@/types';
import type { IndividualPointsRule } from '@/types/database/roundRules.types';
import type {
  PointSystemRules,
  RoundResult,
  ScoredResult,
  MatchResult,
} from './pointSystems';

// ============================================================================
// Core Calculation Functions
// ============================================================================

/**
 * Calculate competition points for a set of round results.
 *
 * Sorts results by raw score (descending for Stableford, ascending for Stroke),
 * assigns positions with proper tie handling, and awards competition points.
 *
 * Tie handling: When players tie, they share the average of the positions
 * they would have occupied. For example, if two players tie for 1st, they
 * both receive the average of 1st and 2nd place points (positional mode) or
 * the configured `tie` value (win_tie_loss mode).
 *
 * @param results - Array of round results to score
 * @param gameType - The game type (affects sorting direction)
 * @param pointSystem - Positional point allocation (used for mode='positional'
 *   and as a fallback for matchPlay configuration)
 * @param individualRule - Optional per-round mode override. When undefined the
 *   positional pointSystem is used (current/default behaviour).
 * @returns Array of scored results with positions and competition points
 */
export function calculateCompetitionPoints<TParticipant = string>(
  results: RoundResult<TParticipant>[],
  gameType: GameType,
  pointSystem: PointSystemRules,
  individualRule?: IndividualPointsRule
): ScoredResult<TParticipant>[] {
  if (results.length === 0) {
    return [];
  }

  // Sort results based on game type
  // Stableford & Par: higher is better (descending)
  // Stroke: lower is better (ascending)
  const sortedResults = [...results].sort((a, b) => {
    if (gameType === 'stableford' || gameType === 'par') {
      return b.rawScore - a.rawScore;
    }
    return a.rawScore - b.rawScore;
  });

  // Group results by score to handle ties
  const scoreGroups = groupByScore(sortedResults);

  const scoredResults: ScoredResult<TParticipant>[] = [];
  let currentPosition = 1;

  for (const group of scoreGroups) {
    const groupSize = group.length;
    const isTied = groupSize > 1;

    const competitionPointsByParticipant = computeCompetitionPointsForGroup(
      group,
      currentPosition,
      groupSize,
      isTied,
      pointSystem,
      individualRule
    );

    for (const result of group) {
      scoredResults.push({
        ...result,
        position: currentPosition,
        tied: isTied,
        competitionPoints: competitionPointsByParticipant.get(result.participantId) ?? 0,
      });
    }

    currentPosition += groupSize;
  }

  return scoredResults;
}

/**
 * Compute competition points for a tie group, dispatching on the configured
 * individualRule mode. Returns a map keyed by participantId so callers can
 * apply the value when constructing scored rows.
 */
function computeCompetitionPointsForGroup<TParticipant>(
  group: RoundResult<TParticipant>[],
  currentPosition: number,
  groupSize: number,
  isTied: boolean,
  pointSystem: PointSystemRules,
  individualRule: IndividualPointsRule | undefined
): Map<TParticipant, number> {
  const result = new Map<TParticipant, number>();
  const mode = individualRule?.mode ?? 'positional';

  switch (mode) {
    case 'raw_score': {
      // Each participant's competition points equal their raw round score
      // (e.g. Stableford total). Aggregating across rounds then yields a
      // cumulative raw-score total — what the user wants for stableford
      // competitions where the leaderboard should be ordered by total points.
      for (const r of group) {
        result.set(r.participantId, r.rawScore);
      }
      break;
    }
    case 'win_tie_loss': {
      const values = (individualRule as Extract<IndividualPointsRule, { mode: 'win_tie_loss' }>).values;
      const value = isTied
        ? values.tie
        : currentPosition === 1
          ? values.win
          : values.loss;
      for (const r of group) {
        result.set(r.participantId, value);
      }
      break;
    }
    case 'positional':
    default: {
      // When a positional rule supplies its own `rules` map we use it; otherwise
      // we fall back to the pointSystem the caller passed in (which already
      // reflects competition.point_system or override).
      const rulesForGroup =
        mode === 'positional' && individualRule && (individualRule as Extract<IndividualPointsRule, { mode: 'positional' }>).rules
          ? mapToPointSystemRules((individualRule as { rules?: Record<string, number> }).rules!, pointSystem)
          : pointSystem;

      const positionsOccupied = Array.from(
        { length: groupSize },
        (_, i) => currentPosition + i
      );
      const totalPoints = positionsOccupied.reduce(
        (sum, pos) => sum + getPointsForPosition(pos, rulesForGroup),
        0
      );
      const averagePoints = Math.round(totalPoints / groupSize);
      for (const r of group) {
        result.set(r.participantId, averagePoints);
      }
      break;
    }
  }

  return result;
}

/**
 * Convert a position-points map (string key → number) into the engine's
 * PointSystemRules shape. Preserves matchPlay from the caller-provided base.
 */
function mapToPointSystemRules(
  map: Record<string, number>,
  base: PointSystemRules
): PointSystemRules {
  const positionPoints: number[] = [];
  for (let i = 1; i <= 20; i++) {
    const points = map[i.toString()];
    if (points !== undefined) {
      positionPoints.push(points);
    } else {
      break;
    }
  }
  return {
    positionPoints,
    defaultPoints: map['default'] ?? 0,
    matchPlay: base.matchPlay,
  };
}

/**
 * Calculate match play competition points for a single match result.
 *
 * @param matchResult - The match result (win/draw/loss)
 * @param pointSystem - Point allocation rules with matchPlay config
 * @returns Competition points earned
 */
export function calculateMatchPlayPoints<TParticipant = string>(
  matchResult: MatchResult<TParticipant>,
  pointSystem: PointSystemRules
): number {
  const matchPlayConfig = pointSystem.matchPlay ?? {
    win: 2,
    draw: 1,
    loss: 0,
  };

  switch (matchResult.result) {
    case 'win':
      return matchPlayConfig.win;
    case 'draw':
      return matchPlayConfig.draw;
    case 'loss':
      return matchPlayConfig.loss;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get points for a specific position from the point system
 */
export function getPointsForPosition(position: number, pointSystem: PointSystemRules): number {
  const index = position - 1;
  if (index < pointSystem.positionPoints.length) {
    return pointSystem.positionPoints[index];
  }
  return pointSystem.defaultPoints ?? 0;
}

/**
 * Group results by raw score for tie detection
 */
function groupByScore<T extends { rawScore: number }>(sortedResults: T[]): T[][] {
  const groups: T[][] = [];
  let currentGroup: T[] = [];
  let currentScore: number | null = null;

  for (const result of sortedResults) {
    if (currentScore === null || result.rawScore === currentScore) {
      currentGroup.push(result);
      currentScore = result.rawScore;
    } else {
      groups.push(currentGroup);
      currentGroup = [result];
      currentScore = result.rawScore;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

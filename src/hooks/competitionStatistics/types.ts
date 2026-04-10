/**
 * Competition Statistics Types
 *
 * View models for the Stats tab on the Competition Detail screen.
 * These are derived client-side from scorecards + hole scores + courses + players
 * by `useCompetitionStatistics`.
 */

export type ScoringMode = 'gross' | 'net';

/**
 * Semantic grouping of categories in the Stats tab UI.
 */
export type CategoryGroupKey =
  | 'scoring'
  | 'putting'
  | 'offTheTee'
  | 'approach'
  | 'bunkers'
  | 'hazards';

/**
 * Individual stat category — e.g. "Most Birdies", "Best FIR %".
 */
export type CategoryKey =
  // Scoring (affected by Gross/Net toggle)
  | 'mostBirdiesOrBetter'
  | 'mostEaglesOrBetter'
  | 'mostPars'
  | 'fewestBogeysOrWorse'
  | 'bestSingleRound'
  // Putting
  | 'fewestAvgPuttsPerRound'
  | 'mostOnePutts'
  | 'fewestThreePuttsOrWorse'
  // Off the tee
  | 'bestFairwayPercentage'
  // Approach
  | 'bestGirPercentage'
  // Trouble
  | 'fewestBunkerShots'
  | 'fewestHazards';

/**
 * A single player's entry in a category ranking.
 * `displayValue` is a pre-formatted string (e.g. "62%", "28.5", "12").
 */
export interface PlayerEntry {
  playerId: string;
  playerName: string;
  value: number;
  displayValue: string;
}

/**
 * Players sharing the same value form a single rank group.
 * `rank` is 1-based; tied groups all share the same rank, and the next
 * group's rank skips (1, 1, 3, 4 …).
 */
export interface RankGroup {
  rank: number;
  value: number;
  displayValue: string;
  players: PlayerEntry[];
}

/**
 * A single stat category card.
 */
export interface Category {
  key: CategoryKey;
  label: string;
  icon: string;
  /** Tailwind-ish semantic hint — resolved at render time via theme colors */
  tone: 'birdie' | 'eagle' | 'par' | 'bogey' | 'success' | 'warning' | 'primary' | 'neutral';
  /** Pre-grouped rankings. Always sorted "best" first. */
  ranks: RankGroup[];
}

/**
 * A visually grouped cluster of categories (e.g. all Putting stats).
 */
export interface CategoryGroup {
  key: CategoryGroupKey;
  title: string;
  icon: string;
  categories: Category[];
}

/**
 * Top-level Stats payload returned by `useCompetitionStatistics`.
 */
export interface CompetitionStats {
  groups: CategoryGroup[];
  hasHandicapRound: boolean;
  hasAnyData: boolean;
  excludedScrambleRoundCount: number;
  allRoundsAreScramble: boolean;
  participantCount: number;
}

/**
 * Achievement Checker Service
 *
 * Core logic for checking achievements based on events.
 * All functions are pure for testability.
 */

import type {
  AchievementCategory,
  AchievementDefinition,
  AchievementEventData,
  AchievementEventType,
  AchievementProgress,
  AchievementProgressUpdate,
} from '@/types/database/achievement.types';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';
import {
  checkThresholdMet,
  createProgressMap,
  filterEarnableAchievements,
} from '@/utils/achievementCalculations';

// =====================================================
// TYPES
// =====================================================

/**
 * Result of checking achievements for an event
 */
export interface AchievementCheckResult {
  /** Progress updates to persist */
  progressUpdates: AchievementProgressUpdate[];
  /** Newly earned achievements */
  newlyEarned: AchievementDefinition[];
  /** Newly unlocked cosmetics */
  cosmeticUnlocks: CosmeticDefinition[];
}

/**
 * Input for achievement checking
 */
export interface CheckAchievementsInput {
  playerId: string;
  eventType: AchievementEventType;
  eventData: AchievementEventData;
  currentProgress: AchievementProgress[];
  definitions: AchievementDefinition[];
  earnedAchievementIds: string[];
  cosmetics: CosmeticDefinition[];
  unlockedCosmeticIds: string[];
  currentPoints: number;
}

// =====================================================
// EVENT TO CATEGORY MAPPING
// =====================================================

/**
 * Maps event types to the achievement categories they can affect.
 * An event can trigger achievements in multiple categories.
 */
const EVENT_CATEGORY_MAP: Record<AchievementEventType, AchievementCategory[]> = {
  round_completed: ['rounds', 'game_types', 'courses', 'streaks'],
  scorecard_submitted: ['scoring', 'rounds', 'streaks'],
  competition_joined: ['competitions', 'social'],
  competition_won: ['competitions'],
  competition_podium: ['competitions'],
  friend_added: ['social'],
  course_played: ['courses'],
  home_venue_played: ['courses'],
  birdie_recorded: ['scoring'],
  eagle_recorded: ['scoring'],
  albatross_recorded: ['scoring'],
  ace_recorded: ['scoring'],
  par_recorded: ['scoring'],
  competition_created: ['competitions'],
  match_play_won: ['match_play', 'competitions'],
  stableford_round: ['game_types', 'scoring'],
};

/**
 * Maps event types to the base achievement codes they affect.
 * This allows fine-grained control over which achievements to check.
 */
const EVENT_ACHIEVEMENT_MAP: Record<AchievementEventType, string[]> = {
  round_completed: [
    'ROUND_VETERAN',
    'PRACTICE_MAKES_PERFECT',
    'COMPETITOR',
    '18_HOLES_OF_GLORY',
    'COURSE_EXPLORER',
    'HOME_ADVANTAGE',
    'COURSE_CONQUEROR',
  ],
  scorecard_submitted: [
    'ROUND_VETERAN',
    'STABLEFORD_SPECIALIST',
    'STROKE_PLAYER',
    'MATCH_PLAY_MASTER',
    'TEAM_PLAYER',
    'LOW_SCORER',
    'NET_MASTER',
    'STABLEFORD_STAR',
  ],
  competition_joined: ['COMPETITION_JUNKIE', 'FIRST_TIMER', 'SOCIAL_BUTTERFLY'],
  competition_won: ['CHAMPION', 'HOT_STREAK'],
  competition_podium: ['PODIUM_FINISH', 'CONSISTENT_PERFORMER'],
  friend_added: ['FIRST_FRIEND', 'SOCIAL_CIRCLE'],
  course_played: ['COURSE_EXPLORER', 'STATE_TRAVELER'],
  home_venue_played: ['HOME_ADVANTAGE'],
  birdie_recorded: ['BIRDIE_HUNTER', 'BIRDIE_STREAK'],
  eagle_recorded: ['EAGLE_EYE'],
  albatross_recorded: ['ALBATROSS_RARE'],
  ace_recorded: ['ACE'],
  par_recorded: ['PAR_MACHINE', 'PAR_STREAK'],
  competition_created: ['ORGANIZER'],
  match_play_won: ['MATCH_WINNER', 'DOMINANT_VICTORY', 'COMEBACK_KING', 'HOLES_WON'],
  stableford_round: ['STABLEFORD_SPECIALIST', 'STABLEFORD_STAR'],
};

// =====================================================
// MAIN CHECK FUNCTION
// =====================================================

/**
 * Main achievement checking function.
 * Checks relevant achievements for an event, calculates new progress,
 * and returns newly earned achievements and cosmetic unlocks.
 *
 * @param input - All data needed to check achievements
 * @returns Progress updates, newly earned achievements, and cosmetic unlocks
 *
 * @example
 * ```typescript
 * const result = checkAchievements({
 *   playerId: 'player-123',
 *   eventType: 'round_completed',
 *   eventData: { game_type: 'stableford', course_id: 'course-1' },
 *   currentProgress: [...],
 *   definitions: [...],
 *   earnedAchievementIds: ['ach-1', 'ach-2'],
 *   cosmetics: [...],
 *   unlockedCosmeticIds: ['cos-1'],
 *   currentPoints: 150,
 * });
 * // result.newlyEarned contains newly unlocked achievements
 * // result.progressUpdates contains progress to persist
 * // result.cosmeticUnlocks contains newly unlocked cosmetics
 * ```
 */
export function checkAchievements(input: CheckAchievementsInput): AchievementCheckResult {
  const {
    eventType,
    eventData,
    currentProgress,
    definitions,
    earnedAchievementIds,
    cosmetics,
    unlockedCosmeticIds,
    currentPoints,
  } = input;

  // 1. Filter definitions relevant to this event type
  const relevantAchievements = getRelevantAchievements(eventType, definitions);

  // 2. Get earnable achievements (filter out already earned)
  const earnableAchievements = filterEarnableAchievements(relevantAchievements, earnedAchievementIds);

  // 3. Create progress map for quick lookup
  const progressMap = createProgressMap(currentProgress);

  // 4. Calculate progress updates and check thresholds
  const progressUpdates: AchievementProgressUpdate[] = [];
  const newlyEarned: AchievementDefinition[] = [];
  let pointsGained = 0;

  // Group earnable achievements by base code
  const achievementsByBase = groupByBaseCode(earnableAchievements);

  for (const [baseCode, achievements] of Object.entries(achievementsByBase)) {
    // Get increment for this base achievement
    const increment = getProgressIncrement(eventType, eventData, baseCode);

    if (increment <= 0) {
      continue;
    }

    // Calculate new progress
    const currentValue = progressMap.get(baseCode) ?? 0;
    const newValue = calculateNewProgress(currentValue, increment);

    // Add progress update
    progressUpdates.push({
      achievement_code: baseCode,
      new_value: newValue,
      previous_value: currentValue,
    });

    // Check which tier achievements are now earned
    for (const achievement of achievements) {
      if (checkThresholdMet(newValue, achievement.threshold)) {
        newlyEarned.push(achievement);
        pointsGained += achievement.points;
      }
    }
  }

  // 5. Check for new cosmetic unlocks based on new total points
  const newTotalPoints = currentPoints + pointsGained;
  const cosmeticUnlocks = checkCosmeticUnlocksFromPoints(
    newTotalPoints,
    cosmetics,
    unlockedCosmeticIds
  );

  return {
    progressUpdates,
    newlyEarned,
    cosmeticUnlocks,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Gets achievements relevant to an event type.
 *
 * Filters achievements by:
 * 1. Category relevance (from EVENT_CATEGORY_MAP)
 * 2. Base code relevance (from EVENT_ACHIEVEMENT_MAP)
 *
 * @param eventType - The type of event that occurred
 * @param definitions - All achievement definitions
 * @returns Achievements that could be affected by this event
 */
export function getRelevantAchievements(
  eventType: AchievementEventType,
  definitions: AchievementDefinition[]
): AchievementDefinition[] {
  const relevantCategories = EVENT_CATEGORY_MAP[eventType] ?? [];
  const relevantBaseCodes = EVENT_ACHIEVEMENT_MAP[eventType] ?? [];

  return definitions.filter((def) => {
    // Check if category matches
    const categoryMatch = relevantCategories.includes(def.category);

    // Check if base code matches (more specific filtering)
    const baseCode = def.base_achievement ?? def.code;
    const baseCodeMatch = relevantBaseCodes.some(
      (code) => baseCode.startsWith(code) || baseCode === code
    );

    // Include if either matches (category for broader relevance, base code for specifics)
    return categoryMatch || baseCodeMatch;
  });
}

/**
 * Gets the progress increment for an event and base achievement.
 *
 * @param eventType - The type of event that occurred
 * @param eventData - Data about the event
 * @param baseCode - The base achievement code to check
 * @returns The increment amount (usually 1, but can vary based on event data)
 */
export function getProgressIncrement(
  eventType: AchievementEventType,
  eventData: AchievementEventData,
  baseCode: string
): number {
  switch (eventType) {
    case 'round_completed':
      return getProgressIncrementForRound(eventData, baseCode);

    case 'scorecard_submitted':
      return getProgressIncrementForScorecard(eventData, baseCode);

    case 'competition_joined':
      return getProgressIncrementForCompetition(eventData, baseCode);

    case 'competition_won':
      return baseCode.startsWith('CHAMPION') || baseCode.startsWith('HOT_STREAK') ? 1 : 0;

    case 'competition_podium':
      return baseCode.startsWith('PODIUM_FINISH') || baseCode.startsWith('CONSISTENT_PERFORMER')
        ? 1
        : 0;

    case 'friend_added':
      // For social circle, use the friend count directly if provided
      if (baseCode.startsWith('SOCIAL_CIRCLE') && eventData.friend_count !== undefined) {
        return eventData.friend_count; // Return absolute count, not increment
      }
      return baseCode.startsWith('FIRST_FRIEND') || baseCode.startsWith('SOCIAL_CIRCLE') ? 1 : 0;

    case 'course_played':
      return getProgressIncrementForCourse(eventData, baseCode);

    case 'home_venue_played':
      return baseCode.startsWith('HOME_ADVANTAGE') ? 1 : 0;

    case 'birdie_recorded':
      return baseCode.startsWith('BIRDIE_HUNTER') || baseCode.startsWith('BIRDIE_STREAK') ? 1 : 0;

    case 'eagle_recorded':
      return baseCode.startsWith('EAGLE_EYE') ? 1 : 0;

    case 'albatross_recorded':
      return baseCode.startsWith('ALBATROSS_RARE') ? 1 : 0;

    case 'ace_recorded':
      return baseCode.startsWith('ACE') ? 1 : 0;

    case 'par_recorded':
      return baseCode.startsWith('PAR_MACHINE') || baseCode.startsWith('PAR_STREAK') ? 1 : 0;

    case 'competition_created':
      return baseCode.startsWith('ORGANIZER') ? 1 : 0;

    case 'match_play_won':
      return getProgressIncrementForMatchPlay(eventData, baseCode);

    case 'stableford_round':
      return getProgressIncrementForStableford(eventData, baseCode);

    default:
      return 0;
  }
}

/**
 * Calculates new progress value.
 *
 * @param currentValue - The current progress value
 * @param increment - The amount to increment by
 * @returns The new progress value
 */
export function calculateNewProgress(currentValue: number, increment: number): number {
  return currentValue + increment;
}

// =====================================================
// SPECIALIZED INCREMENT HELPERS
// =====================================================

/**
 * Gets progress increment for round completion events.
 */
function getProgressIncrementForRound(eventData: AchievementEventData, baseCode: string): number {
  // Round veteran: any round
  if (baseCode.startsWith('ROUND_VETERAN')) {
    return 1;
  }

  // Practice vs competition rounds
  if (baseCode.startsWith('PRACTICE_MAKES_PERFECT')) {
    return eventData.is_competition === false ? 1 : 0;
  }

  if (baseCode.startsWith('COMPETITOR')) {
    return eventData.is_competition === true ? 1 : 0;
  }

  // 18 hole rounds
  if (baseCode.startsWith('18_HOLES_OF_GLORY')) {
    return eventData.hole_count === 18 ? 1 : 0;
  }

  // Course-related achievements
  if (baseCode.startsWith('COURSE_EXPLORER')) {
    return 1; // Assuming each call is a unique course played
  }

  if (baseCode.startsWith('HOME_ADVANTAGE')) {
    return eventData.is_home_venue === true ? 1 : 0;
  }

  if (baseCode.startsWith('COURSE_CONQUEROR')) {
    return 1; // Track plays at same course
  }

  return 0;
}

/**
 * Gets progress increment for scorecard submission events.
 */
function getProgressIncrementForScorecard(
  eventData: AchievementEventData,
  baseCode: string
): number {
  const gameType = eventData.game_type?.toLowerCase();

  // Game type specific achievements
  if (baseCode.startsWith('STABLEFORD_SPECIALIST')) {
    return gameType === 'stableford' ? 1 : 0;
  }

  if (baseCode.startsWith('STROKE_PLAYER')) {
    return gameType === 'stroke_play' || gameType === 'strokeplay' ? 1 : 0;
  }

  if (baseCode.startsWith('MATCH_PLAY_MASTER')) {
    return gameType === 'match_play' || gameType === 'matchplay' ? 1 : 0;
  }

  if (baseCode.startsWith('TEAM_PLAYER')) {
    return ['best_ball', 'scramble', 'shamble', 'fourball'].includes(gameType ?? '') ? 1 : 0;
  }

  // Score thresholds
  if (baseCode.startsWith('LOW_SCORER') && eventData.gross_score !== undefined) {
    // LOW_SCORER achievements use gross score as progress value
    // The threshold check will determine which tier is earned
    return eventData.gross_score;
  }

  if (baseCode.startsWith('NET_MASTER') && eventData.net_score !== undefined) {
    // NET_MASTER uses net score relative to par
    return eventData.net_score;
  }

  if (baseCode.startsWith('STABLEFORD_STAR') && eventData.stableford_points !== undefined) {
    // STABLEFORD_STAR tracks points
    return eventData.stableford_points;
  }

  // Round veteran on scorecard submit
  if (baseCode.startsWith('ROUND_VETERAN')) {
    return 1;
  }

  return 0;
}

/**
 * Gets progress increment for competition events.
 */
function getProgressIncrementForCompetition(
  eventData: AchievementEventData,
  baseCode: string
): number {
  if (baseCode.startsWith('COMPETITION_JUNKIE')) {
    return 1;
  }

  if (baseCode.startsWith('FIRST_TIMER')) {
    return 1;
  }

  // Social butterfly - competitions with 8+ players
  if (baseCode.startsWith('SOCIAL_BUTTERFLY')) {
    return (eventData.unique_players_count ?? 0) >= 8 ? 1 : 0;
  }

  return 0;
}

/**
 * Gets progress increment for course play events.
 */
function getProgressIncrementForCourse(eventData: AchievementEventData, baseCode: string): number {
  if (baseCode.startsWith('COURSE_EXPLORER')) {
    return 1; // Unique course played
  }

  if (baseCode.startsWith('STATE_TRAVELER')) {
    return 1; // Unique state played
  }

  return 0;
}

/**
 * Gets progress increment for match play events.
 */
function getProgressIncrementForMatchPlay(
  eventData: AchievementEventData,
  baseCode: string
): number {
  if (baseCode.startsWith('MATCH_WINNER')) {
    return eventData.match_result === 'win' ? 1 : 0;
  }

  if (baseCode.startsWith('DOMINANT_VICTORY')) {
    // Check for 5&4 or better
    const margin = eventData.margin;
    if (margin && eventData.match_result === 'win') {
      const match = margin.match(/^(\d+)&(\d+)$/);
      if (match) {
        const holesUp = parseInt(match[1], 10);
        const holesRemaining = parseInt(match[2], 10);
        // 5&4 or better means won by 5+ with 4+ holes remaining
        return holesUp >= 5 && holesRemaining >= 4 ? 1 : 0;
      }
    }
    return 0;
  }

  if (baseCode.startsWith('COMEBACK_KING')) {
    // This needs additional context about being down during match
    // For now, use a marker in event data
    return eventData.match_result === 'win' ? 1 : 0;
  }

  if (baseCode.startsWith('HOLES_WON')) {
    // Would need hole-by-hole data
    return 0;
  }

  if (baseCode.startsWith('HALVED_MATCH')) {
    return eventData.match_result === 'halve' ? 1 : 0;
  }

  return 0;
}

/**
 * Gets progress increment for Stableford round events.
 */
function getProgressIncrementForStableford(
  eventData: AchievementEventData,
  baseCode: string
): number {
  if (baseCode.startsWith('STABLEFORD_SPECIALIST')) {
    return 1;
  }

  if (baseCode.startsWith('STABLEFORD_STAR') && eventData.stableford_points !== undefined) {
    // Return the points scored for threshold checking
    return eventData.stableford_points;
  }

  return 0;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Groups achievements by their base code.
 * Achievements with tiers share a base_achievement code.
 */
function groupByBaseCode(
  achievements: AchievementDefinition[]
): Record<string, AchievementDefinition[]> {
  const result: Record<string, AchievementDefinition[]> = {};

  for (const achievement of achievements) {
    const baseCode = achievement.base_achievement ?? achievement.code;

    if (!result[baseCode]) {
      result[baseCode] = [];
    }
    result[baseCode].push(achievement);
  }

  return result;
}

/**
 * Checks which cosmetics can be unlocked based on new total points.
 */
function checkCosmeticUnlocksFromPoints(
  totalPoints: number,
  cosmetics: CosmeticDefinition[],
  unlockedCosmeticIds: string[]
): CosmeticDefinition[] {
  const unlockedSet = new Set(unlockedCosmeticIds);

  return cosmetics.filter(
    (cosmetic) => cosmetic.points_required <= totalPoints && !unlockedSet.has(cosmetic.id)
  );
}

// =====================================================
// BATCH CHECKING
// =====================================================

/**
 * Check achievements for multiple events at once.
 * Useful for retroactive calculation or batch processing.
 *
 * @param events - Array of events to process
 * @param input - Base input (definitions, cosmetics, etc.)
 * @returns Combined result across all events
 */
export function checkAchievementsBatch(
  events: { eventType: AchievementEventType; eventData: AchievementEventData }[],
  input: Omit<CheckAchievementsInput, 'eventType' | 'eventData'>
): AchievementCheckResult {
  const allProgressUpdates: Map<string, AchievementProgressUpdate> = new Map();
  const allNewlyEarned: Map<string, AchievementDefinition> = new Map();
  let runningPoints = input.currentPoints;

  // Create mutable copies of progress and earned
  const progressMap = createProgressMap(input.currentProgress);
  const earnedIds = new Set(input.earnedAchievementIds);

  for (const event of events) {
    const result = checkAchievements({
      ...input,
      eventType: event.eventType,
      eventData: event.eventData,
      currentProgress: Array.from(progressMap.entries()).map(([code, value]) => ({
        id: code,
        player_id: input.playerId,
        achievement_code: code,
        current_value: value,
        last_updated: new Date().toISOString(),
      })),
      earnedAchievementIds: Array.from(earnedIds),
      currentPoints: runningPoints,
    });

    // Merge progress updates
    for (const update of result.progressUpdates) {
      const existing = allProgressUpdates.get(update.achievement_code);
      if (existing) {
        existing.new_value = update.new_value;
      } else {
        allProgressUpdates.set(update.achievement_code, { ...update });
      }
      progressMap.set(update.achievement_code, update.new_value);
    }

    // Merge newly earned (avoid duplicates)
    for (const earned of result.newlyEarned) {
      if (!allNewlyEarned.has(earned.id)) {
        allNewlyEarned.set(earned.id, earned);
        earnedIds.add(earned.id);
        runningPoints += earned.points;
      }
    }
  }

  // Check final cosmetic unlocks
  const cosmeticUnlocks = checkCosmeticUnlocksFromPoints(
    runningPoints,
    input.cosmetics,
    input.unlockedCosmeticIds
  );

  return {
    progressUpdates: Array.from(allProgressUpdates.values()),
    newlyEarned: Array.from(allNewlyEarned.values()),
    cosmeticUnlocks,
  };
}

// =====================================================
// EXPORTS
// =====================================================

export {
  EVENT_CATEGORY_MAP,
  EVENT_ACHIEVEMENT_MAP,
};

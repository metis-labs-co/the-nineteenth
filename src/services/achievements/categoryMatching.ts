/**
 * Achievement Category Matching
 *
 * Maps event types to achievement categories and base codes.
 * Used by the achievement checker to determine which achievements
 * are relevant to a given event.
 */

import type {
  AchievementCategory,
  AchievementDefinition,
  AchievementEventType,
} from '@/types/database/achievement.types';

// =====================================================
// EVENT TO CATEGORY MAPPING
// =====================================================

/**
 * Maps event types to the achievement categories they can affect.
 * An event can trigger achievements in multiple categories.
 */
export const EVENT_CATEGORY_MAP: Record<AchievementEventType, AchievementCategory[]> = {
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
  skins_game_completed: ['side_games'],
  skins_hole_won: ['side_games'],
  wolf_game_completed: ['side_games'],
  wolf_decision_made: ['side_games'],
  league_joined: ['leagues'],
  league_round_completed: ['leagues'],
  knockout_match_won: ['competitions'],
};

/**
 * Maps event types to the base achievement codes they affect.
 * This allows fine-grained control over which achievements to check.
 */
export const EVENT_ACHIEVEMENT_MAP: Record<AchievementEventType, string[]> = {
  round_completed: [
    'ROUND_VETERAN',
    'PRACTICE_MAKES_PERFECT',
    'COMPETITOR',
    '18_HOLES_OF_GLORY',
    'COURSE_EXPLORER',
    'HOME_ADVANTAGE',
    'COURSE_CONQUEROR',
    'NINE_HOLE_SPECIALIST',
  ],
  scorecard_submitted: [
    'ROUND_VETERAN',
    'STABLEFORD_SPECIALIST',
    'STROKE_PLAYER',
    'MATCH_PLAY_MASTER',
    'TEAM_PLAYER',
    'PAR_SPECIALIST',
    'LOW_SCORER',
    'NET_MASTER',
    'STABLEFORD_STAR',
    'FORMAT_EXPLORER',
    'SCORING_MACHINE',
  ],
  competition_joined: ['COMPETITION_JUNKIE', 'FIRST_TIMER', 'SOCIAL_BUTTERFLY'],
  competition_won: ['CHAMPION', 'HOT_STREAK'],
  competition_podium: ['PODIUM_FINISH', 'CONSISTENT_PERFORMER'],
  friend_added: ['FIRST_FRIEND', 'SOCIAL_CIRCLE'],
  course_played: ['COURSE_EXPLORER', 'STATE_TRAVELER'],
  home_venue_played: ['HOME_ADVANTAGE'],
  birdie_recorded: ['BIRDIE_HUNTER'],
  eagle_recorded: ['EAGLE_EYE'],
  albatross_recorded: ['ALBATROSS_RARE'],
  ace_recorded: ['ACE'],
  par_recorded: ['PAR_MACHINE'],
  competition_created: ['ORGANIZER'],
  match_play_won: ['MATCH_WINNER', 'DOMINANT_VICTORY', 'COMEBACK_KING', 'HOLES_WON'],
  stableford_round: ['STABLEFORD_SPECIALIST', 'STABLEFORD_STAR'],
  // Side games
  skins_game_completed: ['SKINS_SHARK', 'FIRST_SKIN', 'CLEAN_SWEEP'],
  skins_hole_won: ['SKIN_COLLECTOR', 'CARRY_KING'],
  wolf_game_completed: ['WOLF_PACK', 'FIRST_HUNT'],
  wolf_decision_made: ['LONE_WOLF', 'BLIND_WOLF'],
  // Leagues
  league_joined: ['LEAGUE_MEMBER'],
  league_round_completed: ['LEAGUE_REGULAR'],
  // Knockout
  knockout_match_won: ['KNOCKOUT_KING'],
};

// =====================================================
// CATEGORY MATCHING FUNCTIONS
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

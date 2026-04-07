/**
 * Achievement Progress Calculation
 *
 * Functions for calculating progress increments based on events.
 * All functions are pure for testability.
 */

import type {
  AchievementEventData,
  AchievementEventType,
} from '@/types/database/achievement.types';

// =====================================================
// MAIN PROGRESS FUNCTIONS
// =====================================================

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
      if (baseCode.startsWith('BIRDIE_HUNTER')) {
        return eventData.birdies ?? 1;
      }
      return 0;

    case 'eagle_recorded':
      if (baseCode.startsWith('EAGLE_EYE')) {
        return eventData.eagles ?? 1;
      }
      return 0;

    case 'albatross_recorded':
      if (baseCode.startsWith('ALBATROSS_RARE')) {
        return eventData.albatrosses ?? 1;
      }
      return 0;

    case 'ace_recorded':
      return baseCode.startsWith('ACE') ? 1 : 0;

    case 'par_recorded':
      if (baseCode.startsWith('PAR_MACHINE')) {
        return eventData.pars ?? 1;
      }
      return 0;

    case 'competition_created':
      return baseCode.startsWith('ORGANIZER') ? 1 : 0;

    case 'match_play_won':
      return getProgressIncrementForMatchPlay(eventData, baseCode);

    case 'stableford_round':
      return getProgressIncrementForStableford(eventData, baseCode);

    // Side games
    case 'skins_game_completed':
      return getProgressIncrementForSkinsGame(eventData, baseCode);

    case 'skins_hole_won':
      return getProgressIncrementForSkinsHole(eventData, baseCode);

    case 'wolf_game_completed':
      return getProgressIncrementForWolfGame(eventData, baseCode);

    case 'wolf_decision_made':
      return getProgressIncrementForWolfDecision(eventData, baseCode);

    // Leagues
    case 'league_joined':
      return baseCode.startsWith('LEAGUE_MEMBER') ? 1 : 0;

    case 'league_round_completed':
      return baseCode.startsWith('LEAGUE_REGULAR') ? 1 : 0;

    // Knockout
    case 'knockout_match_won':
      return baseCode.startsWith('KNOCKOUT_KING') ? 1 : 0;

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

  // 9 hole rounds
  if (baseCode.startsWith('NINE_HOLE_SPECIALIST')) {
    return eventData.hole_count === 9 ? 1 : 0;
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

  if (baseCode.startsWith('PAR_SPECIALIST')) {
    return gameType === 'par' ? 1 : 0;
  }

  if (baseCode.startsWith('FORMAT_EXPLORER')) {
    // Increment by 1 for any round — uniqueness tracking handled by progress value
    return 1;
  }

  if (baseCode.startsWith('SCORING_MACHINE')) {
    return 1; // Any scorecard submission counts
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
// SIDE GAME INCREMENT HELPERS
// =====================================================

/**
 * Gets progress increment for skins game completion events.
 */
function getProgressIncrementForSkinsGame(
  eventData: AchievementEventData,
  baseCode: string
): number {
  if (baseCode.startsWith('SKINS_SHARK')) {
    return 1; // Games played
  }

  if (baseCode.startsWith('FIRST_SKIN')) {
    return 1; // First game completed
  }

  if (baseCode.startsWith('CLEAN_SWEEP')) {
    // Won 5+ skins in a single game
    return (eventData.skins_holes_won ?? 0) >= 5 ? 1 : 0;
  }

  return 0;
}

/**
 * Gets progress increment for skins hole won events.
 */
function getProgressIncrementForSkinsHole(
  eventData: AchievementEventData,
  baseCode: string
): number {
  if (baseCode.startsWith('SKIN_COLLECTOR')) {
    return eventData.skins_holes_won ?? 1;
  }

  if (baseCode.startsWith('CARRY_KING')) {
    // Won a hole with carryovers
    return (eventData.skins_carryover_holes_won ?? 0) > 0 ? 1 : 0;
  }

  return 0;
}

/**
 * Gets progress increment for wolf game completion events.
 */
function getProgressIncrementForWolfGame(
  eventData: AchievementEventData,
  baseCode: string
): number {
  if (baseCode.startsWith('WOLF_PACK')) {
    return 1; // Games played
  }

  if (baseCode.startsWith('FIRST_HUNT')) {
    return 1; // First game completed
  }

  return 0;
}

/**
 * Gets progress increment for wolf decision events.
 */
function getProgressIncrementForWolfDecision(
  eventData: AchievementEventData,
  baseCode: string
): number {
  if (baseCode.startsWith('LONE_WOLF')) {
    // Lone wolf wins (no partner chosen, wolf team won)
    return eventData.wolf_is_lone === true ? 1 : 0;
  }

  if (baseCode.startsWith('BLIND_WOLF')) {
    // Blind wolf wins
    return eventData.wolf_is_blind === true ? 1 : 0;
  }

  return 0;
}

/**
 * Constants for RoundDetailsTab components
 */

import type { GameType, CompetitionType } from '@/types/database.types';

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  stableford: 'Stableford',
  stroke: 'Stroke Play',
  'match-play': 'Match Play',
  'best-ball': 'Best Ball',
  scramble: 'Scramble',
  shamble: 'Shamble',
};

export const COMPETITION_TYPE_LABELS: Record<CompetitionType, string> = {
  league: 'League',
  event: 'Event',
};

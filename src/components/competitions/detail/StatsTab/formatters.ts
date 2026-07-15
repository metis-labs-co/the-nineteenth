/**
 * Formatters for the Stats tab.
 * Kept separate from the components so they're easy to unit test.
 */

import type { CategoryKey, PlayerEntry } from '@/hooks/competitionStatistics';

/**
 * Format a list of tied player names for the leader row of a stat card.
 *
 * - 1 player  -> "Alex"
 * - 2 players -> "Alex & Jordan"
 * - 3 players -> "Alex, Jordan & Sam"
 * - 4+        -> "Alex, Jordan +2 others"
 */
export function formatTiedNames(players: PlayerEntry[]): string {
  if (players.length === 0) return '';
  const names = players.map((p) => p.playerName);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} & ${names[2]}`;
  const shown = names.slice(0, 2).join(', ');
  const remainder = names.length - 2;
  return `${shown} +${remainder} ${remainder === 1 ? 'other' : 'others'}`;
}

/**
 * Format a rank number into a display label.
 * Tied ranks get a "T" prefix: T1, T2, etc.
 */
export function formatRank(rank: number, isTied: boolean): string {
  return isTied ? `T${rank}` : `${rank}`;
}

/**
 * Initials for the leader avatar circle — first letter of the first two words.
 */
export function initialsFor(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Short unit label shown on the right of a stat card header
 * (purely presentational — mirrors the category's display value).
 */
export function unitForCategory(key: CategoryKey): string {
  switch (key) {
    case 'mostBirdiesOrBetter':
      return 'birdies';
    case 'mostEaglesOrBetter':
      return 'eagles';
    case 'mostPars':
      return 'pars';
    case 'fewestBogeysOrWorse':
      return 'bogeys+';
    case 'bestSingleRound':
      return 'strokes';
    case 'fewestAvgPuttsPerRound':
      return 'putts / round';
    case 'mostOnePutts':
      return '1-putts';
    case 'fewestThreePuttsOrWorse':
      return '3-putts+';
    case 'bestFairwayPercentage':
      return 'FIR %';
    case 'bestGirPercentage':
      return 'GIR %';
    case 'fewestBunkerShots':
      return 'shots';
    case 'fewestHazards':
      return 'hazards';
  }
}

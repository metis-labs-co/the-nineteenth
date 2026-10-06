/**
 * "Not played" rounds — a competition round whose scheduled date has passed
 * while it was still `upcoming`, i.e. nobody ever started it.
 *
 * These drop out of the upcoming section (there is nothing to score today) and
 * into Recent Rounds, where the card labels them so the gap in a player's
 * history is explained rather than silently missing.
 *
 * Standalone rounds are deliberately excluded: the user owns them and can
 * still start or delete a stale scheduled round, so it stays actionable.
 */

import { getLocalDateString } from '@/utils/formatting';
import type { RoundItem } from '../types';
import { isCompetitionRoundItem } from './useRoundFilters';

/**
 * Normalise a round date to a `YYYY-MM-DD` key. `rounds.date` is a DATE column
 * so it already arrives in that form; a Date is formatted in local time rather
 * than sliced off an ISO string, which would shift the day west of UTC.
 */
function toDateKey(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  if (date instanceof Date) return getLocalDateString(date);
  const match = /^\d{4}-\d{2}-\d{2}/.exec(date);
  return match ? match[0] : null;
}

/**
 * Whether a round was scheduled before today and never started.
 *
 * @param today - `YYYY-MM-DD` for the current local day; injectable for tests.
 */
export function isNotPlayedRound(
  round: RoundItem,
  today: string = getLocalDateString()
): boolean {
  // 'in-progress' means somebody started it, 'completed' means it happened.
  if (round.status !== 'upcoming') return false;
  if (!isCompetitionRoundItem(round)) return false;

  const dateKey = toDateKey(round.date);
  // An undated competition round has no deadline to have missed.
  if (!dateKey) return false;

  return dateKey < today;
}

/**
 * Splits the fetched rounds into the two lists the screen renders.
 *
 * `active` feeds the In Progress / upcoming section, `history` feeds Recent
 * Rounds. A "not played" round is still `upcoming` in the database but there
 * is nothing left to score today, so it belongs in Recent Rounds — flagged, so
 * the card can say why it has no score.
 *
 * Mutates each round's `notPlayed` flag so the card and the split can't drift.
 */
export function splitActiveAndHistory(
  allRounds: RoundItem[],
  today: string = getLocalDateString()
): { active: RoundItem[]; history: RoundItem[] } {
  for (const round of allRounds) {
    if (isNotPlayedRound(round, today)) round.notPlayed = true;
  }

  const byDateDescending = (a: RoundItem, b: RoundItem) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return 0;
  };

  const active = allRounds
    .filter((r) => r.status !== 'completed' && !r.notPlayed)
    .sort((a, b) => {
      // In-progress first
      if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
      if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
      // Then by date (most recent first)
      return byDateDescending(a, b);
    });

  const history = allRounds
    .filter((r) => r.status === 'completed' || r.notPlayed)
    .sort(byDateDescending);

  return { active, history };
}

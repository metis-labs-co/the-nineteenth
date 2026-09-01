/**
 * Selects the upcoming (not-yet-started) rounds shown above Recent Rounds.
 *
 * Standalone rounds are all listed. A competition can carry a dozen scheduled
 * rounds, so only its NEXT one appears here — the rest stay on the competition
 * screen. Kept pure and separate from the screen so the "next per competition"
 * rule is directly testable.
 */

import type { RoundItem } from '../types';
import { isCompetitionRoundItem } from './useRoundFilters';

/**
 * Orders two upcoming rounds by how soon they are: earliest date first, then
 * by round number. Rounds with no date sort last — an undated competition
 * round isn't the one you score next.
 */
function compareUpcoming(a: RoundItem, b: RoundItem): number {
  const aTime = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
  const bTime = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
  if (aTime !== bTime) return aTime - bTime;
  return (a.roundNumber ?? 0) - (b.roundNumber ?? 0);
}

export function selectUpcomingRounds(activeRounds: RoundItem[]): RoundItem[] {
  const upcoming = activeRounds.filter((r) => r.status !== 'in-progress');

  // The incoming list is date-descending, so the earliest round per
  // competition is picked explicitly rather than by first-seen order.
  const earliestByCompetition = new Map<string, RoundItem>();
  for (const round of upcoming) {
    const competitionId = isCompetitionRoundItem(round) ? round.competition?.id : undefined;
    if (!competitionId) continue;
    const current = earliestByCompetition.get(competitionId);
    if (!current || compareUpcoming(round, current) < 0) {
      earliestByCompetition.set(competitionId, round);
    }
  }

  return upcoming.filter((round) => {
    if (!isCompetitionRoundItem(round)) return true;
    // No competition id (rare — the join failed) means we can't group it, so
    // keep it rather than hiding a round the user may need to score.
    const competitionId = round.competition?.id;
    if (!competitionId) return true;
    return earliestByCompetition.get(competitionId)?.id === round.id;
  });
}

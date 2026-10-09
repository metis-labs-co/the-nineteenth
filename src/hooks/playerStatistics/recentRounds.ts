/**
 * Ended rounds remain in recent activity with their planned-round label,
 * but a partial round score must not enter a performance trend.
 */
import { formatEndedEarlyLabel, isEndedEarly } from '@/utils/roundShape';
import type { RoundSummary } from './types';

export function recentRoundEndedEarlyLabel(
  round: Pick<RoundSummary, 'roundHolesPlayed' | 'nineType'>
): string | null {
  return isEndedEarly({ holes_played: round.roundHolesPlayed })
    ? formatEndedEarlyLabel(round.roundHolesPlayed!, round.nineType ?? 'full')
    : null;
}

export function excludeEndedEarly<T extends Pick<RoundSummary, 'roundHolesPlayed'>>(
  rounds: T[]
): T[] {
  return rounds.filter((round) => !isEndedEarly({ holes_played: round.roundHolesPlayed }));
}

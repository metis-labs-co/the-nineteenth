import type { Hole } from '@/types';
import { resolveEndedAfter } from '@/utils/matchPlayResult';
import type { TeamHoleResult } from '../types';

/** Normalize sparse live results to the physical played prefix of the planned card. */
export function retainTeamMatchResults(
  results: Record<number, TeamHoleResult>,
  totalHoles: number,
  holesPlayed: number | null,
  plannedHoles?: readonly Pick<Hole, 'number'>[]
): Record<number, TeamHoleResult> {
  const endedAfter = resolveEndedAfter(totalHoles, holesPlayed);
  if (endedAfter === null) return results;

  // Sparse keys cannot identify the first physical hole. Until the planned
  // card is available, leave the match undecided rather than invent numbering.
  if (!plannedHoles || plannedHoles.length !== totalHoles) return {};

  const retained: Record<number, TeamHoleResult> = {};
  for (const hole of [...plannedHoles].sort((a, b) => a.number - b.number).slice(0, endedAfter)) {
    retained[hole.number] = results[hole.number] ?? {
      team1Score: null,
      team2Score: null,
      team1PlayerScores: {},
      team2PlayerScores: {},
      winner: null,
    };
  }
  return retained;
}

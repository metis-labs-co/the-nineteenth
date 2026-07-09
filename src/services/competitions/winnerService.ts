// src/services/competitions/winnerService.ts
import { getCompetitionResults } from '@/services/rounds/roundResultsService';
import { aggregateCompetitionStandings } from '@/utils/competitionPoints';
import type { CompetitionWinnerInfo } from '@/components/competitions/CompetitionListCard';
import type { TeamMode } from '@/types/database/enums';

/**
 * Fetches the winner for a completed competition
 * Returns the first place participant (player or team) with their total points
 */
export async function fetchCompetitionWinner(
  competitionId: string,
  teamMode?: TeamMode
): Promise<CompetitionWinnerInfo | undefined> {
  try {
    const competitionResults = await getCompetitionResults(competitionId);

    if (!competitionResults.rounds || competitionResults.rounds.length === 0) {
      return undefined;
    }

    // For team competitions, the winner is the top TEAM; for individual
    // competitions, the top player. Team and individual rows coexist in a team
    // competition and their point totals aren't comparable, so aggregating both
    // together would surface the wrong winner.
    const wantTeams = teamMode !== undefined && teamMode !== 'none';
    const includeRow = (isTeam: boolean) =>
      teamMode === undefined ? true : wantTeams ? isTeam : !isTeam;

    // Build participant lookup map
    const participantMap = new Map<string, { name: string; isTeam: boolean }>();

    // Build round results for aggregation
    const roundResultsForAggregation = [];

    for (const round of competitionResults.rounds) {
      const results = [];

      for (const result of round.results) {
        const isTeam = result.is_team_result;
        if (!includeRow(isTeam)) continue;

        const id = result.player_id || result.team_id;
        if (!id) continue;

        const name = isTeam ? result.team?.name : result.player?.name;

        if (!participantMap.has(id) && name) {
          participantMap.set(id, { name, isTeam });
        }

        results.push({
          participantId: id,
          rawScore: result.raw_score ?? 0,
          position: result.position ?? 0,
          tied: false,
          competitionPoints: result.competition_points,
        });
      }

      if (results.length > 0) {
        roundResultsForAggregation.push({
          roundId: round.roundId,
          results,
        });
      }
    }

    if (roundResultsForAggregation.length === 0) {
      return undefined;
    }

    // Aggregate standings
    const standings = aggregateCompetitionStandings(roundResultsForAggregation);

    if (standings.length === 0) {
      return undefined;
    }

    // Get the winner (position 1)
    const winner = standings[0];
    const participant = participantMap.get(winner.participantId);

    if (!participant) {
      return undefined;
    }

    return {
      name: participant.name,
      points: winner.totalPoints,
      isTeam: participant.isTeam,
    };
  } catch (error) {
    console.error(
      `Error fetching winner for competition ${competitionId}:`,
      error
    );
    return undefined;
  }
}

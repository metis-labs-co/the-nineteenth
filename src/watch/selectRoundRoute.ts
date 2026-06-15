import type { WatchAvailableRound } from './types';

/** A navigation intent the bridge hands to navigate(). Kept as plain data so the
 *  routing decision is pure and unit-testable without React Navigation. */
export type SelectRouteIntent =
  | { screen: 'Scorecard'; params: { roundId: string; competitionId: string } }
  | { screen: 'MatchPlayScoring'; params: { roundId: string } }
  | { screen: 'TeamMatchPlayScoring'; params: { roundId: string } }
  | { screen: 'ViewRound'; params: { roundId: string; competitionId: string | undefined } };

/**
 * Decide where the phone navigates for a watch-selected round. Mirrors the
 * phone's own handleScoreRound routing so the watch opens exactly the screen a
 * tap on the phone would:
 *   - upcoming round            -> ViewRound (lets tee/group setup happen first)
 *   - in-progress solo match    -> MatchPlayScoring
 *   - in-progress team match    -> TeamMatchPlayScoring
 *   - in-progress anything else -> Scorecard
 */
export function routeForSelectedRound(round: WatchAvailableRound): SelectRouteIntent {
  if (round.status === 'upcoming') {
    return {
      screen: 'ViewRound',
      params: { roundId: round.roundId, competitionId: round.competitionId ?? undefined },
    };
  }
  if (round.gameType === 'match-play') {
    return round.isTeamRound
      ? { screen: 'TeamMatchPlayScoring', params: { roundId: round.roundId } }
      : { screen: 'MatchPlayScoring', params: { roundId: round.roundId } };
  }
  return {
    screen: 'Scorecard',
    params: { roundId: round.roundId, competitionId: round.competitionId ?? '' },
  };
}

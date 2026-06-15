import { routeForSelectedRound } from '../selectRoundRoute';
import type { WatchAvailableRound } from '../types';

const round = (over: Partial<WatchAvailableRound>): WatchAvailableRound => ({
  roundId: 'r1',
  competitionId: null,
  title: 'Round',
  teeTime: null,
  status: 'in-progress',
  gameType: 'stableford',
  isTeamRound: false,
  ...over,
});

describe('routeForSelectedRound', () => {
  it('routes an in-progress stableford round to Scorecard with competitionId ""', () => {
    expect(routeForSelectedRound(round({ status: 'in-progress', competitionId: null })))
      .toEqual({ screen: 'Scorecard', params: { roundId: 'r1', competitionId: '' } });
  });

  it('passes a real competitionId to Scorecard for competition rounds', () => {
    expect(routeForSelectedRound(round({ status: 'in-progress', competitionId: 'c9' })))
      .toEqual({ screen: 'Scorecard', params: { roundId: 'r1', competitionId: 'c9' } });
  });

  it('routes in-progress solo match-play to MatchPlayScoring', () => {
    expect(routeForSelectedRound(round({ status: 'in-progress', gameType: 'match-play', isTeamRound: false })))
      .toEqual({ screen: 'MatchPlayScoring', params: { roundId: 'r1' } });
  });

  it('routes in-progress team match-play to TeamMatchPlayScoring', () => {
    expect(routeForSelectedRound(round({ status: 'in-progress', gameType: 'match-play', isTeamRound: true })))
      .toEqual({ screen: 'TeamMatchPlayScoring', params: { roundId: 'r1' } });
  });

  it('routes an upcoming round to ViewRound so setup happens on the phone', () => {
    expect(routeForSelectedRound(round({ status: 'upcoming', competitionId: 'c1' })))
      .toEqual({ screen: 'ViewRound', params: { roundId: 'r1', competitionId: 'c1' } });
  });

  it('omits competitionId for an upcoming standalone round (optional param)', () => {
    expect(routeForSelectedRound(round({ status: 'upcoming', competitionId: null })))
      .toEqual({ screen: 'ViewRound', params: { roundId: 'r1', competitionId: undefined } });
  });
});

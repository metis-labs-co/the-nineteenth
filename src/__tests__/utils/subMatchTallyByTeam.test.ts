import { tallyByTeam, type TeamMatchLeader } from '@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard';

describe('tallyByTeam', () => {
  it('tallies by team across sub-matches where sides alternate teams (Ryder-cup singles)', () => {
    // SM0: A=Australia, B=England, England won (side b)
    // SM1: A=England,  B=Australia, Australia won (side b)
    // SM2: A=Australia, B=England, England won (side b)
    // SM3: A=England,  B=Australia, Australia won (side b)
    const leaders: TeamMatchLeader[] = [
      { teamA: 'Australia', teamB: 'England',  leaderSide: 'b', hasScores: true },
      { teamA: 'England',  teamB: 'Australia', leaderSide: 'b', hasScores: true },
      { teamA: 'Australia', teamB: 'England',  leaderSide: 'b', hasScores: true },
      { teamA: 'England',  teamB: 'Australia', leaderSide: 'b', hasScores: true },
    ];
    const t = tallyByTeam(leaders);
    // By SIDE this would be 0-4; by TEAM it is 2-2.
    expect(t.get('England')).toBe(2);
    expect(t.get('Australia')).toBe(2);
  });

  it('splits a halved match 0.5 / 0.5 between the two teams', () => {
    const leaders: TeamMatchLeader[] = [
      { teamA: 'England', teamB: 'Australia', leaderSide: null, hasScores: true },
    ];
    const t = tallyByTeam(leaders);
    expect(t.get('England')).toBe(0.5);
    expect(t.get('Australia')).toBe(0.5);
  });

  it('ignores matches with no scores', () => {
    const leaders: TeamMatchLeader[] = [
      { teamA: 'England', teamB: 'Australia', leaderSide: 'a', hasScores: false },
    ];
    expect(tallyByTeam(leaders).size).toBe(0);
  });
});

describe('tallyByTeam with configured points', () => {
  it('scales wins by the configured per-match win value (2 pts -> 4-4)', () => {
    const leaders: TeamMatchLeader[] = [
      { teamA: 'Australia', teamB: 'England',  leaderSide: 'b', hasScores: true },
      { teamA: 'England',  teamB: 'Australia', leaderSide: 'b', hasScores: true },
      { teamA: 'Australia', teamB: 'England',  leaderSide: 'b', hasScores: true },
      { teamA: 'England',  teamB: 'Australia', leaderSide: 'b', hasScores: true },
    ];
    const t = tallyByTeam(leaders, { win: 2, tie: 1 });
    expect(t.get('England')).toBe(4);
    expect(t.get('Australia')).toBe(4);
  });

  it('uses the configured tie value for a halved match', () => {
    const leaders: TeamMatchLeader[] = [
      { teamA: 'England', teamB: 'Australia', leaderSide: null, hasScores: true },
    ];
    const t = tallyByTeam(leaders, { win: 2, tie: 1 });
    expect(t.get('England')).toBe(1);
    expect(t.get('Australia')).toBe(1);
  });
});

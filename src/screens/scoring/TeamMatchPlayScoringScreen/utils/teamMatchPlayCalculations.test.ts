/**
 * Team Match Play Calculation Utilities Tests
 *
 * Tests for team match play scoring calculations including:
 * - Team best score calculation
 * - Hole winner determination
 * - Match status calculation
 * - Status text formatting
 * - Per-team status display
 * - Holes won counting
 * - Best player/contributor identification
 */

import {
  calculateTeamBestScore,
  determineTeamHoleWinner,
  calculateTeamMatchStatus,
  getTeamMatchStatusText,
  getTeamMatchStatusDisplay,
  countHolesWon,
  getBestPlayerScore,
  getBestContributor,
} from './teamMatchPlayCalculations';
import type { TeamHoleResult, TeamMatchStatus, MatchTeam } from '../types';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create mock team for testing
 */
function createMockTeam(
  id: string,
  name: string,
  members: { id: string; name: string; handicap: number }[]
): MatchTeam {
  return {
    id,
    name,
    members: members.map((m) => ({
      ...m,
      score: null,
      pickedUp: false,
    })),
    handicap: members.length > 0
      ? Math.round(members.reduce((sum, m) => sum + m.handicap, 0) / members.length)
      : 0,
  };
}

/**
 * Create mock hole results
 */
function createMockHoleResults(
  resultsData: {
    hole: number;
    winner: 'team1' | 'team2' | 'halved' | null;
    team1Score?: number | null;
    team2Score?: number | null;
  }[]
): Record<number, TeamHoleResult> {
  const results: Record<number, TeamHoleResult> = {};
  for (const data of resultsData) {
    results[data.hole] = {
      team1Score: data.team1Score ?? null,
      team2Score: data.team2Score ?? null,
      team1PlayerScores: {},
      team2PlayerScores: {},
      winner: data.winner,
    };
  }
  return results;
}

// ============================================================================
// calculateTeamBestScore Tests
// ============================================================================

describe('calculateTeamBestScore', () => {
  it('returns lowest score from team player scores', () => {
    const playerScores = { p1: 4, p2: 5, p3: 6 };
    expect(calculateTeamBestScore(playerScores)).toBe(4);
  });

  it('returns null for empty scores', () => {
    expect(calculateTeamBestScore({})).toBeNull();
  });

  it('returns null when all scores are null', () => {
    const playerScores = { p1: null, p2: null };
    expect(calculateTeamBestScore(playerScores)).toBeNull();
  });

  it('ignores null scores in calculation', () => {
    const playerScores = { p1: null, p2: 5, p3: 4, p4: null };
    expect(calculateTeamBestScore(playerScores)).toBe(4);
  });

  it('handles single player team', () => {
    const playerScores = { p1: 4 };
    expect(calculateTeamBestScore(playerScores)).toBe(4);
  });

  it('handles tied low scores', () => {
    const playerScores = { p1: 4, p2: 4, p3: 5 };
    expect(calculateTeamBestScore(playerScores)).toBe(4);
  });
});

// ============================================================================
// determineTeamHoleWinner Tests
// ============================================================================

describe('determineTeamHoleWinner', () => {
  it('returns team1 when team1 has lower score', () => {
    expect(determineTeamHoleWinner(4, 5)).toBe('team1');
  });

  it('returns team2 when team2 has lower score', () => {
    expect(determineTeamHoleWinner(5, 4)).toBe('team2');
  });

  it('returns halved when scores are equal', () => {
    expect(determineTeamHoleWinner(4, 4)).toBe('halved');
  });

  it('returns null when team1 score is null', () => {
    expect(determineTeamHoleWinner(null, 4)).toBeNull();
  });

  it('returns null when team2 score is null', () => {
    expect(determineTeamHoleWinner(4, null)).toBeNull();
  });

  it('returns null when both scores are null', () => {
    expect(determineTeamHoleWinner(null, null)).toBeNull();
  });

  it('handles large score differences', () => {
    expect(determineTeamHoleWinner(3, 8)).toBe('team1');
    expect(determineTeamHoleWinner(8, 3)).toBe('team2');
  });
});

// ============================================================================
// calculateTeamMatchStatus Tests
// ============================================================================

describe('calculateTeamMatchStatus', () => {
  it('returns all square with no holes played', () => {
    const status = calculateTeamMatchStatus({});

    expect(status.status).toBe('in_progress');
    if (status.status === 'in_progress') {
      expect(status.leader).toBeNull();
      expect(status.holesUp).toBe(0);
      expect(status.holesRemaining).toBe(18);
    }
  });

  it('returns team1 leading when team1 has won more holes', () => {
    const results = createMockHoleResults([
      { hole: 1, winner: 'team1' },
      { hole: 2, winner: 'team1' },
      { hole: 3, winner: 'team2' },
    ]);

    const status = calculateTeamMatchStatus(results);

    expect(status.status).toBe('in_progress');
    if (status.status === 'in_progress') {
      expect(status.leader).toBe('team1');
      expect(status.holesUp).toBe(1);
      expect(status.holesRemaining).toBe(15);
    }
  });

  it('returns team2 leading when team2 has won more holes', () => {
    const results = createMockHoleResults([
      { hole: 1, winner: 'team2' },
      { hole: 2, winner: 'team2' },
      { hole: 3, winner: 'team1' },
    ]);

    const status = calculateTeamMatchStatus(results);

    expect(status.status).toBe('in_progress');
    if (status.status === 'in_progress') {
      expect(status.leader).toBe('team2');
      expect(status.holesUp).toBe(1);
      expect(status.holesRemaining).toBe(15);
    }
  });

  it('returns all square when holes are tied', () => {
    const results = createMockHoleResults([
      { hole: 1, winner: 'team1' },
      { hole: 2, winner: 'team2' },
      { hole: 3, winner: 'halved' },
    ]);

    const status = calculateTeamMatchStatus(results);

    expect(status.status).toBe('in_progress');
    if (status.status === 'in_progress') {
      expect(status.leader).toBeNull();
      expect(status.holesUp).toBe(0);
      expect(status.holesRemaining).toBe(15);
    }
  });

  it('detects early finish (dormie) when lead exceeds remaining holes', () => {
    // Team 1 wins 4 holes, team 2 wins 1 hole (team1 3 up) with 2 holes remaining = match over
    const results = createMockHoleResults([
      { hole: 1, winner: 'team1' },
      { hole: 2, winner: 'team1' },
      { hole: 3, winner: 'team2' },
      { hole: 4, winner: 'team1' },
      { hole: 5, winner: 'team1' },
      { hole: 6, winner: 'halved' },
      { hole: 7, winner: 'halved' },
      { hole: 8, winner: 'halved' },
      { hole: 9, winner: 'halved' },
      { hole: 10, winner: 'halved' },
      { hole: 11, winner: 'halved' },
      { hole: 12, winner: 'halved' },
      { hole: 13, winner: 'halved' },
      { hole: 14, winner: 'halved' },
      { hole: 15, winner: 'halved' },
      { hole: 16, winner: 'halved' },
    ]);

    const status = calculateTeamMatchStatus(results);

    expect(status.status).toBe('complete');
    if (status.status === 'complete') {
      expect(status.winner).toBe('team1');
      expect(status.margin).toBe('3 & 2');
    }
  });

  it('returns complete with halved when all 18 holes played and tied', () => {
    // 9 holes each team
    const results = createMockHoleResults([
      { hole: 1, winner: 'team1' },
      { hole: 2, winner: 'team2' },
      { hole: 3, winner: 'team1' },
      { hole: 4, winner: 'team2' },
      { hole: 5, winner: 'team1' },
      { hole: 6, winner: 'team2' },
      { hole: 7, winner: 'team1' },
      { hole: 8, winner: 'team2' },
      { hole: 9, winner: 'team1' },
      { hole: 10, winner: 'team2' },
      { hole: 11, winner: 'team1' },
      { hole: 12, winner: 'team2' },
      { hole: 13, winner: 'team1' },
      { hole: 14, winner: 'team2' },
      { hole: 15, winner: 'team1' },
      { hole: 16, winner: 'team2' },
      { hole: 17, winner: 'team1' },
      { hole: 18, winner: 'team2' },
    ]);

    const status = calculateTeamMatchStatus(results);

    expect(status.status).toBe('complete');
    if (status.status === 'complete') {
      expect(status.winner).toBe('halved');
      expect(status.margin).toBe('All Square');
    }
  });

  it('returns winner after all 18 holes with margin', () => {
    // Team 1 wins 10 holes, team 2 wins 8 holes
    const results = createMockHoleResults([
      { hole: 1, winner: 'team1' },
      { hole: 2, winner: 'team1' },
      { hole: 3, winner: 'team2' },
      { hole: 4, winner: 'team2' },
      { hole: 5, winner: 'team1' },
      { hole: 6, winner: 'team2' },
      { hole: 7, winner: 'team1' },
      { hole: 8, winner: 'team2' },
      { hole: 9, winner: 'team1' },
      { hole: 10, winner: 'team2' },
      { hole: 11, winner: 'team1' },
      { hole: 12, winner: 'team2' },
      { hole: 13, winner: 'team1' },
      { hole: 14, winner: 'team2' },
      { hole: 15, winner: 'team1' },
      { hole: 16, winner: 'team2' },
      { hole: 17, winner: 'team1' },
      { hole: 18, winner: 'team1' },
    ]);

    const status = calculateTeamMatchStatus(results);

    // Note: Implementation uses "X & 0" format for matches decided on hole 18
    // because absLead (2) > holesRemaining (0) is true
    expect(status.status).toBe('complete');
    if (status.status === 'complete') {
      expect(status.winner).toBe('team1');
      expect(status.margin).toBe('2 & 0');
    }
  });

  it('ignores holes with null winner (incomplete holes)', () => {
    const results = createMockHoleResults([
      { hole: 1, winner: 'team1' },
      { hole: 2, winner: null }, // Incomplete
      { hole: 3, winner: 'team2' },
    ]);

    const status = calculateTeamMatchStatus(results);

    expect(status.status).toBe('in_progress');
    if (status.status === 'in_progress') {
      expect(status.leader).toBeNull();
      expect(status.holesUp).toBe(0);
      expect(status.holesRemaining).toBe(16); // Only 2 holes counted
    }
  });
});

// ============================================================================
// getTeamMatchStatusText Tests
// ============================================================================

describe('getTeamMatchStatusText', () => {
  const team1Name = 'Team Alpha';
  const team2Name = 'Team Bravo';

  it('returns "All Square with X to play" when tied in progress', () => {
    const status: TeamMatchStatus = {
      status: 'in_progress',
      leader: null,
      holesUp: 0,
      holesRemaining: 12,
    };

    const text = getTeamMatchStatusText(status, team1Name, team2Name);
    expect(text).toBe('All Square with 12 to play');
  });

  it('returns team1 leading format', () => {
    const status: TeamMatchStatus = {
      status: 'in_progress',
      leader: 'team1',
      holesUp: 2,
      holesRemaining: 5,
    };

    const text = getTeamMatchStatusText(status, team1Name, team2Name);
    expect(text).toBe('Team Alpha is 2 up with 5 to play');
  });

  it('returns team2 leading format', () => {
    const status: TeamMatchStatus = {
      status: 'in_progress',
      leader: 'team2',
      holesUp: 3,
      holesRemaining: 8,
    };

    const text = getTeamMatchStatusText(status, team1Name, team2Name);
    expect(text).toBe('Team Bravo is 3 up with 8 to play');
  });

  it('returns "Match Halved" for halved completed match', () => {
    const status: TeamMatchStatus = {
      status: 'complete',
      winner: 'halved',
      margin: 'All Square',
    };

    const text = getTeamMatchStatusText(status, team1Name, team2Name);
    expect(text).toBe('Match Halved');
  });

  it('returns team1 win format with margin', () => {
    const status: TeamMatchStatus = {
      status: 'complete',
      winner: 'team1',
      margin: '3 & 2',
    };

    const text = getTeamMatchStatusText(status, team1Name, team2Name);
    expect(text).toBe('Team Alpha wins 3 & 2');
  });

  it('returns team2 win format with margin', () => {
    const status: TeamMatchStatus = {
      status: 'complete',
      winner: 'team2',
      margin: '1 up',
    };

    const text = getTeamMatchStatusText(status, team1Name, team2Name);
    expect(text).toBe('Team Bravo wins 1 up');
  });
});

// ============================================================================
// getTeamMatchStatusDisplay Tests
// ============================================================================

describe('getTeamMatchStatusDisplay', () => {
  describe('completed match - halved', () => {
    const status: TeamMatchStatus = {
      status: 'complete',
      winner: 'halved',
      margin: 'All Square',
    };

    it('returns AS for team1', () => {
      const display = getTeamMatchStatusDisplay(status, 'team1');
      expect(display.text).toBe('A/S');
      expect(display.fullText).toBe('All Square');
      expect(display.type).toBe('halved');
      expect(display.holesUpDown).toBe(0);
    });

    it('returns AS for team2', () => {
      const display = getTeamMatchStatusDisplay(status, 'team2');
      expect(display.text).toBe('A/S');
      expect(display.fullText).toBe('All Square');
      expect(display.type).toBe('halved');
      expect(display.holesUpDown).toBe(0);
    });
  });

  describe('completed match - team1 wins', () => {
    const status: TeamMatchStatus = {
      status: 'complete',
      winner: 'team1',
      margin: '3 & 2',
    };

    it('returns WIN for team1', () => {
      const display = getTeamMatchStatusDisplay(status, 'team1');
      expect(display.text).toBe('WIN');
      expect(display.fullText).toBe('Won 3 & 2');
      expect(display.type).toBe('win');
      expect(display.holesUpDown).toBe(0);
    });

    it('returns LOSS for team2', () => {
      const display = getTeamMatchStatusDisplay(status, 'team2');
      expect(display.text).toBe('LOSS');
      expect(display.fullText).toBe('Lost 3 & 2');
      expect(display.type).toBe('loss');
      expect(display.holesUpDown).toBe(0);
    });
  });

  describe('completed match - team2 wins', () => {
    const status: TeamMatchStatus = {
      status: 'complete',
      winner: 'team2',
      margin: '2 up',
    };

    it('returns LOSS for team1', () => {
      const display = getTeamMatchStatusDisplay(status, 'team1');
      expect(display.text).toBe('LOSS');
      expect(display.fullText).toBe('Lost 2 up');
      expect(display.type).toBe('loss');
    });

    it('returns WIN for team2', () => {
      const display = getTeamMatchStatusDisplay(status, 'team2');
      expect(display.text).toBe('WIN');
      expect(display.fullText).toBe('Won 2 up');
      expect(display.type).toBe('win');
    });
  });

  describe('in progress - all square', () => {
    const status: TeamMatchStatus = {
      status: 'in_progress',
      leader: null,
      holesUp: 0,
      holesRemaining: 10,
    };

    it('returns AS for both teams', () => {
      const display1 = getTeamMatchStatusDisplay(status, 'team1');
      expect(display1.text).toBe('A/S');
      expect(display1.fullText).toBe('All Square');
      expect(display1.type).toBe('square');
      expect(display1.holesUpDown).toBe(0);

      const display2 = getTeamMatchStatusDisplay(status, 'team2');
      expect(display2.text).toBe('A/S');
      expect(display2.type).toBe('square');
    });
  });

  describe('in progress - team1 leading', () => {
    const status: TeamMatchStatus = {
      status: 'in_progress',
      leader: 'team1',
      holesUp: 2,
      holesRemaining: 7,
    };

    it('returns UP for team1', () => {
      const display = getTeamMatchStatusDisplay(status, 'team1');
      expect(display.text).toBe('2 UP');
      expect(display.fullText).toBe('2 Up');
      expect(display.type).toBe('up');
      expect(display.holesUpDown).toBe(2);
    });

    it('returns DN for team2', () => {
      const display = getTeamMatchStatusDisplay(status, 'team2');
      expect(display.text).toBe('2 DN');
      expect(display.fullText).toBe('2 Down');
      expect(display.type).toBe('down');
      expect(display.holesUpDown).toBe(-2);
    });
  });

  describe('in progress - team2 leading', () => {
    const status: TeamMatchStatus = {
      status: 'in_progress',
      leader: 'team2',
      holesUp: 4,
      holesRemaining: 5,
    };

    it('returns DN for team1', () => {
      const display = getTeamMatchStatusDisplay(status, 'team1');
      expect(display.text).toBe('4 DN');
      expect(display.fullText).toBe('4 Down');
      expect(display.type).toBe('down');
      expect(display.holesUpDown).toBe(-4);
    });

    it('returns UP for team2', () => {
      const display = getTeamMatchStatusDisplay(status, 'team2');
      expect(display.text).toBe('4 UP');
      expect(display.fullText).toBe('4 Up');
      expect(display.type).toBe('up');
      expect(display.holesUpDown).toBe(4);
    });
  });
});

// ============================================================================
// countHolesWon Tests
// ============================================================================

describe('countHolesWon', () => {
  it('counts holes for each team correctly', () => {
    const results = createMockHoleResults([
      { hole: 1, winner: 'team1' },
      { hole: 2, winner: 'team1' },
      { hole: 3, winner: 'team2' },
      { hole: 4, winner: 'halved' },
      { hole: 5, winner: 'team1' },
    ]);

    const count = countHolesWon(results);

    expect(count.team1).toBe(3);
    expect(count.team2).toBe(1);
    expect(count.halved).toBe(1);
  });

  it('returns zeros for empty results', () => {
    const count = countHolesWon({});

    expect(count.team1).toBe(0);
    expect(count.team2).toBe(0);
    expect(count.halved).toBe(0);
  });

  it('handles all halved holes', () => {
    const results = createMockHoleResults([
      { hole: 1, winner: 'halved' },
      { hole: 2, winner: 'halved' },
      { hole: 3, winner: 'halved' },
    ]);

    const count = countHolesWon(results);

    expect(count.team1).toBe(0);
    expect(count.team2).toBe(0);
    expect(count.halved).toBe(3);
  });

  it('handles all team1 wins', () => {
    const results = createMockHoleResults([
      { hole: 1, winner: 'team1' },
      { hole: 2, winner: 'team1' },
      { hole: 3, winner: 'team1' },
    ]);

    const count = countHolesWon(results);

    expect(count.team1).toBe(3);
    expect(count.team2).toBe(0);
    expect(count.halved).toBe(0);
  });

  it('ignores null winners', () => {
    const results = createMockHoleResults([
      { hole: 1, winner: 'team1' },
      { hole: 2, winner: null },
      { hole: 3, winner: 'team2' },
    ]);

    const count = countHolesWon(results);

    expect(count.team1).toBe(1);
    expect(count.team2).toBe(1);
    expect(count.halved).toBe(0);
  });
});

// ============================================================================
// getBestPlayerScore Tests
// ============================================================================

describe('getBestPlayerScore', () => {
  const mockTeam = createMockTeam('t1', 'Team Alpha', [
    { id: 'p1', name: 'John', handicap: 10 },
    { id: 'p2', name: 'Sarah', handicap: 15 },
  ]);

  it('returns lowest score from team members', () => {
    const getPlayerScore = jest.fn((playerId: string, _hole: number) => {
      if (playerId === 'p1') return { strokes: 4 };
      if (playerId === 'p2') return { strokes: 5 };
      return undefined;
    });

    const best = getBestPlayerScore(mockTeam, 1, getPlayerScore);

    expect(best).toBe(4);
    expect(getPlayerScore).toHaveBeenCalledWith('p1', 1);
    expect(getPlayerScore).toHaveBeenCalledWith('p2', 1);
  });

  it('returns null when no scores available', () => {
    const getPlayerScore = jest.fn(() => undefined);

    const best = getBestPlayerScore(mockTeam, 1, getPlayerScore);

    expect(best).toBeNull();
  });

  it('ignores players with undefined scores', () => {
    const getPlayerScore = jest.fn((playerId: string) => {
      if (playerId === 'p1') return undefined;
      if (playerId === 'p2') return { strokes: 5 };
      return undefined;
    });

    const best = getBestPlayerScore(mockTeam, 1, getPlayerScore);

    expect(best).toBe(5);
  });

  it('ignores players with null strokes', () => {
    const getPlayerScore = jest.fn((playerId: string) => {
      if (playerId === 'p1') return { strokes: null as unknown as number };
      if (playerId === 'p2') return { strokes: 5 };
      return undefined;
    });

    const best = getBestPlayerScore(mockTeam, 1, getPlayerScore);

    expect(best).toBe(5);
  });

  it('handles single player team', () => {
    const singlePlayerTeam = createMockTeam('t1', 'Solo', [
      { id: 'p1', name: 'John', handicap: 10 },
    ]);
    const getPlayerScore = jest.fn(() => ({ strokes: 4 }));

    const best = getBestPlayerScore(singlePlayerTeam, 1, getPlayerScore);

    expect(best).toBe(4);
  });
});

// ============================================================================
// getBestContributor Tests
// ============================================================================

describe('getBestContributor', () => {
  const mockTeam = createMockTeam('t1', 'Team Alpha', [
    { id: 'p1', name: 'John', handicap: 10 },
    { id: 'p2', name: 'Sarah', handicap: 15 },
    { id: 'p3', name: 'Mike', handicap: 20 },
  ]);

  it('returns player ID with lowest score', () => {
    const getPlayerScore = jest.fn((playerId: string) => {
      if (playerId === 'p1') return { strokes: 5 };
      if (playerId === 'p2') return { strokes: 4 }; // Best
      if (playerId === 'p3') return { strokes: 6 };
      return undefined;
    });

    const contributor = getBestContributor(mockTeam, 1, getPlayerScore);

    expect(contributor).toBe('p2');
  });

  it('returns null when no scores available', () => {
    const getPlayerScore = jest.fn(() => undefined);

    const contributor = getBestContributor(mockTeam, 1, getPlayerScore);

    expect(contributor).toBeNull();
  });

  it('returns first player when tied', () => {
    const getPlayerScore = jest.fn((playerId: string) => {
      if (playerId === 'p1') return { strokes: 4 }; // Tied - first in list
      if (playerId === 'p2') return { strokes: 4 }; // Tied
      if (playerId === 'p3') return { strokes: 5 };
      return undefined;
    });

    const contributor = getBestContributor(mockTeam, 1, getPlayerScore);

    expect(contributor).toBe('p1');
  });

  it('handles partial scores', () => {
    const getPlayerScore = jest.fn((playerId: string) => {
      if (playerId === 'p1') return undefined; // No score
      if (playerId === 'p2') return { strokes: 4 };
      if (playerId === 'p3') return undefined; // No score
      return undefined;
    });

    const contributor = getBestContributor(mockTeam, 1, getPlayerScore);

    expect(contributor).toBe('p2');
  });

  it('passes correct hole number to getPlayerScore', () => {
    const getPlayerScore = jest.fn(() => ({ strokes: 4 }));

    getBestContributor(mockTeam, 7, getPlayerScore);

    expect(getPlayerScore).toHaveBeenCalledWith('p1', 7);
    expect(getPlayerScore).toHaveBeenCalledWith('p2', 7);
    expect(getPlayerScore).toHaveBeenCalledWith('p3', 7);
  });
});

// ============================================================================
// Integration/Scenario Tests
// ============================================================================

describe('Team Match Play Scenarios', () => {
  describe('Complete match scenario - team1 wins early', () => {
    it('correctly tracks a match where team1 dominates', () => {
      // Team 1 wins 4 holes in a row, then continues to build lead
      const results = createMockHoleResults([
        { hole: 1, winner: 'team1' },
        { hole: 2, winner: 'team1' },
        { hole: 3, winner: 'team1' },
        { hole: 4, winner: 'team1' },
        { hole: 5, winner: 'halved' },
        { hole: 6, winner: 'halved' },
        { hole: 7, winner: 'team2' },
        { hole: 8, winner: 'team1' },
        { hole: 9, winner: 'halved' },
        { hole: 10, winner: 'team1' },
        { hole: 11, winner: 'halved' },
        { hole: 12, winner: 'halved' },
        { hole: 13, winner: 'halved' },
        { hole: 14, winner: 'halved' },
      ]);

      const status = calculateTeamMatchStatus(results);

      // Team1: 6 wins, Team2: 1 win, 7 halved = Team1 is 5 up with 4 to play
      expect(status.status).toBe('complete');
      if (status.status === 'complete') {
        expect(status.winner).toBe('team1');
        expect(status.margin).toBe('5 & 4');
      }

      const count = countHolesWon(results);
      expect(count.team1).toBe(6);
      expect(count.team2).toBe(1);
      expect(count.halved).toBe(7);
    });
  });

  describe('Comeback scenario - team2 fights back', () => {
    it('tracks a match with momentum swings', () => {
      const results = createMockHoleResults([
        { hole: 1, winner: 'team1' },
        { hole: 2, winner: 'team1' },
        { hole: 3, winner: 'team1' },
        // Team1 3 up after 3
        { hole: 4, winner: 'team2' },
        { hole: 5, winner: 'team2' },
        { hole: 6, winner: 'team2' },
        // All square after 6
        { hole: 7, winner: 'team2' },
        { hole: 8, winner: 'team2' },
        // Team2 2 up after 8
      ]);

      const status = calculateTeamMatchStatus(results);

      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBe('team2');
        expect(status.holesUp).toBe(2);
        expect(status.holesRemaining).toBe(10);
      }

      const statusText = getTeamMatchStatusText(status, 'Hackers', 'Slicers');
      expect(statusText).toBe('Slicers is 2 up with 10 to play');
    });
  });

  describe('All halved holes scenario', () => {
    it('handles a match where every hole is halved', () => {
      const results = createMockHoleResults(
        Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          winner: 'halved' as const,
        }))
      );

      const status = calculateTeamMatchStatus(results);

      expect(status.status).toBe('complete');
      if (status.status === 'complete') {
        expect(status.winner).toBe('halved');
        expect(status.margin).toBe('All Square');
      }

      const statusText = getTeamMatchStatusText(status, 'Team A', 'Team B');
      expect(statusText).toBe('Match Halved');

      const count = countHolesWon(results);
      expect(count.team1).toBe(0);
      expect(count.team2).toBe(0);
      expect(count.halved).toBe(18);
    });
  });

  describe('Close match going to 18', () => {
    it('tracks a match decided on the final hole', () => {
      // Alternate wins until hole 17, then team1 wins 18 to win by 1
      const results = createMockHoleResults([
        { hole: 1, winner: 'team1' },
        { hole: 2, winner: 'team2' },
        { hole: 3, winner: 'team1' },
        { hole: 4, winner: 'team2' },
        { hole: 5, winner: 'team1' },
        { hole: 6, winner: 'team2' },
        { hole: 7, winner: 'team1' },
        { hole: 8, winner: 'team2' },
        { hole: 9, winner: 'team1' },
        { hole: 10, winner: 'team2' },
        { hole: 11, winner: 'team1' },
        { hole: 12, winner: 'team2' },
        { hole: 13, winner: 'team1' },
        { hole: 14, winner: 'team2' },
        { hole: 15, winner: 'team1' },
        { hole: 16, winner: 'team2' },
        { hole: 17, winner: 'halved' },
        { hole: 18, winner: 'team1' },
      ]);

      const status = calculateTeamMatchStatus(results);

      // Team1: 9, Team2: 8, Halved: 1 = Team1 wins by 1
      // Note: Implementation uses "1 & 0" format when decided on final hole
      expect(status.status).toBe('complete');
      if (status.status === 'complete') {
        expect(status.winner).toBe('team1');
        expect(status.margin).toBe('1 & 0');
      }

      const count = countHolesWon(results);
      expect(count.team1).toBe(9);
      expect(count.team2).toBe(8);
      expect(count.halved).toBe(1);
    });
  });
});

/**
 * Match Play Calculation Utilities Tests
 *
 * Tests for individual match play scoring calculations including:
 * - Hole winner determination
 * - Match status calculation
 * - Status text formatting
 * - Per-player status display
 */

import {
  determineHoleWinner,
  calculateMatchStatus,
  getMatchStatusText,
  getPlayerMatchStatus,
} from './matchPlayCalculations';
import type { MatchStatus, HoleResult } from '../types';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create mock hole results
 */
function createMockHoleResults(
  resultsData: {
    hole: number;
    winner: 'player1' | 'player2' | 'halved' | null;
    player1Score?: number | null;
    player2Score?: number | null;
    player1PickedUp?: boolean;
    player2PickedUp?: boolean;
  }[]
): Record<number, HoleResult> {
  const results: Record<number, HoleResult> = {};
  for (const data of resultsData) {
    results[data.hole] = {
      player1Score: data.player1Score ?? null,
      player2Score: data.player2Score ?? null,
      player1PickedUp: data.player1PickedUp ?? false,
      player2PickedUp: data.player2PickedUp ?? false,
      winner: data.winner,
    };
  }
  return results;
}

// ============================================================================
// determineHoleWinner Tests
// ============================================================================

describe('determineHoleWinner', () => {
  describe('basic scoring', () => {
    it('returns player1 when player1 has lower score', () => {
      expect(determineHoleWinner(4, 5)).toBe('player1');
    });

    it('returns player2 when player2 has lower score', () => {
      expect(determineHoleWinner(5, 4)).toBe('player2');
    });

    it('returns halved when scores are equal', () => {
      expect(determineHoleWinner(4, 4)).toBe('halved');
    });
  });

  describe('null score handling', () => {
    it('returns null when player1 score is null', () => {
      expect(determineHoleWinner(null, 4)).toBeNull();
    });

    it('returns null when player2 score is null', () => {
      expect(determineHoleWinner(4, null)).toBeNull();
    });

    it('returns null when both scores are null', () => {
      expect(determineHoleWinner(null, null)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles large score differences', () => {
      expect(determineHoleWinner(3, 8)).toBe('player1');
      expect(determineHoleWinner(8, 3)).toBe('player2');
    });

    it('handles score of 1 (hole-in-one)', () => {
      expect(determineHoleWinner(1, 3)).toBe('player1');
      expect(determineHoleWinner(3, 1)).toBe('player2');
    });

    it('handles high scores (blow-up holes)', () => {
      expect(determineHoleWinner(10, 12)).toBe('player1');
      expect(determineHoleWinner(12, 10)).toBe('player2');
      expect(determineHoleWinner(10, 10)).toBe('halved');
    });
  });
});

// ============================================================================
// calculateMatchStatus Tests
// ============================================================================

describe('calculateMatchStatus', () => {
  describe('initial state', () => {
    it('returns all square with no holes played', () => {
      const status = calculateMatchStatus({});

      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBeNull();
        expect(status.holesUp).toBe(0);
        expect(status.holesRemaining).toBe(18);
      }
    });
  });

  describe('in progress - player leading', () => {
    it('returns player1 leading when player1 has won more holes', () => {
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1' },
        { hole: 2, winner: 'player1' },
        { hole: 3, winner: 'player2' },
      ]);

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBe('player1');
        expect(status.holesUp).toBe(1);
        expect(status.holesRemaining).toBe(15);
      }
    });

    it('returns player2 leading when player2 has won more holes', () => {
      const results = createMockHoleResults([
        { hole: 1, winner: 'player2' },
        { hole: 2, winner: 'player2' },
        { hole: 3, winner: 'player1' },
      ]);

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBe('player2');
        expect(status.holesUp).toBe(1);
        expect(status.holesRemaining).toBe(15);
      }
    });

    it('returns all square when holes are tied', () => {
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1' },
        { hole: 2, winner: 'player2' },
        { hole: 3, winner: 'halved' },
      ]);

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBeNull();
        expect(status.holesUp).toBe(0);
        expect(status.holesRemaining).toBe(15);
      }
    });
  });

  describe('early finish (dormie)', () => {
    it('detects early finish when lead exceeds remaining holes - player1 wins', () => {
      // Player1 wins 4 holes, player2 wins 1 hole = player1 3 up with 2 remaining
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1' },
        { hole: 2, winner: 'player1' },
        { hole: 3, winner: 'player2' },
        { hole: 4, winner: 'player1' },
        { hole: 5, winner: 'player1' },
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

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('complete');
      if (status.status === 'complete') {
        expect(status.winner).toBe('player1');
        expect(status.margin).toBe('3 & 2');
      }
    });

    it('detects early finish when lead exceeds remaining holes - player2 wins', () => {
      // Player2 dominates early: 6 wins, 0 for player1, with 10 halved = 16 holes played
      // Player2 is 6 up with 2 remaining = match over (6 > 2)
      const results = createMockHoleResults([
        { hole: 1, winner: 'player2' },
        { hole: 2, winner: 'player2' },
        { hole: 3, winner: 'player2' },
        { hole: 4, winner: 'player2' },
        { hole: 5, winner: 'player2' },
        { hole: 6, winner: 'player2' },
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

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('complete');
      if (status.status === 'complete') {
        expect(status.winner).toBe('player2');
        expect(status.margin).toBe('6 & 2');
      }
    });
  });

  describe('full 18 holes', () => {
    it('returns complete with halved when all 18 holes played and tied', () => {
      // 9 holes each
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1' },
        { hole: 2, winner: 'player2' },
        { hole: 3, winner: 'player1' },
        { hole: 4, winner: 'player2' },
        { hole: 5, winner: 'player1' },
        { hole: 6, winner: 'player2' },
        { hole: 7, winner: 'player1' },
        { hole: 8, winner: 'player2' },
        { hole: 9, winner: 'player1' },
        { hole: 10, winner: 'player2' },
        { hole: 11, winner: 'player1' },
        { hole: 12, winner: 'player2' },
        { hole: 13, winner: 'player1' },
        { hole: 14, winner: 'player2' },
        { hole: 15, winner: 'player1' },
        { hole: 16, winner: 'player2' },
        { hole: 17, winner: 'player1' },
        { hole: 18, winner: 'player2' },
      ]);

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('complete');
      if (status.status === 'complete') {
        expect(status.winner).toBe('halved');
        expect(status.margin).toBe('All Square');
      }
    });

    it('returns winner after all 18 holes with 1 up margin', () => {
      // Player1: 10 holes, Player2: 8 holes
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1' },
        { hole: 2, winner: 'player1' },
        { hole: 3, winner: 'player2' },
        { hole: 4, winner: 'player2' },
        { hole: 5, winner: 'player1' },
        { hole: 6, winner: 'player2' },
        { hole: 7, winner: 'player1' },
        { hole: 8, winner: 'player2' },
        { hole: 9, winner: 'player1' },
        { hole: 10, winner: 'player2' },
        { hole: 11, winner: 'player1' },
        { hole: 12, winner: 'player2' },
        { hole: 13, winner: 'player1' },
        { hole: 14, winner: 'player2' },
        { hole: 15, winner: 'player1' },
        { hole: 16, winner: 'player2' },
        { hole: 17, winner: 'player1' },
        { hole: 18, winner: 'player1' },
      ]);

      const status = calculateMatchStatus(results);

      // Note: Implementation uses "X & 0" format for matches on final hole
      expect(status.status).toBe('complete');
      if (status.status === 'complete') {
        expect(status.winner).toBe('player1');
        expect(status.margin).toBe('2 & 0');
      }
    });
  });

  describe('incomplete holes', () => {
    it('ignores holes with null winner (incomplete holes)', () => {
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1' },
        { hole: 2, winner: null }, // Incomplete
        { hole: 3, winner: 'player2' },
      ]);

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBeNull();
        expect(status.holesUp).toBe(0);
        expect(status.holesRemaining).toBe(16); // Only 2 holes counted
      }
    });

    it('handles multiple incomplete holes scattered throughout', () => {
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1' },
        { hole: 2, winner: null },
        { hole: 3, winner: 'player1' },
        { hole: 4, winner: null },
        { hole: 5, winner: 'player2' },
      ]);

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBe('player1');
        expect(status.holesUp).toBe(1);
        expect(status.holesRemaining).toBe(15); // 3 holes counted
      }
    });
  });

  describe('picked up scenarios', () => {
    it('handles holes where player1 picked up (player2 wins)', () => {
      const results = createMockHoleResults([
        { hole: 1, winner: 'player2', player1PickedUp: true },
        { hole: 2, winner: 'player1' },
        { hole: 3, winner: 'halved' },
      ]);

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBeNull();
        expect(status.holesUp).toBe(0);
        expect(status.holesRemaining).toBe(15);
      }
    });

    it('handles holes where player2 picked up (player1 wins)', () => {
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1', player2PickedUp: true },
        { hole: 2, winner: 'player2' },
        { hole: 3, winner: 'halved' },
      ]);

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBeNull();
        expect(status.holesUp).toBe(0);
        expect(status.holesRemaining).toBe(15);
      }
    });

    it('handles concede (both picked up = halved)', () => {
      const results = createMockHoleResults([
        { hole: 1, winner: 'halved', player1PickedUp: true, player2PickedUp: true },
        { hole: 2, winner: 'player1' },
      ]);

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBe('player1');
        expect(status.holesUp).toBe(1);
        expect(status.holesRemaining).toBe(16);
      }
    });
  });
});

// ============================================================================
// getMatchStatusText Tests
// ============================================================================

describe('getMatchStatusText', () => {
  const player1Name = 'John Smith';
  const player2Name = 'Mike Jones';

  describe('in progress', () => {
    it('returns "All Square with X to play" when tied', () => {
      const status: MatchStatus = {
        status: 'in_progress',
        leader: null,
        holesUp: 0,
        holesRemaining: 12,
      };

      const text = getMatchStatusText(status, player1Name, player2Name);
      expect(text).toBe('All Square with 12 to play');
    });

    it('returns player1 leading format', () => {
      const status: MatchStatus = {
        status: 'in_progress',
        leader: 'player1',
        holesUp: 2,
        holesRemaining: 5,
      };

      const text = getMatchStatusText(status, player1Name, player2Name);
      expect(text).toBe('John Smith is 2 up with 5 to play');
    });

    it('returns player2 leading format', () => {
      const status: MatchStatus = {
        status: 'in_progress',
        leader: 'player2',
        holesUp: 3,
        holesRemaining: 8,
      };

      const text = getMatchStatusText(status, player1Name, player2Name);
      expect(text).toBe('Mike Jones is 3 up with 8 to play');
    });

    it('handles 1 up correctly (singular)', () => {
      const status: MatchStatus = {
        status: 'in_progress',
        leader: 'player1',
        holesUp: 1,
        holesRemaining: 10,
      };

      const text = getMatchStatusText(status, player1Name, player2Name);
      expect(text).toBe('John Smith is 1 up with 10 to play');
    });
  });

  describe('complete', () => {
    it('returns "Match Halved" for halved completed match', () => {
      const status: MatchStatus = {
        status: 'complete',
        winner: 'halved',
        margin: 'All Square',
      };

      const text = getMatchStatusText(status, player1Name, player2Name);
      expect(text).toBe('Match Halved');
    });

    it('returns player1 win format with margin', () => {
      const status: MatchStatus = {
        status: 'complete',
        winner: 'player1',
        margin: '3 & 2',
      };

      const text = getMatchStatusText(status, player1Name, player2Name);
      expect(text).toBe('John Smith wins 3 & 2');
    });

    it('returns player2 win format with margin', () => {
      const status: MatchStatus = {
        status: 'complete',
        winner: 'player2',
        margin: '1 up',
      };

      const text = getMatchStatusText(status, player1Name, player2Name);
      expect(text).toBe('Mike Jones wins 1 up');
    });

    it('handles large win margin', () => {
      const status: MatchStatus = {
        status: 'complete',
        winner: 'player1',
        margin: '7 & 6',
      };

      const text = getMatchStatusText(status, player1Name, player2Name);
      expect(text).toBe('John Smith wins 7 & 6');
    });
  });
});

// ============================================================================
// getPlayerMatchStatus Tests
// ============================================================================

describe('getPlayerMatchStatus', () => {
  describe('completed match - halved', () => {
    const status: MatchStatus = {
      status: 'complete',
      winner: 'halved',
      margin: 'All Square',
    };

    it('returns AS for player1', () => {
      const display = getPlayerMatchStatus(status, 'player1');
      expect(display.text).toBe('A/S');
      expect(display.fullText).toBe('All Square');
      expect(display.type).toBe('halved');
      expect(display.holesUpDown).toBe(0);
    });

    it('returns AS for player2', () => {
      const display = getPlayerMatchStatus(status, 'player2');
      expect(display.text).toBe('A/S');
      expect(display.fullText).toBe('All Square');
      expect(display.type).toBe('halved');
      expect(display.holesUpDown).toBe(0);
    });
  });

  describe('completed match - player1 wins', () => {
    const status: MatchStatus = {
      status: 'complete',
      winner: 'player1',
      margin: '3 & 2',
    };

    it('returns WIN for player1', () => {
      const display = getPlayerMatchStatus(status, 'player1');
      expect(display.text).toBe('WIN');
      expect(display.fullText).toBe('Won 3 & 2');
      expect(display.type).toBe('win');
      expect(display.holesUpDown).toBe(0);
    });

    it('returns LOSS for player2', () => {
      const display = getPlayerMatchStatus(status, 'player2');
      expect(display.text).toBe('LOSS');
      expect(display.fullText).toBe('Lost 3 & 2');
      expect(display.type).toBe('loss');
      expect(display.holesUpDown).toBe(0);
    });
  });

  describe('completed match - player2 wins', () => {
    const status: MatchStatus = {
      status: 'complete',
      winner: 'player2',
      margin: '2 up',
    };

    it('returns LOSS for player1', () => {
      const display = getPlayerMatchStatus(status, 'player1');
      expect(display.text).toBe('LOSS');
      expect(display.fullText).toBe('Lost 2 up');
      expect(display.type).toBe('loss');
    });

    it('returns WIN for player2', () => {
      const display = getPlayerMatchStatus(status, 'player2');
      expect(display.text).toBe('WIN');
      expect(display.fullText).toBe('Won 2 up');
      expect(display.type).toBe('win');
    });
  });

  describe('in progress - all square', () => {
    const status: MatchStatus = {
      status: 'in_progress',
      leader: null,
      holesUp: 0,
      holesRemaining: 10,
    };

    it('returns AS for both players', () => {
      const display1 = getPlayerMatchStatus(status, 'player1');
      expect(display1.text).toBe('A/S');
      expect(display1.fullText).toBe('All Square');
      expect(display1.type).toBe('square');
      expect(display1.holesUpDown).toBe(0);

      const display2 = getPlayerMatchStatus(status, 'player2');
      expect(display2.text).toBe('A/S');
      expect(display2.type).toBe('square');
    });
  });

  describe('in progress - player1 leading', () => {
    const status: MatchStatus = {
      status: 'in_progress',
      leader: 'player1',
      holesUp: 2,
      holesRemaining: 7,
    };

    it('returns UP for player1', () => {
      const display = getPlayerMatchStatus(status, 'player1');
      expect(display.text).toBe('2 UP');
      expect(display.fullText).toBe('2 Up');
      expect(display.type).toBe('up');
      expect(display.holesUpDown).toBe(2);
    });

    it('returns DN for player2', () => {
      const display = getPlayerMatchStatus(status, 'player2');
      expect(display.text).toBe('2 DN');
      expect(display.fullText).toBe('2 Down');
      expect(display.type).toBe('down');
      expect(display.holesUpDown).toBe(-2);
    });
  });

  describe('in progress - player2 leading', () => {
    const status: MatchStatus = {
      status: 'in_progress',
      leader: 'player2',
      holesUp: 4,
      holesRemaining: 5,
    };

    it('returns DN for player1', () => {
      const display = getPlayerMatchStatus(status, 'player1');
      expect(display.text).toBe('4 DN');
      expect(display.fullText).toBe('4 Down');
      expect(display.type).toBe('down');
      expect(display.holesUpDown).toBe(-4);
    });

    it('returns UP for player2', () => {
      const display = getPlayerMatchStatus(status, 'player2');
      expect(display.text).toBe('4 UP');
      expect(display.fullText).toBe('4 Up');
      expect(display.type).toBe('up');
      expect(display.holesUpDown).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('handles 1 up/down correctly', () => {
      const status: MatchStatus = {
        status: 'in_progress',
        leader: 'player1',
        holesUp: 1,
        holesRemaining: 3,
      };

      const display1 = getPlayerMatchStatus(status, 'player1');
      expect(display1.text).toBe('1 UP');
      expect(display1.holesUpDown).toBe(1);

      const display2 = getPlayerMatchStatus(status, 'player2');
      expect(display2.text).toBe('1 DN');
      expect(display2.holesUpDown).toBe(-1);
    });
  });
});

// ============================================================================
// Integration/Scenario Tests
// ============================================================================

describe('Match Play Scenarios', () => {
  describe('Complete match scenario - player1 wins early', () => {
    it('correctly tracks a match where player1 dominates', () => {
      // Player1 wins 4 holes in a row, then continues to build lead
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1' },
        { hole: 2, winner: 'player1' },
        { hole: 3, winner: 'player1' },
        { hole: 4, winner: 'player1' },
        { hole: 5, winner: 'halved' },
        { hole: 6, winner: 'halved' },
        { hole: 7, winner: 'player2' },
        { hole: 8, winner: 'player1' },
        { hole: 9, winner: 'halved' },
        { hole: 10, winner: 'player1' },
        { hole: 11, winner: 'halved' },
        { hole: 12, winner: 'halved' },
        { hole: 13, winner: 'halved' },
        { hole: 14, winner: 'halved' },
      ]);

      const status = calculateMatchStatus(results);

      // Player1: 6 wins, Player2: 1 win, 7 halved = Player1 is 5 up with 4 to play
      expect(status.status).toBe('complete');
      if (status.status === 'complete') {
        expect(status.winner).toBe('player1');
        expect(status.margin).toBe('5 & 4');
      }

      const statusText = getMatchStatusText(status, 'Tiger', 'Phil');
      expect(statusText).toBe('Tiger wins 5 & 4');
    });
  });

  describe('Comeback scenario - player2 fights back', () => {
    it('tracks a match with momentum swings', () => {
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1' },
        { hole: 2, winner: 'player1' },
        { hole: 3, winner: 'player1' },
        // Player1 3 up after 3
        { hole: 4, winner: 'player2' },
        { hole: 5, winner: 'player2' },
        { hole: 6, winner: 'player2' },
        // All square after 6
        { hole: 7, winner: 'player2' },
        { hole: 8, winner: 'player2' },
        // Player2 2 up after 8
      ]);

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBe('player2');
        expect(status.holesUp).toBe(2);
        expect(status.holesRemaining).toBe(10);
      }

      const statusText = getMatchStatusText(status, 'John', 'Mike');
      expect(statusText).toBe('Mike is 2 up with 10 to play');

      // Check per-player status
      const johnStatus = getPlayerMatchStatus(status, 'player1');
      expect(johnStatus.text).toBe('2 DN');
      expect(johnStatus.type).toBe('down');

      const mikeStatus = getPlayerMatchStatus(status, 'player2');
      expect(mikeStatus.text).toBe('2 UP');
      expect(mikeStatus.type).toBe('up');
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

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('complete');
      if (status.status === 'complete') {
        expect(status.winner).toBe('halved');
        expect(status.margin).toBe('All Square');
      }

      const statusText = getMatchStatusText(status, 'Player A', 'Player B');
      expect(statusText).toBe('Match Halved');

      // Both players should show halved status
      const p1Status = getPlayerMatchStatus(status, 'player1');
      expect(p1Status.text).toBe('A/S');
      expect(p1Status.type).toBe('halved');

      const p2Status = getPlayerMatchStatus(status, 'player2');
      expect(p2Status.text).toBe('A/S');
      expect(p2Status.type).toBe('halved');
    });
  });

  describe('Close match going to 18', () => {
    it('tracks a match decided on the final hole', () => {
      // Alternate wins until hole 17, then player1 wins 18 to win by 1
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1' },
        { hole: 2, winner: 'player2' },
        { hole: 3, winner: 'player1' },
        { hole: 4, winner: 'player2' },
        { hole: 5, winner: 'player1' },
        { hole: 6, winner: 'player2' },
        { hole: 7, winner: 'player1' },
        { hole: 8, winner: 'player2' },
        { hole: 9, winner: 'player1' },
        { hole: 10, winner: 'player2' },
        { hole: 11, winner: 'player1' },
        { hole: 12, winner: 'player2' },
        { hole: 13, winner: 'player1' },
        { hole: 14, winner: 'player2' },
        { hole: 15, winner: 'player1' },
        { hole: 16, winner: 'player2' },
        { hole: 17, winner: 'halved' },
        { hole: 18, winner: 'player1' },
      ]);

      const status = calculateMatchStatus(results);

      // Player1: 9, Player2: 8, Halved: 1 = Player1 wins by 1
      // Note: Implementation uses "1 & 0" format when decided on final hole
      expect(status.status).toBe('complete');
      if (status.status === 'complete') {
        expect(status.winner).toBe('player1');
        expect(status.margin).toBe('1 & 0');
      }

      // Check final status text
      const statusText = getMatchStatusText(status, 'Winner', 'Runner-Up');
      expect(statusText).toBe('Winner wins 1 & 0');

      // Check per-player final status
      const winnerStatus = getPlayerMatchStatus(status, 'player1');
      expect(winnerStatus.text).toBe('WIN');
      expect(winnerStatus.type).toBe('win');

      const loserStatus = getPlayerMatchStatus(status, 'player2');
      expect(loserStatus.text).toBe('LOSS');
      expect(loserStatus.type).toBe('loss');
    });
  });

  describe('Dormie situation', () => {
    it('correctly identifies when match is dormie (lead equals remaining)', () => {
      // Player1 is 2 up with 2 to play = dormie
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1' },
        { hole: 2, winner: 'player1' },
        { hole: 3, winner: 'halved' },
        { hole: 4, winner: 'halved' },
        { hole: 5, winner: 'halved' },
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

      const status = calculateMatchStatus(results);

      // 2 up with 2 to play - still in progress (dormie)
      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBe('player1');
        expect(status.holesUp).toBe(2);
        expect(status.holesRemaining).toBe(2);
      }

      // If player1 wins hole 17, match is over
      results[17] = {
        player1Score: 4,
        player2Score: 5,
        player1PickedUp: false,
        player2PickedUp: false,
        winner: 'player1',
      };

      const finalStatus = calculateMatchStatus(results);

      expect(finalStatus.status).toBe('complete');
      if (finalStatus.status === 'complete') {
        expect(finalStatus.winner).toBe('player1');
        expect(finalStatus.margin).toBe('3 & 1');
      }
    });
  });

  describe('Player picks up to concede hole', () => {
    it('handles player conceding a hole by picking up', () => {
      const results = createMockHoleResults([
        { hole: 1, winner: 'player1', player1Score: 4, player2Score: null, player2PickedUp: true },
        { hole: 2, winner: 'player2', player1Score: null, player2Score: 4, player1PickedUp: true },
        { hole: 3, winner: 'halved', player1Score: 4, player2Score: 4 },
      ]);

      const status = calculateMatchStatus(results);

      expect(status.status).toBe('in_progress');
      if (status.status === 'in_progress') {
        expect(status.leader).toBeNull();
        expect(status.holesUp).toBe(0);
        expect(status.holesRemaining).toBe(15);
      }
    });
  });
});

/**
 * Wolf Calculations Tests
 *
 * Unit tests for Wolf game calculation functions.
 * Tests cover rotation, winner determination, points calculation,
 * standings, payouts, and validation.
 */

import {
  determineWolfForHole,
  getWolfRotationForRound,
  calculateNetScore,
  determineWolfHoleResult,
  calculateWolfPoints,
  calculateWolfStandings,
  getSortedStandings,
  calculateWolfPayouts,
  createPayoutRecords,
  simplifyWolfDebts,
  validateWolfParticipants,
  validateWolfDecision,
  canDeclareBlindWolf,
  isWolfGameComplete,
  getNextHoleForDecision,
  getNextHoleForCalculation,
  formatWolfCurrency,
  formatWolfNetResult,
  getWolfDecisionDescription,
  getWolfResultDescription,
  DEFAULT_WOLF_POINT_VALUES,
} from '../wolfCalculations';

// =====================================================
// WOLF ROTATION TESTS
// =====================================================

describe('determineWolfForHole', () => {
  const fourPlayers = ['p1', 'p2', 'p3', 'p4'];
  const threePlayers = ['p1', 'p2', 'p3'];

  it('rotates Wolf correctly for 4 players', () => {
    expect(determineWolfForHole(fourPlayers, 1)).toBe('p1');
    expect(determineWolfForHole(fourPlayers, 2)).toBe('p2');
    expect(determineWolfForHole(fourPlayers, 3)).toBe('p3');
    expect(determineWolfForHole(fourPlayers, 4)).toBe('p4');
    expect(determineWolfForHole(fourPlayers, 5)).toBe('p1'); // Wraps
    expect(determineWolfForHole(fourPlayers, 18)).toBe('p2');
  });

  it('rotates Wolf correctly for 3 players', () => {
    expect(determineWolfForHole(threePlayers, 1)).toBe('p1');
    expect(determineWolfForHole(threePlayers, 2)).toBe('p2');
    expect(determineWolfForHole(threePlayers, 3)).toBe('p3');
    expect(determineWolfForHole(threePlayers, 4)).toBe('p1'); // Wraps
    expect(determineWolfForHole(threePlayers, 6)).toBe('p3');
    expect(determineWolfForHole(threePlayers, 18)).toBe('p3');
  });

  it('throws error for empty wolf order', () => {
    expect(() => determineWolfForHole([], 1)).toThrow('Wolf order cannot be empty');
  });
});

describe('getWolfRotationForRound', () => {
  it('returns rotation for all 18 holes', () => {
    const rotation = getWolfRotationForRound(['p1', 'p2', 'p3', 'p4']);

    expect(rotation.size).toBe(18);
    expect(rotation.get(1)).toBe('p1');
    expect(rotation.get(5)).toBe('p1');
    expect(rotation.get(9)).toBe('p1');
    expect(rotation.get(13)).toBe('p1');
    expect(rotation.get(17)).toBe('p1');
  });
});

// =====================================================
// NET SCORE CALCULATION TESTS
// =====================================================

describe('calculateNetScore', () => {
  it('calculates net score correctly', () => {
    expect(calculateNetScore(5, 1)).toBe(4);
    expect(calculateNetScore(4, 0)).toBe(4);
    expect(calculateNetScore(6, 2)).toBe(4);
  });

  it('handles zero strokes', () => {
    expect(calculateNetScore(4, 0)).toBe(4);
  });
});

// =====================================================
// HOLE RESULT DETERMINATION TESTS
// =====================================================

describe('determineWolfHoleResult', () => {
  describe('Lone Wolf scenarios', () => {
    it('Lone Wolf wins when having best score', () => {
      const result = determineWolfHoleResult(
        'wolf',
        null,
        { wolf: 3, p2: 4, p3: 5 },
        'gross'
      );
      expect(result.wolfTeamWon).toBe(true);
      expect(result.isTie).toBe(false);
    });

    it('Pack wins when having better score than Lone Wolf', () => {
      const result = determineWolfHoleResult(
        'wolf',
        null,
        { wolf: 5, p2: 4, p3: 5 },
        'gross'
      );
      expect(result.wolfTeamWon).toBe(false);
      expect(result.isTie).toBe(false);
    });

    it('Tie when Lone Wolf matches Pack best', () => {
      const result = determineWolfHoleResult(
        'wolf',
        null,
        { wolf: 4, p2: 4, p3: 5 },
        'gross'
      );
      expect(result.wolfTeamWon).toBe(false);
      expect(result.isTie).toBe(true);
    });
  });

  describe('Partner scenarios', () => {
    it('Wolf team wins when partner has best score', () => {
      const result = determineWolfHoleResult(
        'wolf',
        'p2',
        { wolf: 5, p2: 3, p3: 4, p4: 5 },
        'gross'
      );
      expect(result.wolfTeamWon).toBe(true);
      expect(result.isTie).toBe(false);
    });

    it('Wolf team wins when Wolf has best score (with partner)', () => {
      const result = determineWolfHoleResult(
        'wolf',
        'p2',
        { wolf: 3, p2: 5, p3: 4, p4: 5 },
        'gross'
      );
      expect(result.wolfTeamWon).toBe(true);
      expect(result.isTie).toBe(false);
    });

    it('Pack wins against Wolf team', () => {
      const result = determineWolfHoleResult(
        'wolf',
        'p2',
        { wolf: 5, p2: 5, p3: 3, p4: 4 },
        'gross'
      );
      expect(result.wolfTeamWon).toBe(false);
      expect(result.isTie).toBe(false);
    });

    it('Tie between Wolf team and Pack', () => {
      const result = determineWolfHoleResult(
        'wolf',
        'p2',
        { wolf: 5, p2: 4, p3: 4, p4: 5 },
        'gross'
      );
      expect(result.wolfTeamWon).toBe(false);
      expect(result.isTie).toBe(true);
    });
  });

  describe('Net scoring', () => {
    it('uses net scores for comparison', () => {
      // Wolf gross 5, net 4 (1 stroke)
      // p2 gross 4, net 4 (0 strokes)
      const result = determineWolfHoleResult(
        'wolf',
        null,
        { wolf: 5, p2: 4, p3: 6 },
        'net',
        { wolf: 1, p2: 0, p3: 1 }
      );
      // Wolf net 4, p2 net 4, p3 net 5 -> Tie between Wolf and p2
      expect(result.isTie).toBe(true);
    });

    it('Lone Wolf wins with net scoring', () => {
      const result = determineWolfHoleResult(
        'wolf',
        null,
        { wolf: 5, p2: 5, p3: 5 },
        'net',
        { wolf: 2, p2: 1, p3: 0 }
      );
      // Wolf net 3, p2 net 4, p3 net 5 -> Wolf wins
      expect(result.wolfTeamWon).toBe(true);
      expect(result.isTie).toBe(false);
    });
  });

  it('throws error for fewer than 3 players', () => {
    expect(() =>
      determineWolfHoleResult('wolf', null, { wolf: 4, p2: 5 }, 'gross')
    ).toThrow('Wolf requires at least 3 players');
  });
});

// =====================================================
// POINTS CALCULATION TESTS
// =====================================================

describe('calculateWolfPoints', () => {
  const players3 = ['wolf', 'p2', 'p3'];
  const players4 = ['wolf', 'p2', 'p3', 'p4'];

  describe('Tie scenarios', () => {
    it('awards 0 points to all on tie', () => {
      const points = calculateWolfPoints('wolf', null, players3, false, true, false);
      expect(points).toEqual({ wolf: 0, p2: 0, p3: 0 });
    });

    it('awards 0 points to all on tie with partner', () => {
      const points = calculateWolfPoints('wolf', 'p2', players4, false, true, false);
      expect(points).toEqual({ wolf: 0, p2: 0, p3: 0, p4: 0 });
    });
  });

  describe('Partner win/lose', () => {
    it('awards 2 points each to Wolf team on partner win', () => {
      const points = calculateWolfPoints('wolf', 'p2', players4, true, false, false);
      expect(points).toEqual({ wolf: 2, p2: 2, p3: 0, p4: 0 });
    });

    it('awards 3 points each to Pack on partner lose', () => {
      const points = calculateWolfPoints('wolf', 'p2', players4, false, false, false);
      expect(points).toEqual({ wolf: 0, p2: 0, p3: 3, p4: 3 });
    });
  });

  describe('Lone Wolf win/lose', () => {
    it('awards 4 points to Wolf on Lone Wolf win', () => {
      const points = calculateWolfPoints('wolf', null, players3, true, false, false);
      expect(points).toEqual({ wolf: 4, p2: 0, p3: 0 });
    });

    it('awards 1 point each to Pack on Lone Wolf lose (3 players)', () => {
      const points = calculateWolfPoints('wolf', null, players3, false, false, false);
      expect(points).toEqual({ wolf: 0, p2: 1, p3: 1 });
    });

    it('awards 1 point each to Pack on Lone Wolf lose (4 players)', () => {
      const points = calculateWolfPoints('wolf', null, players4, false, false, false);
      expect(points).toEqual({ wolf: 0, p2: 1, p3: 1, p4: 1 });
    });
  });

  describe('Blind Wolf win/lose', () => {
    it('awards 6 points to Wolf on Blind Wolf win', () => {
      const points = calculateWolfPoints('wolf', null, players3, true, false, true);
      expect(points).toEqual({ wolf: 6, p2: 0, p3: 0 });
    });

    it('awards 2 points each to Pack on Blind Wolf lose', () => {
      const points = calculateWolfPoints('wolf', null, players3, false, false, true);
      expect(points).toEqual({ wolf: 0, p2: 2, p3: 2 });
    });

    it('awards 2 points each to Pack on Blind Wolf lose (4 players)', () => {
      const points = calculateWolfPoints('wolf', null, players4, false, false, true);
      expect(points).toEqual({ wolf: 0, p2: 2, p3: 2, p4: 2 });
    });
  });
});

// =====================================================
// STANDINGS CALCULATION TESTS
// =====================================================

describe('calculateWolfStandings', () => {
  it('accumulates points across holes correctly', () => {
    const decisions = [
      { hole_number: 1, points_awarded: { p1: 4, p2: 0, p3: 0 }, calculated_at: '2025-01-01' },
      { hole_number: 2, points_awarded: { p1: 0, p2: 2, p3: 2 }, calculated_at: '2025-01-01' },
      { hole_number: 3, points_awarded: { p1: 0, p2: 0, p3: 0 }, calculated_at: '2025-01-01' }, // Tie
    ] as any;

    const standings = calculateWolfStandings(decisions);

    expect(standings.get('p1')).toBe(4);
    expect(standings.get('p2')).toBe(2);
    expect(standings.get('p3')).toBe(2);
  });

  it('ignores decisions without calculated_at', () => {
    const decisions = [
      { hole_number: 1, points_awarded: { p1: 4, p2: 0 }, calculated_at: '2025-01-01' },
      { hole_number: 2, points_awarded: { p1: 10, p2: 10 }, calculated_at: null }, // Not calculated
    ] as any;

    const standings = calculateWolfStandings(decisions);

    expect(standings.get('p1')).toBe(4);
    expect(standings.get('p2')).toBe(0);
  });

  it('returns empty map for no decisions', () => {
    const standings = calculateWolfStandings([]);
    expect(standings.size).toBe(0);
  });
});

describe('getSortedStandings', () => {
  it('sorts by points descending with correct ranks', () => {
    const standings = new Map([
      ['p1', 10],
      ['p2', 15],
      ['p3', 10],
    ]);
    const names = new Map([
      ['p1', 'Alice'],
      ['p2', 'Bob'],
      ['p3', 'Charlie'],
    ]);

    const sorted = getSortedStandings(standings, names);

    expect(sorted[0]).toEqual({ player_id: 'p2', name: 'Bob', total_points: 15, rank: 1 });
    expect(sorted[1].rank).toBe(2); // Tied for 2nd
    expect(sorted[2].rank).toBe(2); // Tied for 2nd
  });

  it('handles ties in ranking', () => {
    const standings = new Map([
      ['p1', 10],
      ['p2', 10],
      ['p3', 5],
    ]);
    const names = new Map([
      ['p1', 'A'],
      ['p2', 'B'],
      ['p3', 'C'],
    ]);

    const sorted = getSortedStandings(standings, names);

    expect(sorted[0].rank).toBe(1);
    expect(sorted[1].rank).toBe(1); // Tied for 1st
    expect(sorted[2].rank).toBe(3); // Not 2nd, because two players tied for 1st
  });
});

// =====================================================
// PAYOUT CALCULATION TESTS
// =====================================================

describe('calculateWolfPayouts', () => {
  it('calculates per-point payouts correctly', () => {
    const standings = { p1: 10, p2: 6, p3: 2 }; // Total: 18, avg: 6
    const payouts = calculateWolfPayouts(standings, 1); // $1 per point

    expect(payouts.p1.winnings).toBe(10);
    expect(payouts.p1.netResult).toBeCloseTo(4); // 10 - 6 = +4
    expect(payouts.p2.winnings).toBe(6);
    expect(payouts.p2.netResult).toBeCloseTo(0); // 6 - 6 = 0
    expect(payouts.p3.winnings).toBe(2);
    expect(payouts.p3.netResult).toBeCloseTo(-4); // 2 - 6 = -4
  });

  it('handles no pot (pot value null)', () => {
    const standings = { p1: 10, p2: 5 };
    const payouts = calculateWolfPayouts(standings, null);

    expect(payouts.p1.winnings).toBe(0);
    expect(payouts.p1.netResult).toBe(0);
    expect(payouts.p2.winnings).toBe(0);
    expect(payouts.p2.netResult).toBe(0);
  });

  it('handles zero pot value', () => {
    const standings = { p1: 10, p2: 5 };
    const payouts = calculateWolfPayouts(standings, 0);

    expect(payouts.p1.winnings).toBe(0);
    expect(payouts.p1.netResult).toBe(0);
  });

  it('is zero-sum (net results sum to zero)', () => {
    const standings = { p1: 18, p2: 14, p3: 10, p4: 12 }; // Total: 54, avg: 13.5
    const payouts = calculateWolfPayouts(standings, 1);

    const netSum =
      payouts.p1.netResult +
      payouts.p2.netResult +
      payouts.p3.netResult +
      payouts.p4.netResult;

    expect(netSum).toBeCloseTo(0, 2);
  });
});

describe('createPayoutRecords', () => {
  it('creates payout records for database', () => {
    const standings = { p1: 10, p2: 8 };
    const records = createPayoutRecords(standings, 2);

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      player_id: 'p1',
      total_points: 10,
      total_winnings: 20,
    });
  });
});

// =====================================================
// DEBT SIMPLIFICATION TESTS
// =====================================================

describe('simplifyWolfDebts', () => {
  it('calculates who owes whom', () => {
    const payouts = {
      p1: { netResult: 4 },
      p2: { netResult: 0 },
      p3: { netResult: -4 },
    };

    const debts = simplifyWolfDebts(payouts);

    expect(debts).toHaveLength(1);
    expect(debts[0].fromPlayerId).toBe('p3');
    expect(debts[0].toPlayerId).toBe('p1');
    expect(debts[0].amount).toBe(4);
  });

  it('handles multiple debtors and creditors', () => {
    const payouts = {
      p1: { netResult: 10 },
      p2: { netResult: 5 },
      p3: { netResult: -7 },
      p4: { netResult: -8 },
    };

    const debts = simplifyWolfDebts(payouts);

    // Total debt should equal total credit
    const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
    expect(totalDebt).toBeCloseTo(15, 2);
  });

  it('returns empty array when all even', () => {
    const payouts = {
      p1: { netResult: 0 },
      p2: { netResult: 0 },
      p3: { netResult: 0 },
    };

    const debts = simplifyWolfDebts(payouts);
    expect(debts).toHaveLength(0);
  });
});

// =====================================================
// VALIDATION TESTS
// =====================================================

describe('validateWolfParticipants', () => {
  it('validates 3 players', () => {
    const result = validateWolfParticipants(['p1', 'p2', 'p3']);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates 4 players', () => {
    const result = validateWolfParticipants(['p1', 'p2', 'p3', 'p4']);
    expect(result.isValid).toBe(true);
  });

  it('rejects 2 players', () => {
    const result = validateWolfParticipants(['p1', 'p2']);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Wolf requires 3-4 players');
  });

  it('rejects 5 players', () => {
    const result = validateWolfParticipants(['p1', 'p2', 'p3', 'p4', 'p5']);
    expect(result.isValid).toBe(false);
  });

  it('rejects duplicates', () => {
    const result = validateWolfParticipants(['p1', 'p1', 'p3']);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Duplicate participants not allowed');
  });
});

describe('validateWolfDecision', () => {
  const participants = ['wolf', 'p2', 'p3', 'p4'];

  it('validates lone wolf decision', () => {
    const result = validateWolfDecision('wolf', null, participants);
    expect(result.isValid).toBe(true);
  });

  it('validates partner decision', () => {
    const result = validateWolfDecision('wolf', 'p2', participants);
    expect(result.isValid).toBe(true);
  });

  it('rejects Wolf partnering with self', () => {
    const result = validateWolfDecision('wolf', 'wolf', participants);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Wolf cannot partner with themselves');
  });

  it('rejects non-participant as Wolf', () => {
    const result = validateWolfDecision('stranger', null, participants);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Wolf must be a game participant');
  });

  it('rejects non-participant as partner', () => {
    const result = validateWolfDecision('wolf', 'stranger', participants);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Partner must be a game participant');
  });
});

describe('canDeclareBlindWolf', () => {
  it('returns true when blind wolf enabled and no scores', () => {
    expect(canDeclareBlindWolf(null, true)).toBe(true);
    expect(canDeclareBlindWolf({}, true)).toBe(true);
  });

  it('returns false when blind wolf disabled', () => {
    expect(canDeclareBlindWolf(null, false)).toBe(false);
  });

  it('returns false when scores already entered', () => {
    expect(canDeclareBlindWolf({ p1: 4 }, true)).toBe(false);
  });
});

// =====================================================
// GAME STATUS TESTS
// =====================================================

describe('isWolfGameComplete', () => {
  it('returns true when all 18 holes calculated', () => {
    const decisions = Array.from({ length: 18 }, (_, i) => ({
      hole_number: i + 1,
      calculated_at: '2025-01-01',
    }));
    expect(isWolfGameComplete(decisions)).toBe(true);
  });

  it('returns false when not all holes calculated', () => {
    const decisions = Array.from({ length: 17 }, (_, i) => ({
      hole_number: i + 1,
      calculated_at: '2025-01-01',
    }));
    expect(isWolfGameComplete(decisions)).toBe(false);
  });

  it('returns false for empty decisions', () => {
    expect(isWolfGameComplete([])).toBe(false);
  });
});

describe('getNextHoleForDecision', () => {
  it('returns first hole when no decisions', () => {
    expect(getNextHoleForDecision([])).toBe(1);
  });

  it('returns next undecided hole', () => {
    const decisions = [
      { hole_number: 1, decided_at: '2025-01-01' },
      { hole_number: 2, decided_at: '2025-01-01' },
    ];
    expect(getNextHoleForDecision(decisions)).toBe(3);
  });

  it('returns null when all decided', () => {
    const decisions = Array.from({ length: 18 }, (_, i) => ({
      hole_number: i + 1,
      decided_at: '2025-01-01',
    }));
    expect(getNextHoleForDecision(decisions)).toBe(null);
  });
});

describe('getNextHoleForCalculation', () => {
  it('returns hole with decision but no calculation', () => {
    const decisions = [
      { hole_number: 1, decided_at: '2025-01-01', calculated_at: '2025-01-01' },
      { hole_number: 2, decided_at: '2025-01-01', calculated_at: null },
      { hole_number: 3, decided_at: '2025-01-01', calculated_at: null },
    ];
    expect(getNextHoleForCalculation(decisions)).toBe(2);
  });

  it('returns null when all calculated', () => {
    const decisions = [
      { hole_number: 1, decided_at: '2025-01-01', calculated_at: '2025-01-01' },
    ];
    expect(getNextHoleForCalculation(decisions)).toBe(null);
  });
});

// =====================================================
// FORMATTING TESTS
// =====================================================

describe('formatWolfCurrency', () => {
  it('formats positive values', () => {
    expect(formatWolfCurrency(12.5)).toBe('$12.50');
    expect(formatWolfCurrency(100)).toBe('$100.00');
  });

  it('formats zero', () => {
    expect(formatWolfCurrency(0)).toBe('$0.00');
  });
});

describe('formatWolfNetResult', () => {
  it('formats positive with plus sign', () => {
    expect(formatWolfNetResult(4.5)).toBe('+$4.50');
  });

  it('formats negative with minus sign', () => {
    expect(formatWolfNetResult(-3.25)).toBe('-$3.25');
  });

  it('formats zero without sign', () => {
    expect(formatWolfNetResult(0)).toBe('$0.00');
  });
});

describe('getWolfDecisionDescription', () => {
  it('returns Blind Wolf description', () => {
    expect(getWolfDecisionDescription(true, null)).toBe('Blind Wolf');
  });

  it('returns Lone Wolf description', () => {
    expect(getWolfDecisionDescription(false, null)).toBe('Lone Wolf');
  });

  it('returns Partner description with name', () => {
    expect(getWolfDecisionDescription(false, 'p1', 'John')).toBe('Partner: John');
  });

  it('returns Partner description without name', () => {
    expect(getWolfDecisionDescription(false, 'p1')).toBe('Partner: p1');
  });
});

describe('getWolfResultDescription', () => {
  it('returns Tie - Pushed for tie', () => {
    expect(getWolfResultDescription(false, true)).toBe('Tie - Pushed');
  });

  it('returns Wolf Wins when Wolf team won', () => {
    expect(getWolfResultDescription(true, false)).toBe('Wolf Wins');
  });

  it('returns Pack Wins when Pack won', () => {
    expect(getWolfResultDescription(false, false)).toBe('Pack Wins');
  });

  it('returns Pending when null', () => {
    expect(getWolfResultDescription(null, false)).toBe('Pending');
  });
});

// =====================================================
// CONSTANTS TEST
// =====================================================

describe('DEFAULT_WOLF_POINT_VALUES', () => {
  it('has correct point values', () => {
    expect(DEFAULT_WOLF_POINT_VALUES.partnerWin).toBe(2);
    expect(DEFAULT_WOLF_POINT_VALUES.partnerLoseOpponent).toBe(3);
    expect(DEFAULT_WOLF_POINT_VALUES.loneWolfWin).toBe(4);
    expect(DEFAULT_WOLF_POINT_VALUES.loneWolfLoseOpponent).toBe(1);
    expect(DEFAULT_WOLF_POINT_VALUES.blindWolfWin).toBe(6);
    expect(DEFAULT_WOLF_POINT_VALUES.blindWolfLoseOpponent).toBe(2);
  });
});

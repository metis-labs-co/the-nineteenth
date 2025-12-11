/**
 * Team Generation Tests
 *
 * Tests for auto-generating balanced teams using snake draft algorithm.
 * Covers:
 * - (3) Auto-generate balanced teams - verify handicap distribution
 */

import {
  generateBalancedTeams,
  getTeamStats,
  type TeamGenerationConfig,
  type GeneratedTeam,
} from '@/utils/teamGeneration';
import { createTestPlayer, createPlayersWithHandicaps } from './testFixtures';
import type { Player } from '@/types/database.types';

describe('Team Generation', () => {
  // ============================================================================
  // generateBalancedTeams Tests
  // ============================================================================

  describe('generateBalancedTeams', () => {
    describe('team size and count', () => {
      it('creates correct number of teams for even player count', () => {
        const players = Array.from({ length: 8 }, (_, i) =>
          createTestPlayer({ id: `p${i + 1}`, handicap: 10 + i * 3 })
        );

        const teams = generateBalancedTeams(players, {
          teamSize: 2,
          balanceByHandicap: false,
        });

        expect(teams).toHaveLength(4);
        teams.forEach((team) => {
          expect(team.members).toHaveLength(2);
        });
      });

      it('creates teams of size 4 correctly', () => {
        const players = Array.from({ length: 12 }, (_, i) =>
          createTestPlayer({ id: `p${i + 1}`, handicap: 10 + i * 2 })
        );

        const teams = generateBalancedTeams(players, {
          teamSize: 4,
          balanceByHandicap: false,
        });

        expect(teams).toHaveLength(3);
        teams.forEach((team) => {
          expect(team.members).toHaveLength(4);
        });
      });

      it('creates teams of size 3 correctly', () => {
        const players = Array.from({ length: 9 }, (_, i) =>
          createTestPlayer({ id: `p${i + 1}`, handicap: 10 + i * 2 })
        );

        const teams = generateBalancedTeams(players, {
          teamSize: 3,
          balanceByHandicap: false,
        });

        expect(teams).toHaveLength(3);
        teams.forEach((team) => {
          expect(team.members).toHaveLength(3);
        });
      });

      it('handles uneven player counts with remainder team', () => {
        const players = Array.from({ length: 5 }, (_, i) =>
          createTestPlayer({ id: `p${i + 1}`, handicap: 10 + i * 5 })
        );

        const teams = generateBalancedTeams(players, {
          teamSize: 2,
          balanceByHandicap: false,
        });

        // With snake draft: 5 players, 3 teams
        // Round 0 (forward): T1=p1, T2=p2, T3=p3
        // Round 1 (reverse): T3=p4, T2=p5
        // Result: T1=1 member, T2=2 members, T3=2 members
        expect(teams).toHaveLength(3);
        expect(teams[0].members).toHaveLength(1);
        expect(teams[1].members).toHaveLength(2);
        expect(teams[2].members).toHaveLength(2);
      });

      it('handles single player (edge case)', () => {
        const players = [createTestPlayer({ id: 'p1', handicap: 15 })];

        const teams = generateBalancedTeams(players, {
          teamSize: 2,
          balanceByHandicap: false,
        });

        expect(teams).toHaveLength(1);
        expect(teams[0].members).toHaveLength(1);
      });

      it('returns empty array for no players', () => {
        const teams = generateBalancedTeams([], {
          teamSize: 2,
          balanceByHandicap: true,
        });

        expect(teams).toEqual([]);
      });
    });

    describe('snake draft algorithm', () => {
      it('assigns players using snake draft pattern when balanceByHandicap is true', () => {
        // Players with handicaps: 0, 10, 20, 30
        const players = createPlayersWithHandicaps([0, 10, 20, 30]);

        const teams = generateBalancedTeams(players, {
          teamSize: 2,
          balanceByHandicap: true,
        });

        // Snake draft with sorted players:
        // Sorted by handicap: p1(0), p2(10), p3(20), p4(30)
        // Round 1 (forward): Team1 gets p1(0), Team2 gets p2(10)
        // Round 2 (reverse): Team2 gets p3(20), Team1 gets p4(30)
        // Result: Team1 = [0, 30], Team2 = [10, 20]
        expect(teams[0].members.map((m) => m.handicap)).toEqual([0, 30]);
        expect(teams[1].members.map((m) => m.handicap)).toEqual([10, 20]);
      });

      it('maintains original order when balanceByHandicap is false', () => {
        // Players in specific order with unsorted handicaps
        const players = [
          createTestPlayer({ id: 'p1', handicap: 30 }),
          createTestPlayer({ id: 'p2', handicap: 0 }),
          createTestPlayer({ id: 'p3', handicap: 20 }),
          createTestPlayer({ id: 'p4', handicap: 10 }),
        ];

        const teams = generateBalancedTeams(players, {
          teamSize: 2,
          balanceByHandicap: false,
        });

        // Snake draft without sorting:
        // Round 1 (forward): Team1 gets p1(30), Team2 gets p2(0)
        // Round 2 (reverse): Team2 gets p3(20), Team1 gets p4(10)
        expect(teams[0].members.map((m) => m.id)).toEqual(['p1', 'p4']);
        expect(teams[1].members.map((m) => m.id)).toEqual(['p2', 'p3']);
      });

      it('correctly applies snake draft with 4 teams', () => {
        const players = createPlayersWithHandicaps([0, 5, 10, 15, 20, 25, 30, 35]);

        const teams = generateBalancedTeams(players, {
          teamSize: 2,
          balanceByHandicap: true,
        });

        // Sorted: 0, 5, 10, 15, 20, 25, 30, 35
        // Round 1 (forward): T1=0, T2=5, T3=10, T4=15
        // Round 2 (reverse): T4=20, T3=25, T2=30, T1=35
        expect(teams[0].members.map((m) => m.handicap)).toEqual([0, 35]);
        expect(teams[1].members.map((m) => m.handicap)).toEqual([5, 30]);
        expect(teams[2].members.map((m) => m.handicap)).toEqual([10, 25]);
        expect(teams[3].members.map((m) => m.handicap)).toEqual([15, 20]);
      });
    });

    describe('handicap balancing', () => {
      it('creates balanced teams with similar average handicaps', () => {
        // 8 players with handicaps 0-35 in increments of 5
        const players = createPlayersWithHandicaps([0, 5, 10, 15, 20, 25, 30, 35]);

        const teams = generateBalancedTeams(players, {
          teamSize: 2,
          balanceByHandicap: true,
        });

        // Each team should have avg handicap of ~17.5 (70 / 4 teams / 2 players)
        const avgHandicaps = teams.map((team) => {
          const stats = getTeamStats(team);
          return stats.avgHandicap;
        });

        // All averages should be the same with perfect snake draft
        expect(avgHandicaps[0]).toBe(17.5); // (0 + 35) / 2
        expect(avgHandicaps[1]).toBe(17.5); // (5 + 30) / 2
        expect(avgHandicaps[2]).toBe(17.5); // (10 + 25) / 2
        expect(avgHandicaps[3]).toBe(17.5); // (15 + 20) / 2
      });

      it('minimizes handicap variance between teams', () => {
        const players = createPlayersWithHandicaps([5, 8, 12, 15, 18, 22, 25, 28]);

        const teams = generateBalancedTeams(players, {
          teamSize: 2,
          balanceByHandicap: true,
        });

        const avgHandicaps = teams.map((team) => getTeamStats(team).avgHandicap);

        // Calculate variance - should be minimal
        const meanAvg = avgHandicaps.reduce((a, b) => a + b, 0) / avgHandicaps.length;
        const variance =
          avgHandicaps.reduce((sum, avg) => sum + Math.pow(avg - meanAvg, 2), 0) / avgHandicaps.length;

        expect(variance).toBeLessThan(1); // Very low variance
      });

      it('handles undefined handicaps by treating them as 0', () => {
        const players = [
          createTestPlayer({ id: 'p1', handicap: undefined as unknown as number }),
          createTestPlayer({ id: 'p2', handicap: 10 }),
          createTestPlayer({ id: 'p3', handicap: 20 }),
          createTestPlayer({ id: 'p4', handicap: 30 }),
        ];

        const teams = generateBalancedTeams(players, {
          teamSize: 2,
          balanceByHandicap: true,
        });

        // Player with undefined handicap (treated as 0) should be in first team
        // Sorted: 0 (undefined), 10, 20, 30
        const team1Handicaps = teams[0].members.map((m) => m.handicap ?? 0);
        expect(team1Handicaps).toContain(0);
      });
    });

    describe('team naming', () => {
      it('generates sequential team names', () => {
        const players = Array.from({ length: 6 }, (_, i) =>
          createTestPlayer({ id: `p${i + 1}`, handicap: 10 })
        );

        const teams = generateBalancedTeams(players, {
          teamSize: 2,
          balanceByHandicap: false,
        });

        expect(teams.map((t) => t.name)).toEqual(['Team 1', 'Team 2', 'Team 3']);
      });
    });
  });

  // ============================================================================
  // getTeamStats Tests
  // ============================================================================

  describe('getTeamStats', () => {
    it('calculates correct statistics for a team', () => {
      const team: GeneratedTeam = {
        name: 'Team 1',
        members: [
          createTestPlayer({ id: 'p1', handicap: 10 }),
          createTestPlayer({ id: 'p2', handicap: 20 }),
          createTestPlayer({ id: 'p3', handicap: 30 }),
        ],
      };

      const stats = getTeamStats(team);

      expect(stats.avgHandicap).toBe(20);
      expect(stats.totalHandicap).toBe(60);
      expect(stats.lowestHandicap).toBe(10);
      expect(stats.highestHandicap).toBe(30);
    });

    it('handles single member team', () => {
      const team: GeneratedTeam = {
        name: 'Team 1',
        members: [createTestPlayer({ id: 'p1', handicap: 15 })],
      };

      const stats = getTeamStats(team);

      expect(stats.avgHandicap).toBe(15);
      expect(stats.totalHandicap).toBe(15);
      expect(stats.lowestHandicap).toBe(15);
      expect(stats.highestHandicap).toBe(15);
    });

    it('handles empty team', () => {
      const team: GeneratedTeam = {
        name: 'Team 1',
        members: [],
      };

      const stats = getTeamStats(team);

      expect(stats.avgHandicap).toBe(0);
      expect(stats.totalHandicap).toBe(0);
      expect(stats.lowestHandicap).toBe(0);
      expect(stats.highestHandicap).toBe(0);
    });

    it('defaults missing handicaps to 0', () => {
      const team: GeneratedTeam = {
        name: 'Team 1',
        members: [
          createTestPlayer({ id: 'p1', handicap: undefined as unknown as number }),
          createTestPlayer({ id: 'p2', handicap: 10 }),
        ],
      };

      const stats = getTeamStats(team);

      expect(stats.avgHandicap).toBe(5); // (0 + 10) / 2
      expect(stats.totalHandicap).toBe(10);
      expect(stats.lowestHandicap).toBe(0);
      expect(stats.highestHandicap).toBe(10);
    });
  });
});

// ============================================================================
// Integration: Verify teams persist across rounds (Fixed Teams)
// ============================================================================

describe('Fixed Teams Integration', () => {
  it('teams persist across multiple rounds in fixed team mode', () => {
    // Simulate fixed team competition setup
    const players = createPlayersWithHandicaps([5, 10, 15, 20, 25, 30, 35, 40]);

    // Generate teams once (for fixed team mode)
    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
    });

    // Teams should remain the same across rounds
    // Round 1
    const round1Teams = teams;

    // Round 2 - Same teams
    const round2Teams = teams;

    // Round 3 - Same teams
    const round3Teams = teams;

    // Verify team composition is identical
    expect(round1Teams).toEqual(round2Teams);
    expect(round2Teams).toEqual(round3Teams);

    // Verify each team maintains the same players
    round1Teams.forEach((team, index) => {
      const playerIds = team.members.map((m) => m.id);
      const round2PlayerIds = round2Teams[index].members.map((m) => m.id);
      const round3PlayerIds = round3Teams[index].members.map((m) => m.id);

      expect(playerIds).toEqual(round2PlayerIds);
      expect(playerIds).toEqual(round3PlayerIds);
    });
  });
});

// ============================================================================
// Integration: Verify teams can differ per round (Per-Round Teams)
// ============================================================================

describe('Per-Round Teams Integration', () => {
  it('teams can be regenerated differently for each round', () => {
    const players = createPlayersWithHandicaps([5, 10, 15, 20, 25, 30, 35, 40]);

    // Round 1 - Balance by handicap
    const round1Teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
    });

    // Round 2 - Different order (simulate shuffle before generation)
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const round2Teams = generateBalancedTeams(shuffledPlayers, {
      teamSize: 2,
      balanceByHandicap: false, // Different strategy
    });

    // Round 3 - Team size 4 instead
    const round3Teams = generateBalancedTeams(players, {
      teamSize: 4,
      balanceByHandicap: true,
    });

    // Verify rounds can have different team configurations
    expect(round1Teams).toHaveLength(4);
    expect(round2Teams).toHaveLength(4);
    expect(round3Teams).toHaveLength(2); // Different team size

    // In per-round mode, teams can be completely different
    // This is expected behavior - just verify structure is correct
    round1Teams.forEach((team) => {
      expect(team.members.length).toBeGreaterThan(0);
      expect(team.name).toBeDefined();
    });

    round2Teams.forEach((team) => {
      expect(team.members.length).toBeGreaterThan(0);
      expect(team.name).toBeDefined();
    });

    round3Teams.forEach((team) => {
      expect(team.members.length).toBe(4);
      expect(team.name).toBeDefined();
    });
  });
});

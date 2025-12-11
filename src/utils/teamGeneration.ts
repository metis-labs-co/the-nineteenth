// ============================================================================
// Types
// ============================================================================

/**
 * Minimal player type required for team generation.
 * This allows both app-level Player and database Player types to be used.
 */
export interface TeamPlayer {
  id: string;
  name: string;
  handicap?: number | null;
}

/**
 * Configuration for team generation
 */
export interface TeamGenerationConfig {
  /** Number of players per team (2-4) */
  teamSize: 2 | 3 | 4;
  /** Whether to balance teams by handicap using snake draft */
  balanceByHandicap: boolean;
}

/**
 * A generated team with members
 */
export interface GeneratedTeam<T extends TeamPlayer = TeamPlayer> {
  name: string;
  members: T[];
}

/**
 * Statistics for a team's handicaps
 */
export interface TeamStats {
  avgHandicap: number;
  totalHandicap: number;
  lowestHandicap: number;
  highestHandicap: number;
}

// ============================================================================
// Team Generation Functions
// ============================================================================

/**
 * Get the effective handicap for a player, defaulting to 0 if not set.
 *
 * @param player - The player to get handicap for
 * @returns The player's handicap or 0 if undefined/null
 */
function getEffectiveHandicap(player: TeamPlayer): number {
  return player.handicap ?? 0;
}

/**
 * Generate balanced teams using snake draft algorithm.
 *
 * The snake draft pattern assigns players to teams in alternating order:
 * - Round 1: Team 1, Team 2, Team 3, Team 4
 * - Round 2: Team 4, Team 3, Team 2, Team 1
 * - Round 3: Team 1, Team 2, Team 3, Team 4
 * - etc.
 *
 * When balanceByHandicap is true, players are sorted by handicap (lowest first)
 * before the draft, ensuring each team gets a mix of skill levels.
 *
 * @param players - Array of players to assign to teams
 * @param config - Configuration with teamSize and balanceByHandicap options
 * @returns Array of generated teams
 *
 * @example
 * ```typescript
 * const players = [
 *   { id: '1', name: 'Alice', handicap: 5 },
 *   { id: '2', name: 'Bob', handicap: 10 },
 *   { id: '3', name: 'Charlie', handicap: 15 },
 *   { id: '4', name: 'Dave', handicap: 20 },
 * ];
 *
 * const teams = generateBalancedTeams(players, {
 *   teamSize: 2,
 *   balanceByHandicap: true,
 * });
 *
 * // Result: 2 teams of 2 players each
 * // Team 1: Alice (5), Dave (20) - avg 12.5
 * // Team 2: Bob (10), Charlie (15) - avg 12.5
 * ```
 *
 * @example With uneven players
 * ```typescript
 * const players = [p1, p2, p3, p4, p5]; // 5 players
 *
 * const teams = generateBalancedTeams(players, {
 *   teamSize: 2,
 *   balanceByHandicap: true,
 * });
 *
 * // Result: 3 teams
 * // Team 1: 2 players
 * // Team 2: 2 players
 * // Team 3: 1 player (uneven remainder)
 * ```
 *
 * @example Unit test
 * ```typescript
 * describe('generateBalancedTeams', () => {
 *   it('creates teams with correct size', () => {
 *     const players = createTestPlayers(8);
 *
 *     const teams = generateBalancedTeams(players, {
 *       teamSize: 2,
 *       balanceByHandicap: false,
 *     });
 *
 *     expect(teams).toHaveLength(4);
 *     teams.forEach(team => {
 *       expect(team.members).toHaveLength(2);
 *     });
 *   });
 *
 *   it('handles uneven player counts', () => {
 *     const players = createTestPlayers(5);
 *
 *     const teams = generateBalancedTeams(players, {
 *       teamSize: 2,
 *       balanceByHandicap: false,
 *     });
 *
 *     expect(teams).toHaveLength(3);
 *     expect(teams[0].members).toHaveLength(2);
 *     expect(teams[1].members).toHaveLength(2);
 *     expect(teams[2].members).toHaveLength(1);
 *   });
 *
 *   it('balances teams by handicap with snake draft', () => {
 *     const players = [
 *       { id: '1', handicap: 0 },
 *       { id: '2', handicap: 10 },
 *       { id: '3', handicap: 20 },
 *       { id: '4', handicap: 30 },
 *     ] as Player[];
 *
 *     const teams = generateBalancedTeams(players, {
 *       teamSize: 2,
 *       balanceByHandicap: true,
 *     });
 *
 *     // Snake: 0 -> Team1, 10 -> Team2, 20 -> Team2, 30 -> Team1
 *     expect(teams[0].members.map(p => p.handicap)).toEqual([0, 30]);
 *     expect(teams[1].members.map(p => p.handicap)).toEqual([10, 20]);
 *   });
 *
 *   it('uses original order when balanceByHandicap is false', () => {
 *     const players = [
 *       { id: '1', handicap: 30 },
 *       { id: '2', handicap: 0 },
 *       { id: '3', handicap: 20 },
 *       { id: '4', handicap: 10 },
 *     ] as Player[];
 *
 *     const teams = generateBalancedTeams(players, {
 *       teamSize: 2,
 *       balanceByHandicap: false,
 *     });
 *
 *     expect(teams[0].members.map(p => p.id)).toEqual(['1', '4']);
 *     expect(teams[1].members.map(p => p.id)).toEqual(['2', '3']);
 *   });
 *
 *   it('defaults missing handicaps to 0', () => {
 *     const players = [
 *       { id: '1', handicap: undefined },
 *       { id: '2', handicap: 10 },
 *     ] as Player[];
 *
 *     const teams = generateBalancedTeams(players, {
 *       teamSize: 2,
 *       balanceByHandicap: true,
 *     });
 *
 *     // Player without handicap (0) should be first when sorted
 *     expect(getEffectiveHandicap(teams[0].members[0])).toBe(0);
 *   });
 *
 *   it('generates correct team names', () => {
 *     const players = createTestPlayers(6);
 *
 *     const teams = generateBalancedTeams(players, {
 *       teamSize: 2,
 *       balanceByHandicap: false,
 *     });
 *
 *     expect(teams.map(t => t.name)).toEqual(['Team 1', 'Team 2', 'Team 3']);
 *   });
 *
 *   it('returns empty array for empty players', () => {
 *     const teams = generateBalancedTeams([], {
 *       teamSize: 2,
 *       balanceByHandicap: true,
 *     });
 *
 *     expect(teams).toEqual([]);
 *   });
 * });
 * ```
 */
export function generateBalancedTeams<T extends TeamPlayer>(
  players: T[],
  config: TeamGenerationConfig
): GeneratedTeam<T>[] {
  if (players.length === 0) {
    return [];
  }

  const { teamSize, balanceByHandicap } = config;

  // Sort players by handicap if balancing, otherwise keep original order
  const sortedPlayers = balanceByHandicap
    ? [...players].sort(
        (a, b) => getEffectiveHandicap(a) - getEffectiveHandicap(b)
      )
    : [...players];

  // Calculate number of teams needed
  const numTeams = Math.ceil(sortedPlayers.length / teamSize);

  // Initialize teams
  const teams: GeneratedTeam<T>[] = Array.from({ length: numTeams }, (_, i) => ({
    name: `Team ${i + 1}`,
    members: [] as T[],
  }));

  // Snake draft assignment
  // Round 0 (even): 0, 1, 2, 3 (forward)
  // Round 1 (odd):  3, 2, 1, 0 (reverse)
  // Round 2 (even): 0, 1, 2, 3 (forward)
  // etc.
  sortedPlayers.forEach((player, index) => {
    const round = Math.floor(index / numTeams);
    const positionInRound = index % numTeams;

    // Determine team index based on snake pattern
    const teamIndex =
      round % 2 === 0
        ? positionInRound // Forward: 0, 1, 2, 3
        : numTeams - 1 - positionInRound; // Reverse: 3, 2, 1, 0

    teams[teamIndex].members.push(player);
  });

  return teams;
}

// ============================================================================
// Team Statistics Functions
// ============================================================================

/**
 * Calculate handicap statistics for a team.
 *
 * @param team - The team to calculate statistics for
 * @returns Object with avgHandicap, totalHandicap, lowestHandicap, highestHandicap
 *
 * @example
 * ```typescript
 * const team: GeneratedTeam = {
 *   name: 'Team 1',
 *   members: [
 *     { id: '1', handicap: 5 },
 *     { id: '2', handicap: 15 },
 *     { id: '3', handicap: 25 },
 *   ],
 * };
 *
 * const stats = getTeamStats(team);
 * // stats = {
 * //   avgHandicap: 15,
 * //   totalHandicap: 45,
 * //   lowestHandicap: 5,
 * //   highestHandicap: 25,
 * // }
 * ```
 *
 * @example With missing handicaps
 * ```typescript
 * const team: GeneratedTeam = {
 *   name: 'Team 1',
 *   members: [
 *     { id: '1', handicap: undefined },
 *     { id: '2', handicap: 20 },
 *   ],
 * };
 *
 * const stats = getTeamStats(team);
 * // stats = {
 * //   avgHandicap: 10,      // (0 + 20) / 2
 * //   totalHandicap: 20,    // 0 + 20
 * //   lowestHandicap: 0,    // undefined defaults to 0
 * //   highestHandicap: 20,
 * // }
 * ```
 *
 * @example Unit test
 * ```typescript
 * describe('getTeamStats', () => {
 *   it('calculates correct statistics', () => {
 *     const team: GeneratedTeam = {
 *       name: 'Team 1',
 *       members: [
 *         { id: '1', handicap: 10 } as Player,
 *         { id: '2', handicap: 20 } as Player,
 *         { id: '3', handicap: 30 } as Player,
 *       ],
 *     };
 *
 *     const stats = getTeamStats(team);
 *
 *     expect(stats.avgHandicap).toBe(20);
 *     expect(stats.totalHandicap).toBe(60);
 *     expect(stats.lowestHandicap).toBe(10);
 *     expect(stats.highestHandicap).toBe(30);
 *   });
 *
 *   it('handles single member team', () => {
 *     const team: GeneratedTeam = {
 *       name: 'Team 1',
 *       members: [{ id: '1', handicap: 15 } as Player],
 *     };
 *
 *     const stats = getTeamStats(team);
 *
 *     expect(stats.avgHandicap).toBe(15);
 *     expect(stats.totalHandicap).toBe(15);
 *     expect(stats.lowestHandicap).toBe(15);
 *     expect(stats.highestHandicap).toBe(15);
 *   });
 *
 *   it('handles empty team', () => {
 *     const team: GeneratedTeam = {
 *       name: 'Team 1',
 *       members: [],
 *     };
 *
 *     const stats = getTeamStats(team);
 *
 *     expect(stats.avgHandicap).toBe(0);
 *     expect(stats.totalHandicap).toBe(0);
 *     expect(stats.lowestHandicap).toBe(0);
 *     expect(stats.highestHandicap).toBe(0);
 *   });
 *
 *   it('defaults missing handicaps to 0', () => {
 *     const team: GeneratedTeam = {
 *       name: 'Team 1',
 *       members: [
 *         { id: '1', handicap: undefined } as Player,
 *         { id: '2', handicap: 10 } as Player,
 *       ],
 *     };
 *
 *     const stats = getTeamStats(team);
 *
 *     expect(stats.avgHandicap).toBe(5);
 *     expect(stats.totalHandicap).toBe(10);
 *     expect(stats.lowestHandicap).toBe(0);
 *     expect(stats.highestHandicap).toBe(10);
 *   });
 * });
 * ```
 */
export function getTeamStats<T extends TeamPlayer>(team: GeneratedTeam<T>): TeamStats {
  if (team.members.length === 0) {
    return {
      avgHandicap: 0,
      totalHandicap: 0,
      lowestHandicap: 0,
      highestHandicap: 0,
    };
  }

  const handicaps = team.members.map(getEffectiveHandicap);
  const totalHandicap = handicaps.reduce((sum, h) => sum + h, 0);

  return {
    avgHandicap: totalHandicap / handicaps.length,
    totalHandicap,
    lowestHandicap: Math.min(...handicaps),
    highestHandicap: Math.max(...handicaps),
  };
}

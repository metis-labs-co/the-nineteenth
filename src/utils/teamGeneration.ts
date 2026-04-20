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
  /** Number of players per team (2-4). Ignored if `numTeams` is provided. */
  teamSize: 2 | 3 | 4;
  /** Whether to balance teams by handicap using snake draft + local search */
  balanceByHandicap: boolean;
  /**
   * When set, overrides the count derived from `teamSize` and produces exactly
   * this many teams. Team sizes become uneven when players don't divide evenly
   * (extras are distributed to the lowest-indexed teams).
   */
  numTeams?: number;
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
 * Get the effective handicap used for *balancing math*, substituting the
 * population mean when a player has no handicap. This keeps null-handicap
 * players from anchoring the bottom of the sort and from skewing team
 * averages toward zero during local search.
 */
function getBalancingHandicap(player: TeamPlayer, fallbackMean: number): number {
  return player.handicap ?? fallbackMean;
}

/**
 * Compute the mean handicap across all players with a known handicap. Falls
 * back to 0 when no player has one set.
 */
function computeHandicapMean(players: readonly TeamPlayer[]): number {
  const known = players
    .map((p) => p.handicap)
    .filter((h): h is number => typeof h === 'number');
  if (known.length === 0) return 0;
  return known.reduce((sum, h) => sum + h, 0) / known.length;
}

/**
 * Compute each team's average balancing handicap in the same order as `teams`.
 */
function teamAverages<T extends TeamPlayer>(
  teams: readonly GeneratedTeam<T>[],
  fallbackMean: number
): number[] {
  return teams.map((team) => {
    if (team.members.length === 0) return 0;
    const total = team.members.reduce(
      (sum, m) => sum + getBalancingHandicap(m, fallbackMean),
      0
    );
    return total / team.members.length;
  });
}

/**
 * Return the spread (max avg - min avg) across a list of team averages.
 */
function spreadOf(averages: readonly number[]): number {
  if (averages.length < 2) return 0;
  return Math.max(...averages) - Math.min(...averages);
}

/**
 * Optimise an existing team assignment in place by swapping a player between
 * any two teams when the swap reduces the overall handicap spread. Repeats
 * until no improving swap exists (or a safety cap is reached).
 *
 * Snake draft alone leaves visible imbalance on clustered inputs. This 2-opt
 * pass exhaustively considers every (team_a, team_b, member_a, member_b)
 * combination per iteration — O(T² × S²) where T is team count and S is max
 * team size. Both are small in practice (≤ 20 teams, ≤ 4 members), so this
 * runs in microseconds.
 *
 * Returns when no swap improves the spread, or after 100 iterations as a
 * safety guard against pathological inputs.
 */
function optimiseByPairwiseSwap<T extends TeamPlayer>(
  teams: GeneratedTeam<T>[],
  fallbackMean: number
): void {
  const MAX_ITERATIONS = 100;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const averages = teamAverages(teams, fallbackMean);
    const currentSpread = spreadOf(averages);
    if (currentSpread === 0) return;

    let bestSpread = currentSpread;
    let bestA = -1;
    let bestB = -1;
    let bestAi = -1;
    let bestBi = -1;

    for (let a = 0; a < teams.length; a++) {
      const teamA = teams[a];
      const sizeA = teamA.members.length;
      if (sizeA === 0) continue;

      for (let b = a + 1; b < teams.length; b++) {
        const teamB = teams[b];
        const sizeB = teamB.members.length;
        if (sizeB === 0) continue;

        for (let ai = 0; ai < sizeA; ai++) {
          // Null-handicap players are immovable during optimisation. Their
          // effective handicap is only a mean substitution, so swapping them
          // would game the spread metric while increasing uncertainty on the
          // receiving team. We spread them round-robin pre-optimisation and
          // keep them put.
          if (teamA.members[ai].handicap == null) continue;
          for (let bi = 0; bi < sizeB; bi++) {
            if (teamB.members[bi].handicap == null) continue;
            const hA = getBalancingHandicap(teamA.members[ai], fallbackMean);
            const hB = getBalancingHandicap(teamB.members[bi], fallbackMean);
            if (hA === hB) continue; // swap would be a no-op

            const candidate = averages.slice();
            candidate[a] = averages[a] + (hB - hA) / sizeA;
            candidate[b] = averages[b] + (hA - hB) / sizeB;
            const candidateSpread = spreadOf(candidate);

            if (candidateSpread < bestSpread) {
              bestSpread = candidateSpread;
              bestA = a;
              bestB = b;
              bestAi = ai;
              bestBi = bi;
            }
          }
        }
      }
    }

    if (bestA === -1) return; // converged

    const a = teams[bestA];
    const b = teams[bestB];
    const tmp = a.members[bestAi];
    a.members[bestAi] = b.members[bestBi];
    b.members[bestBi] = tmp;
  }
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

  const { teamSize, balanceByHandicap, numTeams: requestedTeams } = config;

  const fallbackMean = computeHandicapMean(players);

  // Null-handicap players are handled in a second pass: we draft the known-
  // handicap players first (sorted), then distribute null players one per
  // team round-robin. If we sorted nulls alongside knowns (even with a mean
  // substitution), stable ordering would cluster them into the same team.
  let knownPlayers: T[];
  let nullPlayers: T[];
  if (balanceByHandicap) {
    knownPlayers = players.filter((p) => p.handicap != null);
    nullPlayers = players.filter((p) => p.handicap == null);
    knownPlayers.sort((a, b) => getEffectiveHandicap(a) - getEffectiveHandicap(b));
  } else {
    knownPlayers = [...players];
    nullPlayers = [];
  }

  // Team count: caller-provided override wins, otherwise derive from teamSize
  const totalPlayers = players.length;
  const numTeams =
    requestedTeams && requestedTeams > 0
      ? Math.min(requestedTeams, totalPlayers)
      : Math.ceil(totalPlayers / teamSize);

  // Initialize teams
  const teams: GeneratedTeam<T>[] = Array.from({ length: numTeams }, (_, i) => ({
    name: `Team ${i + 1}`,
    members: [] as T[],
  }));

  // Snake draft assignment for known-handicap players.
  // Round 0 (even): 0, 1, 2, 3 (forward)
  // Round 1 (odd):  3, 2, 1, 0 (reverse)
  knownPlayers.forEach((player, index) => {
    const round = Math.floor(index / numTeams);
    const positionInRound = index % numTeams;

    const teamIndex =
      round % 2 === 0
        ? positionInRound
        : numTeams - 1 - positionInRound;

    teams[teamIndex].members.push(player);
  });

  // Distribute null-handicap players one per team, round-robin. Starting
  // team rotates based on known-player count to avoid oversizing team 0.
  nullPlayers.forEach((player, index) => {
    const teamIndex = (knownPlayers.length + index) % numTeams;
    teams[teamIndex].members.push(player);
  });

  // Post-pass: pairwise-swap local search to drive handicap spread toward its
  // minimum. Snake draft alone leaves visible imbalance on adversarial inputs
  // (e.g. clustered high + low handicaps); this converges toward equal averages.
  if (balanceByHandicap && numTeams > 1) {
    optimiseByPairwiseSwap(teams, fallbackMean);
  }

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

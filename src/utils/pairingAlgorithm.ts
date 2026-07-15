/**
 * Pairing Algorithm
 * Snake draft algorithm for generating balanced player groupings with tee times
 */

import type {
  PairingGroup,
  PairingPlayer,
  GeneratePairingsOptions,
  GeneratePairingsResult,
} from '@/types';
import type { TeamFormat } from '@/types/database.types';
import { indexById } from '@/utils/collections';
import { MAX_HANDICAP } from '@/constants/scoring';
import { formatTime } from './formatting';

/**
 * The grouping shape that a round type implies.
 *
 * - 'team-together'  → each team plays as one tee group (scramble).
 * - 'team-balanced'  → cross-team split within each group (team round
 *                      with individual-style scoring, e.g. Stableford).
 * - 'snake-draft'    → handicap-balanced groups for non-team rounds.
 * - 'none'           → groups are driven by sub-matches, not by a
 *                      separate shuffle (split round_format).
 */
export type GroupingStrategy =
  | 'team-together'
  | 'team-balanced'
  | 'snake-draft'
  | 'none';

/**
 * Decide which grouping algorithm a round should use.
 *
 * The mapping is intrinsic to the round's type — organisers don't pick
 * a grouping shape separately from the round type. Callers should use
 * this to drive both the "Shuffle groups" UI (hidden for `team-together`
 * and `none`) and the algorithm dispatch inside shuffle handlers.
 */
export function pickGroupingStrategy({
  teamFormat,
  isSplitRound,
  isTeamRound,
  teamCount,
  isIndividualCompetition = false,
}: {
  teamFormat: TeamFormat | null | undefined;
  isSplitRound: boolean;
  isTeamRound: boolean;
  teamCount: number;
  /** True when the round belongs to a competition with `team_mode = 'none'`.
   *  Individual competitions have no team rosters, so any team config left on
   *  a round (e.g. a team preset applied before the team_mode was set) must be
   *  ignored — players are simply split into random, handicap-balanced groups. */
  isIndividualCompetition?: boolean;
}): GroupingStrategy {
  // Split rounds: tee groups come from the sub-matches table — no
  // separate group shuffle at this level. TODO: regenerate pairings on
  // preset change (see src/services/rounds/applyPresetToRound.ts).
  if (isSplitRound) return 'none';
  // Individual competitions never group by team — bypass any stray team
  // format/flags on the round and fall through to the snake draft below.
  if (isIndividualCompetition) return 'snake-draft';
  // Scramble: whole team plays one ball → teammates MUST share a group.
  if (teamFormat === 'scramble') return 'team-together';
  // Any other team round with 2+ rostered teams → balanced cross-team mix.
  if (isTeamRound && teamCount >= 2) return 'team-balanced';
  // No team context → handicap-balanced snake draft over everyone.
  return 'snake-draft';
}

export interface GenerateTeamBalancedGroupsOptions {
  /** One entry per team, holding that team's players. Team order is preserved
   *  in each resulting group (team 0 slots first, then team 1, …). */
  teamPlayers: PairingPlayer[][];
  /** Players per physical tee group (typically 4). */
  groupSize: number;
  /** Start tee time HH:MM. */
  startTime: string;
  /** Minutes between tee groups. */
  intervalMinutes: number;
}

export interface GenerateTeamBalancedGroupsResult {
  groups: PairingGroup[];
  warnings: string[];
}

export interface GenerateTeamTogetherGroupsOptions {
  /** One entry per team, holding that team's players. Each team becomes one
   *  or more groups in input order. */
  teamPlayers: PairingPlayer[][];
  /** Start tee time HH:MM. */
  startTime: string;
  /** Minutes between tee groups. */
  intervalMinutes: number;
  /** Max players per physical tee group. Teams larger than this are split
   *  into successive chunks of this size. Defaults to 4 (foursome limit). */
  maxGroupSize?: number;
}

export interface GenerateTeamTogetherGroupsResult {
  groups: PairingGroup[];
  warnings: string[];
}

/**
 * Fisher-Yates shuffle within contiguous tiers of a handicap-sorted array.
 *
 * Used by the snake-draft generators so repeated "Shuffle groups" calls
 * produce different player-to-group assignments while preserving the
 * skill-balance invariant (each group still receives one player from
 * each tier). Tier size matches the number of groups — one player per
 * tier per group, which is what the snake pattern consumes per round.
 *
 * Pure with respect to the input array (returns a new array). Uses
 * Math.random(); callers that need determinism should swap in a seeded
 * RNG via a parameter — not needed today.
 */
function shuffleWithinTiers<T>(sorted: readonly T[], tierSize: number): T[] {
  if (tierSize < 2 || sorted.length < 2) return [...sorted];
  const result: T[] = [];
  for (let i = 0; i < sorted.length; i += tierSize) {
    const tier = sorted.slice(i, i + tierSize);
    for (let j = tier.length - 1; j > 0; j -= 1) {
      const k = Math.floor(Math.random() * (j + 1));
      [tier[j], tier[k]] = [tier[k], tier[j]];
    }
    result.push(...tier);
  }
  return result;
}

/**
 * Generate pairings using a snake draft algorithm.
 * Players are sorted by handicap and distributed in a snake pattern
 * to create balanced groups with mixed skill levels.
 *
 * Snake pattern example with 12 players in groups of 4:
 * - Sort by handicap: P1 (best) -> P12 (worst)
 * - Round 1: Group 1 gets P1, Group 2 gets P2, Group 3 gets P3
 * - Round 2: Group 3 gets P4, Group 2 gets P5, Group 1 gets P6
 * - Round 3: Group 1 gets P7, Group 2 gets P8, Group 3 gets P9
 * - Round 4: Group 3 gets P10, Group 2 gets P11, Group 1 gets P12
 *
 * Result:
 * - Group 1: P1, P6, P7, P12 (best + mid + mid + worst)
 * - Group 2: P2, P5, P8, P11
 * - Group 3: P3, P4, P9, P10
 */
export function generateSnakeDraftPairings(
  options: GeneratePairingsOptions
): GeneratePairingsResult {
  const { players, groupSize = 4, startTime, intervalMinutes } = options;

  const warnings: string[] = [];

  // Handle edge cases
  if (players.length === 0) {
    return {
      groups: [],
      warnings: ['No players to pair'],
      groupCount: 0,
      playerCount: 0,
    };
  }

  if (players.length < 2) {
    return {
      groups: [],
      warnings: ['Need at least 2 players to create a group'],
      groupCount: 0,
      playerCount: 0,
    };
  }

  // Sort players by handicap (low to high, nulls at end)
  const sortedPlayers = [...players].sort((a, b) => {
    const handicapA = a.handicap ?? MAX_HANDICAP; // Max handicap for nulls
    const handicapB = b.handicap ?? MAX_HANDICAP;
    return handicapA - handicapB;
  });

  // Calculate number of groups needed
  const numGroups = Math.ceil(sortedPlayers.length / groupSize);

  // Randomize within handicap tiers so repeated shuffles produce
  // different arrangements. Each tier holds `numGroups` players — one
  // per group per snake-draft round — so skill balance is preserved.
  const draftOrder = shuffleWithinTiers(sortedPlayers, numGroups);

  // Initialize empty groups
  const groups: PairingPlayer[][] = Array.from({ length: numGroups }, () => []);

  // Snake draft assignment
  let currentGroup = 0;
  let direction = 1; // 1 = forward, -1 = backward

  for (const player of draftOrder) {
    groups[currentGroup].push(player);

    // Move to next group using snake pattern
    currentGroup += direction;

    // Reverse direction at ends
    if (currentGroup >= numGroups) {
      currentGroup = numGroups - 1;
      direction = -1;
    } else if (currentGroup < 0) {
      currentGroup = 0;
      direction = 1;
    }
  }

  // Calculate tee times and convert to PairingGroup format
  const pairingGroups: PairingGroup[] = groups.map((groupPlayers, index) => ({
    playerIds: groupPlayers.map((p) => p.id),
    teeTime: calculateTeeTime(startTime, intervalMinutes, index),
    slotIndex: index,
  }));

  // Generate warnings for small groups
  pairingGroups.forEach((group, index) => {
    const size = group.playerIds.length;
    if (size < groupSize && size < 4) {
      warnings.push(
        `Group ${index + 1} has ${size} player${size === 1 ? '' : 's'} (smaller than target of ${groupSize})`
      );
    }
  });

  // Warn if any group has only 1 player (shouldn't happen with valid input)
  const singlePlayerGroups = pairingGroups.filter((g) => g.playerIds.length === 1);
  if (singlePlayerGroups.length > 0) {
    warnings.push('Some groups have only 1 player - consider redistributing');
  }

  return {
    groups: pairingGroups,
    warnings,
    groupCount: pairingGroups.length,
    playerCount: sortedPlayers.length,
  };
}

/**
 * Calculate tee time for a group slot.
 *
 * @param startTime - Start time in HH:MM format
 * @param intervalMinutes - Minutes between groups
 * @param slotIndex - 0-based slot index
 * @returns Tee time in HH:MM format
 */
export function calculateTeeTime(
  startTime: string,
  intervalMinutes: number,
  slotIndex: number
): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + slotIndex * intervalMinutes;

  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

/**
 * Calculate the recommended number of groups based on player count.
 *
 * @param playerCount - Number of players
 * @param preferredGroupSize - Preferred group size (default 4)
 * @returns Recommended number of groups
 */
export function calculateRecommendedGroupCount(
  playerCount: number,
  preferredGroupSize: number = 4
): number {
  if (playerCount === 0) return 0;
  return Math.ceil(playerCount / preferredGroupSize);
}

/**
 * Determine optimal group sizes for a given player count.
 * Tries to create groups of the preferred size, with smaller groups
 * (3 or 2) when needed to accommodate all players.
 *
 * @param playerCount - Number of players
 * @param preferredGroupSize - Preferred group size (default 4)
 * @returns Array of group sizes
 *
 * @example
 * getOptimalGroupSizes(12, 4) // [4, 4, 4]
 * getOptimalGroupSizes(10, 4) // [4, 3, 3]
 * getOptimalGroupSizes(7, 4)  // [4, 3]
 * getOptimalGroupSizes(5, 4)  // [3, 2]
 */
export function getOptimalGroupSizes(
  playerCount: number,
  preferredGroupSize: number = 4
): number[] {
  if (playerCount === 0) return [];
  if (playerCount <= preferredGroupSize) return [playerCount];

  const numGroups = Math.ceil(playerCount / preferredGroupSize);
  const sizes: number[] = [];

  let remaining = playerCount;
  for (let i = 0; i < numGroups; i++) {
    const groupsLeft = numGroups - i;
    const avgSize = Math.ceil(remaining / groupsLeft);
    const size = Math.min(avgSize, preferredGroupSize, remaining);
    sizes.push(size);
    remaining -= size;
  }

  // Sort descending so larger groups go first
  return sizes.sort((a, b) => b - a);
}

/**
 * Format a tee time for display.
 *
 * @param teeTime - Tee time in HH:MM format (24-hour)
 * @returns Formatted time string (e.g., "7:00 AM")
 */
export function formatTeeTimeForDisplay(teeTime: string | null): string {
  return formatTime(teeTime) ?? 'TBD';
}

/**
 * Parse a display time back to HH:MM format.
 *
 * @param displayTime - Time in display format (e.g., "7:00 AM")
 * @returns Time in HH:MM format (24-hour)
 */
export function parseDisplayTimeToTeeTime(displayTime: string): string {
  const match = displayTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return '07:00';

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Validate pairing groups.
 *
 * @param groups - Array of pairing groups
 * @param availablePlayerIds - Set of valid player IDs
 * @returns Validation result with errors
 */
export function validatePairingGroups(
  groups: PairingGroup[],
  availablePlayerIds: Set<string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const assignedPlayers = new Set<string>();

  groups.forEach((group, index) => {
    const groupNum = index + 1;

    // Check group size
    if (group.playerIds.length < 2) {
      errors.push(`Group ${groupNum} has fewer than 2 players`);
    }
    if (group.playerIds.length > 4) {
      errors.push(`Group ${groupNum} has more than 4 players`);
    }

    // Check for valid and unique player assignments
    group.playerIds.forEach((playerId) => {
      if (!availablePlayerIds.has(playerId)) {
        errors.push(`Group ${groupNum} contains invalid player ID: ${playerId}`);
      }
      if (assignedPlayers.has(playerId)) {
        errors.push(`Player ${playerId} is assigned to multiple groups`);
      }
      assignedPlayers.add(playerId);
    });
  });

  // Check for unassigned players
  availablePlayerIds.forEach((playerId) => {
    if (!assignedPlayers.has(playerId)) {
      errors.push(`Player ${playerId} is not assigned to any group`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Move a player from one group to another.
 *
 * @param groups - Current groups
 * @param playerId - Player to move
 * @param targetGroupIndex - Target group index
 * @returns Updated groups (new array)
 */
export function movePlayerToGroup(
  groups: PairingGroup[],
  playerId: string,
  targetGroupIndex: number
): PairingGroup[] {
  const updatedGroups = groups.map((group, index) => {
    // Remove player from current group
    if (group.playerIds.includes(playerId)) {
      return {
        ...group,
        playerIds: group.playerIds.filter((id) => id !== playerId),
      };
    }

    // Add player to target group
    if (index === targetGroupIndex) {
      return {
        ...group,
        playerIds: [...group.playerIds, playerId],
      };
    }

    return group;
  });

  // Filter out empty groups
  return updatedGroups.filter((group) => group.playerIds.length > 0);
}

/**
 * Add a player to a specific group.
 *
 * @param groups - Current groups
 * @param playerId - Player to add
 * @param groupIndex - Target group index
 * @returns Updated groups (new array)
 */
export function addPlayerToGroup(
  groups: PairingGroup[],
  playerId: string,
  groupIndex: number
): PairingGroup[] {
  return groups.map((group, index) => {
    if (index === groupIndex) {
      return {
        ...group,
        playerIds: [...group.playerIds, playerId],
      };
    }
    return group;
  });
}

/**
 * Remove a player from their group.
 *
 * @param groups - Current groups
 * @param playerId - Player to remove
 * @returns Updated groups (new array, empty groups removed)
 */
export function removePlayerFromGroups(
  groups: PairingGroup[],
  playerId: string
): PairingGroup[] {
  const updatedGroups = groups.map((group) => ({
    ...group,
    playerIds: group.playerIds.filter((id) => id !== playerId),
  }));

  // Filter out empty groups
  return updatedGroups.filter((group) => group.playerIds.length > 0);
}

/**
 * Create a new empty group at the end.
 *
 * @param groups - Current groups
 * @param startTime - Start tee time
 * @param intervalMinutes - Interval between groups
 * @returns Updated groups with new empty group
 */
export function addEmptyGroup(
  groups: PairingGroup[],
  startTime: string,
  intervalMinutes: number
): PairingGroup[] {
  const newSlotIndex = groups.length;
  const newGroup: PairingGroup = {
    playerIds: [],
    teeTime: calculateTeeTime(startTime, intervalMinutes, newSlotIndex),
    slotIndex: newSlotIndex,
  };

  return [...groups, newGroup];
}

/**
 * Recalculate tee times for all groups based on config.
 *
 * @param groups - Current groups
 * @param startTime - Start tee time
 * @param intervalMinutes - Interval between groups
 * @returns Updated groups with recalculated tee times
 */
export function recalculateTeeTimes(
  groups: PairingGroup[],
  startTime: string,
  intervalMinutes: number
): PairingGroup[] {
  return groups.map((group, index) => ({
    ...group,
    teeTime: calculateTeeTime(startTime, intervalMinutes, index),
    slotIndex: index,
  }));
}

// =====================================================
// Sub-match generation for split team rounds
// =====================================================

export interface GenerateSubMatchesOptions {
  /** Players on team A, in any order (sorted internally by handicap) */
  teamAPlayers: PairingPlayer[];
  /** Players on team B */
  teamBPlayers: PairingPlayer[];
  /** Players per sub-team (1 = 1v1, 2 = 2v2, etc.). UI enforces divisors
   *  of the team size; DB check constraint caps at 10. */
  subMatchSize: number;
  /** Start tee time HH:MM */
  startTime: string;
  /** Minutes between tee groups */
  intervalMinutes: number;
  /**
   * Optional override of team A's player order. When provided, the snake-draft
   * is bypassed and players are bucketed into sub-teams in the given order
   * (slots of `subMatchSize`). Used by `pairing_source='current_standings'`
   * rounds where the order is already determined by competition standings.
   *
   * Must contain exactly the same player IDs as `teamAPlayers` (any order
   * mismatch falls back to handicap snake-draft for safety).
   */
  preOrderedTeamA?: string[];
  /** See `preOrderedTeamA`. */
  preOrderedTeamB?: string[];
}

export interface GeneratedSubMatch {
  /** 0-based position within the round */
  sortOrder: number;
  /** Sub-team A player IDs (1–subMatchSize, smaller in remainder sub-match) */
  teamAPlayerIds: string[];
  /** Sub-team B player IDs */
  teamBPlayerIds: string[];
  /** Tee time HH:MM */
  teeTime: string;
  /** Sub-team A player details (for preview UI) */
  teamAPlayers: PairingPlayer[];
  /** Sub-team B player details */
  teamBPlayers: PairingPlayer[];
}

export interface GenerateSubMatchesResult {
  subMatches: GeneratedSubMatch[];
  warnings: string[];
}

/**
 * Bucket a team's players into sub-teams using a caller-supplied id order
 * (e.g. competition standings rank). Slots fill `subMatchSize` at a time —
 * `[id1, id2, id3, id4]` with size 2 → `[[p1,p2], [p3,p4]]`.
 *
 * Returns `null` when the supplied order doesn't exactly match the player
 * roster, so the caller can fall back to handicap snake-draft.
 */
function bucketByOrder(
  players: PairingPlayer[],
  orderedIds: string[],
  subMatchSize: number
): PairingPlayer[][] | null {
  if (orderedIds.length !== players.length) return null;

  const byId = indexById(players);
  const ordered: PairingPlayer[] = [];
  for (const id of orderedIds) {
    const player = byId.get(id);
    if (!player) return null;
    ordered.push(player);
  }

  const subTeams: PairingPlayer[][] = [];
  for (let i = 0; i < ordered.length; i += subMatchSize) {
    subTeams.push(ordered.slice(i, i + subMatchSize));
  }
  return subTeams;
}

/**
 * Snake-draft a single team into balanced sub-teams.
 *
 * Players are sorted by handicap then distributed so each sub-team gets
 * a mix of skill levels. Mirrors `generateSnakeDraftPairings` for a single
 * side. The last sub-team absorbs any remainder (e.g. 5 players, size 2 →
 * sizes [2, 2, 1]).
 */
function snakeDraftSubTeams(
  players: PairingPlayer[],
  subMatchSize: number
): PairingPlayer[][] {
  if (players.length === 0) return [];

  const sorted = [...players].sort((a, b) => {
    const ha = a.handicap ?? MAX_HANDICAP;
    const hb = b.handicap ?? MAX_HANDICAP;
    return ha - hb;
  });

  const numSubTeams = Math.max(1, Math.ceil(sorted.length / subMatchSize));
  const subTeams: PairingPlayer[][] = Array.from({ length: numSubTeams }, () => []);

  let idx = 0;
  let dir = 1;
  for (const p of sorted) {
    subTeams[idx].push(p);
    idx += dir;
    if (idx >= numSubTeams) {
      idx = numSubTeams - 1;
      dir = -1;
    } else if (idx < 0) {
      idx = 0;
      dir = 1;
    }
  }

  // Sort sub-teams by size descending so any remainder (smaller group) is
  // always the last sub-match. Matches the UX spec — users expect "sub-match
  // N is the smaller/odd one" rather than the snake-draft's natural ordering
  // which can push the remainder to the front.
  subTeams.sort((a, b) => b.length - a.length);

  return subTeams;
}

/**
 * Generate balanced sub-matches for a split team round.
 *
 * Algorithm:
 *   1. Snake-draft each team by handicap into sub-teams of the requested
 *      size. Remainder (last sub-team) may be smaller.
 *   2. Pair sub-team 1 of A vs sub-team 1 of B, sub-team 2 of A vs sub-team 2
 *      of B, etc. Ranked matching keeps competitive balance across matchups.
 *   3. Assign staggered tee times by sort order using `calculateTeeTime`.
 *
 * Uneven team sizes are allowed but will produce a 1v2 (or similar)
 * remainder sub-match — callers should surface a warning.
 */
export function generateSubMatches(
  options: GenerateSubMatchesOptions
): GenerateSubMatchesResult {
  const {
    teamAPlayers,
    teamBPlayers,
    subMatchSize,
    startTime,
    intervalMinutes,
    preOrderedTeamA,
    preOrderedTeamB,
  } = options;
  const warnings: string[] = [];

  if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
    return {
      subMatches: [],
      warnings: ['Both teams need at least one player'],
    };
  }

  const subTeamsA = preOrderedTeamA
    ? bucketByOrder(teamAPlayers, preOrderedTeamA, subMatchSize) ??
      snakeDraftSubTeams(teamAPlayers, subMatchSize)
    : snakeDraftSubTeams(teamAPlayers, subMatchSize);
  const subTeamsB = preOrderedTeamB
    ? bucketByOrder(teamBPlayers, preOrderedTeamB, subMatchSize) ??
      snakeDraftSubTeams(teamBPlayers, subMatchSize)
    : snakeDraftSubTeams(teamBPlayers, subMatchSize);

  const numSubMatches = Math.max(subTeamsA.length, subTeamsB.length);

  // Pad short side with empty arrays so zip doesn't drop rows; empty sub-team
  // means the opposing side effectively wins by forfeit. Callers should never
  // hit this in practice because both teams are required to have ≥1 player.
  while (subTeamsA.length < numSubMatches) subTeamsA.push([]);
  while (subTeamsB.length < numSubMatches) subTeamsB.push([]);

  const subMatches: GeneratedSubMatch[] = subTeamsA.map((aSide, i) => {
    const bSide = subTeamsB[i];
    return {
      sortOrder: i,
      teamAPlayerIds: aSide.map((p) => p.id),
      teamBPlayerIds: bSide.map((p) => p.id),
      teeTime: calculateTeeTime(startTime, intervalMinutes, i),
      teamAPlayers: aSide,
      teamBPlayers: bSide,
    };
  });

  // Warn when the final sub-match is uneven (e.g. remainder 1v2)
  if (numSubMatches > 0) {
    const last = subMatches[numSubMatches - 1];
    if (last.teamAPlayerIds.length !== last.teamBPlayerIds.length) {
      warnings.push(
        `Sub-match ${numSubMatches} is uneven (${last.teamAPlayerIds.length}v${last.teamBPlayerIds.length}) — team sizes do not divide evenly`
      );
    }
    if (
      last.teamAPlayerIds.length < subMatchSize ||
      last.teamBPlayerIds.length < subMatchSize
    ) {
      warnings.push(
        `Sub-match ${numSubMatches} is smaller than the requested ${subMatchSize}v${subMatchSize}`
      );
    }
  }

  return { subMatches, warnings };
}

/**
 * All positive divisors of `n` in ascending order.
 *
 * Used to derive the valid sub-match size options for a split round from
 * the team size — e.g. a 4-player team can split into 1v1 (4 matches),
 * 2v2 (2 matches), or 4v4 (1 match). Returns `[]` for non-positive input.
 */
export function divisorsOf(n: number): number[] {
  if (!Number.isFinite(n) || n < 1) return [];
  const result: number[] = [];
  for (let i = 1; i <= n; i += 1) {
    if (n % i === 0) result.push(i);
  }
  return result;
}

/**
 * Generate tee groups that keep teams evenly represented in each group.
 *
 * Algorithm:
 *   1. Decide how many groups to make: ceil(totalPlayers / groupSize).
 *   2. Snake-draft each team independently by handicap into that many
 *      buckets, so within a team the skill is balanced across groups.
 *   3. Concatenate bucket `i` across every team to form physical group `i`.
 *      Each group ends up with the same share of every team.
 *
 * Examples:
 *   - 2 teams of 4, groupSize 4 → 2 groups of (2 from A + 2 from B) = 4.
 *   - 2 teams of 3, groupSize 4 → group 1 = (2+2) = 4, group 2 = (1+1) = 2.
 *   - 2 teams of 5, groupSize 4 → groups of 4, 4, 2.
 *
 * Unbalanced team rosters or group sizes that don't divide evenly are
 * surfaced via `warnings` so the caller can show an inline note.
 */
export function generateTeamBalancedGroups(
  options: GenerateTeamBalancedGroupsOptions
): GenerateTeamBalancedGroupsResult {
  const { teamPlayers, groupSize, startTime, intervalMinutes } = options;
  const warnings: string[] = [];

  const nonEmptyTeams = teamPlayers.filter((t) => t.length > 0);
  const totalPlayers = nonEmptyTeams.reduce((acc, t) => acc + t.length, 0);

  if (nonEmptyTeams.length < 2) {
    warnings.push('Need at least two teams with players for team-balanced groups');
    return { groups: [], warnings };
  }
  if (groupSize < 2) {
    warnings.push('Group size must be at least 2');
    return { groups: [], warnings };
  }

  const numGroups = Math.max(1, Math.ceil(totalPlayers / groupSize));

  // Snake-draft each team by handicap into `numGroups` buckets. The draft
  // direction alternates between teams so the strongest player on team A
  // and the strongest on team B don't always land together in group 0.
  // Within each team we shuffle within handicap tiers first so repeated
  // shuffles swap which teammate lands in which group while preserving
  // the per-group skill balance.
  const teamBuckets: PairingPlayer[][][] = nonEmptyTeams.map((players, teamIdx) => {
    const sorted = [...players].sort((a, b) => {
      const ha = a.handicap ?? MAX_HANDICAP;
      const hb = b.handicap ?? MAX_HANDICAP;
      return ha - hb;
    });
    const draftOrder = shuffleWithinTiers(sorted, numGroups);
    const buckets: PairingPlayer[][] = Array.from({ length: numGroups }, () => []);
    let idx = teamIdx % 2 === 0 ? 0 : numGroups - 1;
    let dir = teamIdx % 2 === 0 ? 1 : -1;
    for (const p of draftOrder) {
      buckets[idx].push(p);
      const next = idx + dir;
      if (next >= numGroups) {
        dir = -1;
        idx = numGroups - 1;
      } else if (next < 0) {
        dir = 1;
        idx = 0;
      } else {
        idx = next;
      }
    }
    return buckets;
  });

  const groups: PairingGroup[] = [];
  for (let i = 0; i < numGroups; i += 1) {
    const playerIds: string[] = [];
    for (const buckets of teamBuckets) {
      for (const p of buckets[i]) playerIds.push(p.id);
    }
    groups.push({
      playerIds,
      teeTime: calculateTeeTime(startTime, intervalMinutes, i),
      slotIndex: i,
    });
  }

  const sizes = groups.map((g) => g.playerIds.length);
  if (sizes.length > 0 && Math.max(...sizes) - Math.min(...sizes) > 1) {
    warnings.push(
      'Groups have uneven sizes — team rosters do not split evenly for this group size'
    );
  }
  if (sizes.some((s) => s > groupSize)) {
    warnings.push(
      `At least one group exceeds the requested size of ${groupSize}`
    );
  }

  return { groups, warnings };
}

/**
 * Generate one on-course tee group per team — teammates stay together.
 *
 * Used for formats where the whole team plays as a single unit on a hole
 * (e.g. Team Scramble: all 4 members play from the best shot of the four).
 * Unlike `generateTeamBalancedGroups`, this does NOT interleave teams —
 * Team A's players land in one group, Team B's in the next.
 *
 * Teams larger than `maxGroupSize` (default 4, foursome limit) are split
 * into successive chunks; a warning is emitted so the UI can surface the
 * unusual shape. Empty teams are skipped.
 */
export function generateTeamTogetherGroups(
  options: GenerateTeamTogetherGroupsOptions
): GenerateTeamTogetherGroupsResult {
  const { teamPlayers, startTime, intervalMinutes, maxGroupSize = 4 } = options;
  const warnings: string[] = [];

  if (maxGroupSize < 2) {
    warnings.push('Group size must be at least 2');
    return { groups: [], warnings };
  }

  const nonEmptyTeams = teamPlayers.filter((t) => t.length > 0);
  if (nonEmptyTeams.length === 0) {
    warnings.push('No teams with players for team-together groups');
    return { groups: [], warnings };
  }

  const groups: PairingGroup[] = [];
  let slotIndex = 0;
  nonEmptyTeams.forEach((team, teamIdx) => {
    if (team.length > maxGroupSize) {
      warnings.push(
        `Team ${teamIdx + 1} has ${team.length} players — split across multiple groups to respect the ${maxGroupSize}-player tee group limit`
      );
    }
    for (let i = 0; i < team.length; i += maxGroupSize) {
      const chunk = team.slice(i, i + maxGroupSize);
      groups.push({
        playerIds: chunk.map((p) => p.id),
        teeTime: calculateTeeTime(startTime, intervalMinutes, slotIndex),
        slotIndex,
      });
      slotIndex += 1;
    }
  });

  return { groups, warnings };
}

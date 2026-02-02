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
    const handicapA = a.handicap ?? 54; // Max handicap for nulls
    const handicapB = b.handicap ?? 54;
    return handicapA - handicapB;
  });

  // Calculate number of groups needed
  const numGroups = Math.ceil(sortedPlayers.length / groupSize);

  // Initialize empty groups
  const groups: PairingPlayer[][] = Array.from({ length: numGroups }, () => []);

  // Snake draft assignment
  let currentGroup = 0;
  let direction = 1; // 1 = forward, -1 = backward

  for (const player of sortedPlayers) {
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
  if (!teeTime) return 'TBD';

  const [hours, minutes] = teeTime.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
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

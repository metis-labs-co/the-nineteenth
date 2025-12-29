// src/components/teams/teamAlgorithms.ts
import type { Player, TeamWithMembers } from '@/types/database.types';

/**
 * Handicap balance quality indicator
 */
export type BalanceQuality = 'good' | 'fair' | 'poor';

/**
 * Calculate average handicap for a team
 */
export const calculateTeamHandicap = (members: { player?: Player }[]): number => {
  const handicaps = members
    .map((m) => m.player?.handicap ?? 0)
    .filter((h): h is number => typeof h === 'number');

  if (handicaps.length === 0) return 0;
  return handicaps.reduce((sum, h) => sum + h, 0) / handicaps.length;
};

/**
 * Calculate handicap spread across all teams
 * Returns the difference between highest and lowest team average
 */
export const calculateHandicapSpread = (teams: TeamWithMembers[]): number => {
  if (teams.length < 2) return 0;

  const averages = teams.map((team) => calculateTeamHandicap(team.members));
  const maxAvg = Math.max(...averages);
  const minAvg = Math.min(...averages);

  return maxAvg - minAvg;
};

/**
 * Determine balance quality based on handicap spread
 * - good: spread <= 3 (well balanced teams)
 * - fair: spread <= 6 (reasonable balance)
 * - poor: spread > 6 (needs adjustment)
 */
export const getBalanceQuality = (spread: number): BalanceQuality => {
  if (spread <= 3) return 'good';
  if (spread <= 6) return 'fair';
  return 'poor';
};

/**
 * Get initials for avatar fallback
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Check if all players are assigned to teams
 */
export const areAllPlayersAssigned = (teams: TeamWithMembers[], totalPlayers: number): boolean => {
  const assignedCount = teams.reduce((sum, team) => sum + team.members.length, 0);
  return assignedCount >= totalPlayers;
};

/**
 * Swap two players between teams
 * Returns a new array of teams with the players swapped
 */
export const swapPlayers = (
  teams: TeamWithMembers[],
  sourceTeamIndex: number,
  sourceMemberIndex: number,
  targetTeamIndex: number,
  targetMemberIndex: number
): TeamWithMembers[] => {
  const newTeams = [...teams];

  // Get the two players
  const player1 = newTeams[sourceTeamIndex].members[sourceMemberIndex];
  const player2 = newTeams[targetTeamIndex].members[targetMemberIndex];

  // Swap them
  newTeams[sourceTeamIndex] = {
    ...newTeams[sourceTeamIndex],
    members: newTeams[sourceTeamIndex].members.map((m, i) =>
      i === sourceMemberIndex ? player2 : m
    ),
  };
  newTeams[targetTeamIndex] = {
    ...newTeams[targetTeamIndex],
    members: newTeams[targetTeamIndex].members.map((m, i) =>
      i === targetMemberIndex ? player1 : m
    ),
  };

  return newTeams;
};

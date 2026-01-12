/**
 * Type definitions for TeamMatchPlayScoringScreen
 *
 * Extends patterns from MatchPlayScoringScreen for team-based match play.
 */

import type { TeamWithMembers, Player } from '@/types/database';

/**
 * Team data for the match
 */
export interface MatchTeam {
  id: string;
  name: string;
  members: TeamMemberScore[];
  /** Combined team handicap (average or best-ball style) */
  handicap: number;
}

/**
 * Individual team member with their scoring data
 */
export interface TeamMemberScore {
  id: string;
  name: string;
  handicap: number;
  /** Current hole score (null if not entered) */
  score: number | null;
  /** Whether player picked up on this hole */
  pickedUp: boolean;
}

/**
 * Hole result for team match play
 */
export interface TeamHoleResult {
  /** Team 1's total score for the hole */
  team1Score: number | null;
  /** Team 2's total score for the hole */
  team2Score: number | null;
  /** Individual player scores for team 1 */
  team1PlayerScores: Record<string, number | null>;
  /** Individual player scores for team 2 */
  team2PlayerScores: Record<string, number | null>;
  /** Which team won the hole */
  winner: 'team1' | 'team2' | 'halved' | null;
}

/**
 * Overall match status
 */
export type TeamMatchStatus =
  | {
      status: 'in_progress';
      leader: 'team1' | 'team2' | null;
      holesUp: number;
      holesRemaining: number;
    }
  | {
      status: 'complete';
      winner: 'team1' | 'team2' | 'halved';
      margin: string;
    };

/**
 * Per-team match status display
 */
export interface TeamMatchStatusDisplay {
  /** Short text: "1 UP", "2 DN", "AS" */
  text: string;
  /** Full text: "1 Up", "2 Down", "All Square" */
  fullText: string;
  /** Status type for styling */
  type: 'up' | 'down' | 'square' | 'win' | 'loss' | 'halved';
  /** Number of holes up/down (0 for square) */
  holesUpDown: number;
}

/**
 * Team scoring mode - how team scores are calculated
 */
export type TeamScoringMode =
  | 'best_ball' // Best score from team counts
  | 'aggregate' // Sum of all player scores
  | 'combined'; // Combined net score

/**
 * Props for TeamMatchPlayScoringScreen
 */
export interface TeamMatchPlayScoringScreenParams {
  roundId: string;
  team1Id?: string;
  team2Id?: string;
}

/**
 * Transform TeamWithMembers to MatchTeam
 */
export function toMatchTeam(team: TeamWithMembers): MatchTeam {
  const members = (team.members || []).map((m) => ({
    id: m.player_id,
    name: m.player?.name || 'Unknown',
    handicap: m.player?.handicap ?? 0,
    score: null,
    pickedUp: false,
  }));

  // Calculate team handicap as average of member handicaps
  const totalHandicap = members.reduce((sum, m) => sum + m.handicap, 0);
  const avgHandicap = members.length > 0 ? Math.round(totalHandicap / members.length) : 0;

  return {
    id: team.id,
    name: team.name,
    members,
    handicap: avgHandicap,
  };
}

/**
 * Get players from teams as array
 */
export function getPlayersFromTeams(teams: TeamWithMembers[]): Player[] {
  const players: Player[] = [];
  for (const team of teams) {
    for (const member of team.members || []) {
      if (member.player) {
        players.push(member.player);
      }
    }
  }
  return players;
}

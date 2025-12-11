/**
 * API Types
 * Types specific to API operations
 */

import type { GameType, RoundResultData, TeamFormat } from '@/types/database.types';
import type { Player } from '@/types';

/** Input for creating a round */
export interface RoundCreateInput {
  courseName: string;
  courseId?: string;
  date: Date;
  teeTime?: string;
  matchType?: string;
  gameType?: GameType;
  isTeamRound?: boolean;
  teamFormat?: TeamFormat;
  scoringPairsRequired?: boolean;
}

/** Input for creating a team */
export interface TeamCreateInput {
  competitionId: string;
  name: string;
  memberIds?: string[];
}

/** Input for saving round results */
export interface RoundResultInput {
  roundId: string;
  playerId?: string;
  teamId?: string;
  rawScore?: number;
  rawResultData?: RoundResultData;
  position?: number;
  competitionPoints?: number;
  isTeamResult?: boolean;
}

/** Team with members for API responses */
export interface Team {
  id: string;
  competitionId: string;
  name: string;
  members?: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
}

/** Team member for API responses */
export interface TeamMember {
  teamId: string;
  playerId: string;
  joinedAt: Date;
  player?: Player;
}

/** Round result for API responses */
export interface RoundResult {
  id: string;
  roundId: string;
  playerId?: string;
  teamId?: string;
  rawScore?: number;
  rawResultData?: RoundResultData;
  position?: number;
  competitionPoints: number;
  isTeamResult: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Permission check result */
export interface PermissionCheckResult {
  allowed: boolean;
  error?: string;
  currentCount?: number;
  limit?: number;
}

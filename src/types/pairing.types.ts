/**
 * Pairing Types
 * Types for player groupings (pairings) with tee times
 */

import type { Player } from './index';

/**
 * Tee time slot configuration for generating pairing groups
 */
export interface TeeTimeSlotConfig {
  /** Start time in HH:MM format (e.g., "07:00") */
  startTime: string;
  /** Interval between groups in minutes (typically 7-10) */
  intervalMinutes: number;
  /** Number of slots/groups to create */
  numberOfSlots: number;
}

/**
 * A single pairing group with players and tee time
 */
export interface PairingGroup {
  /** UUID - undefined for new/unsaved groups */
  id?: string;
  /** Array of 2-4 player UUIDs */
  playerIds: string[];
  /** Tee time in HH:MM format, or null if not set */
  teeTime: string | null;
  /** 0-based slot index for ordering */
  slotIndex: number;
}

/**
 * Form data for managing pairings in round creation/editing
 */
export interface PairingFormData {
  /** Tee time slot configuration */
  teeTimeConfig: TeeTimeSlotConfig;
  /** List of pairing groups */
  groups: PairingGroup[];
  /** How the pairings were generated */
  generationType: 'auto' | 'manual';
}

/**
 * Pairing with populated player details
 * Used for display in UI components
 */
export interface PairingWithPlayers {
  id: string;
  roundId: string;
  playerIds: string[];
  teeTime: string | null;
  slotIndex: number;
  createdAt: string;
  updatedAt: string;
  /** Populated player details */
  players: {
    id: string;
    name: string;
    handicap: number | null;
    handicapIndex?: number | null;
    gender?: 'male' | 'female' | null;
    photoUrl: string | null;
  }[];
}

/**
 * Player info used in pairing algorithm and UI
 */
export interface PairingPlayer {
  id: string;
  name: string;
  handicap: number | null;
  /** Social Handicap Index (calculated from app rounds) */
  handicapIndex?: number | null;
  /** Player gender for GA daily handicap consistency factor */
  gender?: 'male' | 'female' | null;
  photoUrl?: string | null;
}

/**
 * Options for the auto-pairing algorithm
 */
export interface GeneratePairingsOptions {
  /** List of players to pair */
  players: PairingPlayer[];
  /** Preferred group size (2-4, default 4) */
  groupSize?: 2 | 3 | 4;
  /** Start time in HH:MM format */
  startTime: string;
  /** Interval between groups in minutes */
  intervalMinutes: number;
}

/**
 * Result from the auto-pairing algorithm
 */
export interface GeneratePairingsResult {
  /** Generated pairing groups */
  groups: PairingGroup[];
  /** Warnings about the generated pairings */
  warnings: string[];
  /** Number of groups created */
  groupCount: number;
  /** Total players assigned */
  playerCount: number;
}

/**
 * Input for creating pairings in the database
 */
export interface CreatePairingsInput {
  roundId: string;
  groups: {
    playerIds: string[];
    teeTime: string | null;
  }[];
}

/**
 * Input for updating a single pairing
 */
export interface UpdatePairingInput {
  id: string;
  playerIds?: string[];
  teeTime?: string | null;
}

/**
 * Converts Player to PairingPlayer
 */
export function toPairingPlayer(player: Player): PairingPlayer {
  return {
    id: player.id,
    name: player.name,
    handicap: player.handicap ?? null,
    handicapIndex: player.handicapIndex ?? null,
    gender: player.gender ?? null,
    photoUrl: player.photoUrl ?? null,
  };
}

/**
 * Default tee time slot configuration
 */
export const DEFAULT_TEE_TIME_CONFIG: TeeTimeSlotConfig = {
  startTime: '07:00',
  intervalMinutes: 8,
  numberOfSlots: 1,
};

/**
 * Available interval options for tee time slots
 */
export const TEE_TIME_INTERVALS = [7, 8, 9, 10] as const;
export type TeeTimeInterval = (typeof TEE_TIME_INTERVALS)[number];

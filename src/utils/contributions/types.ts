// src/utils/contributions/types.ts
import type { GameType, TeamFormat } from '@/types/database/enums';
import type { Hole } from '@/types';

/** Formats that produce a meaningful team-contribution story. */
export type ContributionFormat = 'best-ball' | 'scramble' | 'shamble' | 'aggregate';

/** Shot slots attributed to players on a single hole (scramble/shamble). */
export interface HoleShotSlots {
  teeShot?: string;
  secondShot?: string;
  approach?: string;
  putt?: string;
}

export interface ContributionMemberInput {
  playerId: string;
  playerName: string;
  handicap: number;
}

export interface ContributionTeamInput {
  teamId: string;
  teamName: string;
  color: string | null;
  members: ContributionMemberInput[];
  /** Gross strokes per player per hole number; undefined = no score. */
  strokesByPlayerHole: Record<string, Record<number, number | undefined>>;
  /** Shot attributions per hole number (scramble/shamble only). */
  shotContributionsByHole?: Record<number, HoleShotSlots>;
}

export interface ContributionRoundInput {
  roundId: string;
  roundLabel: string;
  format: ContributionFormat;
  gameType: GameType;
  holes: Hole[];
  teams: ContributionTeamInput[];
}

export interface ComputeContributionsInput {
  rounds: ContributionRoundInput[];
}

/** Per-shot-type counts (scramble/shamble breakdown). */
export interface ShotBreakdown {
  drives: number;
  approaches: number;
  putts: number;
}

export interface PlayerContribution {
  playerId: string;
  playerName: string;
  /** Raw metric: holes won (may be fractional) or shots used or points. */
  value: number;
  /** 0–1 share of the team's total for this round. */
  share: number;
  /** Present for scramble/shamble. */
  shotBreakdown?: ShotBreakdown;
  /** 1-indexed rank within the team; ties share a position. */
  position: number;
  isMvp: boolean;
}

export interface TeamContribution {
  teamId: string;
  teamName: string;
  color: string | null;
  players: PlayerContribution[];
}

export interface RoundContribution {
  roundId: string;
  roundLabel: string;
  format: ContributionFormat;
  /** Short label of the metric, e.g. 'holes won', 'shots used'. */
  metricLabel: string;
  teams: TeamContribution[];
  /** True when the metric needs data that wasn't captured (e.g. scramble shots). */
  dataMissing: boolean;
  /** Set when shamble fell back to holes-won-only. */
  drivesMissing?: boolean;
}

export interface RollupEntry {
  playerId: string;
  playerName: string;
  /** Average share across played, non-missing rounds (0–1). */
  averageShare: number;
  /** Number of rounds that fed this average. */
  roundsCounted: number;
  position: number;
  isMvp: boolean;
}

export interface ContributionsBoard {
  rollup: RollupEntry[];
  rounds: RoundContribution[];
  /** True when there is no usable team-format data at all. */
  isEmpty: boolean;
}

export type { Hole, GameType, TeamFormat };

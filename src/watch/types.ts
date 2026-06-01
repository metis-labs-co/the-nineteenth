import type {
  HoleScore, FairwayMissDirection, GreenMissDirection, HazardEntry,
} from '@/types/database/base';

export interface LatLng { latitude: number; longitude: number; }
export type WatchUnit = 'metres' | 'yards';

export interface WatchHole {
  hole: number;
  par: number;
  strokeIndex: number;
  green: { center?: LatLng; front?: LatLng; back?: LatLng };
}

export interface WatchPairPlayer { playerId: string; name: string; }

export interface WatchStatFlags {
  putts: boolean; fairways: boolean; gir: boolean; penalties: boolean; bunker: boolean;
}

export interface WatchLeaderboardRow {
  rank: number; name: string; detail: string; isCurrentUser: boolean;
}

export interface WatchSnapshot {
  rev: number;
  roundId: string;
  competitionName: string;
  unit: WatchUnit;
  isPremium: boolean;
  statFlags: WatchStatFlags;
  pairPlayers: WatchPairPlayer[];
  holes: WatchHole[];
  currentHole: number;
  scores: Record<string, HoleScore>; // key `${playerId}:${hole}`; absent = not entered
  leaderboard: WatchLeaderboardRow[];
}

export interface WatchScoreStat {
  putts?: number;
  fairwayHit?: boolean;
  fairwayMissDirection?: FairwayMissDirection;
  greenInRegulation?: boolean;
  greenMissDirection?: GreenMissDirection;
  bunkerShots?: number;
  hazards?: HazardEntry[];
}

export interface WatchScoreWrite {
  clientWriteId: string;
  ts: number;
  baseRev: number; // rev of the snapshot the watch edited from
  roundId: string;
  hole: number;
  playerId: string;
  strokes: number | 'pickup';
  stat?: WatchScoreStat;
}

export type WatchWriteStatus =
  | 'applied' | 'duplicate' | 'superseded' | 'unauthorized' | 'error';
export interface WatchWriteResult { status: WatchWriteStatus; clientWriteId: string; rev?: number; }
export interface WatchAck { clientWriteId: string; status: WatchWriteStatus; rev: number; }

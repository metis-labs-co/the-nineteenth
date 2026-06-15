import type {
  HoleScore, FairwayMissDirection, GreenMissDirection, HazardEntry,
} from '@/types/database/base';
import type { GameType, RoundStatus } from '@/types/database/enums';

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
  /** Show fairway miss direction (Premium); when false, fairway is hit/miss only. */
  fairwayDirection: boolean;
  /** Show green miss direction (Premium); when false, green is hit/miss only. */
  greenDirection: boolean;
}

export interface WatchLeaderboardRow {
  rank: number; name: string; detail: string; isCurrentUser: boolean;
}

/** Course wind, sourced from the phone's weather fetch. `fromDeg` is the
 *  meteorological bearing the wind blows FROM (true north), as Open-Meteo
 *  reports it; the watch converts to "blows to" at render. */
export interface WatchWind { speedKph: number; fromDeg: number; }

/** One round the user can open from the watch picker. `status` decides where the
 *  phone routes: in-progress resumes scoring, upcoming opens ViewRound for setup. */
export interface WatchAvailableRound {
  roundId: string;
  competitionId: string | null;     // null for standalone rounds
  title: string;                    // competition name, else course name, else "Round"
  teeTime: string | null;           // "HH:MM" for display, or null
  status: Extract<RoundStatus, 'in-progress' | 'upcoming'>;
  gameType: GameType;               // routes match-play to its dedicated screen
  isTeamRound: boolean;             // routes team match-play to its dedicated screen
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
  /** Rounds the user can open from the watch. Present even when no round is
   *  active (empty `roundId`) — that push both clears a finished round and
   *  delivers the picker list. */
  availableRounds: WatchAvailableRound[];
  /** Optional so older cached snapshots (and the Swift decoder) stay compatible. */
  wind?: WatchWind;
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
  /** Discriminant: score writes never carry a `type`; see WatchNavigate. */
  type?: never;
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

/** Watch → phone: move the active hole. Discriminated from score writes by `type`. */
export interface WatchNavigate {
  type: 'navigate';
  hole: number;
}

/** Watch → phone: open the chosen round. Carries only the id; the phone resolves
 *  the full entry from the snapshot it last sent and routes accordingly. */
export interface WatchSelectRound {
  type: 'selectRound';
  roundId: string;
}

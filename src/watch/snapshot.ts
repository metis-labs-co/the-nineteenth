import type { HoleScore } from '@/types/database/base';
import type {
  WatchHole,
  WatchLeaderboardRow,
  WatchSnapshot,
  WatchStatFlags,
  WatchUnit,
  WatchWind,
} from './types';

// ─── groupGreenCoords ────────────────────────────────────────────────────────

export interface SnapshotCoord {
  hole: number;
  poiType: string; // 'green_center' | 'green_front' | 'green_back' | 'tee_front' | 'tee_back' | ...
  latitude: number;
  longitude: number;
}

export function groupGreenCoords(coords: SnapshotCoord[]): Map<number, WatchHole['green']> {
  const map = new Map<number, WatchHole['green']>();
  for (const c of coords) {
    if (!c.poiType.startsWith('green_')) continue;
    const g = map.get(c.hole) ?? {};
    const ll = { latitude: c.latitude, longitude: c.longitude };
    if (c.poiType === 'green_center') g.center = ll;
    if (c.poiType === 'green_front') g.front = ll;
    if (c.poiType === 'green_back') g.back = ll;
    map.set(c.hole, g);
  }
  return map;
}

// ─── trimLeaderboard ─────────────────────────────────────────────────────────

export interface SnapshotLeaderboardEntry {
  rank: number; name: string; detail: string; playerId: string;
}

export function trimLeaderboard(
  board: SnapshotLeaderboardEntry[],
  currentUserId: string,
): WatchLeaderboardRow[] {
  const byRank = [...board].sort((a, b) => a.rank - b.rank);
  const keep = new Set<number>();
  byRank.slice(0, 3).forEach((e) => keep.add(e.rank));
  const meIdx = byRank.findIndex((e) => e.playerId === currentUserId);
  if (meIdx >= 0) {
    [meIdx - 1, meIdx, meIdx + 1].forEach((i) => {
      if (i >= 0 && i < byRank.length) keep.add(byRank[i].rank);
    });
  }
  return byRank
    .filter((e) => keep.has(e.rank))
    .map((e) => ({
      rank: e.rank, name: e.name, detail: e.detail, isCurrentUser: e.playerId === currentUserId,
    }));
}

// ─── buildWatchSnapshot ──────────────────────────────────────────────────────

export interface SnapshotPlayer { playerId: string; name: string; scores: Record<string, HoleScore>; }
export interface SnapshotHole { hole: number; par: number; strokeIndex: number; }

export interface BuildSnapshotInput {
  rev: number;
  roundId: string;
  competitionName: string;
  unit: WatchUnit;
  isPremium: boolean;
  statFlags: WatchStatFlags;     // already tier+toggle resolved
  currentHole: number;
  currentUserId: string;
  holes: SnapshotHole[];
  coords: SnapshotCoord[];
  pairPlayers: SnapshotPlayer[];
  leaderboard: SnapshotLeaderboardEntry[];
  wind?: WatchWind;
}

export function buildWatchSnapshot(input: BuildSnapshotInput): WatchSnapshot {
  const greens = groupGreenCoords(input.coords);
  const holes = input.holes.map((h) => ({
    hole: h.hole, par: h.par, strokeIndex: h.strokeIndex, green: greens.get(h.hole) ?? {},
  }));
  const scores: Record<string, HoleScore> = {};
  for (const p of input.pairPlayers) {
    for (const [hole, hs] of Object.entries(p.scores)) scores[`${p.playerId}:${Number(hole)}`] = hs;
  }
  return {
    rev: input.rev,
    roundId: input.roundId,
    competitionName: input.competitionName,
    unit: input.unit,
    isPremium: input.isPremium,
    statFlags: input.statFlags,
    pairPlayers: input.pairPlayers.map((p) => ({ playerId: p.playerId, name: p.name })),
    holes,
    currentHole: input.currentHole,
    scores,
    leaderboard: trimLeaderboard(input.leaderboard, input.currentUserId),
    // Omit the key entirely when absent so the snapshot stays compact and the
    // optional decodes cleanly on the watch.
    ...(input.wind ? { wind: input.wind } : {}),
  };
}

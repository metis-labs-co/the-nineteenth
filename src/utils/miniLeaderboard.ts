/**
 * Mini-leaderboard helpers — derive a 3-row window (above/you/below) from a
 * full leaderboard array, anchored on the current user (or their team).
 */

import type { CompetitionLeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';
import type { TeamWithMembers } from '@/types/database/team.types';

export interface MiniLeaderboardEntry {
  id: string;
  position: number;
  name: string;
  points: number;
  isCurrent: boolean;
}

export interface MiniLeaderboardData {
  above: MiniLeaderboardEntry | null;
  you: MiniLeaderboardEntry;
  below: MiniLeaderboardEntry | null;
}

function toMini(
  entry: CompetitionLeaderboardEntry,
  isCurrent: boolean,
): MiniLeaderboardEntry {
  return {
    id: entry.participantId,
    position: entry.position,
    name: entry.participantName,
    points: entry.totalPoints,
    isCurrent,
  };
}

function getMiniRows(
  leaderboard: CompetitionLeaderboardEntry[] | undefined,
  anchorId: string | undefined,
): MiniLeaderboardData | null {
  if (!leaderboard || leaderboard.length === 0 || !anchorId) return null;

  const sorted = [...leaderboard].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex((e) => e.participantId === anchorId);
  if (idx === -1) return null;

  return {
    above: idx > 0 ? toMini(sorted[idx - 1], false) : null,
    you: toMini(sorted[idx], true),
    below: idx < sorted.length - 1 ? toMini(sorted[idx + 1], false) : null,
  };
}

export function getMiniIndividualRows(
  leaderboard: CompetitionLeaderboardEntry[] | undefined,
  userId: string | undefined,
): MiniLeaderboardData | null {
  return getMiniRows(leaderboard, userId);
}

export function getMiniTeamRows(
  teamLeaderboard: CompetitionLeaderboardEntry[] | undefined,
  userTeamId: string | undefined,
): MiniLeaderboardData | null {
  return getMiniRows(teamLeaderboard, userTeamId);
}

export function resolveUserTeamId(
  teams: TeamWithMembers[] | undefined,
  userId: string | undefined,
): string | undefined {
  if (!teams || teams.length === 0 || !userId) return undefined;
  const team = teams.find((t) => t.members.some((m) => m.player_id === userId));
  return team?.id;
}

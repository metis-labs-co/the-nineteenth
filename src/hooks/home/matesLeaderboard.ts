/**
 * Mates-this-week leaderboard helpers — pure aggregation from weekly
 * scorecard rows to a ranked best-round-per-player list.
 *
 * Kept separate from useMatesThisWeek so the logic is testable without
 * the Supabase client or auth context.
 */

export interface MateWeeklyEntry {
  playerId: string;
  name: string;
  photoUrl: string | null;
  /** Best single-round Stableford points this week */
  points: number;
  /** Round id of that best round, for tap-through to RoundActivity */
  roundId: string;
  isCurrentUser: boolean;
}

export interface WeeklyScorecardRow {
  player_id: string;
  total_points: number | null;
  round_id: string;
}

export interface MateProfile {
  name: string;
  photoUrl: string | null;
}

export function buildMatesLeaderboard(
  rows: WeeklyScorecardRow[],
  profiles: Map<string, MateProfile>,
  currentUserId: string
): MateWeeklyEntry[] {
  const bestByPlayer = new Map<string, { points: number; roundId: string }>();

  for (const row of rows) {
    if (row.total_points == null) continue;
    if (!profiles.has(row.player_id)) continue;
    const best = bestByPlayer.get(row.player_id);
    if (!best || row.total_points > best.points) {
      bestByPlayer.set(row.player_id, { points: row.total_points, roundId: row.round_id });
    }
  }

  return [...bestByPlayer.entries()]
    .map(([playerId, best]) => {
      const profile = profiles.get(playerId)!;
      return {
        playerId,
        name: profile.name,
        photoUrl: profile.photoUrl,
        points: best.points,
        roundId: best.roundId,
        isCurrentUser: playerId === currentUserId,
      };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

import type { GameType, RoundStatus } from '@/types/database/enums';
import type { WatchAvailableRound } from './types';

/** Minimal slice of a round the picker needs. The bridge maps RoundWithCourse
 *  (from useInProgressRounds / useUpcomingRounds) onto this shape, so this pure
 *  helper stays decoupled from the full DB row type and easy to test. */
export interface AvailableRoundSource {
  id: string;
  status: Extract<RoundStatus, 'in-progress' | 'upcoming'>;
  competition_id: string | null;
  competitionName: string | null;
  courseName: string | null;
  tee_time?: string | null; // "HH:MM:SS"
  game_type: GameType;
  is_team_round: boolean;
}

/** "HH:MM:SS" -> "HH:MM"; null/empty -> null. */
function formatTeeTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const [h, m] = raw.split(':');
  if (h == null || m == null) return null;
  return `${h}:${m}`;
}

function toWatchRound(s: AvailableRoundSource): WatchAvailableRound {
  return {
    roundId: s.id,
    competitionId: s.competition_id ?? null,
    title: s.competitionName ?? s.courseName ?? 'Round',
    teeTime: formatTeeTime(s.tee_time),
    status: s.status,
    gameType: s.game_type,
    isTeamRound: s.is_team_round,
  };
}

/**
 * Merge in-progress + upcoming rounds into the watch picker list:
 *   - de-dupe by round id (an in-progress entry wins over an upcoming duplicate),
 *   - in-progress rounds first, then upcoming ordered by tee time (null last).
 */
export function buildAvailableRounds(
  inProgress: AvailableRoundSource[],
  upcoming: AvailableRoundSource[],
): WatchAvailableRound[] {
  const byId = new Map<string, WatchAvailableRound>();
  // In-progress first so it wins the de-dupe.
  for (const s of inProgress) byId.set(s.id, toWatchRound(s));
  for (const s of upcoming) if (!byId.has(s.id)) byId.set(s.id, toWatchRound(s));

  const rounds = [...byId.values()];
  const rank = (r: WatchAvailableRound) => (r.status === 'in-progress' ? 0 : 1);
  return rounds.sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    // Within the same group, order by tee time ascending; null tee times last.
    if (a.teeTime === b.teeTime) return 0;
    if (a.teeTime == null) return 1;
    if (b.teeTime == null) return -1;
    return a.teeTime < b.teeTime ? -1 : 1;
  });
}

import type { CompetitionWinnerInfo } from '@/components/competitions/CompetitionListCard';
import type { TeamMode } from '@/types/database.types';

export interface CompetitionItem {
  id: string;
  name: string;
  status: string;
  rounds: number;
  players: number;
  isOrganizer: boolean;
  startDate: string | null;
  /**
   * Team mode: 'none' | 'fixed' | 'per-round'. Drives the card's team vs
   * individual mini-leaderboard. Always populated by useCompetitionGroups;
   * optional to stay mutually assignable with CompetitionListCardData.
   */
  teamMode?: TeamMode;
  /** Whether this competition is grandfathered (over tier limit) */
  isLegacy?: boolean;
  /** Winner information (only for completed competitions) */
  winner?: CompetitionWinnerInfo;
}

export interface CompetitionGroups {
  active: CompetitionItem[];
  upcoming: CompetitionItem[];
  completed: CompetitionItem[];
}

const STARTED_STATUSES = new Set(['active', 'in_progress', 'in-progress']);

/**
 * Convert a date to a compact integer representing the local calendar day
 * (YYYYMMDD), using local-timezone components.  Useful for comparing calendar
 * days without worrying about time-of-day or UTC offsets.
 */
function localDayNumber(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * Parse a date-only string ('YYYY-MM-DD') or full ISO timestamp and return a
 * compact YYYYMMDD integer for the **calendar date named in the string**, not
 * the local wall-clock interpretation of it.
 *
 * Supabase `date` columns arrive as bare 'YYYY-MM-DD' strings.  Passing such a
 * string to `new Date()` yields UTC midnight, so we read its *UTC* components
 * to recover the intended calendar date.  For full ISO timestamps we do the
 * same (take the first 10 chars) so the function stays consistent.
 */
function startDateDayNumber(startDate: string): number {
  // Extract the YYYY-MM-DD portion robustly.
  const datePart = startDate.length >= 10 ? startDate.slice(0, 10) : startDate;
  const d = new Date(datePart); // parsed as UTC midnight
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function byStartDateAsc(a: CompetitionItem, b: CompetitionItem): number {
  if (!a.startDate && !b.startDate) return 0;
  if (!a.startDate) return 1; // nulls last
  if (!b.startDate) return -1;
  return startDateDayNumber(a.startDate) - startDateDayNumber(b.startDate);
}

function byStartDateDesc(a: CompetitionItem, b: CompetitionItem): number {
  if (!a.startDate && !b.startDate) return 0;
  if (!a.startDate) return 1; // nulls last
  if (!b.startDate) return -1;
  return startDateDayNumber(b.startDate) - startDateDayNumber(a.startDate);
}

/**
 * Merge my + joined competitions and group into active/upcoming/completed.
 *
 * - Duplicate ids keep the organizer copy (myCompetitions wins over joinedCompetitions).
 * - Cancelled competitions are excluded.
 * - Active = started status (active/in_progress/in-progress), or start date today-or-earlier.
 * - Upcoming = everything else (future start date, or drafts with no start date).
 * - Sort: active/upcoming earliest-first (null dates last); completed most-recent-first.
 */
export function groupCompetitions(
  myCompetitions: CompetitionItem[] | undefined,
  joinedCompetitions: CompetitionItem[] | undefined,
  now: Date = new Date()
): CompetitionGroups {
  // Merge: joinedCompetitions first, then myCompetitions overwrites (organizer copy wins).
  const byId = new Map<string, CompetitionItem>();
  for (const comp of joinedCompetitions ?? []) {
    byId.set(comp.id, comp);
  }
  for (const comp of myCompetitions ?? []) {
    byId.set(comp.id, comp);
  }

  const active: CompetitionItem[] = [];
  const upcoming: CompetitionItem[] = [];
  const completed: CompetitionItem[] = [];
  const todayLocalDay = localDayNumber(now);

  for (const comp of byId.values()) {
    const status = comp.status?.toLowerCase() ?? 'draft';
    if (status === 'cancelled') continue;
    if (status === 'completed') {
      completed.push(comp);
      continue;
    }
    const hasStarted =
      STARTED_STATUSES.has(status) ||
      (comp.startDate !== null && startDateDayNumber(comp.startDate) <= todayLocalDay);
    if (hasStarted) {
      active.push(comp);
    } else {
      upcoming.push(comp);
    }
  }

  active.sort(byStartDateAsc);
  upcoming.sort(byStartDateAsc);
  completed.sort(byStartDateDesc);

  return { active, upcoming, completed };
}

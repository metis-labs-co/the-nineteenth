import type { CompetitionWinnerInfo } from '@/components/competitions/CompetitionListCard';

export interface CompetitionItem {
  id: string;
  name: string;
  status: string;
  rounds: number;
  players: number;
  isOrganizer: boolean;
  startDate: string | null;
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
 * Return the UTC day boundary (midnight UTC) for a given date, as a timestamp.
 * Using UTC consistently avoids timezone-dependent behaviour when the date string
 * is parsed as UTC midnight (e.g. '2026-06-11' → 2026-06-11T00:00:00Z).
 */
function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function byStartDateAsc(a: CompetitionItem, b: CompetitionItem): number {
  if (!a.startDate && !b.startDate) return 0;
  if (!a.startDate) return 1;
  if (!b.startDate) return -1;
  return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
}

function byStartDateDesc(a: CompetitionItem, b: CompetitionItem): number {
  const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
  const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
  return timeB - timeA;
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
  const todayUtcStart = utcDayStart(now);

  for (const comp of byId.values()) {
    const status = comp.status?.toLowerCase() ?? 'draft';
    if (status === 'cancelled') continue;
    if (status === 'completed') {
      completed.push(comp);
      continue;
    }
    const hasStarted =
      STARTED_STATUSES.has(status) ||
      (comp.startDate !== null && utcDayStart(new Date(comp.startDate)) <= todayUtcStart);
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

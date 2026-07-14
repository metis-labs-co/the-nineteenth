/**
 * useHomeData - composes all data the Home screen needs into a single
 * typed object. Each underlying TanStack Query is independently cached
 * via its own hook, so navigating away and back hits the cache.
 *
 * The screen renders sections conditionally based on flags returned here.
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getLocalDateString } from '@/utils/formatting';
import { useRoundList } from '@/screens/rounds/RoundListScreen/hooks/useRoundList';
import { useCompetitions } from '@/hooks/competitions/queries';
import { useLeagues } from '@/hooks/leagues/queries';
import { usePlayer } from '@/hooks/player/queries';
import { useHandicapHistory } from '@/hooks/player';
import { usePlayerStatistics } from '@/hooks/playerStatistics/queries';
import {
  useAchievementProgress,
  useAchievementDefinitions,
  useAchievementSummary,
} from '@/hooks/achievements/queries';
import { useFriends } from '@/hooks/friends';
import { useUnreadNotificationCount } from '@/hooks/notifications/queries';
import { useBag } from '@/hooks/queries/useBag';
import { useHasCreatedRound } from '@/hooks/queries/useHasCreatedRound';
import { PUTTER_KEY } from '@/constants/clubs';
import { useDevFlagsStore } from '@/store/devFlagsStore';
import { usePendingActions } from './usePendingActions';
import { useInProgressRounds } from './useInProgressRounds';
import { useUpcomingRounds } from './useUpcomingRounds';
import type { RoundItem } from '@/screens/rounds/RoundListScreen/types';
import type { Competition } from '@/types';
import type { League } from '@/types/database/league.types';
import type { RoundWithCourse } from '@/components/competitions/detail/types';
import type {
  TimeOfDay,
  HandicapHighlight,
  StatsHighlights,
  NotableMoment,
  PendingAction,
} from '@/types/home';
import type { HandicapSummary } from '@/types/handicap.types';

// ---------------------------------------------------------------------------
// Pure helpers — exported so they can be unit-tested without a React runtime.
// ---------------------------------------------------------------------------

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns the first upcoming round whose tee time falls within the next 24h
 * from `now`, or null if none qualifies.
 */
export function computeUpcomingWithin24h(
  upcoming: RoundItem[],
  now: Date,
): RoundItem | null {
  const cutoff = now.getTime() + TWENTY_FOUR_HOURS_MS;
  for (const r of upcoming) {
    if (!r.date) continue;
    const teeTime = r.teeTime ?? '09:00:00';
    const dateStr =
      typeof r.date === 'string'
        ? r.date.slice(0, 10)
        : r.date.toISOString().slice(0, 10);
    const start = new Date(`${dateStr}T${teeTime}`).getTime();
    if (start >= now.getTime() && start <= cutoff) return r;
  }
  return null;
}

/**
 * Same as `computeUpcomingWithin24h` but operates on the richer
 * `RoundWithCourse` shape (with snake_case `tee_time`). Used by the Home
 * screen so the round-today hero card can include competition rounds.
 */
export function computeUpcomingRwcWithin24h(
  upcoming: RoundWithCourse[],
  now: Date,
): RoundWithCourse | null {
  const cutoff = now.getTime() + TWENTY_FOUR_HOURS_MS;
  for (const r of upcoming) {
    if (!r.date) continue;
    const teeTime = r.tee_time ?? '09:00:00';
    const dateStr =
      typeof r.date === 'string'
        ? r.date.slice(0, 10)
        : (r.date as Date).toISOString().slice(0, 10);
    const start = new Date(`${dateStr}T${teeTime}`).getTime();
    if (start >= now.getTime() && start <= cutoff) return r;
  }
  return null;
}

/**
 * Returns the next *competition* round (RoundWithCourse) whose tee time falls
 * within the next 7 days from `now`, or null. `excludeId` lets the caller drop
 * the round already shown in the 24h hero card so it isn't surfaced twice.
 * Standalone (non-competition) rounds are ignored. Assumes `upcoming` is sorted
 * by date ascending (as returned by useUpcomingRounds), so the first match is
 * the earliest.
 */
export function computeNextCompetitionWithin7Days(
  upcoming: RoundWithCourse[],
  now: Date,
  excludeId: string | null,
): RoundWithCourse | null {
  const cutoff = now.getTime() + SEVEN_DAYS_MS;
  for (const r of upcoming) {
    if (excludeId && r.id === excludeId) continue;
    if (!r.competition?.id) continue;
    if (!r.date) continue;
    const teeTime = r.tee_time ?? '09:00:00';
    const dateStr =
      typeof r.date === 'string'
        ? r.date.slice(0, 10)
        : (r.date as Date).toISOString().slice(0, 10);
    const start = new Date(`${dateStr}T${teeTime}`).getTime();
    if (start >= now.getTime() && start <= cutoff) return r;
  }
  return null;
}

/**
 * A single day a competition runs, with the coordinates used to fetch that
 * day's weather forecast. Drives the per-day weather lines on the Home
 * upcoming-competition card.
 */
export interface CompetitionDay {
  /** Local `YYYY-MM-DD` for the round day. */
  dateIso: string;
  lat: number;
  lng: number;
}

/**
 * Resolve a round's club coordinates: the hydrated camelCase fields first
 * (set by useUpcomingRounds), then the raw `location` GeoJSON `[lng, lat]`.
 * Returns null when neither is available.
 */
function resolveClubCoords(
  round: RoundWithCourse,
): { lat: number; lng: number } | null {
  const club = round.course?.clubs as
    | {
        latitude?: number | null;
        longitude?: number | null;
        location?: { coordinates?: [number, number] } | null;
      }
    | null
    | undefined;
  if (!club) return null;
  if (club.latitude != null && club.longitude != null) {
    return { lat: club.latitude, lng: club.longitude };
  }
  const coords = club.location?.coordinates;
  if (coords && coords.length >= 2) {
    return { lat: coords[1], lng: coords[0] };
  }
  return null;
}

/**
 * Distinct days the given competition runs, derived from the already-fetched
 * upcoming rounds (`useUpcomingRounds` returns every upcoming round for the
 * user, including all of a competition's rounds). Rounds with no resolvable
 * club coordinates are dropped; days are deduped (first round wins for that
 * day's coords) and sorted ascending. Returns [] when `competitionId` is null.
 */
export function computeCompetitionDays(
  upcoming: RoundWithCourse[],
  competitionId: string | null,
): CompetitionDay[] {
  if (!competitionId) return [];
  const byDate = new Map<string, CompetitionDay>();
  for (const r of upcoming) {
    if (r.competition?.id !== competitionId) continue;
    if (!r.date) continue;
    const dateIso =
      typeof r.date === 'string'
        ? r.date.slice(0, 10)
        : (r.date as Date).toISOString().slice(0, 10);
    if (byDate.has(dateIso)) continue;
    const coords = resolveClubCoords(r);
    if (!coords) continue;
    byDate.set(dateIso, { dateIso, lat: coords.lat, lng: coords.lng });
  }
  return Array.from(byDate.values()).sort((a, b) =>
    a.dateIso < b.dateIso ? -1 : a.dateIso > b.dateIso ? 1 : 0,
  );
}

/**
 * Returns `upcoming` with the hero-card round removed (by id), so the list
 * below the hero doesn't duplicate it.
 */
export function computeUpcomingForList(
  upcoming: RoundItem[],
  pickedId: string | null,
): RoundItem[] {
  if (!pickedId) return upcoming;
  return upcoming.filter((r) => r.id !== pickedId);
}

export interface AchievementHighlight {
  code: string;
  name: string;
  description: string;
  icon: string;
  currentValue: number;
  threshold: number;
  progressPercent: number;
}

export interface AchievementSummaryStats {
  totalEarned: number;
  totalPoints: number;
  completionPercentage: number;
  totalDefinitions: number;
}

const ACHIEVEMENT_LIMIT = 2;
const COMPETITION_LIMIT = 6;

function timeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function isActiveCompetitionStatus(s: string): boolean {
  return s === 'upcoming' || s === 'in-progress';
}

function isActiveLeague(l: League): boolean {
  return l.status === 'active';
}

/**
 * Pick a single notable moment from PlayerStatistics for the Home highlight.
 * Priority:
 *   1. Best stableford round at favourite course (warm + recognizable)
 *   2. Best round overall
 *   3. null
 */
function pickNotableMoment(
  stats: ReturnType<typeof usePlayerStatistics>['data']
): NotableMoment | null {
  if (!stats) return null;

  if (stats.favouriteCourse && stats.favouriteCourse.bestScore > 0) {
    return {
      kind: 'course_best',
      courseId: stats.favouriteCourse.courseId,
      courseName: stats.favouriteCourse.courseName,
      score: stats.favouriteCourse.bestScore,
    };
  }

  if (stats.bestRound) {
    return {
      kind: 'best_recent',
      score: stats.bestRound.totalGross,
      courseName: stats.bestRound.courseName,
      date: stats.bestRound.date,
    };
  }

  return null;
}

function calcLast5Average(
  recent: ReturnType<typeof usePlayerStatistics>['data'] extends infer T
    ? T extends { recentRounds: infer R }
      ? R
      : never
    : never
): number | null {
  if (!Array.isArray(recent) || recent.length === 0) return null;
  // Restrict to 18-hole rounds — averaging a 9-hole gross alongside 18-hole
  // grosses understates form. `recentRounds` mixes both, so filter here.
  const fullRounds = (recent as { totalGross: number; holesPlayed: number }[]).filter(
    (r) => r.holesPlayed >= 18
  );
  if (fullRounds.length === 0) return null;
  const slice = fullRounds.slice(0, 5);
  const total = slice.reduce((sum, r) => sum + r.totalGross, 0);
  return total / slice.length;
}

export interface HomeData {
  greeting: { firstName: string | null; timeOfDay: TimeOfDay };
  handicap: HandicapHighlight;
  /** Full Social Handicap Index summary for the Home handicap card. */
  handicapSummary: HandicapSummary | null;
  unreadCount: number;
  /** In-progress rounds in RoundWithCourse shape — fed to the shared carousel. */
  inProgressRounds: RoundWithCourse[];
  upcomingRounds: RoundItem[];
  /**
   * The first upcoming round whose tee time is within the next 24 hours,
   * or null if none. Surface for the RoundTodayCard hero on the Home screen.
   *
   * Sourced from `useUpcomingRounds`, which fetches both standalone and
   * competition rounds in `RoundWithCourse` shape (with `course.clubs`
   * populated for the weather forecast).
   */
  upcomingWithin24h: RoundWithCourse | null;
  /**
   * The user's next competition round whose tee time is within the next
   * 7 days, or null. Excludes the round already shown by `upcomingWithin24h`
   * so the home screen never shows it twice. Drives the NextCompetitionCard.
   */
  nextCompetition: RoundWithCourse | null;
  /**
   * Distinct days the `nextCompetition`'s competition runs (with per-day
   * coordinates), used to render the upcoming-competition card's weather
   * forecast. Empty when there is no next competition.
   */
  nextCompetitionDays: CompetitionDay[];
  /**
   * `upcomingRounds` with `upcomingWithin24h` removed.
   * Use this for the scrollable list below the hero so the chosen round
   * isn't shown twice.
   */
  upcomingRoundsForList: RoundItem[];
  lastRound: RoundItem | null;
  pendingActions: PendingAction[];
  competitions: Competition[];
  leagues: League[];
  stats: StatsHighlights | null;
  achievementSummary: AchievementSummaryStats | null;
  achievementsInProgress: AchievementHighlight[];
  friendCount: number;
  isLoading: boolean;
  isRefetching: boolean;
  refetchAll: () => void;
  /**
   * Per-task onboarding status for the Home "Getting started" card. The card
   * stays visible until every task is `true`; completed tasks render as a
   * done state inline so users can revisit them.
   */
  gettingStarted: GettingStartedTasks;
}

export interface GettingStartedTasks {
  hasCreatedRound: boolean;
  hasSetUpBag: boolean;
  hasJoinedCompetition: boolean;
  hasAddedFriend: boolean;
  allCompleted: boolean;
}

export function useHomeData(): HomeData {
  const { user, player } = useAuth();
  const userId = user?.id;

  const {
    rounds,
    isLoading: roundsLoading,
    isRefetching: roundsRefetching,
    refetch: refetchRounds,
  } = useRoundList();

  const { data: competitions, refetch: refetchComps } = useCompetitions();

  const { data: leagues, refetch: refetchLeagues } = useLeagues();

  const { data: playerData, refetch: refetchPlayer } = usePlayer(userId);

  const { data: handicapHistory, refetch: refetchHandicap } =
    useHandicapHistory(userId);

  const { data: stats, refetch: refetchStats } = usePlayerStatistics(userId);

  const { data: achievementProgress, refetch: refetchAchievements } =
    useAchievementProgress(userId ?? '');

  const { data: achievementDefinitions } = useAchievementDefinitions();

  const { data: achievementSummary } = useAchievementSummary(userId ?? '');

  const { data: friends, refetch: refetchFriends } = useFriends();

  const { data: bag = [], refetch: refetchBag } = useBag(player?.id);

  const { data: hasCreatedRound = false, refetch: refetchHasCreatedRound } =
    useHasCreatedRound(userId);

  const { data: unreadCount = 0, refetch: refetchUnread } =
    useUnreadNotificationCount();

  const { actions: pendingActions, refetch: refetchPending } =
    usePendingActions();

  const { data: inProgressRounds = [], refetch: refetchInProgress } =
    useInProgressRounds();

  const { data: upcomingRoundsRwc = [], refetch: refetchUpcomingRwc } =
    useUpcomingRounds();

  const upcomingRounds = useMemo(() => {
    const todayIso = getLocalDateString();
    return (rounds?.active ?? [])
      .filter((r) => r.status === 'upcoming')
      .filter((r) => {
        if (!r.date) return true;
        const d =
          typeof r.date === 'string'
            ? r.date.slice(0, 10)
            : r.date.toISOString().slice(0, 10);
        return d >= todayIso;
      });
  }, [rounds?.active]);

  // Hero card picker. Uses the all-sources upcoming list (standalone +
  // competition) so a competition round today shows up alongside standalone
  // ones. Returns RoundWithCourse so RoundTodayCard / weather get the
  // course.clubs join directly without a cast.
  const upcomingWithin24h = useMemo<RoundWithCourse | null>(() => {
    return computeUpcomingRwcWithin24h(upcomingRoundsRwc, new Date());
  }, [upcomingRoundsRwc]);

  // The next competition round within a week — surfaced as a dedicated card.
  // Excludes the hero round (if any) so it isn't duplicated.
  const nextCompetition = useMemo<RoundWithCourse | null>(() => {
    return computeNextCompetitionWithin7Days(
      upcomingRoundsRwc,
      new Date(),
      upcomingWithin24h?.id ?? null,
    );
  }, [upcomingRoundsRwc, upcomingWithin24h]);

  // Distinct days the next competition runs — drives the per-day weather
  // forecast on the upcoming-competition card. Derived from the already-fetched
  // upcoming rounds, so no extra network request.
  const nextCompetitionDays = useMemo<CompetitionDay[]>(() => {
    return computeCompetitionDays(
      upcomingRoundsRwc,
      nextCompetition?.competition?.id ?? null,
    );
  }, [upcomingRoundsRwc, nextCompetition]);

  // The "Coming up" list still draws from the standalone-only round-list
  // (RoundItem). We exclude any round that the hero already shows.
  const upcomingRoundsForList = useMemo<RoundItem[]>(() => {
    return computeUpcomingForList(upcomingRounds, upcomingWithin24h?.id ?? null);
  }, [upcomingRounds, upcomingWithin24h]);

  const lastRound = useMemo<RoundItem | null>(() => {
    return rounds?.history?.[0] ?? null;
  }, [rounds?.history]);

  const activeCompetitions = useMemo(() => {
    return (competitions ?? [])
      .filter((c) => isActiveCompetitionStatus(c.status))
      .slice(0, COMPETITION_LIMIT);
  }, [competitions]);

  const activeLeagues = useMemo(() => {
    return (leagues ?? []).filter(isActiveLeague).slice(0, COMPETITION_LIMIT);
  }, [leagues]);

  const handicapHighlight = useMemo<HandicapHighlight>(() => {
    const value = playerData?.handicap ?? null;
    return {
      value,
      // 30-day delta requires history snapshots; punted to v2 for now.
      delta30d: null,
      hasHandicap: value !== null && value !== undefined,
    };
  }, [playerData]);

  const statsHighlights = useMemo<StatsHighlights | null>(() => {
    if (!stats) return null;
    if (stats.roundsPlayed < 3) return null;

    return {
      handicap: handicapHighlight.value,
      roundsYtd: stats.roundsPlayedYtd,
      scoringAverage: stats.averageGrossScoreYtd,
      last5Average: calcLast5Average(stats.recentRounds),
      last5DeltaVsHandicap: null,
      notable: pickNotableMoment(stats),
    };
  }, [stats, handicapHighlight.value]);

  const friendCountForAchievements = friends?.length ?? 0;

  const achievementsInProgress = useMemo<AchievementHighlight[]>(() => {
    if (!achievementProgress || !achievementDefinitions) return [];
    const progressByCode = new Map(
      achievementProgress.map((p) => [p.achievement_code, p.current_value])
    );

    const enriched: AchievementHighlight[] = [];

    for (const def of achievementDefinitions) {
      if (def.is_hidden || def.threshold <= 0) continue;

      // Friend-count achievements have a known data-sync issue: the stored
      // progress can lag behind reality (only updated when *this* user
      // accepts an incoming request). Use the live friends list as the
      // source of truth here, even after the DB-side trigger lands, so the
      // home tile stays correct on stale clients.
      let currentValue: number;
      if (
        def.code.startsWith('SOCIAL_CIRCLE') ||
        def.code.startsWith('FIRST_FRIEND')
      ) {
        currentValue = friendCountForAchievements;
      } else {
        const baseCode = def.base_achievement ?? def.code;
        currentValue = progressByCode.get(baseCode) ?? 0;
      }

      const percent = Math.min(
        100,
        Math.max(0, (currentValue / def.threshold) * 100)
      );
      if (percent <= 0 || percent >= 100) continue;

      enriched.push({
        code: def.code,
        name: def.name,
        description: def.description,
        icon: def.icon,
        currentValue,
        threshold: def.threshold,
        progressPercent: percent,
      });
    }

    // Dedupe by base code: only show the lowest-tier in-progress achievement
    // per family (e.g. show SOCIAL_CIRCLE_2 at 7/10, not also _3 at 7/20).
    const seenBase = new Set<string>();
    const deduped: AchievementHighlight[] = [];
    enriched
      .sort((a, b) => b.progressPercent - a.progressPercent)
      .forEach((a) => {
        const def = achievementDefinitions.find((d) => d.code === a.code);
        const baseKey = def?.base_achievement ?? a.code;
        if (seenBase.has(baseKey)) return;
        seenBase.add(baseKey);
        deduped.push(a);
      });

    return deduped.slice(0, ACHIEVEMENT_LIMIT);
  }, [achievementProgress, achievementDefinitions, friendCountForAchievements]);

  const forceNewUserHome = useDevFlagsStore((s) => s.forceNewUserHome);

  const gettingStarted = useMemo<GettingStartedTasks>(() => {
    // Dev override: force every task incomplete so the card always shows.
    if (__DEV__ && forceNewUserHome) {
      return {
        hasCreatedRound: false,
        hasSetUpBag: false,
        hasJoinedCompetition: false,
        hasAddedFriend: false,
        allCompleted: false,
      };
    }
    // Bag query always surfaces the putter — count only user-picked clubs so
    // the unset state matches BagSummarySection's empty check.
    const hasSetUpBag = bag.some((k) => k !== PUTTER_KEY);
    // "Joined a competition" means the user is an organizer or accepted
    // player on any competition (active or otherwise).
    const hasJoinedCompetition = (competitions ?? []).length > 0;
    // "Added a friend" means the user initiated the friendship; being added
    // by someone else doesn't count for this onboarding step.
    const hasAddedFriend = (friends ?? []).some((f) => f.is_requester);
    const allCompleted =
      hasCreatedRound &&
      hasSetUpBag &&
      hasJoinedCompetition &&
      hasAddedFriend;
    return {
      hasCreatedRound,
      hasSetUpBag,
      hasJoinedCompetition,
      hasAddedFriend,
      allCompleted,
    };
  }, [forceNewUserHome, bag, competitions, friends, hasCreatedRound]);

  const firstName = useMemo(() => {
    const fullName = player?.name ?? user?.user_metadata?.name;
    if (typeof fullName === 'string' && fullName.trim().length > 0) {
      return fullName.trim().split(/\s+/)[0];
    }
    return null;
  }, [player?.name, user?.user_metadata?.name]);

  const refetchAll = () => {
    refetchRounds();
    refetchComps();
    refetchLeagues();
    refetchPlayer();
    refetchHandicap();
    refetchStats();
    refetchAchievements();
    refetchFriends();
    refetchUnread();
    refetchPending();
    refetchInProgress();
    refetchUpcomingRwc();
    refetchBag();
    refetchHasCreatedRound();
  };

  const achievementSummaryStats = useMemo<AchievementSummaryStats | null>(() => {
    if (!achievementSummary) return null;
    const totalDefinitions = achievementDefinitions
      ? achievementDefinitions.filter((d) => !d.is_hidden).length
      : 0;
    return {
      totalEarned: achievementSummary.total_earned,
      totalPoints: achievementSummary.total_points,
      completionPercentage: achievementSummary.completion_percentage,
      totalDefinitions,
    };
  }, [achievementSummary, achievementDefinitions]);

  // Dev-only: when the "Force new-user home state" flag is on, blank out every
  // data field so the UI is a faithful preview of a fresh account. Identity
  // (greeting, refetch, loading) stays real.
  if (__DEV__ && forceNewUserHome) {
    return {
      greeting: { firstName, timeOfDay: timeOfDay() },
      handicap: { value: null, delta30d: null, hasHandicap: false },
      handicapSummary: null,
      unreadCount: 0,
      inProgressRounds: [],
      upcomingRounds: [],
      upcomingWithin24h: null,
      nextCompetition: null,
      nextCompetitionDays: [],
      upcomingRoundsForList: [],
      lastRound: null,
      pendingActions: [],
      competitions: [],
      leagues: [],
      stats: null,
      achievementSummary: null,
      achievementsInProgress: [],
      friendCount: 0,
      isLoading: roundsLoading,
      isRefetching: roundsRefetching,
      refetchAll,
      gettingStarted,
    };
  }

  return {
    greeting: { firstName, timeOfDay: timeOfDay() },
    handicap: handicapHighlight,
    handicapSummary: handicapHistory ?? null,
    unreadCount,
    inProgressRounds,
    upcomingRounds,
    upcomingWithin24h,
    nextCompetition,
    nextCompetitionDays,
    upcomingRoundsForList,
    lastRound,
    pendingActions,
    competitions: activeCompetitions,
    leagues: activeLeagues,
    stats: statsHighlights,
    achievementSummary: achievementSummaryStats,
    achievementsInProgress,
    friendCount: friends?.length ?? 0,
    isLoading: roundsLoading,
    isRefetching: roundsRefetching,
    refetchAll,
    gettingStarted,
  };
}

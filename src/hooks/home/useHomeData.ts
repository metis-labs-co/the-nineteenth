/**
 * useHomeData - composes all data the Home screen needs into a single
 * typed object. Each underlying TanStack Query is independently cached
 * via its own hook, so navigating away and back hits the cache.
 *
 * The screen renders sections conditionally based on flags returned here.
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoundList } from '@/screens/rounds/RoundListScreen/hooks/useRoundList';
import { useCompetitions } from '@/hooks/competitions/queries';
import { useLeagues } from '@/hooks/leagues/queries';
import { usePlayer } from '@/hooks/player/queries';
import { usePlayerStatistics } from '@/hooks/playerStatistics/queries';
import {
  useAchievementProgress,
  useAchievementDefinitions,
  useAchievementSummary,
} from '@/hooks/achievements/queries';
import { useFriends } from '@/hooks/friends';
import { useUnreadNotificationCount } from '@/hooks/notifications/queries';
import { usePendingActions } from './usePendingActions';
import { useInProgressRounds } from './useInProgressRounds';
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
  const slice = recent.slice(0, 5);
  const total = slice.reduce(
    (sum: number, r: { totalGross: number }) => sum + r.totalGross,
    0
  );
  return total / slice.length;
}

export interface HomeData {
  greeting: { firstName: string | null; timeOfDay: TimeOfDay };
  handicap: HandicapHighlight;
  unreadCount: number;
  /** In-progress rounds in RoundWithCourse shape — fed to the shared carousel. */
  inProgressRounds: RoundWithCourse[];
  upcomingRounds: RoundItem[];
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
  isNewUser: boolean;
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

  const { data: stats, refetch: refetchStats } = usePlayerStatistics(userId);

  const { data: achievementProgress, refetch: refetchAchievements } =
    useAchievementProgress(userId ?? '');

  const { data: achievementDefinitions } = useAchievementDefinitions();

  const { data: achievementSummary } = useAchievementSummary(userId ?? '');

  const { data: friends, refetch: refetchFriends } = useFriends();

  const { data: unreadCount = 0, refetch: refetchUnread } =
    useUnreadNotificationCount();

  const { actions: pendingActions, refetch: refetchPending } =
    usePendingActions();

  const { data: inProgressRounds = [], refetch: refetchInProgress } =
    useInProgressRounds();

  const upcomingRounds = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
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

  const isNewUser =
    !roundsLoading &&
    inProgressRounds.length === 0 &&
    upcomingRounds.length === 0 &&
    !lastRound &&
    activeCompetitions.length === 0 &&
    activeLeagues.length === 0 &&
    pendingActions.length === 0 &&
    (friends?.length ?? 0) === 0;

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
    refetchStats();
    refetchAchievements();
    refetchFriends();
    refetchUnread();
    refetchPending();
    refetchInProgress();
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

  return {
    greeting: { firstName, timeOfDay: timeOfDay() },
    handicap: handicapHighlight,
    unreadCount,
    inProgressRounds,
    upcomingRounds,
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
    isNewUser,
  };
}

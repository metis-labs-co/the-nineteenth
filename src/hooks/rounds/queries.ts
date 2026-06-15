/**
 * Round Query Hooks
 *
 * TanStack Query hooks for fetching round details, scorecards, players,
 * and combined game results (skins + wolf).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { supabase } from '@/services/supabase/client';
import { roundKeys, scorecardKeys } from '@/hooks/queryKeys';
import { teeToTeeBox } from '@/utils/teeTransformers';
import { useSkinsStatistics, useSkinsGameHistory } from '@/hooks/skins';
import { useWolfStatistics, useWolfGameHistory } from '@/hooks/wolf';
import type { Round, Course, Scorecard, Player, Club, Pairing, Competition, Tee, TeeBox } from '@/types/database.types';
import type { SkinsPlayerStatistics, SkinsGameHistoryEntry } from '@/hooks/skins';
import type { WolfPlayerStatistics, WolfGameHistoryEntry } from '@/hooks/wolf';

// =====================================================
// TYPES - Round Details
// =====================================================

export interface CourseWithClub extends Course {
  club: Pick<Club, 'id' | 'name' | 'city' | 'state' | 'address'> | null;
}

export type CompetitionSummary = Pick<Competition, 'id' | 'name' | 'competition_type' | 'status' | 'start_date' | 'end_date' | 'handicap_source' | 'team_mode'>;

export interface RoundWithCourse extends Round {
  course: CourseWithClub | null;
  competition: CompetitionSummary | null;
}

export interface ScorecardWithPlayer extends Scorecard {
  player: Player | null;
}

export interface RoundPlayer extends Player {
  has_scorecard: boolean;
}

// =====================================================
// TYPES - Game Results
// =====================================================

export type GameType = 'skins' | 'wolf';

export interface GameResultsSummary {
  totalGamesPlayed: number;
  totalNetResult: number;
  skins: {
    gamesPlayed: number;
    netResult: number;
    winRate: number | null;
  };
  wolf: {
    gamesPlayed: number;
    netResult: number;
    winRate: number | null;
  };
}

export interface CombinedGameHistoryEntry {
  id: string;
  gameType: GameType;
  roundId: string;
  courseName: string | null;
  competitionName: string | null;
  date: string | null;
  netResult: number;
  completedAt: string | null;
}

export type GameTypeFilter = 'all' | 'skins' | 'wolf';

// =====================================================
// DATA FETCHING - Round Details
// =====================================================

async function fetchRoundDetails(roundId: string): Promise<RoundWithCourse> {
  const { data, error } = await supabase
    .from('rounds')
    .select(`
      *,
      courses (
        *,
        clubs (id, name, city, state, address),
        tees_from_table:tees (*)
      ),
      competitions (id, name, competition_type, status, start_date, end_date, handicap_source, team_mode)
    `)
    .eq('id', roundId)
    .is('deleted_at', null)
    .single();

  if (error) {
    throw new Error(`Failed to fetch round: ${error.message}`);
  }

  // Handle Supabase join types
  const roundData = data as Record<string, unknown>;
  const courseData = roundData.courses as Record<string, unknown> | null;
  const competitionData = roundData.competitions as CompetitionSummary | null;

  // Merge tees from table into course.tees for backward compatibility
  let mergedCourse: CourseWithClub | null = null;
  if (courseData) {
    const teesFromTable = (courseData.tees_from_table as Tee[] | null) ?? [];
    const legacyTees = (courseData.tees as TeeBox[] | null) ?? [];

    // Prefer tees from table, fallback to legacy JSONB
    const mergedTees = teesFromTable.length > 0 ? teesFromTable.map(teeToTeeBox) : legacyTees;

    // Build merged course without temporary fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tees_from_table, clubs, ...courseWithoutTemp } = courseData as Record<string, unknown>;
    mergedCourse = {
      ...courseWithoutTemp,
      tees: mergedTees,
      club: (clubs as CourseWithClub['club']) || null,
    } as CourseWithClub;
  }

  return {
    ...roundData,
    course: mergedCourse,
    competition: competitionData,
  } as RoundWithCourse;
}

async function fetchRoundScorecards(roundId: string): Promise<ScorecardWithPlayer[]> {
  const { data, error } = await supabase
    .from('scorecards')
    .select(`
      *,
      players!player_id (*)
    `)
    .eq('round_id', roundId)
    .order('total_points', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch scorecards: ${error.message}`);
  }

  return (data || []).map((scorecard: Record<string, unknown>) => ({
    ...scorecard,
    player: (scorecard.players as Player) || null,
  })) as ScorecardWithPlayer[];
}

// =====================================================
// DATA FETCHING - Round Players
// =====================================================

async function fetchRoundPlayers(roundId: string): Promise<RoundPlayer[]> {
  const playerIds = new Set<string>();

  // First, get the round to check if it belongs to a competition
  const { data: roundData } = await supabase
    .from('rounds')
    .select('competition_id')
    .eq('id', roundId)
    .single() as { data: { competition_id: string | null } | null };

  // 1. Try to get players from pairings (competition rounds)
  const { data: pairingsData, error: pairingsError } = await supabase
    .from('pairings')
    .select('player_ids')
    .eq('round_id', roundId);

  if (pairingsError) {
    console.error('Error fetching pairings:', pairingsError);
  }

  // Type assertion for pairings data
  const pairings = (pairingsData || []) as Pick<Pairing, 'player_ids'>[];

  // Collect player IDs from pairings
  pairings.forEach((pairing) => {
    (pairing.player_ids || []).forEach((id) => playerIds.add(id));
  });

  // 2. For competition rounds, get players from competition_players
  if (roundData?.competition_id) {
    const { data: compPlayersData, error: compPlayersError } = await supabase
      .from('competition_players')
      .select('player_id')
      .eq('competition_id', roundData.competition_id)
      .eq('status', 'accepted') as unknown as { data: { player_id: string }[] | null; error: { code?: string; message: string } | null };

    if (compPlayersError) {
      console.error('Error fetching competition_players:', compPlayersError);
    } else if (compPlayersData) {
      compPlayersData.forEach((cp) => {
        playerIds.add(cp.player_id);
      });
    }
  }

  // 3. Also try to get players from round_players (standalone/social rounds)
  try {
    const { data: roundPlayersData, error: roundPlayersError } = await supabase
      .from('round_players')
      .select('player_id')
      .eq('round_id', roundId) as { data: { player_id: string }[] | null; error: { code?: string; message: string } | null };

    if (roundPlayersError) {
      // Table might not exist - not a critical error
      if (roundPlayersError.code !== 'PGRST205') {
        console.error('Error fetching round_players:', roundPlayersError);
      }
    } else if (roundPlayersData) {
      // Add player IDs from round_players
      roundPlayersData.forEach((rp) => {
        playerIds.add(rp.player_id);
      });
    }
  } catch {
    // Silently ignore if round_players table doesn't exist
  }

  if (playerIds.size === 0) {
    return [];
  }

  // 3. Fetch player details
  const { data: playersData, error: playersError } = await supabase
    .from('players')
    .select('*')
    .in('id', Array.from(playerIds));

  if (playersError) {
    throw new Error(`Failed to fetch players: ${playersError.message}`);
  }

  // Type assertion for players data
  const players = (playersData || []) as Player[];

  // 4. Check which players have scorecards
  const { data: scorecardsData } = await supabase
    .from('scorecards')
    .select('player_id')
    .eq('round_id', roundId);

  // Type assertion for scorecards data
  const scorecards = (scorecardsData || []) as Pick<Scorecard, 'player_id'>[];

  const playersWithScorecards = new Set(
    scorecards.map((sc) => sc.player_id)
  );

  return players.map((player) => ({
    ...player,
    has_scorecard: playersWithScorecards.has(player.id),
  }));
}

// =====================================================
// HOOKS - Round Details
// =====================================================

export function useRoundDetails(roundId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: roundKeys.detail(roundId),
    queryFn: () => fetchRoundDetails(roundId),
    enabled: (options?.enabled ?? true) && !!roundId,
    staleTime: CACHE_TIMES.MODERATE,
    gcTime: GC_TIMES.STANDARD,
  });
}

export function useRoundScorecards(roundId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: scorecardKeys.list({ roundId }),
    queryFn: () => fetchRoundScorecards(roundId),
    enabled: (options?.enabled ?? true) && !!roundId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    refetchInterval: 30 * 1000,
  });
}

export function useRoundPlayers(roundId: string) {
  return useQuery({
    queryKey: [...roundKeys.detail(roundId), 'players'],
    queryFn: () => fetchRoundPlayers(roundId),
    enabled: !!roundId,
    staleTime: CACHE_TIMES.MODERATE,
    gcTime: GC_TIMES.STANDARD,
  });
}

/**
 * Fetch every per-player tee override for a round. Returns a Map keyed by
 * `player_id` → `TeeBox | null`. Consumers typically resolve
 * `override ?? rounds.selected_tee` to get a player's effective tee.
 *
 * Useful for the Details tab (show current user's effective tee) and the
 * Edit Tees sheet (seed current selections).
 */
async function fetchRoundPlayerTees(roundId: string): Promise<Map<string, TeeBox | null>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed query workaround
  const { data, error } = await (supabase.from('round_players') as any)
    .select('player_id, selected_tee')
    .eq('round_id', roundId);
  if (error) {
    throw new Error(`Failed to fetch round player tees: ${error.message}`);
  }
  const map = new Map<string, TeeBox | null>();
  for (const row of (data ?? []) as { player_id: string; selected_tee: TeeBox | null }[]) {
    map.set(row.player_id, row.selected_tee);
  }
  return map;
}

export function useRoundPlayerTees(roundId: string) {
  return useQuery({
    queryKey: [...roundKeys.detail(roundId), 'player-tees'],
    queryFn: () => fetchRoundPlayerTees(roundId),
    enabled: !!roundId,
    staleTime: CACHE_TIMES.MODERATE,
    gcTime: GC_TIMES.STANDARD,
  });
}

// =====================================================
// HOOK - Game Results
// =====================================================

export function useGameResults() {
  // Get current user ID
  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
  });

  const userId = session?.user?.id;

  // Fetch statistics
  const {
    data: skinsStats,
    isLoading: isLoadingSkins,
    refetch: refetchSkins,
  } = useSkinsStatistics(userId);

  const {
    data: wolfStats,
    isLoading: isLoadingWolf,
    refetch: refetchWolf,
  } = useWolfStatistics(userId);

  // Fetch game history
  const {
    data: skinsHistory,
    isLoading: isLoadingSkinsHistory,
    refetch: refetchSkinsHistory,
  } = useSkinsGameHistory(userId, { limit: 50 });

  const {
    data: wolfHistory,
    isLoading: isLoadingWolfHistory,
    refetch: refetchWolfHistory,
  } = useWolfGameHistory(userId, { limit: 50 });

  // Compute summary
  const summary = useMemo((): GameResultsSummary => {
    const skinsGames = skinsStats?.games_played ?? 0;
    const skinsNet = skinsStats?.total_net_result ?? 0;
    const wolfGames = wolfStats?.games_played ?? 0;
    const wolfNet = wolfStats?.total_net_result ?? 0;

    return {
      totalGamesPlayed: skinsGames + wolfGames,
      totalNetResult: skinsNet + wolfNet,
      skins: {
        gamesPlayed: skinsGames,
        netResult: skinsNet,
        winRate: skinsStats?.win_rate ?? null,
      },
      wolf: {
        gamesPlayed: wolfGames,
        netResult: wolfNet,
        winRate: wolfStats?.win_rate ?? null,
      },
    };
  }, [skinsStats, wolfStats]);

  // Combine and sort history
  const combinedHistory = useMemo((): CombinedGameHistoryEntry[] => {
    const entries: CombinedGameHistoryEntry[] = [];

    // Map skins history
    (skinsHistory ?? []).forEach((entry: SkinsGameHistoryEntry) => {
      entries.push({
        id: entry.id,
        gameType: 'skins',
        roundId: entry.round_id,
        courseName: entry.round?.course?.name ?? null,
        competitionName: entry.round?.competition?.name ?? null,
        date: entry.round?.date ?? entry.completed_at,
        netResult: entry.payout?.net_result ?? 0,
        completedAt: entry.completed_at,
      });
    });

    // Map wolf history
    (wolfHistory ?? []).forEach((entry: WolfGameHistoryEntry) => {
      entries.push({
        id: entry.id,
        gameType: 'wolf',
        roundId: entry.round_id,
        courseName: entry.round?.course?.name ?? null,
        competitionName: entry.round?.competition?.name ?? null,
        date: entry.round?.date ?? entry.completed_at,
        netResult: entry.payout?.net_result ?? 0,
        completedAt: entry.completed_at,
      });
    });

    // Sort by date descending
    entries.sort((a, b) => {
      const dateA = a.completedAt ?? a.date ?? '';
      const dateB = b.completedAt ?? b.date ?? '';
      return dateB.localeCompare(dateA);
    });

    return entries;
  }, [skinsHistory, wolfHistory]);

  const isLoading = isLoadingSkins || isLoadingWolf || isLoadingSkinsHistory || isLoadingWolfHistory;

  const refetch = async () => {
    await Promise.all([
      refetchSkins(),
      refetchWolf(),
      refetchSkinsHistory(),
      refetchWolfHistory(),
    ]);
  };

  return {
    userId,
    summary,
    combinedHistory,
    skinsStats: skinsStats as SkinsPlayerStatistics | null | undefined,
    wolfStats: wolfStats as WolfPlayerStatistics | null | undefined,
    isLoading,
    refetch,
  };
}

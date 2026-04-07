/**
 * useGameResults - Combined Skins + Wolf game results
 *
 * Aggregates statistics and history from both skins and wolf
 * side-games for the Game Results screen.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { supabase } from '@/services/supabase/client';
import { useSkinsStatistics, useSkinsGameHistory } from '@/hooks/skins';
import { useWolfStatistics, useWolfGameHistory } from '@/hooks/wolf';
import type { SkinsPlayerStatistics, SkinsGameHistoryEntry } from '@/hooks/skins';
import type { WolfPlayerStatistics, WolfGameHistoryEntry } from '@/hooks/wolf';

// =====================================================
// TYPES
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
// HOOK
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

/**
 * Prize Pool Hooks - Query Hooks
 *
 * TanStack Query hooks for fetching prize pool data.
 *
 * Hooks:
 * - useCompetitionPrizePool: Fetch prize pool for a competition
 * - usePoolTransactions: Fetch pool transaction history
 * - usePoolBalance: Fetch current pool balances
 * - usePoolAllocationSummary: Calculate allocation summary
 * - useCanDrawFromPool: Check if amount can be drawn
 * - useSkinsAllocationStatus: Get skins allocation status across rounds
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { prizePoolKeys } from '@/hooks/queryKeys';
import { createError } from './helpers';
import type {
  PoolTransactionsOptions,
  RoundSkinsAllocation,
  SkinsAllocationStatus,
} from './types';
import type {
  CompetitionPrizePool,
  PoolTransaction,
  PoolAllocationSummary,
  PoolBalanceSummary,
} from '@/types/database/prizePool.types';

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Query hook to fetch prize pool for a competition
 */
export function useCompetitionPrizePool(competitionId: string | undefined) {
  return useQuery({
    queryKey: prizePoolKeys.pool(competitionId ?? ''),
    queryFn: async (): Promise<CompetitionPrizePool | null> => {
      if (!competitionId) return null;

      const { data: pool, error } = await supabase
        .from('competition_prize_pools' as never)
        .select('*')
        .eq('competition_id', competitionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw createError(`Failed to fetch prize pool: ${error.message}`, 'DATABASE');
      }

      return pool as unknown as CompetitionPrizePool;
    },
    enabled: !!competitionId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch pool transactions
 */
export function usePoolTransactions(
  poolId: string | undefined,
  options?: PoolTransactionsOptions
) {
  return useQuery({
    queryKey: prizePoolKeys.transactions(poolId ?? ''),
    queryFn: async (): Promise<PoolTransaction[]> => {
      if (!poolId) return [];

      let query = supabase
        .from('pool_transactions' as never)
        .select('*')
        .eq('pool_id', poolId)
        .order('created_at', { ascending: false });

      if (options?.type) {
        query = query.eq('transaction_type', options.type);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data: transactions, error } = await query;

      if (error) {
        throw createError(`Failed to fetch pool transactions: ${error.message}`, 'DATABASE');
      }

      return (transactions ?? []) as unknown as PoolTransaction[];
    },
    enabled: !!poolId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch current pool balances
 */
export function usePoolBalance(poolId: string | undefined) {
  return useQuery({
    queryKey: prizePoolKeys.balance(poolId ?? ''),
    queryFn: async (): Promise<PoolBalanceSummary | null> => {
      if (!poolId) return null;

      const { data: pool, error: poolError } = await supabase
        .from('competition_prize_pools' as never)
        .select('total_pool_amount, skins_budget, winner_budget, other_budget')
        .eq('id', poolId)
        .single();

      if (poolError) {
        if (poolError.code === 'PGRST116') return null;
        throw createError(`Failed to fetch pool: ${poolError.message}`, 'DATABASE');
      }

      const poolData = pool as {
        total_pool_amount: number;
        skins_budget: number;
        winner_budget: number;
        other_budget: number;
      } | null;

      if (!poolData) return null;

      const [skinsResult, winnerResult, otherResult] = await Promise.all([
        supabase.rpc('get_pool_balance' as never, {
          p_pool_id: poolId,
          p_category: 'skins',
        } as never),
        supabase.rpc('get_pool_balance' as never, {
          p_pool_id: poolId,
          p_category: 'winner',
        } as never),
        supabase.rpc('get_pool_balance' as never, {
          p_pool_id: poolId,
          p_category: 'other',
        } as never),
      ]);

      const { count } = await supabase
        .from('pool_transactions' as never)
        .select('*', { count: 'exact', head: true })
        .eq('pool_id', poolId);

      return {
        total: poolData.total_pool_amount,
        skins_remaining: (skinsResult.data as number | null) ?? poolData.skins_budget,
        winner_remaining: (winnerResult.data as number | null) ?? poolData.winner_budget,
        other_remaining: (otherResult.data as number | null) ?? poolData.other_budget,
        transactions_count: count ?? 0,
      };
    },
    enabled: !!poolId,
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to calculate pool allocation summary
 */
export function usePoolAllocationSummary(competitionId: string | undefined) {
  const poolQuery = useCompetitionPrizePool(competitionId);
  const balanceQuery = usePoolBalance(poolQuery.data?.id);

  return useQuery({
    queryKey: prizePoolKeys.summary(competitionId ?? ''),
    queryFn: async (): Promise<PoolAllocationSummary | null> => {
      const pool = poolQuery.data;
      const balance = balanceQuery.data;

      if (!pool) return null;

      const skinsUsed = pool.skins_budget - (balance?.skins_remaining ?? pool.skins_budget);
      const winnerUsed = pool.winner_budget - (balance?.winner_remaining ?? pool.winner_budget);
      const otherUsed = pool.other_budget - (balance?.other_remaining ?? pool.other_budget);

      return {
        skins: {
          percent: pool.skins_allocation_percent,
          budget: pool.skins_budget,
          used: skinsUsed,
          remaining: balance?.skins_remaining ?? pool.skins_budget,
        },
        winner: {
          percent: pool.winner_allocation_percent,
          budget: pool.winner_budget,
          used: winnerUsed,
          remaining: balance?.winner_remaining ?? pool.winner_budget,
        },
        other: {
          percent: pool.other_allocation_percent,
          budget: pool.other_budget,
          used: otherUsed,
          remaining: balance?.other_remaining ?? pool.other_budget,
        },
      };
    },
    enabled:
      !!competitionId && !poolQuery.isLoading && !balanceQuery.isLoading && !!poolQuery.data,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Query hook to check if an amount can be drawn from pool
 */
export function useCanDrawFromPool(poolId: string | undefined, amount: number) {
  return useQuery({
    queryKey: [...prizePoolKeys.balance(poolId ?? ''), 'canDraw', amount],
    queryFn: async (): Promise<boolean> => {
      if (!poolId || amount <= 0) return false;

      const { data, error } = await supabase.rpc('can_draw_from_pool' as never, {
        p_pool_id: poolId,
        p_amount: amount,
      } as never);

      if (error) {
        console.error('[useCanDrawFromPool] RPC error:', error);
        return false;
      }

      return data === true;
    },
    enabled: !!poolId && amount > 0,
    staleTime: 10 * 1000,
    gcTime: 60 * 1000,
    retry: 1,
  });
}

/**
 * Query hook to get skins allocation status for a competition
 */
export function useSkinsAllocationStatus(competitionId: string | undefined) {
  return useQuery({
    queryKey: [...prizePoolKeys.summary(competitionId ?? ''), 'skinsAllocation'],
    queryFn: async (): Promise<SkinsAllocationStatus | null> => {
      if (!competitionId) return null;

      const { data: pool, error: poolError } = await supabase
        .from('competition_prize_pools' as never)
        .select('id, skins_budget')
        .eq('competition_id', competitionId)
        .single();

      if (poolError) {
        if (poolError.code === 'PGRST116') {
          return {
            totalBudget: 0,
            totalAllocated: 0,
            remainingBudget: 0,
            hasAvailableBudget: false,
            roundAllocations: [],
            roundsWithPoolSkins: 0,
            totalRounds: 0,
          };
        }
        throw createError(`Failed to fetch prize pool: ${poolError.message}`, 'DATABASE');
      }

      const poolData = pool as { id: string; skins_budget: number } | null;

      if (!poolData) {
        return {
          totalBudget: 0,
          totalAllocated: 0,
          remainingBudget: 0,
          hasAvailableBudget: false,
          roundAllocations: [],
          roundsWithPoolSkins: 0,
          totalRounds: 0,
        };
      }

      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select('id, round_number')
        .eq('competition_id', competitionId)
        .order('round_number', { ascending: true });

      if (roundsError) {
        throw createError(`Failed to fetch rounds: ${roundsError.message}`, 'DATABASE');
      }

      const roundList = (rounds ?? []) as { id: string; round_number: number }[];

      if (roundList.length === 0) {
        return {
          totalBudget: poolData.skins_budget,
          totalAllocated: 0,
          remainingBudget: poolData.skins_budget,
          hasAvailableBudget: poolData.skins_budget > 0,
          roundAllocations: [],
          roundsWithPoolSkins: 0,
          totalRounds: 0,
        };
      }

      const { data: skinsGames, error: skinsError } = await supabase
        .from('skins_games')
        .select('round_id, pool_draw_amount, status')
        .in('round_id', roundList.map(r => r.id))
        .eq('pool_source', 'prize_pool');

      if (skinsError) {
        throw createError(`Failed to fetch skins games: ${skinsError.message}`, 'DATABASE');
      }

      const skinsGamesList = (skinsGames ?? []) as {
        round_id: string;
        pool_draw_amount: number;
        status: string;
      }[];

      const skinsGameMap = new Map(
        skinsGamesList.map(g => [g.round_id, g])
      );

      const roundAllocations: RoundSkinsAllocation[] = roundList.map(round => {
        const skinsGame = skinsGameMap.get(round.id);
        return {
          roundId: round.id,
          roundNumber: round.round_number,
          poolDrawAmount: skinsGame?.pool_draw_amount ?? 0,
          hasPoolSkins: !!skinsGame && skinsGame.status !== 'cancelled',
          status: skinsGame
            ? (skinsGame.status as 'active' | 'completed' | 'cancelled')
            : 'none',
        };
      });

      const totalAllocated = roundAllocations
        .filter(r => r.status !== 'cancelled')
        .reduce((sum, r) => sum + r.poolDrawAmount, 0);

      const remainingBudget = poolData.skins_budget - totalAllocated;
      const roundsWithPoolSkins = roundAllocations.filter(r => r.hasPoolSkins).length;

      return {
        totalBudget: poolData.skins_budget,
        totalAllocated,
        remainingBudget,
        hasAvailableBudget: remainingBudget > 0,
        roundAllocations,
        roundsWithPoolSkins,
        totalRounds: roundList.length,
      };
    },
    enabled: !!competitionId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

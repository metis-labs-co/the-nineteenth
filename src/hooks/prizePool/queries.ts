/**
 * Prize Pool Hooks - Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { prizePoolKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { createError } from './helpers';
import type { PoolTransactionsOptions } from './types';
import type {
  CompetitionPrizePool,
  PrizePoolPlacement,
  PoolTransaction,
} from '@/types/database/prizePool.types';

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
    staleTime: CACHE_TIMES.FREQUENT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

export function usePrizePoolPlacements(poolId: string | undefined) {
  return useQuery({
    queryKey: prizePoolKeys.placements(poolId ?? ''),
    queryFn: async (): Promise<PrizePoolPlacement[]> => {
      if (!poolId) return [];

      const { data, error } = await supabase
        .from('prize_pool_placements' as never)
        .select('*')
        .eq('pool_id', poolId)
        .order('position', { ascending: true });

      if (error) {
        throw createError(`Failed to fetch placements: ${error.message}`, 'DATABASE');
      }

      return (data ?? []) as unknown as PrizePoolPlacement[];
    },
    enabled: !!poolId,
    staleTime: CACHE_TIMES.FREQUENT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

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
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

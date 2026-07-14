/**
 * Prize Pool Hooks - Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { prizePoolKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { assertNoDbError } from '@/services/errors';
import type { PoolTransactionsOptions } from './types';
import type {
  CompetitionPrizePool,
  PoolTargetType,
  PrizePoolPlacement,
  PoolTransaction,
} from '@/types/database/prizePool.types';

/** Both pools (individual + team) for a competition */
export interface CompetitionPrizePools {
  individual: CompetitionPrizePool | null;
  team: CompetitionPrizePool | null;
}

export function useCompetitionPrizePool(
  competitionId: string | undefined,
  target: PoolTargetType = 'individual'
) {
  return useQuery({
    queryKey: prizePoolKeys.pool(competitionId ?? '', target),
    queryFn: async (): Promise<CompetitionPrizePool | null> => {
      if (!competitionId) return null;

      const { data: pool, error } = await supabase
        .from('competition_prize_pools' as never)
        .select('*')
        .eq('competition_id', competitionId)
        .eq('target_type', target)
        .maybeSingle();

      assertNoDbError(error, 'fetch prize pool');

      return (pool as unknown as CompetitionPrizePool) ?? null;
    },
    enabled: !!competitionId,
    staleTime: CACHE_TIMES.FREQUENT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch both prize pools (individual + team) for a competition.
 * Either or both may be null.
 */
export function useCompetitionPrizePools(competitionId: string | undefined) {
  return useQuery({
    queryKey: prizePoolKeys.pools(competitionId ?? ''),
    queryFn: async (): Promise<CompetitionPrizePools> => {
      if (!competitionId) return { individual: null, team: null };

      const { data, error } = await supabase
        .from('competition_prize_pools' as never)
        .select('*')
        .eq('competition_id', competitionId);

      assertNoDbError(error, 'fetch prize pools');

      const rows = (data ?? []) as unknown as CompetitionPrizePool[];
      return {
        individual: rows.find((p) => p.target_type === 'individual') ?? null,
        team: rows.find((p) => p.target_type === 'team') ?? null,
      };
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

      assertNoDbError(error, 'fetch placements');

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

      assertNoDbError(error, 'fetch pool transactions');

      return (transactions ?? []) as unknown as PoolTransaction[];
    },
    enabled: !!poolId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

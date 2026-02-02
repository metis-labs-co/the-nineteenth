/**
 * Prize Pool Hooks - Mutation Hooks
 *
 * TanStack Query mutation hooks for modifying prize pool data.
 *
 * Hooks:
 * - useCreatePrizePool: Create a new prize pool
 * - useUpdatePrizePool: Update an existing pool
 * - useDeletePrizePool: Delete a pool
 * - useAutoSplitPool: Auto-split pool for skins
 * - useDrawFromPool: Draw from pool for skins
 * - useReturnToPool: Return funds to pool
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { prizePoolKeys, roundKeys, skinsKeys, competitionKeys } from '@/hooks/queryKeys';
import { createError } from './helpers';
import type {
  CompetitionPrizePool,
  CreatePrizePoolInput,
  UpdatePrizePoolInput,
} from '@/types/database/prizePool.types';

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Mutation hook to create a new prize pool
 */
export function useCreatePrizePool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreatePrizePoolInput & { created_by: string; player_count: number }
    ): Promise<CompetitionPrizePool> => {
      const { player_count, ...poolInput } = input;

      const totalAllocation =
        poolInput.skins_allocation_percent +
        (poolInput.winner_allocation_percent ?? 0) +
        (poolInput.other_allocation_percent ?? 0);

      if (totalAllocation > 100) {
        throw createError('Allocation percentages cannot exceed 100%', 'VALIDATION');
      }

      const totalPoolAmount =
        poolInput.funding_type === 'per_player'
          ? poolInput.funding_amount * player_count
          : poolInput.funding_amount;

      const skinsBudget = (totalPoolAmount * poolInput.skins_allocation_percent) / 100;
      const winnerBudget = (totalPoolAmount * (poolInput.winner_allocation_percent ?? 0)) / 100;
      const otherBudget = (totalPoolAmount * (poolInput.other_allocation_percent ?? 0)) / 100;

      const insertData = {
        competition_id: poolInput.competition_id,
        funding_type: poolInput.funding_type,
        funding_amount: poolInput.funding_amount,
        currency: poolInput.currency ?? 'AUD',
        total_pool_amount: totalPoolAmount,
        skins_allocation_percent: poolInput.skins_allocation_percent,
        winner_allocation_percent: poolInput.winner_allocation_percent ?? 0,
        other_allocation_percent: poolInput.other_allocation_percent ?? 0,
        skins_budget: skinsBudget,
        winner_budget: winnerBudget,
        other_budget: otherBudget,
        auto_split_skins: poolInput.auto_split_skins ?? false,
        status: 'draft' as const,
        created_by: poolInput.created_by,
      };

      const { data, error } = await supabase
        .from('competition_prize_pools' as never)
        .insert(insertData as never)
        .select()
        .single();

      if (error) {
        throw createError(`Failed to create prize pool: ${error.message}`, 'DATABASE');
      }

      return data as unknown as CompetitionPrizePool;
    },

    onSuccess: async (data) => {
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pool(data.competition_id),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.summary(data.competition_id),
      });
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(data.competition_id),
      });

      if (data.auto_split_skins) {
        try {
          const { count } = await supabase
            .from('rounds')
            .select('*', { count: 'exact', head: true })
            .eq('competition_id', data.competition_id)
            .eq('status', 'upcoming');

          if (count && count > 0) {
            const { error: redistError } = await supabase.rpc(
              'redistribute_skins_pots' as never,
              {
                p_competition_id: data.competition_id,
              } as never
            );

            if (redistError) {
              console.warn('[useCreatePrizePool] Auto-split redistribution failed:', redistError);
            } else {
              console.log('[useCreatePrizePool] Auto-split triggered for', count, 'rounds');
              queryClient.invalidateQueries({ queryKey: skinsKeys.all });
              queryClient.invalidateQueries({ queryKey: roundKeys.all });
            }
          }
        } catch (error) {
          console.warn('[useCreatePrizePool] Auto-split trigger failed:', error);
        }
      }
    },

    onError: (error) => {
      console.error('[useCreatePrizePool] Failed to create pool:', error);
    },
  });
}

/**
 * Mutation hook to update a prize pool
 */
export function useUpdatePrizePool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poolId,
      updates,
      player_count,
    }: {
      poolId: string;
      updates: UpdatePrizePoolInput;
      player_count: number;
    }): Promise<CompetitionPrizePool> => {
      const { data: currentPoolData, error: fetchError } = await supabase
        .from('competition_prize_pools' as never)
        .select('*')
        .eq('id', poolId)
        .single();

      if (fetchError) {
        throw createError(`Failed to fetch pool: ${fetchError.message}`, 'DATABASE');
      }

      const currentPool = currentPoolData as unknown as CompetitionPrizePool;

      if (currentPool.is_locked) {
        throw createError('Prize pool is locked after round starts', 'LOCKED');
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

      const fundingType = updates.funding_type ?? currentPool.funding_type;
      const fundingAmount = updates.funding_amount ?? currentPool.funding_amount;

      if (updates.funding_type) updateData.funding_type = updates.funding_type;
      if (updates.funding_amount) updateData.funding_amount = updates.funding_amount;

      const totalPoolAmount =
        fundingType === 'per_player' ? fundingAmount * player_count : fundingAmount;
      updateData.total_pool_amount = totalPoolAmount;

      const skinsPercent =
        updates.skins_allocation_percent ?? currentPool.skins_allocation_percent;
      const winnerPercent =
        updates.winner_allocation_percent ?? currentPool.winner_allocation_percent;
      const otherPercent =
        updates.other_allocation_percent ?? currentPool.other_allocation_percent;

      if (skinsPercent + winnerPercent + otherPercent > 100) {
        throw createError('Allocation percentages cannot exceed 100%', 'VALIDATION');
      }

      if (updates.skins_allocation_percent !== undefined)
        updateData.skins_allocation_percent = updates.skins_allocation_percent;
      if (updates.winner_allocation_percent !== undefined)
        updateData.winner_allocation_percent = updates.winner_allocation_percent;
      if (updates.other_allocation_percent !== undefined)
        updateData.other_allocation_percent = updates.other_allocation_percent;

      updateData.skins_budget = (totalPoolAmount * skinsPercent) / 100;
      updateData.winner_budget = (totalPoolAmount * winnerPercent) / 100;
      updateData.other_budget = (totalPoolAmount * otherPercent) / 100;

      if (updates.auto_split_skins !== undefined) {
        updateData.auto_split_skins = updates.auto_split_skins;
      }

      const { data, error } = await supabase
        .from('competition_prize_pools' as never)
        .update(updateData as never)
        .eq('id', poolId)
        .select()
        .single();

      if (error) {
        throw createError(`Failed to update prize pool: ${error.message}`, 'DATABASE');
      }

      return data as unknown as CompetitionPrizePool;
    },

    onSuccess: async (data) => {
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pool(data.competition_id),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.balance(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.summary(data.competition_id),
      });
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(data.competition_id),
      });

      if (data.auto_split_skins) {
        try {
          const { count } = await supabase
            .from('rounds')
            .select('*', { count: 'exact', head: true })
            .eq('competition_id', data.competition_id)
            .eq('status', 'upcoming');

          if (count && count > 0) {
            const { error: redistError } = await supabase.rpc(
              'redistribute_skins_pots' as never,
              {
                p_competition_id: data.competition_id,
              } as never
            );

            if (redistError) {
              console.warn('[useUpdatePrizePool] Auto-split redistribution failed:', redistError);
            } else {
              console.log('[useUpdatePrizePool] Auto-split triggered for', count, 'rounds');
              queryClient.invalidateQueries({ queryKey: skinsKeys.all });
              queryClient.invalidateQueries({ queryKey: roundKeys.all });
            }
          }
        } catch (error) {
          console.warn('[useUpdatePrizePool] Auto-split trigger failed:', error);
        }
      }
    },

    onError: (error) => {
      console.error('[useUpdatePrizePool] Failed to update pool:', error);
    },
  });
}

/**
 * Mutation hook to delete a prize pool
 */
export function useDeletePrizePool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poolId,
      competitionId,
    }: {
      poolId: string;
      competitionId: string;
    }): Promise<void> => {
      const { data: poolData, error: fetchError } = await supabase
        .from('competition_prize_pools' as never)
        .select('is_locked')
        .eq('id', poolId)
        .single();

      if (fetchError) {
        throw createError(`Failed to fetch pool: ${fetchError.message}`, 'DATABASE');
      }

      const pool = poolData as { is_locked: boolean } | null;

      if (pool?.is_locked) {
        throw createError('Cannot delete locked prize pool', 'LOCKED');
      }

      const { error } = await supabase
        .from('competition_prize_pools' as never)
        .delete()
        .eq('id', poolId);

      if (error) {
        throw createError(`Failed to delete prize pool: ${error.message}`, 'DATABASE');
      }
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pool(variables.competitionId),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.summary(variables.competitionId),
      });
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(variables.competitionId),
      });
    },

    onError: (error) => {
      console.error('[useDeletePrizePool] Failed to delete pool:', error);
    },
  });
}

/**
 * Mutation hook to auto-split pool for skins
 */
export function useAutoSplitPool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poolId,
      roundCount,
    }: {
      poolId: string;
      roundCount: number;
    }): Promise<CompetitionPrizePool> => {
      if (roundCount <= 0) {
        throw createError('Round count must be greater than 0', 'VALIDATION');
      }

      const { error: rpcError } = await supabase.rpc('auto_split_pool_for_skins' as never, {
        p_pool_id: poolId,
        p_round_count: roundCount,
      } as never);

      if (rpcError) {
        throw createError(`Failed to auto-split pool: ${rpcError.message}`, 'DATABASE');
      }

      const { data: pool, error: fetchError } = await supabase
        .from('competition_prize_pools' as never)
        .select('*')
        .eq('id', poolId)
        .single();

      if (fetchError) {
        throw createError(`Failed to fetch updated pool: ${fetchError.message}`, 'DATABASE');
      }

      return pool as unknown as CompetitionPrizePool;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pool(data.competition_id),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.summary(data.competition_id),
      });
      queryClient.invalidateQueries({
        queryKey: skinsKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(data.competition_id),
      });
    },

    onError: (error) => {
      console.error('[useAutoSplitPool] Failed to auto-split:', error);
    },
  });
}

/**
 * Utility hook to draw from pool for a skins game
 */
export function useDrawFromPool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poolId,
      roundId,
      amount,
    }: {
      poolId: string;
      roundId: string;
      amount: number;
    }): Promise<number> => {
      const { data, error } = await supabase.rpc('draw_from_pool' as never, {
        p_pool_id: poolId,
        p_round_id: roundId,
        p_amount: amount,
      } as never);

      if (error) {
        throw createError(`Failed to draw from pool: ${error.message}`, 'DATABASE');
      }

      return data as unknown as number;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.balance(variables.poolId),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.transactions(variables.poolId),
      });
    },

    onError: (error) => {
      console.error('[useDrawFromPool] Failed to draw:', error);
    },
  });
}

/**
 * Utility hook to return funds to pool (e.g., carryover return)
 */
export function useReturnToPool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poolId,
      roundId,
      amount,
      description,
    }: {
      poolId: string;
      roundId: string;
      amount: number;
      description?: string;
    }): Promise<void> => {
      const { error } = await supabase.rpc('return_to_pool' as never, {
        p_pool_id: poolId,
        p_round_id: roundId,
        p_amount: amount,
        p_description: description ?? `Carryover returned from round`,
      } as never);

      if (error) {
        throw createError(`Failed to return to pool: ${error.message}`, 'DATABASE');
      }
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.balance(variables.poolId),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.transactions(variables.poolId),
      });
    },

    onError: (error) => {
      console.error('[useReturnToPool] Failed to return:', error);
    },
  });
}

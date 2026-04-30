/**
 * Prize Pool Hooks - Mutation Hooks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { prizePoolKeys, competitionKeys } from '@/hooks/queryKeys';
import { createError } from './helpers';
import type {
  CompetitionPrizePool,
  CreatePrizePoolInput,
  UpdatePrizePoolInput,
} from '@/types/database/prizePool.types';

export function useCreatePrizePool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreatePrizePoolInput & { created_by: string; player_count: number }
    ): Promise<CompetitionPrizePool> => {
      const { player_count, placements, ...poolInput } = input;

      const totalPercent = placements.reduce((sum, p) => sum + p.percent, 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        throw createError('Placement percentages must sum to 100%', 'VALIDATION');
      }

      const totalPoolAmount =
        poolInput.funding_type === 'per_player'
          ? poolInput.funding_amount * player_count
          : poolInput.funding_amount;

      const { data, error } = await supabase
        .from('competition_prize_pools' as never)
        .insert({
          competition_id: poolInput.competition_id,
          target_type: poolInput.target_type,
          funding_type: poolInput.funding_type,
          funding_amount: poolInput.funding_amount,
          currency: poolInput.currency ?? 'AUD',
          total_pool_amount: totalPoolAmount,
          status: 'draft',
          created_by: poolInput.created_by,
        } as never)
        .select()
        .single();

      if (error) {
        throw createError(`Failed to create prize pool: ${error.message}`, 'DATABASE');
      }

      const pool = data as unknown as CompetitionPrizePool;

      const placementRows = placements.map((p) => ({
        pool_id: pool.id,
        position: p.position,
        percent: p.percent,
        payout_amount: (totalPoolAmount * p.percent) / 100,
      }));

      const { error: placementError } = await supabase
        .from('prize_pool_placements' as never)
        .insert(placementRows as never);

      if (placementError) {
        await supabase
          .from('competition_prize_pools' as never)
          .delete()
          .eq('id', pool.id);
        throw createError(`Failed to create placements: ${placementError.message}`, 'DATABASE');
      }

      return pool;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pool(data.competition_id, data.target_type),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pools(data.competition_id),
      });
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(data.competition_id),
      });
    },

    onError: (error) => {
      console.error('[useCreatePrizePool] Failed to create pool:', error);
    },
  });
}

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

      const fundingType = updates.funding_type ?? currentPool.funding_type;
      const fundingAmount = updates.funding_amount ?? currentPool.funding_amount;
      const totalPoolAmount =
        fundingType === 'per_player' ? fundingAmount * player_count : fundingAmount;

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        total_pool_amount: totalPoolAmount,
      };
      if (updates.funding_type) updateData.funding_type = updates.funding_type;
      if (updates.funding_amount) updateData.funding_amount = updates.funding_amount;

      const { data, error } = await supabase
        .from('competition_prize_pools' as never)
        .update(updateData as never)
        .eq('id', poolId)
        .select()
        .single();

      if (error) {
        throw createError(`Failed to update prize pool: ${error.message}`, 'DATABASE');
      }

      const pool = data as unknown as CompetitionPrizePool;

      if (updates.placements) {
        const totalPercent = updates.placements.reduce((sum, p) => sum + p.percent, 0);
        if (Math.abs(totalPercent - 100) > 0.01) {
          throw createError('Placement percentages must sum to 100%', 'VALIDATION');
        }

        await supabase
          .from('prize_pool_placements' as never)
          .delete()
          .eq('pool_id', poolId);

        const placementRows = updates.placements.map((p) => ({
          pool_id: poolId,
          position: p.position,
          percent: p.percent,
          payout_amount: (totalPoolAmount * p.percent) / 100,
        }));

        const { error: placementError } = await supabase
          .from('prize_pool_placements' as never)
          .insert(placementRows as never);

        if (placementError) {
          throw createError(`Failed to update placements: ${placementError.message}`, 'DATABASE');
        }
      } else {
        const { error: recalcError } = await supabase.rpc(
          'recalculate_placement_amounts' as never,
          { p_pool_id: poolId } as never
        );
        if (recalcError) {
          console.warn('[useUpdatePrizePool] Failed to recalculate amounts:', recalcError);
        }
      }

      return pool;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pool(data.competition_id),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.placements(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(data.competition_id),
      });
    },

    onError: (error) => {
      console.error('[useUpdatePrizePool] Failed to update pool:', error);
    },
  });
}

export function useDeletePrizePool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poolId,
      competitionId: _competitionId,
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
        queryKey: competitionKeys.detail(variables.competitionId),
      });
    },

    onError: (error) => {
      console.error('[useDeletePrizePool] Failed to delete pool:', error);
    },
  });
}

export function useSettlePrizePool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poolId,
      competitionId,
    }: {
      poolId: string;
      competitionId: string;
    }): Promise<void> => {
      const { error } = await supabase.rpc('settle_prize_pool' as never, {
        p_pool_id: poolId,
      } as never);

      if (error) {
        throw createError(`Failed to settle prize pool: ${error.message}`, 'DATABASE');
      }
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pool(variables.competitionId),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.placements(variables.poolId),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.transactions(variables.poolId),
      });
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(variables.competitionId),
      });
    },

    onError: (error) => {
      console.error('[useSettlePrizePool] Failed to settle pool:', error);
    },
  });
}

/**
 * Settle a competition's prize pool by writing final positions and invoking
 * the matching settle RPC. Dispatches by pool target_type:
 *   - 'individual': writes competition_players.final_position, calls settle_prize_pool
 *   - 'team':       writes teams.final_position, calls settle_team_prize_pool
 *
 * Ties at paying positions are broken arbitrarily by the RPC's `LIMIT 1`.
 * Callers should warn the user before invoking when ties exist.
 */
export function useSettleCompetitionPayouts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poolId,
      competitionId,
      target,
      standings,
    }: {
      poolId: string;
      competitionId: string;
      target: 'individual' | 'team';
      /**
       * Standings to commit. `participantId` is the player id (individual)
       * or team id (team) depending on target.
       */
      standings: { participantId: string; position: number }[];
    }): Promise<void> => {
      if (target === 'individual') {
        for (const standing of standings) {
          const { error: updateError } = await supabase
            .from('competition_players' as never)
            // @ts-expect-error - Supabase types don't cover partial updates well
            .update({ final_position: standing.position })
            .eq('competition_id', competitionId)
            .eq('player_id', standing.participantId);

          if (updateError) {
            throw createError(
              `Failed to set final position for player: ${updateError.message}`,
              'DATABASE'
            );
          }
        }

        const { error: rpcError } = await supabase.rpc('settle_prize_pool' as never, {
          p_pool_id: poolId,
        } as never);

        if (rpcError) {
          throw createError(`Failed to settle prize pool: ${rpcError.message}`, 'DATABASE');
        }
      } else {
        for (const standing of standings) {
          const { error: updateError } = await supabase
            .from('teams' as never)
            // @ts-expect-error - Supabase types don't cover partial updates well
            .update({ final_position: standing.position })
            .eq('competition_id', competitionId)
            .eq('id', standing.participantId);

          if (updateError) {
            throw createError(
              `Failed to set final position for team: ${updateError.message}`,
              'DATABASE'
            );
          }
        }

        const { error: rpcError } = await supabase.rpc(
          'settle_team_prize_pool' as never,
          { p_pool_id: poolId } as never
        );

        if (rpcError) {
          throw createError(
            `Failed to settle team prize pool: ${rpcError.message}`,
            'DATABASE'
          );
        }
      }
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pool(variables.competitionId, variables.target),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pools(variables.competitionId),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.placements(variables.poolId),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.transactions(variables.poolId),
      });
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(variables.competitionId),
      });
    },

    onError: (error) => {
      console.error('[useSettleCompetitionPayouts] Failed to settle payouts:', error);
    },
  });
}

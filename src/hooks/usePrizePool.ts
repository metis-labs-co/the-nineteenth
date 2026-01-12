/**
 * TanStack Query hooks for Competition Prize Pools
 *
 * Provides hooks for fetching and mutating prize pool data.
 * Prize pools fund skins games and other competition prizes.
 *
 * Hooks:
 * - Query: useCompetitionPrizePool, usePoolTransactions, usePoolBalance, usePoolAllocationSummary, useCanDrawFromPool
 * - Mutation: useCreatePrizePool, useUpdatePrizePool, useDeletePrizePool, useAutoSplitPool
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { prizePoolKeys, roundKeys, skinsKeys, competitionKeys } from '@/hooks/queryKeys';
import type {
  CompetitionPrizePool,
  PoolTransaction,
  CreatePrizePoolInput,
  UpdatePrizePoolInput,
  PoolAllocationSummary,
  PoolBalanceSummary,
  PoolTransactionType,
} from '@/types/database/prizePool.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Error type for prize pool service operations
 */
export interface PrizePoolServiceError extends Error {
  code: 'NOT_FOUND' | 'VALIDATION' | 'DATABASE' | 'PERMISSION' | 'LOCKED' | 'UNKNOWN';
}

/**
 * Options for filtering pool transactions
 */
export interface PoolTransactionsOptions {
  /** Maximum number of transactions to return */
  limit?: number;
  /** Filter by transaction type */
  type?: PoolTransactionType;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Creates a typed PrizePoolServiceError
 */
function createError(
  message: string,
  code: PrizePoolServiceError['code']
): PrizePoolServiceError {
  const error = new Error(message) as PrizePoolServiceError;
  error.code = code;
  return error;
}

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Query hook to fetch prize pool for a competition
 *
 * @param competitionId - Competition UUID
 * @returns Query result with CompetitionPrizePool or null
 *
 * @example
 * ```tsx
 * function CompetitionDetails({ competitionId }: { competitionId: string }) {
 *   const { data: pool, isLoading } = useCompetitionPrizePool(competitionId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!pool) return <Text>No prize pool configured</Text>;
 *
 *   return (
 *     <View>
 *       <Text>Total Pool: ${pool.total_pool_amount}</Text>
 *       <Text>Skins Budget: ${pool.skins_budget}</Text>
 *     </View>
 *   );
 * }
 * ```
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
        if (error.code === 'PGRST116') return null; // Not found
        throw createError(`Failed to fetch prize pool: ${error.message}`, 'DATABASE');
      }

      return pool as unknown as CompetitionPrizePool;
    },
    enabled: !!competitionId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch pool transactions
 *
 * Returns transactions with optional filtering.
 *
 * @param poolId - Prize pool UUID
 * @param options - Filter options (limit, type)
 * @returns Query result with array of PoolTransaction
 *
 * @example
 * ```tsx
 * function PoolTransactionList({ poolId }: { poolId: string }) {
 *   const { data: transactions } = usePoolTransactions(poolId, {
 *     limit: 20,
 *     type: 'skins_draw',
 *   });
 *
 *   return transactions?.map(tx => (
 *     <TransactionRow key={tx.id} transaction={tx} />
 *   ));
 * }
 * ```
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
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch current pool balances
 *
 * Calls get_pool_balance RPC for accurate balance calculation.
 *
 * @param poolId - Prize pool UUID
 * @returns Query result with PoolBalanceSummary
 *
 * @example
 * ```tsx
 * function PoolBalanceCard({ poolId }: { poolId: string }) {
 *   const { data: balance } = usePoolBalance(poolId);
 *
 *   return (
 *     <View>
 *       <Text>Total: ${balance?.total}</Text>
 *       <Text>Skins Remaining: ${balance?.skins_remaining}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function usePoolBalance(poolId: string | undefined) {
  return useQuery({
    queryKey: prizePoolKeys.balance(poolId ?? ''),
    queryFn: async (): Promise<PoolBalanceSummary | null> => {
      if (!poolId) return null;

      // Fetch pool to get budgets
      // Note: Using 'as never' pattern because these tables/functions are not yet in generated types
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

      // Get remaining balances using RPC calls
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

      // Count transactions
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
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to calculate pool allocation summary
 *
 * Returns allocations with used/remaining amounts.
 *
 * @param competitionId - Competition UUID
 * @returns Query result with PoolAllocationSummary
 *
 * @example
 * ```tsx
 * function AllocationBreakdown({ competitionId }: { competitionId: string }) {
 *   const { data: summary } = usePoolAllocationSummary(competitionId);
 *
 *   return (
 *     <View>
 *       <AllocationBar
 *         label="Skins"
 *         percent={summary?.skins.percent}
 *         used={summary?.skins.used}
 *         remaining={summary?.skins.remaining}
 *       />
 *       <AllocationBar
 *         label="Winner"
 *         percent={summary?.winner.percent}
 *         used={summary?.winner.used}
 *         remaining={summary?.winner.remaining}
 *       />
 *     </View>
 *   );
 * }
 * ```
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

      // Calculate used amounts
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
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Query hook to check if an amount can be drawn from pool
 *
 * Validates against skins budget remaining.
 *
 * @param poolId - Prize pool UUID
 * @param amount - Amount to check
 * @returns Query result with boolean
 *
 * @example
 * ```tsx
 * function SkinsPotInput({ poolId, value, onChange }: Props) {
 *   const { data: canDraw } = useCanDrawFromPool(poolId, value);
 *
 *   return (
 *     <View>
 *       <TextInput value={value} onChangeText={onChange} />
 *       {!canDraw && <Text style={styles.error}>Exceeds available budget</Text>}
 *     </View>
 *   );
 * }
 * ```
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
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 60 * 1000,
    retry: 1,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Mutation hook to create a new prize pool
 *
 * Creates pool with funding configuration and allocations.
 *
 * @returns Mutation result with create function
 *
 * @example
 * ```tsx
 * function CreatePoolButton({ competitionId, playerCount }: Props) {
 *   const { mutate: createPool, isPending } = useCreatePrizePool();
 *
 *   const handleCreate = () => {
 *     createPool(
 *       {
 *         competition_id: competitionId,
 *         funding_type: 'per_player',
 *         funding_amount: 50,
 *         skins_allocation_percent: 60,
 *         winner_allocation_percent: 30,
 *         other_allocation_percent: 10,
 *         auto_split_skins: true,
 *       },
 *       {
 *         onSuccess: (pool) => {
 *           Alert.alert('Success', `Pool created: $${pool.total_pool_amount}`);
 *         },
 *       }
 *     );
 *   };
 *
 *   return <Button onPress={handleCreate} loading={isPending}>Create Pool</Button>;
 * }
 * ```
 */
export function useCreatePrizePool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreatePrizePoolInput & { created_by: string; player_count: number }
    ): Promise<CompetitionPrizePool> => {
      const { player_count, ...poolInput } = input;

      // Validate allocations sum
      const totalAllocation =
        poolInput.skins_allocation_percent +
        (poolInput.winner_allocation_percent ?? 0) +
        (poolInput.other_allocation_percent ?? 0);

      if (totalAllocation > 100) {
        throw createError('Allocation percentages cannot exceed 100%', 'VALIDATION');
      }

      // Calculate total pool amount
      const totalPoolAmount =
        poolInput.funding_type === 'per_player'
          ? poolInput.funding_amount * player_count
          : poolInput.funding_amount;

      // Calculate budgets
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

    onSuccess: (data) => {
      // Invalidate pool query for this competition
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pool(data.competition_id),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.summary(data.competition_id),
      });
      // Invalidate competition details so UI updates immediately
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(data.competition_id),
      });
    },

    onError: (error) => {
      console.error('[useCreatePrizePool] Failed to create pool:', error);
    },
  });
}

/**
 * Mutation hook to update a prize pool
 *
 * Only allowed if pool is not locked.
 *
 * @returns Mutation result with update function
 *
 * @example
 * ```tsx
 * function EditPoolForm({ pool }: { pool: CompetitionPrizePool }) {
 *   const { mutate: updatePool, isPending } = useUpdatePrizePool();
 *
 *   const handleSave = (updates: UpdatePrizePoolInput) => {
 *     updatePool(
 *       { poolId: pool.id, updates, player_count: 8 },
 *       {
 *         onSuccess: () => Alert.alert('Saved!'),
 *         onError: (err) => {
 *           if (err.code === 'LOCKED') {
 *             Alert.alert('Cannot edit', 'Pool is locked after round starts');
 *           }
 *         },
 *       }
 *     );
 *   };
 *
 *   return pool.is_locked ? <Text>Pool is locked</Text> : <Form onSubmit={handleSave} />;
 * }
 * ```
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
      // Fetch current pool to check lock status
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

      // Build update object
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

      // Update funding if changed
      const fundingType = updates.funding_type ?? currentPool.funding_type;
      const fundingAmount = updates.funding_amount ?? currentPool.funding_amount;

      if (updates.funding_type) updateData.funding_type = updates.funding_type;
      if (updates.funding_amount) updateData.funding_amount = updates.funding_amount;

      // Recalculate total pool amount
      const totalPoolAmount =
        fundingType === 'per_player' ? fundingAmount * player_count : fundingAmount;
      updateData.total_pool_amount = totalPoolAmount;

      // Update allocations if changed
      const skinsPercent =
        updates.skins_allocation_percent ?? currentPool.skins_allocation_percent;
      const winnerPercent =
        updates.winner_allocation_percent ?? currentPool.winner_allocation_percent;
      const otherPercent =
        updates.other_allocation_percent ?? currentPool.other_allocation_percent;

      // Validate total allocation
      if (skinsPercent + winnerPercent + otherPercent > 100) {
        throw createError('Allocation percentages cannot exceed 100%', 'VALIDATION');
      }

      if (updates.skins_allocation_percent !== undefined)
        updateData.skins_allocation_percent = updates.skins_allocation_percent;
      if (updates.winner_allocation_percent !== undefined)
        updateData.winner_allocation_percent = updates.winner_allocation_percent;
      if (updates.other_allocation_percent !== undefined)
        updateData.other_allocation_percent = updates.other_allocation_percent;

      // Recalculate budgets
      updateData.skins_budget = (totalPoolAmount * skinsPercent) / 100;
      updateData.winner_budget = (totalPoolAmount * winnerPercent) / 100;
      updateData.other_budget = (totalPoolAmount * otherPercent) / 100;

      // Update auto-split if changed
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

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.pool(data.competition_id),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.balance(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: prizePoolKeys.summary(data.competition_id),
      });
      // Invalidate competition details so UI updates immediately
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(data.competition_id),
      });
    },

    onError: (error) => {
      console.error('[useUpdatePrizePool] Failed to update pool:', error);
    },
  });
}

/**
 * Mutation hook to delete a prize pool
 *
 * Only allowed if pool is not locked.
 *
 * @returns Mutation result with delete function
 *
 * @example
 * ```tsx
 * function DeletePoolButton({ pool }: { pool: CompetitionPrizePool }) {
 *   const { mutate: deletePool, isPending } = useDeletePrizePool();
 *
 *   const handleDelete = () => {
 *     Alert.alert('Delete Pool?', 'This cannot be undone', [
 *       { text: 'Cancel', style: 'cancel' },
 *       {
 *         text: 'Delete',
 *         style: 'destructive',
 *         onPress: () => deletePool({ poolId: pool.id, competitionId: pool.competition_id }),
 *       },
 *     ]);
 *   };
 *
 *   return pool.is_locked ? null : <Button onPress={handleDelete}>Delete Pool</Button>;
 * }
 * ```
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
      // Check lock status first
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
      // Invalidate competition details so UI updates immediately
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
 *
 * Calculates skins_pot_per_round based on skins budget and round count.
 * Optionally creates skins games for each scheduled round.
 *
 * @returns Mutation result with auto-split function
 *
 * @example
 * ```tsx
 * function AutoSplitButton({ pool, rounds }: Props) {
 *   const { mutate: autoSplit, isPending } = useAutoSplitPool();
 *
 *   return (
 *     <Button
 *       onPress={() =>
 *         autoSplit({
 *           poolId: pool.id,
 *           roundCount: rounds.length,
 *         })
 *       }
 *       loading={isPending}
 *     >
 *       Auto-Split for {rounds.length} Rounds
 *     </Button>
 *   );
 * }
 * ```
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

      // Call RPC function to auto-split
      const { error: rpcError } = await supabase.rpc('auto_split_pool_for_skins' as never, {
        p_pool_id: poolId,
        p_round_count: roundCount,
      } as never);

      if (rpcError) {
        throw createError(`Failed to auto-split pool: ${rpcError.message}`, 'DATABASE');
      }

      // Fetch updated pool
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
      // Also invalidate skins games as auto-split may affect them
      queryClient.invalidateQueries({
        queryKey: skinsKeys.all,
      });
      // Invalidate competition details so UI updates immediately
      queryClient.invalidateQueries({
        queryKey: competitionKeys.detail(data.competition_id),
      });
    },

    onError: (error) => {
      console.error('[useAutoSplitPool] Failed to auto-split:', error);
    },
  });
}

// =====================================================
// UTILITY HOOKS
// =====================================================

/**
 * Utility hook to draw from pool for a skins game
 *
 * Creates a pool transaction and returns the drawn amount.
 *
 * @returns Mutation result with draw function
 *
 * @example
 * ```tsx
 * function CreateSkinsFromPool({ poolId, roundId }: Props) {
 *   const { mutate: drawFromPool, isPending } = useDrawFromPool();
 *
 *   const handleCreate = () => {
 *     drawFromPool(
 *       {
 *         poolId,
 *         roundId,
 *         amount: 60,
 *       },
 *       {
 *         onSuccess: (drawnAmount) => {
 *           // Create skins game with drawnAmount
 *         },
 *       }
 *     );
 *   };
 * }
 * ```
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
 *
 * Creates a skins_return transaction.
 *
 * @returns Mutation result with return function
 *
 * @example
 * ```tsx
 * function ReturnCarryover({ poolId, roundId, carryover }: Props) {
 *   const { mutate: returnToPool, isPending } = useReturnToPool();
 *
 *   return (
 *     <Button
 *       onPress={() =>
 *         returnToPool({
 *           poolId,
 *           roundId,
 *           amount: carryover,
 *           description: 'Round carryover returned',
 *         })
 *       }
 *       loading={isPending}
 *     >
 *       Return ${carryover} to Pool
 *     </Button>
 *   );
 * }
 * ```
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

// =====================================================
// SKINS ALLOCATION STATUS
// =====================================================

/**
 * Details of skins allocation for a single round
 */
export interface RoundSkinsAllocation {
  /** Round ID */
  roundId: string;
  /** Round number */
  roundNumber: number;
  /** Amount drawn from pool (0 if no skins game or direct pot) */
  poolDrawAmount: number;
  /** Whether this round has a skins game from the pool */
  hasPoolSkins: boolean;
  /** Status of the skins game */
  status: 'none' | 'active' | 'completed' | 'cancelled';
}

/**
 * Skins allocation status across all competition rounds
 */
export interface SkinsAllocationStatus {
  /** Total skins budget from the prize pool */
  totalBudget: number;
  /** Total amount already drawn for skins games */
  totalAllocated: number;
  /** Remaining budget available for new skins games */
  remainingBudget: number;
  /** Whether any budget is available */
  hasAvailableBudget: boolean;
  /** Per-round allocation details */
  roundAllocations: RoundSkinsAllocation[];
  /** Number of rounds with pool-sourced skins */
  roundsWithPoolSkins: number;
  /** Total number of rounds in the competition */
  totalRounds: number;
}

/**
 * Query hook to get skins allocation status for a competition
 *
 * Returns detailed information about how the skins budget has been
 * allocated across rounds, including which rounds have pool-sourced
 * skins games and how much budget remains.
 *
 * @param competitionId - Competition UUID
 * @returns Query result with SkinsAllocationStatus
 *
 * @example
 * ```tsx
 * function SkinsAllocationOverview({ competitionId }: { competitionId: string }) {
 *   const { data: allocation, isLoading } = useSkinsAllocationStatus(competitionId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!allocation) return null;
 *
 *   return (
 *     <View>
 *       <Text>Budget: ${allocation.totalBudget}</Text>
 *       <Text>Allocated: ${allocation.totalAllocated}</Text>
 *       <Text>Remaining: ${allocation.remainingBudget}</Text>
 *       {!allocation.hasAvailableBudget && (
 *         <Text style={{ color: 'orange' }}>
 *           No pool budget remaining. New skins games will be direct pot.
 *         </Text>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useSkinsAllocationStatus(competitionId: string | undefined) {
  return useQuery({
    queryKey: [...prizePoolKeys.summary(competitionId ?? ''), 'skinsAllocation'],
    queryFn: async (): Promise<SkinsAllocationStatus | null> => {
      if (!competitionId) return null;

      // 1. Get the prize pool for this competition
      const { data: pool, error: poolError } = await supabase
        .from('competition_prize_pools' as never)
        .select('id, skins_budget')
        .eq('competition_id', competitionId)
        .single();

      if (poolError) {
        if (poolError.code === 'PGRST116') {
          // No pool configured - return empty allocation
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

      // 2. Get all rounds for this competition
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

      // 3. Get skins games for these rounds (only pool-sourced)
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

      // Create a map of round_id -> skins game data
      const skinsGameMap = new Map(
        skinsGamesList.map(g => [g.round_id, g])
      );

      // 4. Build round allocations
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

      // 5. Calculate totals
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
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

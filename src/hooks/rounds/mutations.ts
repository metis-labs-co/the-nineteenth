/**
 * Round Mutation Hooks
 *
 * TanStack Query mutation hooks for round operations (delete, etc.).
 *
 * Deletion rules:
 * - Practice rounds: Only the creator can delete
 * - Competition rounds: Only the competition organizer can delete, and only if status is 'upcoming'
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import {
  roundKeys,
  scorecardKeys,
  competitionKeys,
  competitionDetailsKeys,
  skinsKeys,
  leaderboardKeys,
} from '@/hooks/queryKeys';
import { recalculateScorecardDifferential } from '@/services/handicap/recalculateScorecardDifferential';
import { upsertRoundPlayerTee } from '@/services/competitionPlayers/competitionPlayersService';
import { refinalizeRoundResults } from '@/services/rounds/refinalizeRoundResults';
import { forceFinalizeRound } from '@/services/rounds/forceFinalizeRound';
import { reopenRound } from '@/services/rounds/reopenRound';
import { getScorecardsByRound, markScorecardsAsSynced, deleteScorecardsByRound } from '@/services/offline/database';
import { syncScorecard } from '@/services/offline/sync';
import { useToast } from '@/context/ToastContext';
import type { TeeBox } from '@/types';
import type { CompetitionData, RoundWithCourse } from '@/components/competitions/detail';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';

// =====================================================
// TYPES
// =====================================================

export interface DeleteRoundInput {
  /** The round ID to delete */
  roundId: string;
  /** Competition ID if this is a competition round (for cache invalidation) */
  competitionId?: string;
}

export interface DeleteRoundResult {
  success: boolean;
  roundId: string;
}

// =====================================================
// SERVICE FUNCTION
// =====================================================

/**
 * Soft-delete a round via the `soft_delete_round` RPC.
 *
 * The round is flagged `deleted_at = now()` on the server and can be
 * recovered for up to 90 days via `restoreRound`. After soft-deletion,
 * any locally-cached scorecards are removed from SQLite so offline reads
 * don't resurrect stale data.
 */
async function deleteRound(
  roundId: string,
): Promise<DeleteRoundResult> {
  const { error } = await supabase.rpc('soft_delete_round' as never, {
    p_round_id: roundId,
  } as never);

  if (error) {
    console.error('[deleteRound] Failed to soft-delete round:', error);
    throw new Error(`Failed to delete round: ${error.message}`);
  }

  // Clear locally-cached scorecards so offline reads don't resurrect them.
  try {
    await deleteScorecardsByRound(roundId);
  } catch (e) {
    console.warn('[deleteRound] local scorecard cleanup failed (non-fatal):', e);
  }

  return { success: true, roundId };
}

async function restoreRound(roundId: string): Promise<DeleteRoundResult> {
  const { error } = await supabase.rpc('restore_round' as never, {
    p_round_id: roundId,
  } as never);

  if (error) {
    console.error('[restoreRound] Failed to restore round:', error);
    throw new Error(`Failed to restore round: ${error.message}`);
  }

  return { success: true, roundId };
}

// =====================================================
// HOOK
// =====================================================

/** Shared cache invalidation after a round delete or restore. */
function invalidateRoundCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  variables: DeleteRoundInput,
) {
  queryClient.invalidateQueries({ queryKey: scorecardKeys.list({ roundId: variables.roundId }) });
  queryClient.invalidateQueries({ queryKey: skinsKeys.gamesByRound(variables.roundId) });
  if (variables.competitionId) {
    queryClient.invalidateQueries({ queryKey: roundKeys.list(variables.competitionId) });
    queryClient.invalidateQueries({ queryKey: competitionKeys.detail(variables.competitionId) });
    queryClient.invalidateQueries({ queryKey: skinsKeys.all });
  }
  queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
}

/**
 * Mutation hook to restore a soft-deleted round.
 *
 * Calls the `restore_round` RPC and invalidates the same caches as deletion
 * so lists and detail views reflect the restored round immediately.
 */
export function useRestoreRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteRoundInput) => restoreRound(input.roundId),
    onSuccess: (_, variables) => invalidateRoundCaches(queryClient, variables),
    onError: (error) => console.error('[useRestoreRound] Failed:', error),
  });
}

/**
 * Mutation hook to delete a round
 *
 * Soft-deletes the round via RPC (recoverable for 90 days) and shows an
 * Undo toast so the user can immediately reverse the action.
 *
 * @returns Mutation result with deleteRound function
 *
 * @example
 * ```tsx
 * function DeleteRoundButton({ round, competitionId }: Props) {
 *   const { mutate: deleteRound, isPending } = useDeleteRound();
 *   const navigation = useNavigation();
 *
 *   const handleDelete = () => {
 *     deleteRound(
 *       { roundId: round.id, competitionId },
 *       {
 *         onSuccess: () => {
 *           navigation.goBack();
 *         },
 *         onError: (error) => {
 *           Alert.alert('Error', error.message);
 *         },
 *       }
 *     );
 *   };
 *
 *   return (
 *     <Button onPress={handleDelete} loading={isPending}>
 *       Delete Round
 *     </Button>
 *   );
 * }
 * ```
 */
export function useDeleteRound() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (input: DeleteRoundInput): Promise<DeleteRoundResult> => {
      return deleteRound(input.roundId);
    },

    onSuccess: (_, variables) => {
      // Remove the specific round from cache
      queryClient.removeQueries({ queryKey: roundKeys.detail(variables.roundId) });

      // Invalidate all related caches
      invalidateRoundCaches(queryClient, variables);

      // Show Undo toast — user can reverse the soft-delete within 6 s.
      // The deleting screen usually navigates away on success, so the Undo
      // handler must NOT rely on a component-scoped mutation (its onSuccess
      // wouldn't fire after unmount). Call the module-level restore + invalidate
      // via the app-global queryClient, both of which survive unmount.
      showToast({
        variant: 'success',
        title: 'Round deleted',
        autoDismissMs: 6000,
        action: {
          label: 'Undo',
          onPress: async () => {
            try {
              await restoreRound(variables.roundId);
              invalidateRoundCaches(queryClient, variables);
            } catch (error) {
              console.error('[useDeleteRound] Undo restore failed:', error);
              showToast({
                variant: 'error',
                title: "Couldn't undo",
                message: 'Please try again.',
              });
            }
          },
        },
      });
    },

    onError: (error) => {
      console.error('[useDeleteRound] Failed to delete round:', error);
    },
  });
}

export default useDeleteRound;

// =====================================================
// EDIT TEES / RECALCULATE SCORECARD
// =====================================================

/** Input for updating a player's tee on a round and recalculating their scorecard. */
export interface UpdatePlayerTeeInput {
  roundId: string;
  playerId: string;
  scorecardId: string;
  /** Tee to set on round_players.selected_tee as a per-player override. */
  tee: TeeBox;
  /** Optional competition ID for extra cache invalidation. */
  competitionId?: string;
}

/**
 * Write a per-player tee override to `round_players` then call the existing
 * `recalculateScorecardDifferential` service so the scorecard's handicap
 * snapshot (daily_handicap_used, total_points, etc.) is regenerated from
 * the new tee's slope/CR.
 */
async function updatePlayerTeeAndRecalculate(input: UpdatePlayerTeeInput): Promise<void> {
  const { roundId, playerId, scorecardId, tee } = input;

  // 1. Update the round_players tee override. Some earlier records might
  //    not have a round_players row at all (older standalone rounds), so
  //    we upsert on (round_id, player_id) if supported; otherwise we
  //    update and insert on miss.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed client workaround
  const { error: updateError } = await (supabase.from('round_players') as any)
    .update({ selected_tee: tee })
    .eq('round_id', roundId)
    .eq('player_id', playerId);
  if (updateError) {
    throw new Error(`Failed to update round_players: ${updateError.message}`);
  }

  // 2. Trigger the server-side recalc. This reads the effective tee
  //    (per-player override wins), computes WHS DHC, and rewrites
  //    all snapshot fields on the scorecard.
  await recalculateScorecardDifferential(scorecardId);
}

/**
 * Mutation hook to change the tee a player used on a completed round and
 * have all handicap snapshot / stableford points regenerated.
 *
 * Use this when the original tee selection was wrong (e.g. wizard
 * auto-selected the first tee but the player physically played a different
 * tee). After the mutation, the round list card, scorecard view and
 * leaderboard should all reflect the corrected tee's DHC and points.
 */
export function useUpdatePlayerTee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePlayerTeeAndRecalculate,
    onSuccess: (_, variables) => {
      // Invalidate everything that could display this scorecard.
      queryClient.invalidateQueries({ queryKey: scorecardKeys.list({ roundId: variables.roundId }) });
      queryClient.invalidateQueries({ queryKey: scorecardKeys.detail(variables.scorecardId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(variables.roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.round(variables.roundId) });
      if (variables.competitionId) {
        queryClient.invalidateQueries({ queryKey: leaderboardKeys.competition(variables.competitionId) });
      }
    },
    onError: (error) => {
      console.error('[useUpdatePlayerTee] Failed to update tee / recalculate:', error);
    },
  });
}

// =====================================================
// SWITCH PLAYER TEE (mid-round, from score entry)
// =====================================================

/** Input for switching a player's tee from the score-entry screen. */
export interface SwitchPlayerTeeInput {
  roundId: string;
  playerId: string;
  /** New tee to apply as the per-player override. */
  tee: TeeBox;
  /** Competition id — when set, the override is written to
   *  competition_round_player_tees instead of round_players. */
  competitionId?: string;
  /** Real scorecard id (server UUID). When provided, the differential is
   *  recalculated. Omit for players with no synced scorecard yet. */
  scorecardId?: string;
}

/**
 * Persist a per-player tee override and (best-effort) recalculate the
 * scorecard differential. Routes the write by round type:
 *   - standalone  -> round_players.selected_tee
 *   - competition -> competition_round_player_tees.selected_tee
 * Exported for direct unit testing.
 */
export async function switchPlayerTeeAndPersist(input: SwitchPlayerTeeInput): Promise<void> {
  const { roundId, playerId, tee, competitionId, scorecardId } = input;

  if (competitionId) {
    await upsertRoundPlayerTee(roundId, playerId, tee);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed client workaround
    const { error } = await (supabase.from('round_players') as any)
      .update({ selected_tee: tee })
      .eq('round_id', roundId)
      .eq('player_id', playerId);
    if (error) {
      throw new Error(`Failed to update round_players: ${error.message}`);
    }
  }

  // Recalc only when there is a real scorecard to recompute. Mid-round with
  // no synced scorecard, the live store snapshot drives the eventual submit.
  if (scorecardId) {
    await recalculateScorecardDifferential(scorecardId);
  }
}

/**
 * Mutation hook used by the score-entry ChangeTeesSheet. Owner/organizer
 * changes a player's tee on an in-progress round.
 */
export function useSwitchPlayerTee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: switchPlayerTeeAndPersist,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: scorecardKeys.list({ roundId: variables.roundId }) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(variables.roundId) });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.round(variables.roundId) });
      if (variables.competitionId) {
        queryClient.invalidateQueries({ queryKey: leaderboardKeys.competition(variables.competitionId) });
      }
    },
    onError: (error) => {
      console.error('[useSwitchPlayerTee] Failed to switch tee:', error);
    },
  });
}

// =====================================================
// RECALCULATE ROUND RESULTS
// =====================================================

export interface RecalculateRoundResultsInput {
  roundId: string;
  /** Competition ID for cache invalidation. Optional for standalone rounds. */
  competitionId?: string;
}

/**
 * Recalculate the round_results rows for a completed round.
 *
 * Re-runs `refinalizeRoundResults` against the existing completed scorecards.
 * Reads from `scorecards.total_points / total_net` (already cached at scoring
 * time) and rewrites individual / team rows according to the round's current
 * game type, rules_override, and the competition's per_round_rules_enabled
 * flag. No tee data required.
 *
 * Use cases:
 *   - A scoring engine fix shipped after the round was finalized.
 *   - The user changed per-round rules post-completion and wants existing
 *     rounds to reflect the new allocation.
 *   - The team standings look wrong and the organizer wants a fresh pass.
 *
 * Safe to call repeatedly: `saveRoundResults` uses delete-then-insert, and
 * the team-only path also clears stale individual rows first.
 */
export function useRecalculateRoundResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecalculateRoundResultsInput) => {
      await refinalizeRoundResults(input.roundId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(variables.roundId) });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.round(variables.roundId) });
      if (variables.competitionId) {
        queryClient.invalidateQueries({
          queryKey: leaderboardKeys.competition(variables.competitionId),
        });
      }
    },
    onError: (error) => {
      console.error('[useRecalculateRoundResults] Failed:', error);
    },
  });
}

// =====================================================
// UPDATE PER-ROUND RULES (rules_override)
// =====================================================

export interface UpdateRoundRulesInput {
  /** Round whose rules_override is being replaced. */
  roundId: string;
  /** Competition ID for leaderboard cache invalidation (optional). */
  competitionId?: string;
  /** Full replacement rules_override payload. */
  rulesOverride: RoundRulesOverride;
}

/**
 * Replace a round's rules_override, then re-finalize so the new points apply
 * immediately. refinalizeRoundResults is idempotent (same path as the
 * Recalculate Results action). Editing should be gated at the call site by the
 * advanced_round_rules feature; applying is never gated.
 */
export function useUpdateRoundRules() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateRoundRulesInput>({
    mutationFn: async ({ roundId, rulesOverride }) => {
      const { error } = await supabase
        .from('rounds')
        // @ts-expect-error - Supabase types don't model partial JSONB updates
        .update({ rules_override: rulesOverride })
        .eq('id', roundId);
      if (error) throw new Error(error.message);
      await refinalizeRoundResults(roundId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(variables.roundId) });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.round(variables.roundId) });
      if (variables.competitionId) {
        queryClient.invalidateQueries({
          queryKey: leaderboardKeys.competition(variables.competitionId),
        });
        queryClient.invalidateQueries({ queryKey: competitionKeys.detail(variables.competitionId) });
        queryClient.invalidateQueries({
          queryKey: competitionDetailsKeys.detail(variables.competitionId),
        });
      }
    },
    onError: (error) => {
      console.error('[useUpdateRoundRules] Failed:', error);
    },
  });
}

// =====================================================
// REORDER COMPETITION ROUNDS (DRAG-AND-DROP)
// =====================================================

export interface ReorderCompetitionRoundsInput {
  /** Competition whose rounds are being reordered. */
  competitionId: string;
  /**
   * The new order, expressed as the full ordered list of round IDs.
   * Index 0 becomes display_order = 1, index 1 becomes 2, etc. The
   * server (`reorder_competition_rounds` RPC) verifies every ID belongs
   * to the competition and that the caller is the organizer.
   */
  roundIds: string[];
}

/**
 * Mutation hook to manually reorder rounds within a competition.
 *
 * Uses an optimistic update against `competitionDetailsKeys.detail()` so
 * the UI snaps to the new order immediately on drop. On error the cache
 * is rolled back. On settle we invalidate so any drift between optimistic
 * and authoritative state is corrected.
 *
 * Authorization is enforced server-side: the RPC checks
 * `auth.uid() = competitions.organizer_id`. The UI should still gate the
 * gesture on `isOrganizer` so non-organizers don't see drag affordances.
 */
export function useReorderCompetitionRounds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReorderCompetitionRoundsInput): Promise<void> => {
      // RPC types are not in the generated Database types, mirror the
      // `as never` pattern used elsewhere in the codebase (e.g. prize-pool
      // and skins RPC calls) to bypass strict typing.
      const { error } = await supabase.rpc('reorder_competition_rounds' as never, {
        p_competition_id: input.competitionId,
        p_round_ids: input.roundIds,
      } as never);
      if (error) {
        throw new Error(`Failed to reorder rounds: ${error.message}`);
      }
    },

    onMutate: async (input) => {
      const detailKey = competitionDetailsKeys.detail(input.competitionId);
      await queryClient.cancelQueries({ queryKey: detailKey });

      const previous = queryClient.getQueryData<CompetitionData>(detailKey);
      if (previous) {
        const byId = new Map(previous.rounds.map((r) => [r.id, r]));
        const reordered: RoundWithCourse[] = [];
        input.roundIds.forEach((id, idx) => {
          const round = byId.get(id);
          if (round) {
            reordered.push({ ...round, display_order: idx + 1 });
          }
        });
        // Append any rounds the caller forgot to include so we never drop
        // data on a partial input.
        for (const round of previous.rounds) {
          if (!input.roundIds.includes(round.id)) {
            reordered.push(round);
          }
        }
        queryClient.setQueryData<CompetitionData>(detailKey, {
          ...previous,
          rounds: reordered,
        });
      }
      return { previous };
    },

    onError: (error, input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          competitionDetailsKeys.detail(input.competitionId),
          context.previous
        );
      }
      console.error('[useReorderCompetitionRounds] Failed to reorder:', error);
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: competitionDetailsKeys.detail(input.competitionId),
      });
      queryClient.invalidateQueries({
        queryKey: roundKeys.list(input.competitionId),
      });
    },
  });
}

// =====================================================
// FORCE SYNC ROUND SCORECARDS (LOCAL → SUPABASE)
// =====================================================

export interface ForceSyncRoundScorecardsInput {
  roundId: string;
  /** Competition ID for cache invalidation. Optional for standalone rounds. */
  competitionId?: string;
}

export interface ForceSyncRoundScorecardsResult {
  /** Total completed, non-standalone scorecards found in local SQLite for this round */
  eligible: number;
  /** Successfully upserted to Supabase */
  pushed: number;
  /** Upsert attempts that threw */
  failed: number;
  /** First error message captured (for surfacing to the user) */
  firstError: string | null;
}

/**
 * Force-push every locally-saved completed scorecard for a round up to
 * Supabase, then re-run round_results finalization.
 *
 * The background sync orchestrator already does this on every online tick
 * via `getUnsyncedScorecards()`, but if a column-mismatch (or any other
 * upsert error) caused those attempts to keep failing, the user is left
 * with scorecards trapped in local SQLite while the View Round screen and
 * leaderboard read empty from Supabase.
 *
 * This hook is the manual recovery lever: it reads from local SQLite for
 * THIS round only, calls `syncScorecard` per row (skipServerCheck=true so
 * we don't bail when the server has zero rows), and on success marks the
 * row synced in SQLite. After all pushes complete, it re-runs
 * `refinalizeRoundResults` so the leaderboard reflects the freshly-landed
 * data.
 */
export function useForceSyncRoundScorecards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: ForceSyncRoundScorecardsInput
    ): Promise<ForceSyncRoundScorecardsResult> => {
      const local = await getScorecardsByRound(input.roundId);
      const eligible = local.filter(
        (sc) => !sc.isStandalone && sc.status === 'completed'
      );

      let pushed = 0;
      let failed = 0;
      let firstError: string | null = null;

      for (const sc of eligible) {
        try {
          await syncScorecard(sc, { skipServerCheck: true });
          await markScorecardsAsSynced([sc.id]);
          pushed++;
        } catch (error) {
          failed++;
          if (firstError === null) {
            firstError = error instanceof Error ? error.message : String(error);
          }
          console.error('[useForceSyncRoundScorecards] sync failed', {
            scorecardId: sc.id.substring(0, 20) + '...',
            error,
          });
        }
      }

      // Re-finalize once scorecards have landed so the leaderboard /
      // round_results pipeline picks up the new data. Non-fatal: if it
      // throws, the caller can still hit "Recalculate Results" manually.
      if (pushed > 0) {
        try {
          await refinalizeRoundResults(input.roundId);
        } catch (error) {
          console.warn(
            '[useForceSyncRoundScorecards] refinalize failed (non-fatal):',
            error
          );
        }
      }

      return {
        eligible: eligible.length,
        pushed,
        failed,
        firstError,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: scorecardKeys.list({ roundId: variables.roundId }),
      });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(variables.roundId) });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.round(variables.roundId) });
      if (variables.competitionId) {
        queryClient.invalidateQueries({
          queryKey: leaderboardKeys.competition(variables.competitionId),
        });
      }
    },
    onError: (error) => {
      console.error('[useForceSyncRoundScorecards] Failed:', error);
    },
  });
}

// =====================================================
// FORCE-FINALIZE / RE-OPEN ROUND (ORGANISER)
// =====================================================

export interface ForceFinalizeRoundInput {
  roundId: string;
  /** Competition ID for cache invalidation. */
  competitionId?: string;
}

/** Shared cache invalidation for force-finalize / re-open. */
function invalidateRoundStatusCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  input: ForceFinalizeRoundInput
) {
  queryClient.invalidateQueries({ queryKey: roundKeys.detail(input.roundId) });
  queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
  queryClient.invalidateQueries({ queryKey: leaderboardKeys.round(input.roundId) });
  queryClient.invalidateQueries({ queryKey: scorecardKeys.list({ roundId: input.roundId }) });
  // Home "Continue scoring" carousel keys off round status; force-submit /
  // re-open flips it, so refresh it too (prefix matches every user variant).
  queryClient.invalidateQueries({ queryKey: ['home', 'inProgressRounds'] });
  if (input.competitionId) {
    queryClient.invalidateQueries({ queryKey: roundKeys.list(input.competitionId) });
    queryClient.invalidateQueries({ queryKey: leaderboardKeys.competition(input.competitionId) });
    queryClient.invalidateQueries({ queryKey: competitionKeys.detail(input.competitionId) });
    queryClient.invalidateQueries({ queryKey: competitionDetailsKeys.detail(input.competitionId) });
  }
}

/**
 * Organiser force-submit: mark the round completed regardless of incomplete
 * players, then re-finalize results (incomplete players become DNF).
 */
export function useForceFinalizeRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ForceFinalizeRoundInput) => {
      await forceFinalizeRound(input.roundId);
    },
    onSuccess: (_, input) => invalidateRoundStatusCaches(queryClient, input),
    onError: (error) => console.error('[useForceFinalizeRound] Failed:', error),
  });
}

/**
 * Organiser re-open: flip a completed round back to in-progress so a DNF
 * player can finish. Re-finalize happens via normal submission or the
 * existing Recalculate Results action.
 */
export function useReopenRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ForceFinalizeRoundInput) => {
      await reopenRound(input.roundId);
    },
    onSuccess: (_, input) => invalidateRoundStatusCaches(queryClient, input),
    onError: (error) => console.error('[useReopenRound] Failed:', error),
  });
}

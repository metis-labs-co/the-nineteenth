/**
 * Hook for handling round submission and mutations
 */

import { useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import type { DialogConfig } from '@/hooks/useConfirmationDialog';
import { format } from 'date-fns';
import { roundKeys, scoringPairsKeys, skinsKeys, wolfKeys } from '@/hooks/queryKeys';
import type { RoundFormData, SkinsEditState, WolfEditState } from '../types';
import { updateRound, shuffleScoringPairs } from './useEditRoundData';
import { parseAustralianDate } from '@/utils/formatting';
import { supabase } from '@/services/supabase/client';

interface UseRoundSubmissionOptions {
  roundId: string;
  competitionId?: string;
  formData: RoundFormData;
  skinsEditState: SkinsEditState;
  wolfEditState: WolfEditState;
  /** Current user ID for creating skins/wolf game */
  userId: string | undefined;
  /** Participant IDs for the skins game (competition players) */
  participantIds: string[];
  /** Prize pool ID (for pool source funding) */
  poolId?: string;
  onSuccess: () => void;
}

interface UseRoundSubmissionReturn {
  updateMutation: ReturnType<typeof useMutation<void, Error, void>>;
  shuffleMutation: ReturnType<typeof useMutation<void, Error, void>>;
  handleSubmit: () => void;
  handleShuffleScoringPairs: () => void;
  isSubmitting: boolean;
  isShuffling: boolean;
  /** Dialog config for confirmations/errors - parent should render ConfirmationDialog */
  dialogConfig: DialogConfig;
  /** Dismiss the dialog */
  dismissDialog: () => void;
}

/**
 * Handles round update and scoring pairs shuffle mutations
 */
export function useRoundSubmission({
  roundId,
  competitionId,
  formData,
  skinsEditState,
  wolfEditState,
  userId,
  participantIds,
  poolId,
  onSuccess,
}: UseRoundSubmissionOptions): UseRoundSubmissionReturn {
  const queryClient = useQueryClient();
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  /**
   * Handle skins game changes (create, update, or delete)
   */
  const handleSkinsChanges = async () => {
    // Skip if skins can't be edited (round has started)
    if (!skinsEditState.canEditSkins) return;

    const { skinsEnabled, skinsConfig, skinsPoolSource } = formData;
    const existingGameId = skinsEditState.existingSkinsGameId;

    // Calculate pool draw amount if using prize pool
    const poolDrawAmount = skinsPoolSource === 'prize_pool' && skinsConfig
      ? (skinsConfig.pot_type === 'per_hole' ? skinsConfig.pot_value * 18 : skinsConfig.pot_value)
      : 0;

    try {
      if (skinsEnabled && skinsConfig) {
        if (existingGameId) {
          // Update existing skins game
          console.log('[useRoundSubmission] Updating existing skins game:', existingGameId);
          // Note: Using 'as any' because skins_games table types haven't been regenerated yet
          const { error } = await (supabase
            .from('skins_games') as any)
            .update({
              pot_type: skinsConfig.pot_type,
              pot_value: skinsConfig.pot_value,
              currency: skinsConfig.currency || 'AUD',
              scoring_type: skinsConfig.scoring_type,
              pool_source: skinsPoolSource,
              pool_draw_amount: poolDrawAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingGameId);

          if (error) {
            console.error('[useRoundSubmission] Failed to update skins game:', error);
            throw new Error('Failed to update skins game');
          }
        } else if (userId && participantIds.length >= 2) {
          // Create new skins game
          console.log('[useRoundSubmission] Creating new skins game for round:', roundId, 'pool source:', skinsPoolSource);
          // Note: Using 'as any' because skins_games table types haven't been regenerated yet
          const { error } = await (supabase.from('skins_games') as any).insert({
            round_id: roundId,
            pairing_id: null,
            participant_ids: participantIds,
            pot_type: skinsConfig.pot_type,
            pot_value: skinsConfig.pot_value,
            currency: skinsConfig.currency || 'AUD',
            scoring_type: skinsConfig.scoring_type,
            pool_source: skinsPoolSource,
            pool_draw_amount: poolDrawAmount,
            status: 'active',
            disclaimer_accepted_at: new Date().toISOString(),
            disclaimer_accepted_by: userId,
            created_by: userId,
          });

          if (error) {
            console.error('[useRoundSubmission] Failed to create skins game:', error);
            throw new Error('Failed to create skins game');
          }

          // If using prize pool, draw from pool
          if (skinsPoolSource === 'prize_pool' && poolId && poolDrawAmount > 0) {
            try {
              await supabase.rpc('draw_from_pool' as never, {
                p_pool_id: poolId,
                p_round_id: roundId,
                p_amount: poolDrawAmount,
              } as never);
              console.log('[useRoundSubmission] Drew from pool:', poolDrawAmount);
            } catch (drawError) {
              console.error('[useRoundSubmission] Failed to draw from pool:', drawError);
              // Don't fail the skins creation, just log the error
            }
          }
        }
      } else if (!skinsEnabled && existingGameId) {
        // Delete existing skins game (user disabled skins)
        console.log('[useRoundSubmission] Deleting skins game:', existingGameId);
        // Note: Using 'as any' because skins_games table types haven't been regenerated yet
        const { error } = await (supabase
          .from('skins_games') as any)
          .delete()
          .eq('id', existingGameId);

        if (error) {
          console.error('[useRoundSubmission] Failed to delete skins game:', error);
          throw new Error('Failed to delete skins game');
        }
      }
    } catch (error) {
      // Log but don't fail the entire submission
      console.error('[useRoundSubmission] Skins operation failed:', error);
      // Re-throw to let caller know skins failed
      throw error;
    }
  };

  /**
   * Handle Wolf game changes (create, update, or delete)
   */
  const handleWolfChanges = async () => {
    // Skip if Wolf can't be edited (round has started)
    if (!wolfEditState.canEditWolf) return;

    const { wolfEnabled, wolfConfig } = formData;
    const existingGameId = wolfEditState.existingWolfGameId;

    try {
      if (wolfEnabled && wolfConfig) {
        if (existingGameId) {
          // Update existing Wolf game
          console.log('[useRoundSubmission] Updating existing Wolf game:', existingGameId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Wolf types not regenerated yet
          const { error } = await (supabase
            .from('wolf_games') as any)
            .update({
              scoring_type: wolfConfig.scoring_type,
              blind_wolf_enabled: wolfConfig.blind_wolf_enabled,
              pot_enabled: wolfConfig.pot_enabled,
              pot_value_per_point: wolfConfig.pot_value_per_point ?? 0,
              currency: wolfConfig.currency || 'AUD',
              wolf_order: wolfConfig.wolf_order ?? [],
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingGameId);

          if (error) {
            console.error('[useRoundSubmission] Failed to update Wolf game:', error);
            throw new Error('Failed to update Wolf game');
          }
        } else if (userId) {
          // Create new Wolf game
          console.log('[useRoundSubmission] Creating new Wolf game for round:', roundId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Wolf types not regenerated yet
          const { error } = await (supabase.from('wolf_games') as any).insert({
            round_id: roundId,
            scoring_type: wolfConfig.scoring_type,
            blind_wolf_enabled: wolfConfig.blind_wolf_enabled,
            pot_enabled: wolfConfig.pot_enabled,
            pot_value_per_point: wolfConfig.pot_value_per_point ?? 0,
            currency: wolfConfig.currency || 'AUD',
            wolf_order: wolfConfig.wolf_order ?? [],
            status: 'active',
            current_hole: 1,
            disclaimer_accepted_at: new Date().toISOString(),
            disclaimer_accepted_by: userId,
            created_by: userId,
          });

          if (error) {
            console.error('[useRoundSubmission] Failed to create Wolf game:', error);
            throw new Error('Failed to create Wolf game');
          }
        }
      } else if (!wolfEnabled && existingGameId) {
        // Delete existing Wolf game (user disabled Wolf)
        console.log('[useRoundSubmission] Deleting Wolf game:', existingGameId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Wolf types not regenerated yet
        const { error } = await (supabase
          .from('wolf_games') as any)
          .delete()
          .eq('id', existingGameId);

        if (error) {
          console.error('[useRoundSubmission] Failed to delete Wolf game:', error);
          throw new Error('Failed to delete Wolf game');
        }
      }
    } catch (error) {
      // Log but don't fail the entire submission
      console.error('[useRoundSubmission] Wolf operation failed:', error);
      // Re-throw to let caller know Wolf failed
      throw error;
    }
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const parsedDate = parseAustralianDate(formData.date);
      if (!parsedDate) {
        throw new Error('Invalid date format');
      }

      // Update round data
      await updateRound(roundId, {
        date: format(parsedDate, 'yyyy-MM-dd'),
        tee_time: formData.teeTime || null,
        game_type: formData.gameType,
        selected_tee: formData.selectedTee,
        scoring_pairs_required: formData.scoringPairsRequired,
        course_id: formData.courseId,
      });

      // Handle skins changes (non-blocking - log errors but don't fail submission)
      try {
        await handleSkinsChanges();
      } catch (skinsError) {
        console.error('[useRoundSubmission] Skins changes failed but round updated:', skinsError);
        // Could show a warning to user here if needed
      }

      // Handle Wolf changes (non-blocking - log errors but don't fail submission)
      try {
        await handleWolfChanges();
      } catch (wolfError) {
        console.error('[useRoundSubmission] Wolf changes failed but round updated:', wolfError);
        // Could show a warning to user here if needed
      }
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: skinsKeys.gamesByRound(roundId) });
      queryClient.invalidateQueries({ queryKey: wolfKeys.gameByRound(roundId) });
      if (competitionId) {
        queryClient.invalidateQueries({
          queryKey: ['competition', competitionId, 'details'],
        });
      }
      onSuccess();
    },
    onError: (error: Error) => {
      showAlert('Error', error.message || 'Failed to update round');
    },
  });

  // Shuffle scoring pairs mutation
  const shuffleMutation = useMutation({
    mutationFn: () => shuffleScoringPairs(roundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scoringPairsKeys.list(roundId) });
      showAlert(
        'Scoring Pairs Shuffled',
        'Existing scoring pairs have been cleared. New pairs will be auto-generated when players view the round.'
      );
    },
    onError: (error: Error) => {
      showAlert('Error', error.message || 'Failed to shuffle scoring pairs');
    },
  });

  const handleSubmit = useCallback(() => {
    if (!formData.date) {
      showAlert('Error', 'Please select a date');
      return;
    }
    updateMutation.mutate();
  }, [formData.date, updateMutation, showAlert]);

  const handleShuffleScoringPairs = useCallback(() => {
    showDialog({
      title: 'Shuffle Scoring Pairs',
      message: 'This will clear all existing scoring pairs and generate new random ones. Continue?',
      confirmLabel: 'Shuffle',
      confirmVariant: 'destructive',
      icon: 'shuffle-variant',
      onConfirm: () => {
        dismissDialog();
        shuffleMutation.mutate();
      },
    });
  }, [shuffleMutation, showDialog, dismissDialog]);

  return {
    updateMutation,
    shuffleMutation,
    handleSubmit,
    handleShuffleScoringPairs,
    isSubmitting: updateMutation.isPending,
    isShuffling: shuffleMutation.isPending,
    dialogConfig,
    dismissDialog,
  };
}

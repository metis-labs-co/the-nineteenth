/**
 * useProfileMutations - Profile Update Hook
 *
 * Handles player profile update mutations:
 * - Update name, phone, handicap
 * - Update photo URL
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { authKeys, clubKeys } from '../queryKeys';
import { fetchMyPlayer } from './utils';
import type { User } from '@supabase/supabase-js';
import type { Player } from '@/types/database.types';
import type { ProfileUpdateInput } from '@/types/auth';

/** Re-read the caller's full player row after a write. */
async function requireMyPlayer(): Promise<Player> {
  const player = await fetchMyPlayer();
  if (!player) {
    throw new Error('Player profile not found after update');
  }
  return player;
}

/**
 * Hook for profile update mutations
 *
 * @param user - Current auth user (from useAuthUser)
 * @returns Profile mutation functions and state
 */
export function useProfileMutations(user: User | null) {
  const queryClient = useQueryClient();

  /**
   * Mutation: Update player profile
   * Uses upsert to handle edge case where player record doesn't exist
   * (e.g., if the handle_new_user trigger failed during signup)
   */
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: ProfileUpdateInput): Promise<Player> => {
      if (!user?.id) {
        throw new Error('No user logged in');
      }

      // Build update object with only provided fields
      const updateData: Record<string, string | number | null> = {};

      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      if (updates.phone !== undefined) {
        updateData.phone = updates.phone || null;
      }
      if (updates.handicap !== undefined) {
        updateData.handicap = updates.handicap;
        updateData.handicap_updated_at = new Date().toISOString();
      }
      if (updates.photoUrl !== undefined) {
        updateData.photo_url = updates.photoUrl || null;
      }
      if (updates.gender !== undefined) {
        updateData.gender = updates.gender;
      }
      if (updates.golf_id !== undefined) {
        updateData.golf_id = updates.golf_id || null;
      }
      if (updates.home_club_id !== undefined) {
        updateData.home_club_id = updates.home_club_id;
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('No fields to update');
      }

      // Try update first (normal case). Only `id` is returned: private
      // columns can't be selected directly, so the full row is re-read
      // through get_my_player below.
      const { error } = await supabase
        .from('players')
        .update(updateData as unknown as never)
        .eq('id', user.id)
        .select('id')
        .single();

      if (error) {
        // If no player record found, create one via upsert (trigger may have failed)
        if (error.code === 'PGRST116') {
          console.warn('[useProfileMutations] No player record found, creating via upsert');
          // Create-if-missing (ON CONFLICT DO NOTHING), then apply the
          // update. A DO UPDATE upsert that sets private columns is rejected
          // under the players column grants; plain UPDATEs of them are fine.
          const { error: insertError } = await supabase
            .from('players')
            .upsert({
              id: user.id,
              email: user.email || '',
              name: updateData.name || user.user_metadata?.name || 'Player',
              ...updateData,
            } as unknown as never, { onConflict: 'id', ignoreDuplicates: true });

          if (insertError) {
            console.error('[useProfileMutations] Upsert failed:', insertError);
            throw insertError;
          }

          const { error: retryError } = await supabase
            .from('players')
            .update(updateData as unknown as never)
            .eq('id', user.id);

          if (retryError) {
            console.error('[useProfileMutations] Update after insert failed:', retryError);
            throw retryError;
          }
          return requireMyPlayer();
        }

        console.error('[useProfileMutations] Update failed:', error);
        throw error;
      }

      return requireMyPlayer();
    },
    onSuccess: (updatedPlayer, updates) => {
      if (user?.id) {
        queryClient.setQueryData(authKeys.player(user.id), updatedPlayer);
        // Invalidate home club cache when home_club_id changes
        if (updates.home_club_id !== undefined) {
          queryClient.invalidateQueries({ queryKey: clubKeys.homeClub(user.id) });
        }
      }
    },
    onError: (err) => {
      console.error('Profile update error:', err);
    },
  });

  return {
    // Mutations
    updateProfile: updateProfileMutation.mutateAsync,

    // Loading states
    isUpdatingProfile: updateProfileMutation.isPending,

    // Errors
    updateProfileError: updateProfileMutation.error,
  };
}

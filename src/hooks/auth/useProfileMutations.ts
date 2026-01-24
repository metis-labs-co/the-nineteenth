/**
 * useProfileMutations - Profile Update Hook
 *
 * Handles player profile update mutations:
 * - Update name, phone, handicap
 * - Update photo URL
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { authKeys } from '../queryKeys';
import type { User } from '@supabase/supabase-js';
import type { Player } from '@/types/database.types';
import type { ProfileUpdateInput } from '@/types/auth';

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

      if (Object.keys(updateData).length === 0) {
        throw new Error('No fields to update');
      }

      const { data, error } = await supabase
        .from('players')
        .update(updateData as unknown as never)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Player;
    },
    onSuccess: (updatedPlayer) => {
      if (user?.id) {
        queryClient.setQueryData(authKeys.player(user.id), updatedPlayer);
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

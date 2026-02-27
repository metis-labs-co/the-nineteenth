/**
 * useAccountDeletion - Account deletion mutation hook
 *
 * Invokes the delete-account edge function to permanently delete
 * the user's account and all associated data (GDPR Article 17).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { authKeys } from './queryKeys';

interface DeleteAccountResult {
  success: boolean;
  message: string;
}

export function useAccountDeletion() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (): Promise<DeleteAccountResult> => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete account');
      }

      return data as DeleteAccountResult;
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      // Sign out locally (auth user is already deleted server-side)
      supabase.auth.signOut();
    },
  });

  return {
    deleteAccount: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}

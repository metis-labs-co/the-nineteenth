/**
 * usePasswordReset - Password Management Hook
 *
 * Handles password reset and update flows:
 * - Request password reset email
 * - Update password (when logged in)
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import type {
  PasswordResetRequest,
  PasswordUpdateRequest,
  PasswordResetResponse,
} from '@/types/auth';

/**
 * Hook for password reset and update mutations
 *
 * @returns Password mutation functions and state
 */
export function usePasswordReset() {
  /**
   * Mutation: Request password reset email
   */
  const resetPasswordMutation = useMutation({
    mutationFn: async (request: PasswordResetRequest): Promise<PasswordResetResponse> => {
      const { email, redirectTo } = request;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo ?? 'https://thenineteenth.golf/app/auth/reset-password',
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: `Password reset link sent to ${email}. Please check your inbox.`,
      };
    },
    onError: (err: AuthError) => {
      console.error('Password reset error:', err);
    },
  });

  /**
   * Mutation: Update password (when logged in)
   */
  const updatePasswordMutation = useMutation({
    mutationFn: async (request: PasswordUpdateRequest) => {
      const { newPassword } = request;

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }
    },
    onError: (err: AuthError) => {
      console.error('Password update error:', err);
    },
  });

  return {
    // Mutations
    resetPassword: resetPasswordMutation.mutateAsync,
    updatePassword: updatePasswordMutation.mutateAsync,

    // Loading states
    isResettingPassword: resetPasswordMutation.isPending,
    isUpdatingPassword: updatePasswordMutation.isPending,

    // Errors
    resetPasswordError: resetPasswordMutation.error,
    updatePasswordError: updatePasswordMutation.error,
  };
}

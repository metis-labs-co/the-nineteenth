/**
 * AuthContext - Provides authentication state to the app
 *
 * This context:
 * - Sets up the Supabase auth state listener ONCE at app level
 * - Manages isInitializing state centrally
 * - Prevents multiple auth listeners from being created
 *
 * The useAuth hook consumes this context and adds query-based data fetching.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { authKeys } from '@/hooks/queryKeys';
import type { Session } from '@supabase/supabase-js';
import type { AuthEvent } from '@/types/auth';

// ============================================================================
// TYPES
// ============================================================================

interface AuthContextValue {
  /** Whether the auth state is still being determined */
  isInitializing: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider - Wraps app to provide auth state and set up listener
 *
 * IMPORTANT: This must be inside QueryClientProvider but wrap RootNavigator
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <AuthProvider>
 *         <RootNavigator />
 *       </AuthProvider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [isInitializing, setIsInitializing] = useState(true);

  // Set up auth state listener ONCE
  useEffect(() => {
    if (__DEV__) {
      console.log('[AuthProvider] Setting up onAuthStateChange listener (singleton)');
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthEvent, newSession: Session | null) => {
        if (__DEV__) {
          console.log('[AuthProvider] onAuthStateChange fired:', {
            event,
            hasSession: !!newSession,
            userId: newSession?.user?.id,
          });
        }

        // Update session cache
        queryClient.setQueryData(authKeys.session(), newSession);

        // Update user cache from session (avoids extra API call)
        if (newSession?.user) {
          queryClient.setQueryData(authKeys.user(), newSession.user);
        } else {
          queryClient.setQueryData(authKeys.user(), null);
        }

        // Mark initialization complete after receiving the first auth state event
        // The INITIAL_SESSION event fires immediately when the listener is set up
        if (event === 'INITIAL_SESSION') {
          if (__DEV__) {
            console.log('[AuthProvider] Received INITIAL_SESSION, setting isInitializing=false');
          }
          setIsInitializing(false);
        }

        // Clear player cache on sign out
        if (event === 'SIGNED_OUT') {
          queryClient.removeQueries({ queryKey: ['auth', 'player'] });
        }

        // Fetch player profile on sign in (not cached in session)
        if (event === 'SIGNED_IN' && newSession?.user) {
          queryClient.invalidateQueries({
            queryKey: authKeys.player(newSession.user.id),
          });
        }
      }
    );

    // Cleanup listener on unmount
    return () => {
      if (__DEV__) {
        console.log('[AuthProvider] Cleaning up onAuthStateChange listener');
      }
      authListener.subscription.unsubscribe();
    };
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ isInitializing }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access auth context
 * @throws Error if used outside AuthProvider
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

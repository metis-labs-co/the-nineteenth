/**
 * AuthContext - Provides authentication state to the app
 *
 * This context:
 * - Sets up the Supabase auth state listener ONCE at app level
 * - Manages isInitializing state centrally
 * - Prevents multiple auth listeners from being created
 * - Syncs user ID with RevenueCat for subscription management
 * - Registers push notification tokens on sign in
 *
 * The useAuth hook consumes this context and adds query-based data fetching.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase/client';
import { authKeys, pushKeys } from '@/hooks/queryKeys';
import {
  loginToRevenueCat,
  logoutFromRevenueCat,
} from '@/services/subscription/SubscriptionService';
import { pushService } from '@/services/notifications/pushService';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import type { AuthEvent } from '@/types/auth';

// ============================================================================
// PUSH NOTIFICATION CONSTANTS
// ============================================================================

/** AsyncStorage key for tracking push token registration status */
const PUSH_TOKEN_REGISTERED_KEY = '@push_token_registered';

// ============================================================================
// TYPES
// ============================================================================

interface AuthContextValue {
  /** Whether the auth state is still being determined */
  isInitializing: boolean;
}

// ============================================================================
// PUSH NOTIFICATION HELPERS
// ============================================================================

/**
 * Check if push token has already been registered on this device
 */
async function hasRegisteredPushToken(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PUSH_TOKEN_REGISTERED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark push token as registered on this device
 */
async function markPushTokenRegistered(registered: boolean): Promise<void> {
  try {
    if (registered) {
      await AsyncStorage.setItem(PUSH_TOKEN_REGISTERED_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(PUSH_TOKEN_REGISTERED_KEY);
    }
  } catch (error) {
    console.warn('[AuthProvider] Error updating push registration status:', error);
  }
}

/**
 * Attempt to register push token for a user
 *
 * This is called on sign-in and handles all the prerequisites:
 * - Checks if running on physical device
 * - Checks if already registered on this device
 * - Checks if user hasn't denied permissions
 * - Registers token with graceful error handling
 *
 * @param userId - The authenticated user's ID
 * @returns Whether registration was successful (or skipped for valid reasons)
 */
async function attemptPushTokenRegistration(userId: string): Promise<boolean> {
  // Check if running on physical device (push doesn't work on simulators)
  if (!pushService.isPhysicalDevice()) {
    if (__DEV__) {
      console.log('[AuthProvider] Push: Skipping - not a physical device');
    }
    return true; // Not an error, just skipped
  }

  // Check if already registered on this device
  const alreadyRegistered = await hasRegisteredPushToken();
  if (alreadyRegistered) {
    if (__DEV__) {
      console.log('[AuthProvider] Push: Skipping - already registered on this device');
    }
    return true; // Already done
  }

  // Check permission status before attempting registration
  const permissionStatus = await pushService.getPermissionStatus();
  if (permissionStatus === 'denied') {
    if (__DEV__) {
      console.log('[AuthProvider] Push: Skipping - permissions denied');
    }
    return true; // User denied, don't re-prompt
  }

  // Attempt registration
  if (__DEV__) {
    console.log('[AuthProvider] Push: Attempting token registration...');
  }

  const result = await pushService.registerPushToken(userId);

  if (result.success) {
    // Mark as registered in AsyncStorage
    await markPushTokenRegistered(true);
    if (__DEV__) {
      console.log('[AuthProvider] Push: Token registered successfully:', result.data?.expoToken);
    }
    return true;
  } else {
    // Log error but don't fail auth flow
    console.warn('[AuthProvider] Push: Registration failed:', result.error);
    return false;
  }
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

  // Handle deep links for email confirmation
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (__DEV__) {
        console.log('[AuthProvider] Handling deep link:', url);
      }

      try {
        const parsedUrl = Linking.parse(url);
        const { queryParams } = parsedUrl;

        if (queryParams?.token_hash && queryParams?.type) {
          const tokenHash = queryParams.token_hash as string;
          const type = queryParams.type as string;

          if (__DEV__) {
            console.log('[AuthProvider] Verifying OTP:', { type, hasToken: !!tokenHash });
          }

          // Verify the token with Supabase
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'email' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
          });

          if (error) {
            console.error('[AuthProvider] OTP verification failed:', error);
          } else if (data.session) {
            if (__DEV__) {
              console.log('[AuthProvider] OTP verification successful, user authenticated');
            }
            // Session will be handled by onAuthStateChange
          }
        }
      } catch (err) {
        console.error('[AuthProvider] Error handling deep link:', err);
      }
    };

    // Handle initial URL (app opened via deep link)
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    handleInitialUrl();

    // Listen for incoming deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

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

        // Clear player cache on sign out and log out of RevenueCat
        // Also clear push token registration status
        if (event === 'SIGNED_OUT') {
          queryClient.removeQueries({ queryKey: ['auth', 'player'] });

          // Log out of RevenueCat to clear purchase state
          logoutFromRevenueCat().catch((err) => {
            console.error('[AuthProvider] Failed to logout from RevenueCat:', err);
          });

          // Clear push token registration status so it can re-register on next sign-in
          // Note: Task 22 will handle actually unregistering the token from the database
          markPushTokenRegistered(false).catch((err) => {
            console.warn('[AuthProvider] Failed to clear push registration status:', err);
          });

          // Clear push queries
          queryClient.removeQueries({ queryKey: pushKeys.all });
        }

        // Fetch player profile on sign in (not cached in session)
        // Also sync user ID with RevenueCat for subscription management
        // And register push notification token
        if (event === 'SIGNED_IN' && newSession?.user) {
          const userId = newSession.user.id;

          queryClient.invalidateQueries({
            queryKey: authKeys.player(userId),
          });

          // Log in to RevenueCat with user ID to link purchases
          loginToRevenueCat(userId).catch((err) => {
            console.error('[AuthProvider] Failed to login to RevenueCat:', err);
          });

          // Register push notification token (non-blocking)
          attemptPushTokenRegistration(userId)
            .then((success) => {
              if (success) {
                // Invalidate push queries so usePushNotifications picks up the new token
                queryClient.invalidateQueries({ queryKey: pushKeys.all });
              }
            })
            .catch((err) => {
              // This should never throw, but catch just in case
              console.error('[AuthProvider] Unexpected error registering push token:', err);
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

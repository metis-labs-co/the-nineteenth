/**
 * Supabase Client Configuration
 *
 * Initializes the Supabase client with:
 * - AsyncStorage for session persistence
 * - Auto-refresh token handling
 * - Custom headers for mobile app
 *
 * @see https://supabase.com/docs/reference/javascript/initializing
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@/types/database.types';

// Environment variables (from .env)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
    'Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  );
}

/**
 * Supabase client instance
 *
 * Features:
 * - Type-safe database queries via Database generic
 * - Session persistence with AsyncStorage
 * - Auto-refresh tokens before expiry
 * - Automatic retry on network errors
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Use AsyncStorage for session persistence
    storage: AsyncStorage,

    // Auto-refresh tokens 60 seconds before expiry
    autoRefreshToken: true,

    // Persist session across app restarts
    persistSession: true,

    // Detect session from URL (for magic links)
    detectSessionInUrl: false, // Not needed for mobile apps
  },

  // Global settings
  global: {
    headers: {
      'X-Client-Info': 'the-nineteenth-mobile-app',
    },
  },

  // Realtime settings (for leaderboard updates)
  realtime: {
    // Reduce heartbeat for mobile to save battery
    heartbeatIntervalMs: 30000, // 30 seconds
  },
});

/**
 * Helper: Get current session
 * Returns null if not authenticated
 */
export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return null;
  }

  return data.session;
};

/**
 * Helper: Get current user
 * Returns null if not authenticated
 */
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting user:', error);
    return null;
  }

  return data.user;
};

/**
 * Helper: Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getCurrentSession();
  return session !== null;
};

/**
 * Helper: Get auth token for API calls
 * Returns null if not authenticated
 */
export const getAuthToken = async (): Promise<string | null> => {
  const session = await getCurrentSession();
  return session?.access_token ?? null;
};

/**
 * Active Round Session — persistence for resuming the score-entry screen
 * after the app is killed/relaunched.
 *
 * Set when the user enters the Scorecard screen, cleared when they exit
 * (back, submit, or delete). On cold start, RootNavigator reads this and
 * — if the session belongs to the currently signed-in user — pushes the
 * Scorecard onto the stack.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_ROUND_SESSION_KEY = '@active_round_session_v1';

export interface ActiveRoundSession {
  roundId: string;
  competitionId: string;
  isBuildAsYouPlay?: boolean;
  /** Supabase auth user id — gates restore to the matching signed-in user. */
  userId: string;
  savedAt: number;
}

export const activeRoundSession = {
  async get(): Promise<ActiveRoundSession | null> {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_ROUND_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ActiveRoundSession;
      if (!parsed?.roundId || !parsed?.competitionId || !parsed?.userId) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  async set(session: Omit<ActiveRoundSession, 'savedAt'>): Promise<void> {
    try {
      const payload: ActiveRoundSession = { ...session, savedAt: Date.now() };
      await AsyncStorage.setItem(ACTIVE_ROUND_SESSION_KEY, JSON.stringify(payload));
    } catch {
      // Best-effort: failure just means we can't restore on next launch.
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ACTIVE_ROUND_SESSION_KEY);
    } catch {
      // Best-effort.
    }
  },
};

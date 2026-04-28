import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_CAROUSEL_SEEN_KEY = 'welcome_carousel_seen_v1';

export interface UseHasSeenWelcomeReturn {
  hasSeenWelcome: boolean | null;
  markSeen: () => Promise<void>;
}

// In dev builds (Expo Go / dev client), always reshow the welcome carousel so
// it can be iterated on without manually clearing AsyncStorage between reloads.
const ALWAYS_RESHOW_IN_DEV = __DEV__;

export function useHasSeenWelcome(): UseHasSeenWelcomeReturn {
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(
    ALWAYS_RESHOW_IN_DEV ? false : null
  );

  useEffect(() => {
    if (ALWAYS_RESHOW_IN_DEV) return;

    let cancelled = false;
    AsyncStorage.getItem(WELCOME_CAROUSEL_SEEN_KEY)
      .then((value) => {
        if (!cancelled) setHasSeenWelcome(value === 'true');
      })
      .catch(() => {
        if (!cancelled) setHasSeenWelcome(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markSeen = useCallback(async () => {
    setHasSeenWelcome(true);
    if (ALWAYS_RESHOW_IN_DEV) return;
    try {
      await AsyncStorage.setItem(WELCOME_CAROUSEL_SEEN_KEY, 'true');
    } catch {
      // Swallow — worst case the carousel reshows next launch.
    }
  }, []);

  return { hasSeenWelcome, markSeen };
}

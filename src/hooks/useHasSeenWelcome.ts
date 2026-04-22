import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_CAROUSEL_SEEN_KEY = 'welcome_carousel_seen_v1';

export interface UseHasSeenWelcomeReturn {
  hasSeenWelcome: boolean | null;
  markSeen: () => Promise<void>;
}

export function useHasSeenWelcome(): UseHasSeenWelcomeReturn {
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);

  useEffect(() => {
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
    try {
      await AsyncStorage.setItem(WELCOME_CAROUSEL_SEEN_KEY, 'true');
    } catch {
      // Swallow — worst case the carousel reshows next launch.
    }
  }, []);

  return { hasSeenWelcome, markSeen };
}

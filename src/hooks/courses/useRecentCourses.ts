/**
 * useRecentCourses - AsyncStorage-backed recent course list
 *
 * Tracks the last few courses a user has selected (e.g. in the
 * create-round wizard) so they can be surfaced as quick-pick pills.
 *
 * Storage is device-local per user; no backend sync.
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import type { Club } from '@/types/database.types';
import type { CourseWithFavoriteStatus } from '@/hooks/clubs/types';

const STORAGE_KEY_PREFIX = 'recent_courses_v1:';
const MAX_RECENT_COURSES = 5;

export type RecentCourse = CourseWithFavoriteStatus & { club: Club };

interface StoredRecentCourse {
  course: RecentCourse;
  lastUsedAt: number;
}

function getStorageKey(userId: string | undefined): string | null {
  if (!userId) return null;
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

async function readRecents(userId: string | undefined): Promise<StoredRecentCourse[]> {
  const key = getStorageKey(userId);
  if (!key) return [];
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is StoredRecentCourse =>
        entry &&
        typeof entry === 'object' &&
        entry.course &&
        entry.course.id &&
        entry.course.club &&
        typeof entry.lastUsedAt === 'number'
    );
  } catch {
    return [];
  }
}

async function writeRecents(
  userId: string | undefined,
  entries: StoredRecentCourse[]
): Promise<void> {
  const key = getStorageKey(userId);
  if (!key) return;
  try {
    await AsyncStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // Swallow — recents are a nice-to-have, not critical.
  }
}

export function useRecentCourses() {
  const { user } = useAuth();
  const userId = user?.id;

  const [entries, setEntries] = useState<StoredRecentCourse[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoaded(false);
    readRecents(userId).then((loaded) => {
      if (cancelled) return;
      setEntries(loaded);
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addRecentCourse = useCallback(
    (course: RecentCourse) => {
      if (!userId) return;
      setEntries((prev) => {
        const filtered = prev.filter((entry) => entry.course.id !== course.id);
        const next: StoredRecentCourse[] = [
          { course, lastUsedAt: Date.now() },
          ...filtered,
        ].slice(0, MAX_RECENT_COURSES);
        void writeRecents(userId, next);
        return next;
      });
    },
    [userId]
  );

  const clearRecentCourses = useCallback(() => {
    if (!userId) return;
    setEntries([]);
    void writeRecents(userId, []);
  }, [userId]);

  const recentCourses: RecentCourse[] = entries
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .map((entry) => entry.course);

  return {
    recentCourses,
    addRecentCourse,
    clearRecentCourses,
    isLoaded,
  };
}

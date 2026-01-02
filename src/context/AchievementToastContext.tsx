/**
 * AchievementToastContext - Global state for achievement toast notifications
 *
 * Provides a context for showing achievement unlock toasts from anywhere in the app.
 * Manages toast queue and visibility state.
 *
 * Usage:
 * 1. Wrap app in AchievementToastProvider (in App.tsx)
 * 2. Use useAchievementToast() hook to show toasts from any component
 *
 * @example
 * ```tsx
 * // In a hook after checking achievements
 * const { showAchievementToast } = useAchievementToast();
 *
 * const result = await checkAndAward('scorecard_submitted', data);
 * if (result.hasNewRewards) {
 *   for (const achievement of result.newAchievements) {
 *     const cosmetic = result.newCosmetics.find(c => c.points_required <= currentPoints);
 *     showAchievementToast(achievement, cosmetic);
 *   }
 * }
 * ```
 */

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { navigate } from '@/navigation/navigationRef';
import type { AchievementDefinition } from '@/types/database/achievement.types';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Toast item in the queue
 */
interface ToastItem {
  id: string;
  achievement: AchievementDefinition;
  cosmetic?: CosmeticDefinition | null;
}

/**
 * Context value type
 */
interface AchievementToastContextValue {
  /**
   * Show an achievement toast
   * @param achievement - The achievement that was unlocked
   * @param cosmetic - Optional cosmetic that was unlocked
   */
  showAchievementToast: (
    achievement: AchievementDefinition,
    cosmetic?: CosmeticDefinition | null
  ) => void;

  /**
   * Show multiple achievement toasts in sequence
   * @param achievements - Array of achievements
   * @param cosmetics - Array of cosmetics (matched by index)
   */
  showMultipleToasts: (
    achievements: AchievementDefinition[],
    cosmetics?: (CosmeticDefinition | null)[]
  ) => void;

  /**
   * The currently visible toast (if any)
   */
  currentToast: ToastItem | null;

  /**
   * Whether a toast is visible
   */
  isVisible: boolean;

  /**
   * Dismiss the current toast
   */
  dismissToast: () => void;

  /**
   * Navigate to achievements screen and dismiss toast
   */
  navigateToAchievements: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AchievementToastContext = createContext<AchievementToastContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface AchievementToastProviderProps {
  children: React.ReactNode;
}

export function AchievementToastProvider({ children }: AchievementToastProviderProps) {
  // State
  const [_queue, setQueue] = useState<ToastItem[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Ref to track if we're currently processing the queue
  const isProcessingRef = useRef(false);

  // Process next toast in queue
  const processQueue = useCallback(() => {
    if (isProcessingRef.current) return;

    setQueue((currentQueue) => {
      if (currentQueue.length === 0) {
        return currentQueue;
      }

      isProcessingRef.current = true;
      const [next, ...remaining] = currentQueue;

      // Show the toast
      setCurrentToast(next);
      setIsVisible(true);

      return remaining;
    });
  }, []);

  // Show a single achievement toast
  const showAchievementToast = useCallback(
    (achievement: AchievementDefinition, cosmetic?: CosmeticDefinition | null) => {
      const toastItem: ToastItem = {
        id: `${achievement.id}-${Date.now()}`,
        achievement,
        cosmetic,
      };

      setQueue((prev) => [...prev, toastItem]);

      // Process immediately if nothing is visible
      if (!isVisible && !isProcessingRef.current) {
        setTimeout(processQueue, 0);
      }
    },
    [isVisible, processQueue]
  );

  // Show multiple toasts in sequence
  const showMultipleToasts = useCallback(
    (achievements: AchievementDefinition[], cosmetics?: (CosmeticDefinition | null)[]) => {
      const items: ToastItem[] = achievements.map((achievement, index) => ({
        id: `${achievement.id}-${Date.now()}-${index}`,
        achievement,
        cosmetic: cosmetics?.[index] ?? null,
      }));

      setQueue((prev) => [...prev, ...items]);

      // Process immediately if nothing is visible
      if (!isVisible && !isProcessingRef.current) {
        setTimeout(processQueue, 0);
      }
    },
    [isVisible, processQueue]
  );

  // Dismiss current toast and show next
  const dismissToast = useCallback(() => {
    setIsVisible(false);
    setCurrentToast(null);
    isProcessingRef.current = false;

    // Process next toast after a short delay
    setTimeout(() => {
      processQueue();
    }, 300);
  }, [processQueue]);

  // Navigate to achievements screen
  const navigateToAchievements = useCallback(() => {
    setIsVisible(false);
    setCurrentToast(null);
    isProcessingRef.current = false;

    // Clear the queue when navigating
    setQueue([]);

    // Navigate to achievements screen using navigation ref
    navigate('Achievements');
  }, []);

  // Context value
  const value = useMemo(
    () => ({
      showAchievementToast,
      showMultipleToasts,
      currentToast,
      isVisible,
      dismissToast,
      navigateToAchievements,
    }),
    [
      showAchievementToast,
      showMultipleToasts,
      currentToast,
      isVisible,
      dismissToast,
      navigateToAchievements,
    ]
  );

  return (
    <AchievementToastContext.Provider value={value}>
      {children}
    </AchievementToastContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access achievement toast functionality
 *
 * @returns Object with showAchievementToast, showMultipleToasts, and state
 * @throws Error if used outside AchievementToastProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { showAchievementToast } = useAchievementToast();
 *
 *   const handleUnlock = (achievement: AchievementDefinition) => {
 *     showAchievementToast(achievement);
 *   };
 *
 *   return <Button onPress={() => handleUnlock(someAchievement)}>Unlock</Button>;
 * }
 * ```
 */
export function useAchievementToast(): AchievementToastContextValue {
  const context = useContext(AchievementToastContext);

  if (!context) {
    throw new Error('useAchievementToast must be used within AchievementToastProvider');
  }

  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AchievementToastContext };
export type { AchievementToastContextValue, ToastItem };

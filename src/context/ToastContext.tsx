/**
 * ToastContext - Unified toast notification system
 *
 * Provides a single queue-based toast system for all in-app feedback:
 * - Notification toasts (Supabase Realtime)
 * - Achievement unlock celebrations
 * - Success/error/info feedback
 *
 * Replaces the previous split between react-native-toast-message and
 * the custom AchievementToast system with one consistent approach.
 *
 * @example
 * ```tsx
 * const { showSuccessToast, showNotificationToast } = useToast();
 *
 * showSuccessToast('Copied!', 'Invite code copied to clipboard');
 * showNotificationToast(notification, () => navigation.navigate('Notifications'));
 * ```
 */

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import type { Notification } from '@/types/database.types';
import type { AchievementDefinition } from '@/types/database/achievement.types';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';

// ============================================================================
// TYPES
// ============================================================================

export type SimpleToastVariant = 'success' | 'error' | 'info';
export type ToastVariant = 'notification' | 'achievement' | SimpleToastVariant;

interface BaseToastItem {
  id: string;
  variant: ToastVariant;
  autoDismissMs?: number;
}

export interface NotificationToastItem extends BaseToastItem {
  variant: 'notification';
  notification: Notification;
  onPress?: () => void;
}

export interface AchievementToastItem extends BaseToastItem {
  variant: 'achievement';
  achievement: AchievementDefinition;
  cosmetic?: CosmeticDefinition | null;
}

export interface SimpleToastItem extends BaseToastItem {
  variant: SimpleToastVariant;
  title: string;
  message?: string;
  icon?: string;
}

export type ToastItem = NotificationToastItem | AchievementToastItem | SimpleToastItem;

/** Omit 'id' while preserving the discriminated union */
export type ToastItemInput =
  | Omit<NotificationToastItem, 'id'>
  | Omit<AchievementToastItem, 'id'>
  | Omit<SimpleToastItem, 'id'>;

// ============================================================================
// DEFAULT DISMISS TIMES
// ============================================================================

const DEFAULT_DISMISS_MS: Record<ToastVariant, number> = {
  notification: 4000,
  achievement: 5000,
  success: 3000,
  error: 3000,
  info: 3000,
};

const INTER_TOAST_DELAY_MS = 300;

// ============================================================================
// CONTEXT VALUE
// ============================================================================

export interface ToastContextValue {
  /** Show any toast variant */
  showToast: (item: ToastItemInput) => void;

  /** Show a notification toast (Supabase Realtime) */
  showNotificationToast: (notification: Notification, onPress?: () => void) => void;

  /** Show an achievement unlock toast */
  showAchievementToast: (
    achievement: AchievementDefinition,
    cosmetic?: CosmeticDefinition | null,
  ) => void;

  /** Show multiple achievement toasts in sequence */
  showMultipleToasts: (
    achievements: AchievementDefinition[],
    cosmetics?: (CosmeticDefinition | null)[],
  ) => void;

  /** Show a success toast */
  showSuccessToast: (title: string, message?: string) => void;

  /** Show an error toast */
  showErrorToast: (title: string, message?: string) => void;

  /** The currently visible toast (if any) */
  currentToast: ToastItem | null;

  /** Whether a toast is visible */
  isVisible: boolean;

  /** Dismiss the current toast */
  dismissToast: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [_queue, setQueue] = useState<ToastItem[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isProcessingRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear auto-dismiss timer
  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

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

      // Set auto-dismiss timer
      const dismissMs = next.autoDismissMs ?? DEFAULT_DISMISS_MS[next.variant];
      clearDismissTimer();
      dismissTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        setCurrentToast(null);
        isProcessingRef.current = false;
        // Process next after inter-toast delay
        setTimeout(() => {
          // Trigger processQueue on next tick
          setQueue((q) => {
            if (q.length > 0) {
              isProcessingRef.current = false;
              // Re-trigger by updating state
            }
            return q;
          });
        }, INTER_TOAST_DELAY_MS);
      }, dismissMs);

      return remaining;
    });
  }, [clearDismissTimer]);

  // Re-process queue when items are added and nothing is showing
  const enqueue = useCallback(
    (items: ToastItem[]) => {
      setQueue((prev) => {
        const updated = [...prev, ...items];
        // Process immediately if nothing is visible
        if (!isProcessingRef.current) {
          setTimeout(processQueue, 0);
        }
        return updated;
      });
    },
    [processQueue],
  );

  // Dismiss current toast and process next
  const dismissToast = useCallback(() => {
    clearDismissTimer();
    setIsVisible(false);
    setCurrentToast(null);
    isProcessingRef.current = false;

    // Process next toast after delay
    setTimeout(() => {
      processQueue();
    }, INTER_TOAST_DELAY_MS);
  }, [clearDismissTimer, processQueue]);

  // ---- Convenience methods ----

  const showToast = useCallback(
    (item: ToastItemInput) => {
      const toastItem = { ...item, id: `toast-${Date.now()}-${Math.random()}` } as ToastItem;
      enqueue([toastItem]);
    },
    [enqueue],
  );

  const showNotificationToast = useCallback(
    (notification: Notification, onPress?: () => void) => {
      showToast({
        variant: 'notification',
        notification,
        onPress: onPress
          ? () => {
              dismissToast();
              onPress();
            }
          : undefined,
      });
    },
    [showToast, dismissToast],
  );

  const showAchievementToast = useCallback(
    (achievement: AchievementDefinition, cosmetic?: CosmeticDefinition | null) => {
      showToast({
        variant: 'achievement',
        achievement,
        cosmetic,
      });
    },
    [showToast],
  );

  const showMultipleToasts = useCallback(
    (achievements: AchievementDefinition[], cosmetics?: (CosmeticDefinition | null)[]) => {
      const items: ToastItem[] = achievements.map((achievement, index) => ({
        id: `achievement-${achievement.id}-${Date.now()}-${index}`,
        variant: 'achievement' as const,
        achievement,
        cosmetic: cosmetics?.[index] ?? null,
      }));
      enqueue(items);
    },
    [enqueue],
  );

  const showSuccessToast = useCallback(
    (title: string, message?: string) => {
      showToast({ variant: 'success', title, message });
    },
    [showToast],
  );

  const showErrorToast = useCallback(
    (title: string, message?: string) => {
      showToast({ variant: 'error', title, message });
    },
    [showToast],
  );

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      clearDismissTimer();
    };
  }, [clearDismissTimer]);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      showNotificationToast,
      showAchievementToast,
      showMultipleToasts,
      showSuccessToast,
      showErrorToast,
      currentToast,
      isVisible,
      dismissToast,
    }),
    [
      showToast,
      showNotificationToast,
      showAchievementToast,
      showMultipleToasts,
      showSuccessToast,
      showErrorToast,
      currentToast,
      isVisible,
      dismissToast,
    ],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Access the unified toast system
 *
 * @throws Error if used outside ToastProvider
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

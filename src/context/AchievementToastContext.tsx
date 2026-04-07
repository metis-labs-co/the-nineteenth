/**
 * AchievementToastContext - Facade for backward compatibility
 *
 * Delegates to the unified ToastContext. Consumers using useAchievementToast()
 * continue to work without changes.
 */

import React, { useCallback, useMemo } from 'react';
import { useToast } from '@/context/ToastContext';
import { navigate } from '@/navigation/navigationRef';
import type { AchievementDefinition } from '@/types/database/achievement.types';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';

// ============================================================================
// TYPES (preserved for backward compatibility)
// ============================================================================

interface ToastItem {
  id: string;
  achievement: AchievementDefinition;
  cosmetic?: CosmeticDefinition | null;
}

interface AchievementToastContextValue {
  showAchievementToast: (
    achievement: AchievementDefinition,
    cosmetic?: CosmeticDefinition | null,
  ) => void;
  showMultipleToasts: (
    achievements: AchievementDefinition[],
    cosmetics?: (CosmeticDefinition | null)[],
  ) => void;
  currentToast: ToastItem | null;
  isVisible: boolean;
  dismissToast: () => void;
  navigateToAchievements: () => void;
}

// ============================================================================
// PROVIDER (passthrough — ToastProvider handles everything)
// ============================================================================

interface AchievementToastProviderProps {
  children: React.ReactNode;
}

export function AchievementToastProvider({ children }: AchievementToastProviderProps) {
  return <>{children}</>;
}

// ============================================================================
// HOOK (delegates to useToast)
// ============================================================================

export function useAchievementToast(): AchievementToastContextValue {
  const toast = useToast();

  const navigateToAchievements = useCallback(() => {
    toast.dismissToast();
    navigate('Achievements');
  }, [toast]);

  // Map the current toast to the achievement-specific shape consumers expect
  const currentToast: ToastItem | null = useMemo(() => {
    if (toast.currentToast?.variant === 'achievement') {
      return {
        id: toast.currentToast.id,
        achievement: toast.currentToast.achievement,
        cosmetic: toast.currentToast.cosmetic,
      };
    }
    return null;
  }, [toast.currentToast]);

  const isVisible = toast.isVisible && toast.currentToast?.variant === 'achievement';

  return useMemo(
    () => ({
      showAchievementToast: toast.showAchievementToast,
      showMultipleToasts: toast.showMultipleToasts,
      currentToast,
      isVisible,
      dismissToast: toast.dismissToast,
      navigateToAchievements,
    }),
    [toast.showAchievementToast, toast.showMultipleToasts, currentToast, isVisible, toast.dismissToast, navigateToAchievements],
  );
}

// ============================================================================
// EXPORTS (preserved for backward compatibility)
// ============================================================================

export type { AchievementToastContextValue, ToastItem };

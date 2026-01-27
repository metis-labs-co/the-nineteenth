/**
 * useTeeSelector Hook
 *
 * Shared logic for TeeSelector variants including:
 * - Selection state management
 * - Accessibility label generation
 * - Color mapping utility
 */

import { useCallback, useMemo } from 'react';
import { useFormattedDistance } from '@/store/settingsStore';
import type { TeeBox } from '@/types/database.types';

// ===========================================================================
// TEE COLOR MAPPING
// ===========================================================================

const TEE_COLOR_MAP: Record<string, string> = {
  black: '#1a1a1a',
  blue: '#2563eb',
  white: '#f5f5f5',
  gold: '#eab308',
  yellow: '#facc15',
  red: '#dc2626',
  green: '#16a34a',
  silver: '#9ca3af',
  orange: '#ea580c',
};

/**
 * Map tee color names to actual colors
 * Handles both color names (e.g., "blue") and hex codes (e.g., "#2563eb")
 */
export const getTeeColor = (color: string, fallbackColor: string): string => {
  if (!color) return fallbackColor;

  // If it's already a hex code, use it directly
  if (color.startsWith('#')) {
    return color;
  }

  // Otherwise, try to map the color name
  return TEE_COLOR_MAP[color.toLowerCase()] ?? fallbackColor;
};

// ===========================================================================
// SELECTION LOGIC
// ===========================================================================

/**
 * Check if a tee is selected
 */
export const isTeeSelected = (
  tee: TeeBox,
  selectedTee: TeeBox | string | null
): boolean => {
  if (!selectedTee) return false;
  if (typeof selectedTee === 'string') {
    return tee.name === selectedTee;
  }
  return tee.name === selectedTee.name && tee.color === selectedTee.color;
};

// ===========================================================================
// HOOK
// ===========================================================================

interface UseTeeSelectorOptions {
  selectedTee: TeeBox | string | null;
  onSelectTee: (tee: TeeBox) => void;
}

interface UseTeeSelectorReturn {
  /** Check if a specific tee is selected */
  isSelected: (tee: TeeBox) => boolean;
  /** Handle tee selection */
  handleSelect: (tee: TeeBox) => void;
  /** Format distance for display */
  formatDistance: (yards: number) => string;
  /** Get tee color */
  getTeeColor: (color: string, fallback: string) => string;
  /** Generate accessibility label for pills variant */
  getPillAccessibilityLabel: (tee: TeeBox, showYardage: boolean) => string;
  /** Generate accessibility label for cards variant */
  getCardAccessibilityLabel: (tee: TeeBox) => string;
  /** Generate accessibility label for list variant */
  getListAccessibilityLabel: (tee: TeeBox) => string;
}

export function useTeeSelector({
  selectedTee,
  onSelectTee,
}: UseTeeSelectorOptions): UseTeeSelectorReturn {
  const { formatDistance } = useFormattedDistance();

  // Memoized selection check
  const isSelected = useCallback(
    (tee: TeeBox) => isTeeSelected(tee, selectedTee),
    [selectedTee]
  );

  // Selection handler
  const handleSelect = useCallback(
    (tee: TeeBox) => {
      onSelectTee(tee);
    },
    [onSelectTee]
  );

  // Accessibility label generators
  const getPillAccessibilityLabel = useCallback(
    (tee: TeeBox, showYardage: boolean): string => {
      let label = `${tee.name} tee`;
      if (showYardage && tee.totalYardage) {
        label += `, ${formatDistance(tee.totalYardage)}`;
      }
      return label;
    },
    [formatDistance]
  );

  const getCardAccessibilityLabel = useCallback((tee: TeeBox): string => {
    let label = `${tee.name} tee`;
    if (tee.courseRating) {
      label += `, course rating ${tee.courseRating}`;
    }
    return label;
  }, []);

  const getListAccessibilityLabel = useCallback(
    (tee: TeeBox): string => {
      let label = `${tee.name} tee`;
      if (tee.totalYardage) {
        label += `, ${formatDistance(tee.totalYardage)}`;
      }
      if (tee.courseRating) {
        label += `, course rating ${tee.courseRating}`;
      }
      if (tee.slopeRating) {
        label += `, slope ${tee.slopeRating}`;
      }
      return label;
    },
    [formatDistance]
  );

  return useMemo(
    () => ({
      isSelected,
      handleSelect,
      formatDistance,
      getTeeColor,
      getPillAccessibilityLabel,
      getCardAccessibilityLabel,
      getListAccessibilityLabel,
    }),
    [
      isSelected,
      handleSelect,
      formatDistance,
      getPillAccessibilityLabel,
      getCardAccessibilityLabel,
      getListAccessibilityLabel,
    ]
  );
}

export default useTeeSelector;

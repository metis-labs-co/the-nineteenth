/**
 * useBuildAsYouPlay - Orchestration hook for build-as-you-play mode
 *
 * Allows super admins to define course holes on-the-fly during scoring.
 * Detects unconfigured (placeholder) holes and shows a setup modal
 * before allowing score entry.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { useUpdateCourseHoles } from '@/hooks/useUpdateCourseHoles';
import type { Hole } from '@/types/database/base';

// =====================================================
// TYPES
// =====================================================

export interface UseBuildAsYouPlayParams {
  /** Whether build-as-you-play mode is active */
  enabled: boolean;
  /** Course ID for persisting hole data */
  courseId: string | null;
  /** Current holes from the scorecard store */
  holes: Hole[];
}

export interface UseBuildAsYouPlayReturn {
  /** Whether the feature is active */
  enabled: boolean;
  /** Whether the hole setup modal should be shown */
  showHoleSetupModal: boolean;
  /** The hole number pending setup */
  pendingHoleNumber: number | null;
  /** Currently selected tee name (chosen on hole 1) */
  selectedTeeName: string | null;
  /** Check if a hole is configured (not a placeholder) */
  isHoleConfigured: (holeNumber: number) => boolean;
  /** Check hole before navigation — returns true if navigation can proceed */
  checkHoleBeforeNavigation: (targetHole: number) => boolean;
  /** Save hole setup data from the modal */
  handleSaveHoleSetup: (updatedHole: Hole) => Promise<void>;
  /** Set the tee name (one-time, on hole 1) */
  handleSelectTee: (teeName: string) => void;
  /** Close the modal without saving (should not normally be used) */
  dismissModal: () => void;
  /** Whether a save is in progress */
  isSaving: boolean;
  /** Error message from the last failed save attempt */
  saveError: string | null;
  /** Set of stroke indexes already used by configured holes */
  usedStrokeIndexes: Set<number>;
  /** Number of holes that have been configured */
  configuredCount: number;
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Detect if a hole is a placeholder (unconfigured).
 * Placeholder holes have: par === 4, strokeIndex === hole.number, no yardages.
 */
function isPlaceholderHole(hole: Hole): boolean {
  const hasNoYardages = !hole.yardages || Object.keys(hole.yardages).length === 0;
  return hole.par === 4 && hole.strokeIndex === hole.number && hasNoYardages;
}

// =====================================================
// HOOK
// =====================================================

export function useBuildAsYouPlay({
  enabled,
  courseId,
  holes,
}: UseBuildAsYouPlayParams): UseBuildAsYouPlayReturn {
  const [configuredHoles, setConfiguredHoles] = useState<Set<number>>(new Set());
  const [selectedTeeName, setSelectedTeeName] = useState<string | null>(null);
  const [showHoleSetupModal, setShowHoleSetupModal] = useState(false);
  const [pendingHoleNumber, setPendingHoleNumber] = useState<number | null>(null);

  const updateCourseHolesMutation = useUpdateCourseHoles();

  // Initialize: scan holes on mount to find already-configured ones
  // and recover tee name from first configured hole's yardages
  useEffect(() => {
    if (!enabled || holes.length === 0) return;

    const configured = new Set<number>();
    let recoveredTeeName: string | null = null;

    for (const hole of holes) {
      if (!isPlaceholderHole(hole)) {
        configured.add(hole.number);
        // Recover tee name from first configured hole
        if (!recoveredTeeName && hole.yardages && Object.keys(hole.yardages).length > 0) {
          recoveredTeeName = Object.keys(hole.yardages)[0];
        }
      }
    }

    if (configured.size > 0) {
      setConfiguredHoles(configured);
    }
    if (recoveredTeeName) {
      setSelectedTeeName(recoveredTeeName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount/enabled change
  }, [enabled, holes.length]);

  // Compute used stroke indexes from configured holes only
  const usedStrokeIndexes = useMemo(() => {
    const used = new Set<number>();
    for (const hole of holes) {
      if (configuredHoles.has(hole.number)) {
        used.add(hole.strokeIndex);
      }
    }
    return used;
  }, [holes, configuredHoles]);

  const isHoleConfigured = useCallback(
    (holeNumber: number): boolean => {
      return configuredHoles.has(holeNumber);
    },
    [configuredHoles]
  );

  const checkHoleBeforeNavigation = useCallback(
    (targetHole: number): boolean => {
      if (!enabled) return true;
      if (configuredHoles.has(targetHole)) return true;

      // Block navigation and show modal
      setPendingHoleNumber(targetHole);
      setShowHoleSetupModal(true);
      return false;
    },
    [enabled, configuredHoles]
  );

  const handleSelectTee = useCallback((teeName: string) => {
    setSelectedTeeName(teeName);
  }, []);

  const handleSaveHoleSetup = useCallback(
    async (updatedHole: Hole) => {
      if (!courseId) return;

      // Reset any previous error
      updateCourseHolesMutation.reset();

      // Update the holes array with the configured hole
      const updatedHoles = holes.map((h) =>
        h.number === updatedHole.number ? updatedHole : h
      );

      try {
        // Persist to database
        await updateCourseHolesMutation.mutateAsync({
          courseId,
          holes: updatedHoles,
        });

        // Update local scorecard store
        useScorecardStore.getState().updateHoles(updatedHoles);

        // Mark hole as configured
        setConfiguredHoles((prev) => {
          const next = new Set(prev);
          next.add(updatedHole.number);
          return next;
        });

        // Close modal
        setShowHoleSetupModal(false);
        setPendingHoleNumber(null);
      } catch {
        // Error is captured by mutation state — modal stays open for retry
      }
    },
    [courseId, holes, updateCourseHolesMutation]
  );

  const dismissModal = useCallback(() => {
    setShowHoleSetupModal(false);
    setPendingHoleNumber(null);
  }, []);

  // No-op return when not enabled
  if (!enabled) {
    return {
      enabled: false,
      showHoleSetupModal: false,
      pendingHoleNumber: null,
      selectedTeeName: null,
      isHoleConfigured: () => true,
      checkHoleBeforeNavigation: () => true,
      handleSaveHoleSetup: async () => {},
      handleSelectTee: () => {},
      dismissModal: () => {},
      isSaving: false,
      saveError: null,
      usedStrokeIndexes: new Set(),
      configuredCount: 0,
    };
  }

  return {
    enabled: true,
    showHoleSetupModal,
    pendingHoleNumber,
    selectedTeeName,
    isHoleConfigured,
    checkHoleBeforeNavigation,
    handleSaveHoleSetup,
    handleSelectTee,
    dismissModal,
    isSaving: updateCourseHolesMutation.isPending,
    saveError: updateCourseHolesMutation.error
      ? (updateCourseHolesMutation.error as Error).message ?? 'Failed to save hole'
      : null,
    usedStrokeIndexes,
    configuredCount: configuredHoles.size,
  };
}

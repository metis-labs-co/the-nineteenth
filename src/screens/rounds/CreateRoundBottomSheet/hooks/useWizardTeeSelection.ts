/**
 * useWizardTeeSelection - Handles tee box selection in the wizard.
 *
 * The dedicated tee step has been removed from the UI. Tee selection is now
 * inline (in PartnersStep for groups, YourSetupStep for solo). This hook
 * provides handlers for updating the current user's tee and partner tees.
 */

import { useCallback } from 'react';
import type { TeeBox } from '@/types/database.types';
import type { WizardData } from '../types';

interface UseWizardTeeSelectionParams {
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}

export function useWizardTeeSelection({
  setData,
}: UseWizardTeeSelectionParams) {
  const handleSelectTee = useCallback((tee: TeeBox) => {
    setData((prev) => ({ ...prev, selectedTee: tee }));
  }, [setData]);

  const handleSkipTeeSelection = useCallback(() => {
    setData((prev) => ({ ...prev, selectedTee: null }));
  }, [setData]);

  /** Update a specific partner's tee selection */
  const handlePlayerTeeChange = useCallback((playerId: string, tee: TeeBox) => {
    setData((prev) => ({
      ...prev,
      selectedPartners: prev.selectedPartners.map((p) =>
        p.id === playerId ? { ...p, selectedTee: tee } : p
      ),
    }));
  }, [setData]);

  /** Update current user's tee (alias for handleSelectTee) */
  const handleCurrentUserTeeChange = useCallback((tee: TeeBox) => {
    setData((prev) => ({ ...prev, selectedTee: tee }));
  }, [setData]);

  return {
    handleSelectTee,
    handleSkipTeeSelection,
    handlePlayerTeeChange,
    handleCurrentUserTeeChange,
  };
}

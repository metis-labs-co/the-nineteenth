/**
 * useWizardTeeSelection - Handles tee box selection and skip logic in the wizard.
 *
 * Responsibilities:
 * - Select a tee box and advance to the next step
 * - Skip tee selection (no tee chosen)
 * - Auto-start round when match type and partners are pre-set
 */

import { useCallback } from 'react';
import type { TeeBox, GameType } from '@/types/database.types';
import type {
  WizardStep,
  WizardData,
  SelectedCourse,
  PlayingPartner,
} from '../types';

interface UseWizardTeeSelectionParams {
  initialMatchType?: GameType;
  skipPartnerStep?: boolean;
  setCurrentStep: React.Dispatch<React.SetStateAction<WizardStep>>;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
  startRoundWithCurrentState: (
    course: SelectedCourse,
    tee: TeeBox | null,
    partners: PlayingPartner[],
    matchType: GameType | null,
  ) => void;
}

export function useWizardTeeSelection({
  initialMatchType,
  skipPartnerStep,
  setCurrentStep,
  setData,
  startRoundWithCurrentState,
}: UseWizardTeeSelectionParams) {
  const handleSelectTee = useCallback((tee: TeeBox) => {
    if (initialMatchType && skipPartnerStep) {
      setData((prev) => {
        startRoundWithCurrentState(
          prev.selectedCourse!,
          tee,
          prev.selectedPartners,
          initialMatchType,
        );
        return { ...prev, selectedTee: tee };
      });
    } else {
      setData((prev) => ({ ...prev, selectedTee: tee }));
      setCurrentStep(initialMatchType ? 'partners' : 'matchType');
    }
  }, [initialMatchType, skipPartnerStep, startRoundWithCurrentState, setCurrentStep, setData]);

  const handleSkipTeeSelection = useCallback(() => {
    if (initialMatchType && skipPartnerStep) {
      setData((prev) => {
        startRoundWithCurrentState(
          prev.selectedCourse!,
          null,
          prev.selectedPartners,
          initialMatchType,
        );
        return { ...prev, selectedTee: null };
      });
    } else {
      setData((prev) => ({ ...prev, selectedTee: null }));
      setCurrentStep(initialMatchType ? 'partners' : 'matchType');
    }
  }, [initialMatchType, skipPartnerStep, startRoundWithCurrentState, setCurrentStep, setData]);

  return {
    handleSelectTee,
    handleSkipTeeSelection,
  };
}

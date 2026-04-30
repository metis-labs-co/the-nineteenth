/**
 * useCompetitionWizardState
 *
 * Manages the wizard step flow and data:
 * - Current step tracking
 * - Step completion handlers
 * - Back/reset navigation
 */

import { useEffect } from 'react';
import { useCompetitionWizardStore, clearWizardDraft } from '@/store/competitionWizardStore';
import type { WizardData, WizardPrizePoolConfig } from '@/store/competitionWizardStore';
import { useConfirmationDialog } from '@/hooks';
import { BASE_STEPS } from '../types';

import type {
  CompetitionDetailsFormData,
  SimplifiedRoundFormData,
  PlayerFormData,
} from '@/schemas/competition';

interface UseCompetitionWizardStateParams {
  initialState?: WizardData;
  onGoBack: () => void;
}

export function useCompetitionWizardState({
  initialState,
  onGoBack,
}: UseCompetitionWizardStateParams) {
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // Wizard state from Zustand store for session persistence
  const {
    currentStep,
    wizardData,
    setCurrentStep,
    setStep1,
    setStep2,
    setPlayers,
    setPrizePoolConfig,
    initializeFromRouteParams,
    hasDraft,
  } = useCompetitionWizardStore();

  // Initialize store from route params (from AI competition flow)
  useEffect(() => {
    if (initialState && !hasDraft) {
      initializeFromRouteParams(initialState);
    }
  }, [initialState, hasDraft, initializeFromRouteParams]);

  // Steps are static now — the prize pool step is always shown
  const STEPS = BASE_STEPS;

  // Handle step completion
  const handleStep1Complete = (data: CompetitionDetailsFormData) => {
    setStep1(data);
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: SimplifiedRoundFormData[]) => {
    setStep2(data);
    setCurrentStep(3);
  };

  const handlePlayersComplete = (data: PlayerFormData[]) => {
    const wizardPlayers = data.map((p) => ({
      id: p.id || '',
      name: p.name,
      email: p.email || null,
      handicap: p.handicap ? parseFloat(p.handicap) : null,
      photo_url: null,
      is_placeholder: false,
    }));
    setPlayers(wizardPlayers);
    setCurrentStep(4);
  };

  const handlePlayersSkip = () => {
    setPlayers([]);
    setCurrentStep(4);
  };

  const handlePrizePoolComplete = (data: WizardPrizePoolConfig) => {
    setPrizePoolConfig(data);
    setCurrentStep(5);
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentStep === 1) {
      onGoBack();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle form reset
  const handleReset = () => {
    showDialog({
      title: 'Reset Form',
      message: 'Are you sure you want to reset the form? All entered data will be lost.',
      confirmLabel: 'Reset',
      confirmVariant: 'destructive',
      icon: 'refresh',
      onConfirm: () => {
        dismissDialog();
        clearWizardDraft();
        setCurrentStep(1);
      },
    });
  };

  return {
    currentStep,
    wizardData,
    STEPS,
    handleStep1Complete,
    handleStep2Complete,
    handlePlayersComplete,
    handlePlayersSkip,
    handlePrizePoolComplete,
    handleBack,
    handleReset,
    // Dialog passthrough
    dialogConfig,
    showAlert,
    dismissDialog,
  };
}

/**
 * useCompetitionWizardState
 *
 * Manages the wizard step flow and data:
 * - Current step tracking
 * - Step completion handlers
 * - Dynamic step list (with/without prize pool)
 * - Back/reset navigation
 */

import { useEffect, useMemo } from 'react';
import { useCompetitionWizardStore, clearWizardDraft } from '@/store/competitionWizardStore';
import type { WizardData } from '@/store/competitionWizardStore';
import { useConfirmationDialog } from '@/hooks';
import { BASE_STEPS, PRIZE_POOL_STEP } from '../types';

import type {
  CompetitionDetailsFormData,
  SimplifiedRoundFormData,
  PrizePoolConfigFormData,
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

  // Check if prize pool is enabled to determine step count
  const hasPrizePool = wizardData.step1?.enablePrizePool ?? false;

  // Build dynamic steps array based on prize pool toggle
  const STEPS = useMemo(() => {
    if (hasPrizePool) {
      return [
        BASE_STEPS[0], // Details
        BASE_STEPS[1], // Rounds
        BASE_STEPS[2], // Players
        PRIZE_POOL_STEP, // Prize Pool (inserted)
        { ...BASE_STEPS[3], number: 5 }, // Review (renumbered)
      ];
    }
    return BASE_STEPS;
  }, [hasPrizePool]);

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
    const prizePoolEnabled = wizardData.step1?.enablePrizePool ?? false;
    setCurrentStep(prizePoolEnabled ? 4 : 4);
  };

  const handlePlayersSkip = () => {
    setPlayers([]);
    const prizePoolEnabled = wizardData.step1?.enablePrizePool ?? false;
    setCurrentStep(prizePoolEnabled ? 4 : 4);
  };

  const handlePrizePoolComplete = (data: PrizePoolConfigFormData) => {
    setPrizePoolConfig(data);
    setCurrentStep(5);
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentStep === 1) {
      onGoBack();
    } else if (hasPrizePool && currentStep === 5) {
      setCurrentStep(4);
    } else if (!hasPrizePool && currentStep === 4) {
      setCurrentStep(3);
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
    hasPrizePool,
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

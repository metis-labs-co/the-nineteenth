import { useState, useCallback, useMemo, useEffect } from 'react';
import type { UseWizardOptions, UseWizardReturn } from './types';

/**
 * useWizard - Step navigation hook for FullScreenWizard
 *
 * Manages which step you're on and how to move between steps.
 * Domain state (form data, selections, etc.) stays in each wizard's own hook.
 *
 * @example
 * const wizard = useWizard({
 *   steps: stepConfigs,
 *   onSubmit: handleCreate,
 *   onClose: () => navigation.goBack(),
 * });
 */
export function useWizard({ steps, onSubmit, onClose }: UseWizardOptions): UseWizardReturn {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Clamp index if steps array shrinks (dynamic steps)
  const clampedIndex = Math.min(currentStepIndex, Math.max(0, steps.length - 1));

  useEffect(() => {
    if (clampedIndex !== currentStepIndex) {
      setCurrentStepIndex(clampedIndex);
    }
  }, [clampedIndex, currentStepIndex]);

  const currentStep = steps[clampedIndex];
  const isFirstStep = clampedIndex === 0;
  const isLastStep = clampedIndex === steps.length - 1;

  const goNext = useCallback(() => {
    const step = steps[clampedIndex];
    if (!step.canProceed) return;

    if (step.isSubmit || clampedIndex === steps.length - 1) {
      onSubmit();
    } else {
      setCurrentStepIndex(clampedIndex + 1);
    }
  }, [steps, clampedIndex, onSubmit]);

  const goBack = useCallback(() => {
    if (clampedIndex === 0) {
      onClose();
    } else {
      setCurrentStepIndex(clampedIndex - 1);
    }
  }, [clampedIndex, onClose]);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < steps.length) {
        setCurrentStepIndex(index);
      }
    },
    [steps.length]
  );

  return useMemo(
    () => ({
      currentStepIndex: clampedIndex,
      currentStep,
      steps,
      goNext,
      goBack,
      goToStep,
      isFirstStep,
      isLastStep,
      totalSteps: steps.length,
    }),
    [clampedIndex, currentStep, steps, goNext, goBack, goToStep, isFirstStep, isLastStep]
  );
}

import type { ReactNode } from 'react';

/**
 * Configuration for a single wizard step
 */
export interface WizardStepConfig {
  /** Unique step identifier */
  key: string;
  /** Title shown in the progress bar label */
  title: string;
  /** Whether the user can proceed to the next step */
  canProceed: boolean;
  /** Render function for the step content */
  render: () => ReactNode;
  /** Override the "Next" button text (e.g. "Create League") */
  nextLabel?: string;
  /** True for the final step — calls onSubmit instead of advancing */
  isSubmit?: boolean;
}

/**
 * Options for the useWizard hook
 */
export interface UseWizardOptions {
  /** Array of step configurations (can be dynamic) */
  steps: WizardStepConfig[];
  /** Called when the final step's submit/next is pressed */
  onSubmit: () => void;
  /** Called when user closes the wizard (X button or back from first step) */
  onClose: () => void;
}

/**
 * Return value from the useWizard hook
 */
export interface UseWizardReturn {
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Current step config */
  currentStep: WizardStepConfig;
  /** All step configs (pass-through for FullScreenWizard) */
  steps: WizardStepConfig[];
  /** Advance to the next step (no-op if canProceed is false) */
  goNext: () => void;
  /** Go back one step, or call onClose if on first step */
  goBack: () => void;
  /** Jump to a specific step by index */
  goToStep: (index: number) => void;
  /** Whether current step is the first step */
  isFirstStep: boolean;
  /** Whether current step is the last step */
  isLastStep: boolean;
  /** Total number of steps */
  totalSteps: number;
}

/**
 * Props for the FullScreenWizard component
 */
export interface FullScreenWizardProps {
  /** Wizard title shown in the header */
  title: string;
  /** Wizard state from useWizard() */
  wizard: UseWizardReturn;
  /** Content to render (typically wizard.currentStep.render()) */
  children: ReactNode;
  /** Whether the content area should scroll (default: true) */
  scrollable?: boolean;
  /** Whether to show the footer (default: true) */
  showFooter?: boolean;
  /** Whether the submit action is loading */
  isSubmitting?: boolean;
  /** Close handler for the X button in the top-right corner. Shows on all steps. */
  onClose?: () => void;
}

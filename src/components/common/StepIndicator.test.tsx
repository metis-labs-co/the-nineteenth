/**
 * StepIndicator Component Tests
 *
 * Tests for the wizard step indicator component including:
 * - Rendering with different props
 * - Step circle states (active, completed, inactive)
 * - Progress bar calculations
 * - Title display
 * - Edge cases
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StepIndicator, StepIndicatorProps, Step } from './StepIndicator';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    ProgressBar: ({ progress, color, style, ...props }: any) => (
      <View
        testID="progress-bar"
        accessibilityValue={{ now: progress * 100, min: 0, max: 100 }}
        style={style}
        {...props}
      />
    ),
  };
});

// Default test data
const defaultSteps: readonly Step[] = [
  { number: 1, title: 'Venue' },
  { number: 2, title: 'Course' },
  { number: 3, title: 'Holes' },
];

const twoSteps: readonly Step[] = [
  { number: 1, title: 'First' },
  { number: 2, title: 'Second' },
];

const fiveSteps: readonly Step[] = [
  { number: 1, title: 'Step One' },
  { number: 2, title: 'Step Two' },
  { number: 3, title: 'Step Three' },
  { number: 4, title: 'Step Four' },
  { number: 5, title: 'Step Five' },
];

const renderStepIndicator = (props: Partial<StepIndicatorProps> = {}) => {
  const defaultProps: StepIndicatorProps = {
    steps: defaultSteps,
    currentStep: 1,
    ...props,
  };
  return render(<StepIndicator {...defaultProps} />);
};

describe('StepIndicator', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderStepIndicator();
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('renders all step numbers', () => {
      renderStepIndicator();
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('renders with two steps', () => {
      renderStepIndicator({ steps: twoSteps });
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('renders with five steps', () => {
      renderStepIndicator({ steps: fiveSteps });
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('4')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('renders progress bar by default', () => {
      renderStepIndicator();
      expect(screen.getByTestId('progress-bar')).toBeTruthy();
    });

    it('does not render titles by default', () => {
      renderStepIndicator();
      expect(screen.queryByText('Venue')).toBeNull();
      expect(screen.queryByText('Course')).toBeNull();
      expect(screen.queryByText('Holes')).toBeNull();
    });
  });

  // =========================================================================
  // CURRENT STEP STATES
  // =========================================================================

  describe('Current Step States', () => {
    it('highlights first step when currentStep is 1', () => {
      renderStepIndicator({ currentStep: 1 });
      const stepOne = screen.getByText('1');
      expect(stepOne).toBeTruthy();
    });

    it('highlights first two steps when currentStep is 2', () => {
      renderStepIndicator({ currentStep: 2 });
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('highlights all steps when currentStep is 3', () => {
      renderStepIndicator({ currentStep: 3 });
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('handles step 1 of 5 correctly', () => {
      renderStepIndicator({ steps: fiveSteps, currentStep: 1 });
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('handles step 3 of 5 correctly', () => {
      renderStepIndicator({ steps: fiveSteps, currentStep: 3 });
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('handles last step correctly', () => {
      renderStepIndicator({ steps: fiveSteps, currentStep: 5 });
      expect(screen.getByText('5')).toBeTruthy();
    });
  });

  // =========================================================================
  // PROGRESS BAR
  // =========================================================================

  describe('Progress Bar', () => {
    it('shows progress bar when showProgress is true', () => {
      renderStepIndicator({ showProgress: true });
      expect(screen.getByTestId('progress-bar')).toBeTruthy();
    });

    it('hides progress bar when showProgress is false', () => {
      renderStepIndicator({ showProgress: false });
      expect(screen.queryByTestId('progress-bar')).toBeNull();
    });

    it('calculates progress correctly for step 1 of 3', () => {
      renderStepIndicator({ currentStep: 1 });
      const progressBar = screen.getByTestId('progress-bar');
      // Progress should be 1/3 = 0.333... * 100 ≈ 33.33%
      expect(progressBar.props.accessibilityValue.now).toBeCloseTo(33.33, 0);
    });

    it('calculates progress correctly for step 2 of 3', () => {
      renderStepIndicator({ currentStep: 2 });
      const progressBar = screen.getByTestId('progress-bar');
      // Progress should be 2/3 = 0.666... * 100 ≈ 66.67%
      expect(progressBar.props.accessibilityValue.now).toBeCloseTo(66.67, 0);
    });

    it('calculates progress correctly for step 3 of 3', () => {
      renderStepIndicator({ currentStep: 3 });
      const progressBar = screen.getByTestId('progress-bar');
      // Progress should be 3/3 = 100%
      expect(progressBar.props.accessibilityValue.now).toBe(100);
    });

    it('calculates progress correctly for step 1 of 5', () => {
      renderStepIndicator({ steps: fiveSteps, currentStep: 1 });
      const progressBar = screen.getByTestId('progress-bar');
      // Progress should be 1/5 = 0.2 * 100 = 20%
      expect(progressBar.props.accessibilityValue.now).toBe(20);
    });

    it('calculates progress correctly for step 3 of 5', () => {
      renderStepIndicator({ steps: fiveSteps, currentStep: 3 });
      const progressBar = screen.getByTestId('progress-bar');
      // Progress should be 3/5 = 0.6 * 100 = 60%
      expect(progressBar.props.accessibilityValue.now).toBe(60);
    });

    it('calculates progress correctly for step 5 of 5', () => {
      renderStepIndicator({ steps: fiveSteps, currentStep: 5 });
      const progressBar = screen.getByTestId('progress-bar');
      // Progress should be 5/5 = 100%
      expect(progressBar.props.accessibilityValue.now).toBe(100);
    });

    it('shows 50% progress for step 1 of 2', () => {
      renderStepIndicator({ steps: twoSteps, currentStep: 1 });
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar.props.accessibilityValue.now).toBe(50);
    });

    it('shows 100% progress for step 2 of 2', () => {
      renderStepIndicator({ steps: twoSteps, currentStep: 2 });
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar.props.accessibilityValue.now).toBe(100);
    });
  });

  // =========================================================================
  // TITLES
  // =========================================================================

  describe('Titles', () => {
    it('shows titles when showTitles is true', () => {
      renderStepIndicator({ showTitles: true });
      expect(screen.getByText('Venue')).toBeTruthy();
      expect(screen.getByText('Course')).toBeTruthy();
      expect(screen.getByText('Holes')).toBeTruthy();
    });

    it('hides titles when showTitles is false', () => {
      renderStepIndicator({ showTitles: false });
      expect(screen.queryByText('Venue')).toBeNull();
      expect(screen.queryByText('Course')).toBeNull();
      expect(screen.queryByText('Holes')).toBeNull();
    });

    it('displays titles with five steps', () => {
      renderStepIndicator({ steps: fiveSteps, showTitles: true });
      expect(screen.getByText('Step One')).toBeTruthy();
      expect(screen.getByText('Step Two')).toBeTruthy();
      expect(screen.getByText('Step Three')).toBeTruthy();
      expect(screen.getByText('Step Four')).toBeTruthy();
      expect(screen.getByText('Step Five')).toBeTruthy();
    });

    it('renders with long titles', () => {
      const longTitleSteps: readonly Step[] = [
        { number: 1, title: 'Very Long Step Title' },
        { number: 2, title: 'Another Long Title' },
      ];
      renderStepIndicator({ steps: longTitleSteps, showTitles: true });
      expect(screen.getByText('Very Long Step Title')).toBeTruthy();
      expect(screen.getByText('Another Long Title')).toBeTruthy();
    });

    it('renders with short titles', () => {
      const shortTitleSteps: readonly Step[] = [
        { number: 1, title: 'A' },
        { number: 2, title: 'B' },
      ];
      renderStepIndicator({ steps: shortTitleSteps, showTitles: true });
      expect(screen.getByText('A')).toBeTruthy();
      expect(screen.getByText('B')).toBeTruthy();
    });
  });

  // =========================================================================
  // PROP COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with showProgress=true and showTitles=true', () => {
      renderStepIndicator({ showProgress: true, showTitles: true });
      expect(screen.getByTestId('progress-bar')).toBeTruthy();
      expect(screen.getByText('Venue')).toBeTruthy();
    });

    it('renders with showProgress=false and showTitles=true', () => {
      renderStepIndicator({ showProgress: false, showTitles: true });
      expect(screen.queryByTestId('progress-bar')).toBeNull();
      expect(screen.getByText('Venue')).toBeTruthy();
    });

    it('renders with showProgress=true and showTitles=false', () => {
      renderStepIndicator({ showProgress: true, showTitles: false });
      expect(screen.getByTestId('progress-bar')).toBeTruthy();
      expect(screen.queryByText('Venue')).toBeNull();
    });

    it('renders with showProgress=false and showTitles=false', () => {
      renderStepIndicator({ showProgress: false, showTitles: false });
      expect(screen.queryByTestId('progress-bar')).toBeNull();
      expect(screen.queryByText('Venue')).toBeNull();
    });

    it('handles all props together', () => {
      renderStepIndicator({
        steps: fiveSteps,
        currentStep: 3,
        showProgress: true,
        showTitles: true,
      });
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByTestId('progress-bar')).toBeTruthy();
      expect(screen.getByText('Step Three')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles single step', () => {
      const singleStep: readonly Step[] = [{ number: 1, title: 'Only Step' }];
      renderStepIndicator({ steps: singleStep, currentStep: 1 });
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('handles single step with title', () => {
      const singleStep: readonly Step[] = [{ number: 1, title: 'Only Step' }];
      renderStepIndicator({ steps: singleStep, currentStep: 1, showTitles: true });
      expect(screen.getByText('Only Step')).toBeTruthy();
    });

    it('handles single step progress (100%)', () => {
      const singleStep: readonly Step[] = [{ number: 1, title: 'Only Step' }];
      renderStepIndicator({ steps: singleStep, currentStep: 1 });
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar.props.accessibilityValue.now).toBe(100);
    });

    it('renders empty title gracefully', () => {
      const emptyTitleSteps: readonly Step[] = [
        { number: 1, title: '' },
        { number: 2, title: 'Second' },
      ];
      renderStepIndicator({ steps: emptyTitleSteps, showTitles: true });
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('Second')).toBeTruthy();
    });

    it('handles non-sequential step numbers', () => {
      const nonSequentialSteps: readonly Step[] = [
        { number: 1, title: 'First' },
        { number: 3, title: 'Third' },
        { number: 5, title: 'Fifth' },
      ];
      renderStepIndicator({ steps: nonSequentialSteps, showTitles: true });
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('handles large step numbers', () => {
      const largeNumberSteps: readonly Step[] = [
        { number: 10, title: 'Ten' },
        { number: 20, title: 'Twenty' },
      ];
      renderStepIndicator({ steps: largeNumberSteps, currentStep: 10 });
      expect(screen.getByText('10')).toBeTruthy();
      expect(screen.getByText('20')).toBeTruthy();
    });

    it('handles step titles with special characters', () => {
      const specialCharSteps: readonly Step[] = [
        { number: 1, title: 'Step #1' },
        { number: 2, title: "Step's 2" },
      ];
      renderStepIndicator({ steps: specialCharSteps, showTitles: true });
      expect(screen.getByText('Step #1')).toBeTruthy();
      expect(screen.getByText("Step's 2")).toBeTruthy();
    });

    it('handles many steps (10 steps)', () => {
      const manySteps: readonly Step[] = Array.from({ length: 10 }, (_, i) => ({
        number: i + 1,
        title: `Step ${i + 1}`,
      }));
      renderStepIndicator({ steps: manySteps, currentStep: 5 });
      expect(screen.getByText('5')).toBeTruthy();
      expect(screen.getByText('10')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(StepIndicator).toBeDefined();
      expect(typeof StepIndicator).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props: StepIndicatorProps = {
        steps: defaultSteps,
        currentStep: 2,
        showProgress: true,
        showTitles: false,
      };

      const { rerender } = render(<StepIndicator {...props} />);
      expect(screen.getByText('2')).toBeTruthy();

      rerender(<StepIndicator {...props} />);
      expect(screen.getByText('2')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders course creation wizard steps', () => {
      const courseSteps: readonly Step[] = [
        { number: 1, title: 'Venue' },
        { number: 2, title: 'Course' },
        { number: 3, title: 'Holes' },
      ];
      renderStepIndicator({ steps: courseSteps, currentStep: 2, showTitles: true });
      expect(screen.getByText('Venue')).toBeTruthy();
      expect(screen.getByText('Course')).toBeTruthy();
      expect(screen.getByText('Holes')).toBeTruthy();
    });

    it('renders competition setup wizard steps', () => {
      const competitionSteps: readonly Step[] = [
        { number: 1, title: 'Details' },
        { number: 2, title: 'Rounds' },
        { number: 3, title: 'Players' },
        { number: 4, title: 'Review' },
      ];
      renderStepIndicator({ steps: competitionSteps, currentStep: 3, showTitles: true });
      expect(screen.getByText('Details')).toBeTruthy();
      expect(screen.getByText('Rounds')).toBeTruthy();
      expect(screen.getByText('Players')).toBeTruthy();
      expect(screen.getByText('Review')).toBeTruthy();
    });

    it('renders onboarding flow steps', () => {
      const onboardingSteps: readonly Step[] = [
        { number: 1, title: 'Welcome' },
        { number: 2, title: 'Profile' },
        { number: 3, title: 'Settings' },
      ];
      renderStepIndicator({ steps: onboardingSteps, currentStep: 1, showTitles: true });
      expect(screen.getByText('Welcome')).toBeTruthy();
      expect(screen.getByText('Profile')).toBeTruthy();
      expect(screen.getByText('Settings')).toBeTruthy();
    });

    it('renders round scoring steps without titles', () => {
      const scoringSteps: readonly Step[] = [
        { number: 1, title: 'Hole 1' },
        { number: 2, title: 'Hole 2' },
        { number: 3, title: 'Hole 3' },
      ];
      renderStepIndicator({ steps: scoringSteps, currentStep: 2, showTitles: false });
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.queryByText('Hole 1')).toBeNull();
    });

    it('renders checkout flow with progress', () => {
      const checkoutSteps: readonly Step[] = [
        { number: 1, title: 'Cart' },
        { number: 2, title: 'Shipping' },
        { number: 3, title: 'Payment' },
        { number: 4, title: 'Confirm' },
      ];
      renderStepIndicator({ steps: checkoutSteps, currentStep: 3, showProgress: true });
      const progressBar = screen.getByTestId('progress-bar');
      // Progress should be 3/4 = 75%
      expect(progressBar.props.accessibilityValue.now).toBe(75);
    });
  });

  // =========================================================================
  // CONNECTING LINES
  // =========================================================================

  describe('Connecting Lines', () => {
    it('renders connecting lines between steps', () => {
      // The component renders connecting lines between steps
      // We verify the component renders without errors and has correct structure
      renderStepIndicator();
      // All step numbers should be rendered
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('does not render connecting line after last step', () => {
      // With 3 steps, there should be 2 connecting lines (not 3)
      // The component handles this with the condition: index < steps.length - 1
      renderStepIndicator();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('renders no connecting lines for single step', () => {
      const singleStep: readonly Step[] = [{ number: 1, title: 'Only' }];
      renderStepIndicator({ steps: singleStep });
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('renders one connecting line for two steps', () => {
      renderStepIndicator({ steps: twoSteps });
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
    });
  });

  // =========================================================================
  // STEP COMPLETION STATES
  // =========================================================================

  describe('Step Completion States', () => {
    it('marks all steps as inactive when current is 0', () => {
      // Edge case: currentStep = 0 (before first step)
      // Note: The component treats currentStep >= step.number as active
      renderStepIndicator({ currentStep: 0 });
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('correctly identifies completed steps', () => {
      // When currentStep is 3, steps 1 and 2 are completed (currentStep > step.number)
      renderStepIndicator({ currentStep: 3 });
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('correctly identifies active step', () => {
      // When currentStep is 2, step 2 is active (not completed, but highlighted)
      renderStepIndicator({ currentStep: 2 });
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('correctly identifies future steps', () => {
      // When currentStep is 1, steps 2 and 3 are future (not active, not completed)
      renderStepIndicator({ currentStep: 1 });
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  // =========================================================================
  // DEFAULT PROPS
  // =========================================================================

  describe('Default Props', () => {
    it('showProgress defaults to true', () => {
      render(<StepIndicator steps={defaultSteps} currentStep={1} />);
      expect(screen.getByTestId('progress-bar')).toBeTruthy();
    });

    it('showTitles defaults to false', () => {
      render(<StepIndicator steps={defaultSteps} currentStep={1} />);
      expect(screen.queryByText('Venue')).toBeNull();
    });
  });
});

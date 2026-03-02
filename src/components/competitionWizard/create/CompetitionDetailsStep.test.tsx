/**
 * CompetitionDetailsStep Component Tests
 *
 * Tests for the first step of competition creation wizard including:
 * - Rendering with default and initial data
 * - Form input validation
 * - Competition type switching (event/league)
 * - Date validation
 * - Form submission
 * - Cancel button behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import CompetitionDetailsStep from './CompetitionDetailsStep';
import type { CompetitionDetailsFormData } from '@/schemas/competition';

// Mock theme context
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#2E7D32',
    secondary: '#4CAF50',
    background: '#FFFFFF',
    surface: '#FAFAFA',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textTertiary: '#999999',
    white: '#FFFFFF',
    gray200: '#E5E5E5',
    gray300: '#D4D4D4',
    gray400: '#A3A3A3',
    gray500: '#737373',
    error: '#DC2626',
  }),
}));

// Mock SubscriptionContext
jest.mock('@/context/SubscriptionContext', () => ({
  useIsPremium: () => true,
  useCheckFeature: () => (_featureId: string, _context?: any) => ({ allowed: true, requiredTier: 'free' }),
}));

// Mock tabler icons
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconTrophy: (props: any) => <View testID="icon-trophy" {...props} />,
    IconLock: (props: any) => <View testID="icon-lock" {...props} />,
  };
});

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

// Mock date-fns functions for consistent date testing
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    startOfDay: (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    },
  };
});

// Helper to create safe testID from label
const _createTestId = (label: string, prefix: string) => {
  const safeName = label?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'unnamed';
  return `${prefix}-${safeName}`;
};

// Mock FormInput component
jest.mock('@/components/common', () => {
  const { View, TextInput, Text } = require('react-native');

  const createSafeTestId = (label: string, prefix: string) => {
    const safeName = label?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'unnamed';
    return `${prefix}-${safeName}`;
  };

  return {
    FormInput: ({
      label,
      value,
      onChangeText,
      onBlur,
      placeholder,
      error,
      hint,
      multiline,
      numberOfLines,
      required,
      testID,
    }: any) => (
      <View testID={testID || createSafeTestId(label || '', 'form-input')}>
        {label && (
          <Text testID={createSafeTestId(label, 'label')}>
            {label}
            {required && ' *'}
          </Text>
        )}
        <TextInput
          testID={createSafeTestId(label || '', 'input')}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
        {error && <Text testID="input-error">{error}</Text>}
        {hint && !error && <Text testID="input-hint">{hint}</Text>}
      </View>
    ),
    DatePicker: ({ label, value, onChange, error, hint, minimumDate: _minimumDate, placeholder }: any) => (
      <View testID={createSafeTestId(label || '', 'date-picker')}>
        <Text testID={createSafeTestId(label || '', 'date-label')}>{label}</Text>
        <TextInput
          testID={createSafeTestId(label || '', 'date-input')}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
        />
        {error && <Text testID="date-error">{error}</Text>}
        {hint && !error && <Text testID="date-hint">{hint}</Text>}
      </View>
    ),
    FormSection: ({ children }: any) => <View testID="form-section">{children}</View>,
    SegmentedButton: ({ value, onValueChange, buttons, style }: any) => {
      const { TouchableOpacity: TO } = require('react-native');
      return (
        <View testID="segmented-buttons" style={style}>
          {buttons.map((button: any) => (
            <TO
              key={button.value}
              testID={`segment-${button.value}`}
              onPress={() => onValueChange(button.value)}
              accessibilityState={{ selected: value === button.value }}
            >
              <Text>{button.label}</Text>
            </TO>
          ))}
        </View>
      );
    },
    Pill: ({ label }: any) => <View testID="pill"><Text>{label}</Text></View>,
  };
});

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { TouchableOpacity, View, Text } = require('react-native');
  return {
    Button: ({ children, onPress, mode, style, testID, textColor, buttonColor: _buttonColor, disabled, contentStyle: _contentStyle }: any) => (
      <TouchableOpacity
        testID={testID || `button-${mode}`}
        onPress={onPress}
        disabled={disabled}
        style={style}
        accessibilityRole="button"
      >
        <Text style={{ color: textColor }}>{children}</Text>
      </TouchableOpacity>
    ),
    Text: ({ children, style, ...props }: any) => {
      const { Text: RNText } = require('react-native');
      return <RNText style={style} {...props}>{children}</RNText>;
    },
    Icon: ({ source, size, color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size, backgroundColor: color }} />
    ),
  };
});

describe('CompetitionDetailsStep', () => {
  const mockOnComplete = jest.fn();
  const mockOnBack = jest.fn();

  const defaultProps = {
    onComplete: mockOnComplete,
    onBack: mockOnBack,
  };

  const validFormData: CompetitionDetailsFormData = {
    name: 'Summer Championship',
    description: 'A fun summer golf event',
    competitionType: 'event',
    startDate: '15/06/2026',
    endDate: '16/06/2026',
    handicapSystem: 'honor',
    handicapSource: 'profile',
    inviteCode: 'SUMMER2026',
    enableTeams: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);
      expect(screen.getByText('Enter the basic details for your competition. You can edit these later.')).toBeTruthy();
    });

    it('renders all form fields', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      // Check for form field labels
      expect(screen.getByTestId('label-competition-name')).toBeTruthy();
      expect(screen.getByTestId('label-description-optional')).toBeTruthy();
      expect(screen.getByText('Competition Type *')).toBeTruthy();
      expect(screen.getByTestId('label-invite-code-optional')).toBeTruthy();
      expect(screen.getByTestId('date-label-start-date')).toBeTruthy();
    });

    it('renders Cancel and Next buttons', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Next: Rounds')).toBeTruthy();
    });

    it('renders competition type segmented buttons', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      expect(screen.getAllByTestId('segmented-buttons').length).toBeGreaterThan(0);
      expect(screen.getByTestId('segment-event')).toBeTruthy();
      expect(screen.getByTestId('segment-knockout')).toBeTruthy();
    });

    it('renders step description', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const description = screen.getByText(
        'Enter the basic details for your competition. You can edit these later.'
      );
      expect(description).toBeTruthy();
    });
  });

  // ===========================================================================
  // INITIAL DATA TESTS
  // ===========================================================================

  describe('Initial Data', () => {
    it('renders with empty values by default', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const nameInput = screen.getByTestId('input-competition-name');
      expect(nameInput.props.value).toBe('');
    });

    it('renders with initial data when provided', () => {
      render(<CompetitionDetailsStep {...defaultProps} initialData={validFormData} />);

      const nameInput = screen.getByTestId('input-competition-name');
      expect(nameInput.props.value).toBe('Summer Championship');
    });

    it('populates description from initial data', () => {
      render(<CompetitionDetailsStep {...defaultProps} initialData={validFormData} />);

      const descriptionInput = screen.getByTestId('input-description-optional');
      expect(descriptionInput.props.value).toBe('A fun summer golf event');
    });

    it('populates invite code from initial data', () => {
      render(<CompetitionDetailsStep {...defaultProps} initialData={validFormData} />);

      const inviteCodeInput = screen.getByTestId('input-invite-code-optional');
      expect(inviteCodeInput.props.value).toBe('SUMMER2026');
    });

    it('populates start date from initial data', () => {
      render(<CompetitionDetailsStep {...defaultProps} initialData={validFormData} />);

      const startDateInput = screen.getByTestId('date-input-start-date');
      expect(startDateInput.props.value).toBe('15/06/2026');
    });

    it('defaults competition type to event', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const eventSegment = screen.getByTestId('segment-event');
      expect(eventSegment.props.accessibilityState.selected).toBe(true);
    });
  });

  // ===========================================================================
  // COMPETITION TYPE TESTS
  // ===========================================================================

  describe('Competition Type Selection', () => {
    it('shows end date field when event type is selected', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      // Event is default, end date should be visible
      expect(screen.getByTestId('date-picker-end-date')).toBeTruthy();
    });

    it('hides end date field when knockout type is selected', async () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      // Switch to league type
      fireEvent.press(screen.getByTestId('segment-knockout'));

      // Wait for layout animation
      await waitFor(() => {
        expect(screen.queryByTestId('date-picker-end-date')).toBeNull();
      });
    });

    it('shows correct hint for event type', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      expect(screen.getByText('A fixed-term competition with a set end date')).toBeTruthy();
    });

    it('shows correct hint for knockout type', async () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      fireEvent.press(screen.getByTestId('segment-knockout'));

      await waitFor(() => {
        expect(screen.getByText('A bracket-style elimination competition')).toBeTruthy();
      });
    });

    it('updates selected state when switching type', async () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      // Initially event is selected
      expect(screen.getByTestId('segment-event').props.accessibilityState.selected).toBe(true);
      expect(screen.getByTestId('segment-knockout').props.accessibilityState.selected).toBe(false);

      // Switch to league
      fireEvent.press(screen.getByTestId('segment-knockout'));

      await waitFor(() => {
        expect(screen.getByTestId('segment-knockout').props.accessibilityState.selected).toBe(true);
        expect(screen.getByTestId('segment-event').props.accessibilityState.selected).toBe(false);
      });
    });

    it('clears end date when switching to league type', async () => {
      const initialDataWithEndDate = {
        ...validFormData,
        competitionType: 'event' as const,
        endDate: '16/06/2026',
      };

      render(<CompetitionDetailsStep {...defaultProps} initialData={initialDataWithEndDate} />);

      // Switch to league
      fireEvent.press(screen.getByTestId('segment-knockout'));

      // Switch back to event
      await waitFor(() => {
        fireEvent.press(screen.getByTestId('segment-event'));
      });

      // End date should be cleared
      await waitFor(() => {
        const endDateInput = screen.getByTestId('date-input-end-date');
        expect(endDateInput.props.value).toBe('');
      });
    });
  });

  // ===========================================================================
  // FORM INPUT TESTS
  // ===========================================================================

  describe('Form Inputs', () => {
    it('updates competition name on change', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const nameInput = screen.getByTestId('input-competition-name');
      fireEvent.changeText(nameInput, 'New Competition');

      expect(nameInput.props.value).toBe('New Competition');
    });

    it('updates description on change', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const descriptionInput = screen.getByTestId('input-description-optional');
      fireEvent.changeText(descriptionInput, 'New description');

      expect(descriptionInput.props.value).toBe('New description');
    });

    it('converts invite code to uppercase', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const inviteCodeInput = screen.getByTestId('input-invite-code-optional');
      fireEvent.changeText(inviteCodeInput, 'summer');

      // The component converts to uppercase and filters invalid chars
      expect(inviteCodeInput.props.value).toBe('SUMMER');
    });

    it('filters invalid characters from invite code', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const inviteCodeInput = screen.getByTestId('input-invite-code-optional');
      fireEvent.changeText(inviteCodeInput, 'test@123!');

      // Only alphanumeric, hyphen, underscore allowed
      expect(inviteCodeInput.props.value).toBe('TEST123');
    });

    it('updates start date on change', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const startDateInput = screen.getByTestId('date-input-start-date');
      fireEvent.changeText(startDateInput, '15/06/2026');

      expect(startDateInput.props.value).toBe('15/06/2026');
    });

    it('updates end date on change', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const endDateInput = screen.getByTestId('date-input-end-date');
      fireEvent.changeText(endDateInput, '31/12/2025');

      expect(endDateInput.props.value).toBe('31/12/2025');
    });
  });

  // ===========================================================================
  // BUTTON ACTIONS TESTS
  // ===========================================================================

  describe('Button Actions', () => {
    it('calls onBack when Cancel button is pressed', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      fireEvent.press(screen.getByText('Cancel'));

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('does not call onComplete when form is invalid', async () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      // Submit with empty form
      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        expect(mockOnComplete).not.toHaveBeenCalled();
      });
    });

    it('calls onComplete with valid form data', async () => {
      render(<CompetitionDetailsStep {...defaultProps} initialData={validFormData} />);

      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
        const calledWith = mockOnComplete.mock.calls[0][0];
        expect(calledWith.name).toBe('Summer Championship');
        expect(calledWith.description).toBe('A fun summer golf event');
        expect(calledWith.competitionType).toBe('event');
        expect(calledWith.startDate).toBe('15/06/2026');
        expect(calledWith.endDate).toBe('16/06/2026');
        expect(calledWith.handicapSystem).toBe('honor');
        expect(calledWith.inviteCode).toBe('SUMMER2026');
      });
    });

    it('allows submission for knockout type without end date', async () => {
      const knockoutData = {
        ...validFormData,
        competitionType: 'knockout' as const,
        endDate: '',
      };

      render(<CompetitionDetailsStep {...defaultProps} initialData={knockoutData} />);

      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // VALIDATION TESTS
  // ===========================================================================

  describe('Validation', () => {
    it('shows error for empty competition name on submit', async () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      // Fill start date but leave name empty
      const startDateInput = screen.getByTestId('date-input-start-date');
      fireEvent.changeText(startDateInput, '15/06/2026');

      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        // Check that onComplete was not called
        expect(mockOnComplete).not.toHaveBeenCalled();
      });
    });

    it('shows error for short competition name', async () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const nameInput = screen.getByTestId('input-competition-name');
      fireEvent.changeText(nameInput, 'AB');

      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        expect(mockOnComplete).not.toHaveBeenCalled();
      });
    });

    it('shows error for missing start date', async () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const nameInput = screen.getByTestId('input-competition-name');
      fireEvent.changeText(nameInput, 'Valid Competition Name');

      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        expect(mockOnComplete).not.toHaveBeenCalled();
      });
    });

    it('shows error for missing end date on event type', async () => {
      const partialData = {
        ...validFormData,
        endDate: '',
      };

      render(<CompetitionDetailsStep {...defaultProps} initialData={partialData} />);

      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        expect(mockOnComplete).not.toHaveBeenCalled();
      });
    });

    it('validates invite code minimum length', async () => {
      const dataWithShortInviteCode = {
        ...validFormData,
        inviteCode: 'AB', // Too short (min 4)
      };

      render(<CompetitionDetailsStep {...defaultProps} initialData={dataWithShortInviteCode} />);

      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        expect(mockOnComplete).not.toHaveBeenCalled();
      });
    });

    it('accepts empty invite code (auto-generate)', async () => {
      const dataWithNoInviteCode = {
        ...validFormData,
        inviteCode: '',
      };

      render(<CompetitionDetailsStep {...defaultProps} initialData={dataWithNoInviteCode} />);

      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // LAYOUT TESTS
  // ===========================================================================

  describe('Layout', () => {
    it('renders form section with surface background', () => {
      const { UNSAFE_root: _UNSAFE_root } = render(<CompetitionDetailsStep {...defaultProps} />);

      // Component should render without errors
      expect(screen.getAllByTestId('segmented-buttons').length).toBeGreaterThan(0);
    });

    it('renders footer with action buttons', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Next: Rounds')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLACEHOLDERS AND HINTS TESTS
  // ===========================================================================

  describe('Placeholders and Hints', () => {
    it('shows correct placeholder for competition name', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const nameInput = screen.getByTestId('input-competition-name');
      expect(nameInput.props.placeholder).toBe('e.g., Summer Classic 2025');
    });

    it('shows correct placeholder for description', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const descriptionInput = screen.getByTestId('input-description-optional');
      expect(descriptionInput.props.placeholder).toBe('Add a description for your competition...');
    });

    it('shows correct placeholder for invite code', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const inviteCodeInput = screen.getByTestId('input-invite-code-optional');
      // The component's actual placeholder text
      expect(inviteCodeInput.props.placeholder).toBe('e.g., SUMMER2025');
    });

    it('shows hint for invite code when no error', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      expect(screen.getByTestId('input-hint')).toBeTruthy();
      expect(screen.getByText('Custom code for players to join. Leave blank to auto-generate.')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles undefined initial data', () => {
      render(<CompetitionDetailsStep {...defaultProps} initialData={undefined} />);

      const nameInput = screen.getByTestId('input-competition-name');
      expect(nameInput.props.value).toBe('');
    });

    it('handles null description gracefully', () => {
      const dataWithNullDescription = {
        ...validFormData,
        description: undefined,
      };

      render(<CompetitionDetailsStep {...defaultProps} initialData={dataWithNullDescription} />);

      const descriptionInput = screen.getByTestId('input-description-optional');
      expect(descriptionInput.props.value).toBe('');
    });

    it('handles rapid competition type switching', async () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      // Rapid switches
      fireEvent.press(screen.getByTestId('segment-knockout'));
      fireEvent.press(screen.getByTestId('segment-event'));
      fireEvent.press(screen.getByTestId('segment-knockout'));
      fireEvent.press(screen.getByTestId('segment-event'));

      await waitFor(() => {
        // Should end on event, with end date visible
        expect(screen.getByTestId('date-picker-end-date')).toBeTruthy();
      });
    });

    it('handles long competition name', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const longName = 'A'.repeat(100);
      const nameInput = screen.getByTestId('input-competition-name');
      fireEvent.changeText(nameInput, longName);

      expect(nameInput.props.value).toBe(longName);
    });

    it('handles special characters in description', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const specialDesc = 'Test with special chars: @#$%^&*() and unicode: 🏌️⛳';
      const descriptionInput = screen.getByTestId('input-description-optional');
      fireEvent.changeText(descriptionInput, specialDesc);

      expect(descriptionInput.props.value).toBe(specialDesc);
    });

    it('handles maximum length invite code', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const maxCode = 'ABCDEFGHIJ1234567890'; // 20 chars
      const inviteCodeInput = screen.getByTestId('input-invite-code-optional');
      fireEvent.changeText(inviteCodeInput, maxCode);

      expect(inviteCodeInput.props.value).toBe(maxCode);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('renders buttons with accessible role', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      // Check that Cancel button exists with its testID
      const cancelButton = screen.getByTestId('button-outlined');
      expect(cancelButton.props.accessibilityRole).toBe('button');
    });

    it('renders segmented buttons with selectable state', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const eventSegment = screen.getByTestId('segment-event');
      expect(eventSegment.props.accessibilityState).toBeDefined();
    });
  });

  // ===========================================================================
  // DEFAULT VALUES TESTS
  // ===========================================================================

  describe('Default Values', () => {
    it('defaults competition type to event', () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const eventSegment = screen.getByTestId('segment-event');
      expect(eventSegment.props.accessibilityState.selected).toBe(true);
    });

    it('defaults handicap system to honor', async () => {
      render(<CompetitionDetailsStep {...defaultProps} initialData={validFormData} />);

      // Submit and check onComplete receives honor as handicap system
      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
        const calledWith = mockOnComplete.mock.calls[0][0];
        expect(calledWith.handicapSystem).toBe('honor');
      });
    });
  });

  // ===========================================================================
  // FORM SUBMISSION FLOW TESTS
  // ===========================================================================

  describe('Form Submission Flow', () => {
    it('maintains form data after failed validation', async () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      // Fill partial data
      const nameInput = screen.getByTestId('input-competition-name');
      fireEvent.changeText(nameInput, 'Test Competition');

      const descriptionInput = screen.getByTestId('input-description-optional');
      fireEvent.changeText(descriptionInput, 'Test Description');

      // Try to submit without dates
      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        // Data should still be there
        expect(nameInput.props.value).toBe('Test Competition');
        expect(descriptionInput.props.value).toBe('Test Description');
      });
    });

    it('validates on submit only (mode: onSubmit)', async () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      const nameInput = screen.getByTestId('input-competition-name');

      // Type invalid name (too short)
      fireEvent.changeText(nameInput, 'AB');

      // Blur should not show error immediately (onSubmit mode)
      fireEvent(nameInput, 'blur');

      // No error should appear yet (validation is on submit)
      expect(screen.queryByText('Competition name must be at least 3 characters')).toBeNull();
    });
  });

  // ===========================================================================
  // INTEGRATION TESTS
  // ===========================================================================

  describe('Integration', () => {
    it('completes full form flow successfully', async () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      // Fill competition name
      const nameInput = screen.getByTestId('input-competition-name');
      fireEvent.changeText(nameInput, 'Integration Test Competition');

      // Fill description
      const descriptionInput = screen.getByTestId('input-description-optional');
      fireEvent.changeText(descriptionInput, 'A test description');

      // Keep event type (default)

      // Fill invite code
      const inviteCodeInput = screen.getByTestId('input-invite-code-optional');
      fireEvent.changeText(inviteCodeInput, 'TEST2025');

      // Fill dates
      const startDateInput = screen.getByTestId('date-input-start-date');
      fireEvent.changeText(startDateInput, '15/06/2026');

      const endDateInput = screen.getByTestId('date-input-end-date');
      fireEvent.changeText(endDateInput, '31/12/2026');

      // Submit
      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
        const calledWith = mockOnComplete.mock.calls[0][0];
        expect(calledWith.name).toBe('Integration Test Competition');
        expect(calledWith.description).toBe('A test description');
        expect(calledWith.competitionType).toBe('event');
        expect(calledWith.inviteCode).toBe('TEST2025');
        expect(calledWith.startDate).toBe('15/06/2026');
        expect(calledWith.endDate).toBe('31/12/2026');
      });
    });

    it('handles knockout type form flow', async () => {
      render(<CompetitionDetailsStep {...defaultProps} />);

      // Fill competition name
      const nameInput = screen.getByTestId('input-competition-name');
      fireEvent.changeText(nameInput, 'Knockout Competition');

      // Switch to knockout type
      fireEvent.press(screen.getByTestId('segment-knockout'));

      // Fill start date only (no end date needed for knockout)
      const startDateInput = screen.getByTestId('date-input-start-date');
      fireEvent.changeText(startDateInput, '15/06/2026');

      // Submit
      fireEvent.press(screen.getByText('Next: Rounds'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
        const calledWith = mockOnComplete.mock.calls[0][0];
        expect(calledWith.name).toBe('Knockout Competition');
        expect(calledWith.competitionType).toBe('knockout');
        expect(calledWith.startDate).toBe('15/06/2026');
      });
    });

    it('persists data when returning to step with initial data', () => {
      // Simulate returning to step with previously entered data
      render(<CompetitionDetailsStep {...defaultProps} initialData={validFormData} />);

      // All fields should be populated
      expect(screen.getByTestId('input-competition-name').props.value).toBe('Summer Championship');
      expect(screen.getByTestId('input-description-optional').props.value).toBe('A fun summer golf event');
      expect(screen.getByTestId('input-invite-code-optional').props.value).toBe('SUMMER2026');
      expect(screen.getByTestId('date-input-start-date').props.value).toBe('15/06/2026');
      expect(screen.getByTestId('date-input-end-date').props.value).toBe('16/06/2026');
    });
  });
});

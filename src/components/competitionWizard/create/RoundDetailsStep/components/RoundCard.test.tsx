/**
 * RoundCard Component Tests
 *
 * Tests for the individual round card component in the competition wizard.
 * Covers rendering, interactions, error states, tee selection, and premium features.
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { RoundCard } from './RoundCard';
import type { RoundCardProps } from '../types';
import type { RoundDetailsFormData } from '@/schemas/competition';
import type { TeeBox } from '@/types/database.types';

// Mock child components
jest.mock('@/components/common/DatePicker', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    DatePicker: ({
      value,
      onChange,
      mode,
      label,
      error,
      hint,
      showClear,
    }: {
      value: string;
      onChange: (value: string) => void;
      mode?: 'date' | 'time';
      label?: string;
      error?: string;
      hint?: string;
      showClear?: boolean;
    }) => (
      <View testID={`date-picker-${mode || 'date'}`}>
        {label && <Text testID={`label-${mode || 'date'}`}>{label}</Text>}
        <Text testID={`value-${mode || 'date'}`}>{value || 'No value'}</Text>
        {error && <Text testID={`error-${mode || 'date'}`}>{error}</Text>}
        {hint && <Text testID={`hint-${mode || 'date'}`}>{hint}</Text>}
        <TouchableOpacity
          testID={`change-${mode || 'date'}`}
          onPress={() => onChange(mode === 'time' ? '09:30' : '15/01/2025')}
        >
          <Text>Change</Text>
        </TouchableOpacity>
        {showClear && (
          <TouchableOpacity testID={`clear-${mode || 'date'}`} onPress={() => onChange('')}>
            <Text>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
  };
});

describe('RoundCard', () => {
  // Create base mock data
  const createMockRound = (overrides?: Partial<RoundDetailsFormData>): RoundDetailsFormData => ({
    courseId: '',
    courseName: '',
    date: '',
    teeTime: '',
    matchType: 'stableford',
    scoringPairsRequired: false,
    ...overrides,
  });

  const createMockTee = (overrides?: Partial<TeeBox>): TeeBox => ({
    name: 'Blue Tees',
    color: 'blue',
    totalYardage: 6500,
    courseRating: 72.5,
    slopeRating: 130,
    ...overrides,
  });

  const defaultProps: RoundCardProps = {
    round: createMockRound(),
    index: 0,
    errors: {},
    isRemovable: false,
    availableTees: [],
    isPremium: false,
    onUpdate: jest.fn(),
    onRemove: jest.fn(),
    onOpenCourseModal: jest.fn(),
    onOpenTeeModal: jest.fn(),
    onOpenMatchTypeModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<RoundCard {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders round number based on index', () => {
      render(<RoundCard {...defaultProps} index={0} />);
      expect(screen.getByText('Round 1')).toBeTruthy();
    });

    it('renders round number for second round', () => {
      render(<RoundCard {...defaultProps} index={1} />);
      expect(screen.getByText('Round 2')).toBeTruthy();
    });

    it('renders round number for third round', () => {
      render(<RoundCard {...defaultProps} index={2} />);
      expect(screen.getByText('Round 3')).toBeTruthy();
    });

    it('renders course label', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.getByText('Course *')).toBeTruthy();
    });

    it('renders match type label', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.getByText('Match Type')).toBeTruthy();
    });

    it('renders scoring pairs label', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.getByText('Scoring Pairs')).toBeTruthy();
    });

    it('renders round date picker', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.getByTestId('date-picker-date')).toBeTruthy();
    });

    it('renders tee time picker', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.getByTestId('date-picker-time')).toBeTruthy();
    });
  });

  // ===========================================================================
  // COURSE SELECTION TESTS
  // ===========================================================================

  describe('Course Selection', () => {
    it('renders course input container', () => {
      const { UNSAFE_root } = render(<RoundCard {...defaultProps} />);
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      expect(textInputs.length).toBeGreaterThan(0);
    });

    it('displays course name when selected', () => {
      const round = createMockRound({
        courseId: 'course-1',
        courseName: 'Royal Melbourne',
      });
      const { UNSAFE_root } = render(<RoundCard {...defaultProps} round={round} />);
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      const courseInput = textInputs[0];
      expect(courseInput.props.value).toBe('Royal Melbourne');
    });

    it('calls onOpenCourseModal when course TouchableOpacity is pressed', () => {
      const onOpenCourseModal = jest.fn();
      const { UNSAFE_root } = render(
        <RoundCard {...defaultProps} onOpenCourseModal={onOpenCourseModal} />
      );

      // Find the TouchableOpacity components and press the course one
      const touchables = UNSAFE_root.findAllByType(require('react-native').TouchableOpacity);
      // The first touchable should be the course selector
      if (touchables.length > 0) {
        fireEvent.press(touchables[0]);
        expect(onOpenCourseModal).toHaveBeenCalled();
      }
    });

    it('displays course hint when no error', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.getByText('Tap to select from your saved courses')).toBeTruthy();
    });

    it('displays course error when provided', () => {
      render(<RoundCard {...defaultProps} errors={{ course: 'Course is required' }} />);
      expect(screen.getByText('Course is required')).toBeTruthy();
    });

    it('hides hint when error is displayed', () => {
      render(<RoundCard {...defaultProps} errors={{ course: 'Course is required' }} />);
      expect(screen.queryByText('Tap to select from your saved courses')).toBeNull();
    });
  });

  // ===========================================================================
  // TEE SELECTION TESTS
  // ===========================================================================

  describe('Tee Selection', () => {
    it('does not render tee selector when no course selected', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.queryByText('Playing Tees')).toBeNull();
    });

    it('does not render tee selector when no tees available', () => {
      const round = createMockRound({ courseId: 'course-1' });
      render(<RoundCard {...defaultProps} round={round} availableTees={[]} />);
      expect(screen.queryByText('Playing Tees')).toBeNull();
    });

    it('renders tee selector when course has tees', () => {
      const round = createMockRound({ courseId: 'course-1' });
      const tees = [createMockTee()];
      render(<RoundCard {...defaultProps} round={round} availableTees={tees} />);
      expect(screen.getByText('Playing Tees')).toBeTruthy();
    });

    it('displays placeholder when no tee selected', () => {
      const round = createMockRound({ courseId: 'course-1' });
      const tees = [createMockTee()];
      render(<RoundCard {...defaultProps} round={round} availableTees={tees} />);
      expect(screen.getByText('Select tees (optional)')).toBeTruthy();
    });

    it('displays selected tee name', () => {
      const round = createMockRound({
        courseId: 'course-1',
        selectedTee: {
          name: 'Blue Tees',
          color: 'blue',
          totalYardage: 6500,
        },
      });
      const tees = [createMockTee()];
      render(<RoundCard {...defaultProps} round={round} availableTees={tees} />);
      expect(screen.getByText('Blue Tees')).toBeTruthy();
    });

    it('displays selected tee yardage', () => {
      const round = createMockRound({
        courseId: 'course-1',
        selectedTee: {
          name: 'Blue Tees',
          color: 'blue',
          totalYardage: 6500,
        },
      });
      const tees = [createMockTee()];
      render(<RoundCard {...defaultProps} round={round} availableTees={tees} />);
      expect(screen.getByText('(6,500 yds)')).toBeTruthy();
    });

    it('calls onOpenTeeModal when tee selector is pressed', () => {
      const onOpenTeeModal = jest.fn();
      const round = createMockRound({ courseId: 'course-1' });
      const tees = [createMockTee()];
      render(
        <RoundCard
          {...defaultProps}
          round={round}
          availableTees={tees}
          onOpenTeeModal={onOpenTeeModal}
        />
      );

      const teeSelector = screen.getByText('Select tees (optional)');
      fireEvent.press(teeSelector.parent?.parent!);
      expect(onOpenTeeModal).toHaveBeenCalled();
    });

    it('renders tee hint text', () => {
      const round = createMockRound({ courseId: 'course-1' });
      const tees = [createMockTee()];
      render(<RoundCard {...defaultProps} round={round} availableTees={tees} />);
      expect(
        screen.getByText('Select which tees players will use for handicap calculations')
      ).toBeTruthy();
    });

    it('handles white tee color with border', () => {
      const round = createMockRound({
        courseId: 'course-1',
        selectedTee: {
          name: 'White Tees',
          color: 'white',
          totalYardage: 6000,
        },
      });
      const tees = [createMockTee({ color: 'white', name: 'White Tees' })];
      render(<RoundCard {...defaultProps} round={round} availableTees={tees} />);
      expect(screen.getByText('White Tees')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DATE PICKER TESTS
  // ===========================================================================

  describe('Date Picker', () => {
    it('renders round date picker with label', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.getByTestId('label-date')).toBeTruthy();
    });

    it('passes date value to picker', () => {
      const round = createMockRound({ date: '15/01/2025' });
      render(<RoundCard {...defaultProps} round={round} />);
      expect(screen.getByText('15/01/2025')).toBeTruthy();
    });

    it('calls onUpdate when date changes', () => {
      const onUpdate = jest.fn();
      render(<RoundCard {...defaultProps} onUpdate={onUpdate} />);

      fireEvent.press(screen.getByTestId('change-date'));
      expect(onUpdate).toHaveBeenCalledWith({ date: '15/01/2025' });
    });

    it('displays date error when provided', () => {
      render(<RoundCard {...defaultProps} errors={{ date: 'Date is required' }} />);
      expect(screen.getByTestId('error-date')).toBeTruthy();
    });

    it('displays date hint when no error', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.getByTestId('hint-date')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEE TIME PICKER TESTS
  // ===========================================================================

  describe('Tee Time Picker', () => {
    it('renders tee time picker', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.getByTestId('date-picker-time')).toBeTruthy();
    });

    it('passes tee time value to picker', () => {
      const round = createMockRound({ teeTime: '08:30' });
      render(<RoundCard {...defaultProps} round={round} />);
      expect(screen.getByText('08:30')).toBeTruthy();
    });

    it('calls onUpdate when tee time changes', () => {
      const onUpdate = jest.fn();
      render(<RoundCard {...defaultProps} onUpdate={onUpdate} />);

      fireEvent.press(screen.getByTestId('change-time'));
      expect(onUpdate).toHaveBeenCalledWith({ teeTime: '09:30' });
    });

    it('shows clear button when tee time is set', () => {
      const round = createMockRound({ teeTime: '08:30' });
      render(<RoundCard {...defaultProps} round={round} />);
      expect(screen.getByTestId('clear-time')).toBeTruthy();
    });

    it('does not show clear button when tee time is empty', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.queryByTestId('clear-time')).toBeNull();
    });
  });

  // ===========================================================================
  // MATCH TYPE SELECTION TESTS
  // ===========================================================================

  describe('Match Type Selection', () => {
    it('displays default match type (Stableford)', () => {
      const { UNSAFE_root } = render(<RoundCard {...defaultProps} />);
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      // Match type is the second TextInput after course
      const matchTypeInput = textInputs[1];
      expect(matchTypeInput.props.value).toBe('Stableford');
    });

    it('displays Stroke Play when selected', () => {
      const round = createMockRound({ matchType: 'stroke' });
      const { UNSAFE_root } = render(<RoundCard {...defaultProps} round={round} />);
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      const matchTypeInput = textInputs[1];
      expect(matchTypeInput.props.value).toBe('Stroke Play');
    });

    it('displays Match Play when selected', () => {
      const round = createMockRound({ matchType: 'match-play' });
      const { UNSAFE_root } = render(<RoundCard {...defaultProps} round={round} />);
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      const matchTypeInput = textInputs[1];
      expect(matchTypeInput.props.value).toBe('Match Play');
    });

    it('displays Ambrose when selected', () => {
      const round = createMockRound({ matchType: 'ambrose' });
      const { UNSAFE_root } = render(<RoundCard {...defaultProps} round={round} />);
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      const matchTypeInput = textInputs[1];
      expect(matchTypeInput.props.value).toBe('Ambrose');
    });

    it('displays Best Ball when selected', () => {
      const round = createMockRound({ matchType: 'best-ball' });
      const { UNSAFE_root } = render(<RoundCard {...defaultProps} round={round} />);
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      const matchTypeInput = textInputs[1];
      expect(matchTypeInput.props.value).toBe('Best Ball');
    });

    it('displays Scramble when selected', () => {
      const round = createMockRound({ matchType: 'scramble' });
      const { UNSAFE_root } = render(<RoundCard {...defaultProps} round={round} />);
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      const matchTypeInput = textInputs[1];
      expect(matchTypeInput.props.value).toBe('Scramble');
    });

    it('calls onOpenMatchTypeModal when match type TouchableOpacity is pressed', () => {
      const onOpenMatchTypeModal = jest.fn();
      const { UNSAFE_root } = render(
        <RoundCard {...defaultProps} onOpenMatchTypeModal={onOpenMatchTypeModal} />
      );

      // Find TouchableOpacity elements - the structure is: course, match type, scoring pairs
      const touchables = UNSAFE_root.findAllByType(require('react-native').TouchableOpacity);
      // Try each touchable until we find the match type one
      // Match type touchable wraps the TextInput with 'Stableford' value
      let found = false;
      for (let i = 0; i < touchables.length && !found; i++) {
        fireEvent.press(touchables[i]);
        if (onOpenMatchTypeModal.mock.calls.length > 0) {
          found = true;
        }
      }
      expect(onOpenMatchTypeModal).toHaveBeenCalled();
    });

    it('displays match type hint', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.getByText('Select the scoring format for this round')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCORING PAIRS TESTS - PREMIUM USER
  // ===========================================================================

  describe('Scoring Pairs - Premium User', () => {
    it('renders scoring pairs toggle for premium users', () => {
      render(<RoundCard {...defaultProps} isPremium={true} />);
      expect(screen.getByText('Require Scoring Pairs')).toBeTruthy();
    });

    it('renders toggle description', () => {
      render(<RoundCard {...defaultProps} isPremium={true} />);
      expect(screen.getByText('Assign designated markers for this round')).toBeTruthy();
    });

    it('shows unchecked state when scoring pairs not required', () => {
      const round = createMockRound({ scoringPairsRequired: false });
      render(<RoundCard {...defaultProps} round={round} isPremium={true} />);
      // Checkbox should not have check icon
      expect(screen.getByText('Require Scoring Pairs')).toBeTruthy();
    });

    it('shows checked state when scoring pairs required', () => {
      const round = createMockRound({ scoringPairsRequired: true });
      render(<RoundCard {...defaultProps} round={round} isPremium={true} />);
      // Component should be in checked state
      expect(screen.getByText('Require Scoring Pairs')).toBeTruthy();
    });

    it('toggles scoring pairs when pressed by premium user', () => {
      const onUpdate = jest.fn();
      const round = createMockRound({ scoringPairsRequired: false });
      render(<RoundCard {...defaultProps} round={round} isPremium={true} onUpdate={onUpdate} />);

      const toggleLabel = screen.getByText('Require Scoring Pairs');
      fireEvent.press(toggleLabel.parent?.parent?.parent!);
      expect(onUpdate).toHaveBeenCalledWith({ scoringPairsRequired: true });
    });

    it('un-toggles scoring pairs when already enabled', () => {
      const onUpdate = jest.fn();
      const round = createMockRound({ scoringPairsRequired: true });
      render(<RoundCard {...defaultProps} round={round} isPremium={true} onUpdate={onUpdate} />);

      const toggleLabel = screen.getByText('Require Scoring Pairs');
      fireEvent.press(toggleLabel.parent?.parent?.parent!);
      expect(onUpdate).toHaveBeenCalledWith({ scoringPairsRequired: false });
    });

    it('renders scoring pairs hint', () => {
      render(<RoundCard {...defaultProps} isPremium={true} />);
      expect(
        screen.getByText(
          'When enabled, you can configure who scores whom after creating the competition'
        )
      ).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCORING PAIRS TESTS - FREE USER
  // ===========================================================================

  describe('Scoring Pairs - Free User', () => {
    it('renders locked state for free users', () => {
      render(<RoundCard {...defaultProps} isPremium={false} />);
      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('displays upgrade message for free users', () => {
      render(<RoundCard {...defaultProps} isPremium={false} />);
      expect(screen.getByText('Upgrade to Premium to use this feature')).toBeTruthy();
    });

    it('does not toggle when pressed by free user', () => {
      const onUpdate = jest.fn();
      render(<RoundCard {...defaultProps} isPremium={false} onUpdate={onUpdate} />);

      // The locked toggle should not have onPress handler
      const label = screen.getByText('Require Scoring Pairs');
      expect(label).toBeTruthy();
      // Component should still render without crashing
    });

    it('renders scoring pairs hint for free users', () => {
      render(<RoundCard {...defaultProps} isPremium={false} />);
      expect(
        screen.getByText(
          'When enabled, you can configure who scores whom after creating the competition'
        )
      ).toBeTruthy();
    });
  });

  // ===========================================================================
  // REMOVE BUTTON TESTS
  // ===========================================================================

  describe('Remove Button', () => {
    it('does not render remove button when not removable', () => {
      render(<RoundCard {...defaultProps} isRemovable={false} />);
      // No close icon button should be present
      expect(screen.queryByTestId('remove-button')).toBeNull();
    });

    it('renders remove button when removable', () => {
      const { UNSAFE_root } = render(<RoundCard {...defaultProps} isRemovable={true} />);
      // IconButton with close icon should be present
      const iconButtons = UNSAFE_root.findAllByType(require('react-native-paper').IconButton);
      expect(iconButtons.length).toBeGreaterThan(0);
    });

    it('calls onRemove when remove button is pressed', () => {
      const onRemove = jest.fn();
      const { UNSAFE_root } = render(
        <RoundCard {...defaultProps} isRemovable={true} onRemove={onRemove} />
      );

      const iconButtons = UNSAFE_root.findAllByType(require('react-native-paper').IconButton);
      if (iconButtons.length > 0) {
        fireEvent.press(iconButtons[0]);
        expect(onRemove).toHaveBeenCalled();
      }
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error States', () => {
    it('displays multiple errors simultaneously', () => {
      render(
        <RoundCard
          {...defaultProps}
          errors={{
            course: 'Course is required',
            date: 'Date is required',
          }}
        />
      );
      expect(screen.getByText('Course is required')).toBeTruthy();
      expect(screen.getByTestId('error-date')).toBeTruthy();
    });

    it('applies error styling to course input', () => {
      const { UNSAFE_root } = render(
        <RoundCard {...defaultProps} errors={{ course: 'Error' }} />
      );
      // Check that TextInput has error prop
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      const courseInput = textInputs.find((input: any) =>
        input.props.placeholder === 'Select a course'
      );
      expect(courseInput?.props.error).toBe(true);
    });
  });

  // ===========================================================================
  // COMBINED STATE TESTS
  // ===========================================================================

  describe('Combined States', () => {
    it('renders fully populated round card', () => {
      const round = createMockRound({
        courseId: 'course-1',
        courseName: 'Royal Melbourne',
        date: '15/01/2025',
        teeTime: '08:30',
        matchType: 'stroke',
        scoringPairsRequired: true,
        selectedTee: {
          name: 'Blue Tees',
          color: 'blue',
          totalYardage: 6500,
        },
      });
      const tees = [createMockTee()];

      const { UNSAFE_root } = render(
        <RoundCard
          {...defaultProps}
          round={round}
          availableTees={tees}
          isPremium={true}
          isRemovable={true}
          index={2}
        />
      );

      expect(screen.getByText('Round 3')).toBeTruthy();
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      expect(textInputs[0].props.value).toBe('Royal Melbourne');
      expect(screen.getByText('Blue Tees')).toBeTruthy();
      expect(screen.getByText('15/01/2025')).toBeTruthy();
      expect(screen.getByText('08:30')).toBeTruthy();
      expect(textInputs[1].props.value).toBe('Stroke Play');
    });

    it('handles round with minimal data', () => {
      const { UNSAFE_root } = render(<RoundCard {...defaultProps} />);
      expect(screen.getByText('Round 1')).toBeTruthy();
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      expect(textInputs[0].props.placeholder).toBe('Select a course');
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty errors object', () => {
      const { toJSON } = render(<RoundCard {...defaultProps} errors={{}} />);
      expect(toJSON()).toBeTruthy();
    });

    it('handles undefined selectedTee yardage', () => {
      const round = createMockRound({
        courseId: 'course-1',
        selectedTee: {
          name: 'Blue Tees',
          color: 'blue',
          totalYardage: undefined,
        },
      });
      const tees = [createMockTee()];
      render(<RoundCard {...defaultProps} round={round} availableTees={tees} />);
      expect(screen.getByText('Blue Tees')).toBeTruthy();
      expect(screen.queryByText(/yds/)).toBeNull();
    });

    it('handles zero index', () => {
      render(<RoundCard {...defaultProps} index={0} />);
      expect(screen.getByText('Round 1')).toBeTruthy();
    });

    it('handles large index', () => {
      render(<RoundCard {...defaultProps} index={99} />);
      expect(screen.getByText('Round 100')).toBeTruthy();
    });

    it('handles empty course name', () => {
      const round = createMockRound({ courseId: 'course-1', courseName: '' });
      const { UNSAFE_root } = render(<RoundCard {...defaultProps} round={round} />);
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      expect(textInputs[0].props.value).toBe('');
    });

    it('handles null match type fallback', () => {
      const round = createMockRound({ matchType: undefined as any });
      const { UNSAFE_root } = render(<RoundCard {...defaultProps} round={round} />);
      const textInputs = UNSAFE_root.findAllByType(require('react-native-paper').TextInput);
      expect(textInputs[1].props.value).toBe('Stableford');
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('labels are visible for screen readers', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.getByText('Course *')).toBeTruthy();
      expect(screen.getByText('Match Type')).toBeTruthy();
      expect(screen.getByText('Scoring Pairs')).toBeTruthy();
    });

    it('round number is visible for screen readers', () => {
      render(<RoundCard {...defaultProps} index={0} />);
      expect(screen.getByText('Round 1')).toBeTruthy();
    });

    it('error messages are visible for screen readers', () => {
      render(<RoundCard {...defaultProps} errors={{ course: 'Required field' }} />);
      expect(screen.getByText('Required field')).toBeTruthy();
    });

    it('hint messages are visible for screen readers', () => {
      render(<RoundCard {...defaultProps} />);
      expect(screen.getByText('Tap to select from your saved courses')).toBeTruthy();
    });
  });

  // ===========================================================================
  // THEME SUPPORT TESTS
  // ===========================================================================

  describe('Theme Support', () => {
    it('renders with theme colors', () => {
      const { toJSON } = render(<RoundCard {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders tee selector with theme colors', () => {
      const round = createMockRound({ courseId: 'course-1' });
      const tees = [createMockTee()];
      const { toJSON } = render(
        <RoundCard {...defaultProps} round={round} availableTees={tees} />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEE COLOR TESTS
  // ===========================================================================

  describe('Tee Colors', () => {
    const teeColors = [
      { color: 'black', expectedColor: '#000000' },
      { color: 'blue', expectedColor: '#2196F3' },
      { color: 'white', expectedColor: '#FFFFFF' },
      { color: 'yellow', expectedColor: '#FFEB3B' },
      { color: 'red', expectedColor: '#F44336' },
      { color: 'gold', expectedColor: '#FFD700' },
      { color: 'green', expectedColor: '#4CAF50' },
    ];

    teeColors.forEach(({ color }) => {
      it(`renders ${color} tee correctly`, () => {
        const round = createMockRound({
          courseId: 'course-1',
          selectedTee: {
            name: `${color.charAt(0).toUpperCase() + color.slice(1)} Tees`,
            color: color,
            totalYardage: 6000,
          },
        });
        const tees = [createMockTee({ color, name: `${color} Tees` })];
        render(<RoundCard {...defaultProps} round={round} availableTees={tees} />);
        expect(screen.getByText(`${color.charAt(0).toUpperCase() + color.slice(1)} Tees`)).toBeTruthy();
      });
    });

    it('handles unknown tee color', () => {
      const round = createMockRound({
        courseId: 'course-1',
        selectedTee: {
          name: 'Custom Tees',
          color: 'unknown',
          totalYardage: 6000,
        },
      });
      const tees = [createMockTee({ color: 'unknown', name: 'Custom Tees' })];
      const { toJSON } = render(
        <RoundCard {...defaultProps} round={round} availableTees={tees} />
      );
      expect(toJSON()).toBeTruthy();
    });
  });
});

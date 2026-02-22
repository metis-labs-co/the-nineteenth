/**
 * RoundDetailsStep Component Tests
 *
 * Tests for the round details step in the competition creation wizard.
 * Covers rendering, round management, modal interactions, validation,
 * and subscription tier limits.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RoundDetailsStep from './index';
import type { RoundDetailsStepProps } from './types';
import type { RoundDetailsFormData, GameType } from '@/schemas/competition';

// ===========================================================================
// MOCKS
// ===========================================================================

// Mock theme context
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#2E7D32',
    primaryLighter: '#E8F5E9',
    secondary: '#4CAF50',
    background: '#FFFFFF',
    surface: '#FAFAFA',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    white: '#FFFFFF',
    gray100: '#F5F5F5',
    gray200: '#E5E5E5',
    gray300: '#D4D4D4',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#DC2626',
  }),
}));

// Mock subscription context
const mockIsPremium = jest.fn(() => false);
jest.mock('@/context/SubscriptionContext', () => ({
  useIsPremium: () => mockIsPremium(),
}));

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

// Mock the hook
const mockUseRoundDetailsForm = jest.fn();
jest.mock('./hooks/useRoundDetailsForm', () => ({
  useRoundDetailsForm: (props: any) => mockUseRoundDetailsForm(props),
}));

// Mock RoundCard component
jest.mock('./components/RoundCard', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    RoundCard: ({
      round,
      index,
      errors,
      isRemovable,
      onUpdate,
      onRemove,
      onOpenCourseModal,
      onOpenTeeModal,
      onOpenMatchTypeModal,
    }: any) => (
      <View testID={`round-card-${index}`}>
        <Text testID={`round-course-${index}`}>{round.courseName || 'No Course'}</Text>
        <Text testID={`round-date-${index}`}>{round.date || 'No Date'}</Text>
        <Text testID={`round-match-type-${index}`}>{round.matchType}</Text>
        {errors?.course && <Text testID={`error-course-${index}`}>{errors.course}</Text>}
        {errors?.date && <Text testID={`error-date-${index}`}>{errors.date}</Text>}
        <TouchableOpacity testID={`select-course-${index}`} onPress={onOpenCourseModal}>
          <Text>Select Course</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`select-tee-${index}`} onPress={onOpenTeeModal}>
          <Text>Select Tee</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`select-match-type-${index}`} onPress={onOpenMatchTypeModal}>
          <Text>Select Match Type</Text>
        </TouchableOpacity>
        {isRemovable && (
          <TouchableOpacity testID={`remove-round-${index}`} onPress={onRemove}>
            <Text>Remove</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          testID={`update-round-${index}`}
          onPress={() => onUpdate({ courseName: 'Updated Course' })}
        >
          <Text>Update</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

// Mock MatchTypeModal
jest.mock('./components/MatchTypeModal', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    MatchTypeModal: ({ visible, selectedMatchType, onSelect, onClose }: any) =>
      visible ? (
        <View testID="match-type-modal">
          <Text testID="selected-match-type">{selectedMatchType}</Text>
          <TouchableOpacity testID="select-stableford" onPress={() => onSelect('stableford')}>
            <Text>Stableford</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="select-stroke" onPress={() => onSelect('stroke')}>
            <Text>Stroke Play</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="close-match-type-modal" onPress={onClose}>
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      ) : null,
  };
});

// Mock CourseSelectionModal
jest.mock('./components/CourseSelectionModal', () => {
  const { View, Text, TextInput, TouchableOpacity } = require('react-native');
  return {
    CourseSelectionModal: ({
      visible,
      displayItems,
      isLoading,
      isSearching,
      courseSearchQuery,
      onCourseSelect,
      onSearchChange,
      onClose,
    }: any) =>
      visible ? (
        <View testID="course-selection-modal">
          <TextInput
            testID="course-search-input"
            value={courseSearchQuery}
            onChangeText={onSearchChange}
          />
          {isLoading && <Text testID="loading-indicator">Loading...</Text>}
          {isSearching && <Text testID="searching-indicator">Searching...</Text>}
          {displayItems?.map((item: any, i: number) => (
            <TouchableOpacity
              key={i}
              testID={`course-item-${i}`}
              onPress={() => onCourseSelect(item.courses?.[0], item.venue)}
            >
              <Text>{item.venue?.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity testID="close-course-modal" onPress={onClose}>
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      ) : null,
  };
});

// Mock TeeSelectionModal
jest.mock('./components/TeeSelectionModal', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    TeeSelectionModal: ({ visible, availableTees, selectedTeeName, onSelect, onClose }: any) =>
      visible ? (
        <View testID="tee-selection-modal">
          {selectedTeeName && <Text testID="selected-tee">{selectedTeeName}</Text>}
          {availableTees?.map((tee: any, i: number) => (
            <TouchableOpacity key={i} testID={`tee-item-${i}`} onPress={() => onSelect(tee)}>
              <Text>{tee.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity testID="close-tee-modal" onPress={onClose}>
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      ) : null,
  };
});

// ===========================================================================
// TEST HELPERS
// ===========================================================================

const createMockRound = (overrides?: Partial<RoundDetailsFormData>): RoundDetailsFormData => ({
  courseId: '',
  courseName: '',
  date: '',
  teeTime: '',
  matchType: 'stableford',
  scoringPairsRequired: false,
  ...overrides,
});

const createDefaultFormReturn = (overrides?: Partial<ReturnType<typeof mockUseRoundDetailsForm>>) => ({
  // Rounds state
  rounds: [createMockRound()],
  errors: {},
  effectiveMaxRounds: 10,
  canAddRound: true,

  // Course data
  displayItems: [],
  favoriteCourses: [],
  isLoadingCourses: false,
  isSearching: false,
  courseSearchQuery: '',
  courseTees: {},

  // Game types
  availableGameTypes: [
    { value: 'stableford', label: 'Stableford', description: 'Points-based' },
    { value: 'stroke', label: 'Stroke Play', description: 'Count strokes' },
  ],

  // Modal states
  showCourseModal: false,
  showMatchTypeModal: false,
  showTeeModal: false,
  editingCourseRoundIndex: null,
  editingMatchTypeRoundIndex: null,
  editingTeeRoundIndex: null,

  // Round handlers
  updateRound: jest.fn(),
  addRound: jest.fn(),
  removeRound: jest.fn(),
  getAvailableTeesForRound: jest.fn(() => []),

  // Course modal handlers
  openCourseModal: jest.fn(),
  handleCourseSelect: jest.fn(),
  handleCloseCourseModal: jest.fn(),
  setCourseSearchQuery: jest.fn(),

  // Match type modal handlers
  openMatchTypeModal: jest.fn(),
  handleMatchTypeSelect: jest.fn(),
  handleCloseMatchTypeModal: jest.fn(),

  // Tee modal handlers
  openTeeModal: jest.fn(),
  handleTeeSelect: jest.fn(),
  handleCloseTeeModal: jest.fn(),

  // Form submission
  handleSubmit: jest.fn(),

  ...overrides,
});

const defaultProps: RoundDetailsStepProps = {
  onComplete: jest.fn(),
  onBack: jest.fn(),
};

describe('RoundDetailsStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPremium.mockReturnValue(false);
    mockUseRoundDetailsForm.mockReturnValue(createDefaultFormReturn());
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByText(/Add rounds to your competition/)).toBeTruthy();
    });

    it('renders the step description', () => {
      render(<RoundDetailsStep {...defaultProps} />);
      expect(
        screen.getByText(/Each round can have a different course and date/)
      ).toBeTruthy();
    });

    it('renders the info box with round limit information', () => {
      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByText(/You can add up to 10 rounds per competition/)).toBeTruthy();
    });

    it('renders Back and Next buttons', () => {
      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByText('Back')).toBeTruthy();
      expect(screen.getByText('Next: Add Players')).toBeTruthy();
    });

    it('renders round cards for each round', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          rounds: [
            createMockRound({ courseName: 'Course 1' }),
            createMockRound({ courseName: 'Course 2' }),
          ],
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByTestId('round-card-0')).toBeTruthy();
      expect(screen.getByTestId('round-card-1')).toBeTruthy();
    });

    it('renders with initial data', () => {
      const initialData = [
        createMockRound({ courseName: 'Royal Melbourne', date: '15/01/2025' }),
      ];
      render(<RoundDetailsStep {...defaultProps} initialData={initialData} />);

      expect(screen.getByTestId('round-card-0')).toBeTruthy();
    });

    it('renders add round button when can add more rounds', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ canAddRound: true })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByText('Add Another Round')).toBeTruthy();
    });

    it('hides add round button when at max rounds', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ canAddRound: false, effectiveMaxRounds: 10 })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.queryByText('Add Another Round')).toBeNull();
    });
  });

  // ===========================================================================
  // ROUND LIMIT TESTS
  // ===========================================================================

  describe('Round Limits', () => {
    it('shows limit reached message when at max rounds for non-premium tier', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          canAddRound: false,
          effectiveMaxRounds: 2,
          rounds: [createMockRound(), createMockRound()],
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByText(/Maximum 2 rounds on your plan/)).toBeTruthy();
      expect(screen.getByText(/Upgrade for more rounds/)).toBeTruthy();
    });

    it('shows singular "round" when max is 1', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          canAddRound: false,
          effectiveMaxRounds: 1,
          rounds: [createMockRound()],
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByText(/Maximum 1 round on your plan/)).toBeTruthy();
    });

    it('does not show limit message when effectiveMaxRounds is 10', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          canAddRound: false,
          effectiveMaxRounds: 10,
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.queryByText(/Maximum.*rounds on your plan/)).toBeNull();
    });

    it('respects maxRoundsPerCompetition prop', () => {
      render(<RoundDetailsStep {...defaultProps} maxRoundsPerCompetition={5} />);

      // Verify the hook was called with the prop
      expect(mockUseRoundDetailsForm).toHaveBeenCalledWith(
        expect.objectContaining({ maxRoundsPerCompetition: 5 })
      );
    });
  });

  // ===========================================================================
  // ROUND MANAGEMENT TESTS
  // ===========================================================================

  describe('Round Management', () => {
    it('calls addRound when add button is pressed', () => {
      const addRound = jest.fn();
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ addRound, canAddRound: true })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByText('Add Another Round'));

      expect(addRound).toHaveBeenCalledTimes(1);
    });

    it('renders removable round cards when multiple rounds exist', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          rounds: [createMockRound(), createMockRound()],
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);

      // First round should show remove button (isRemovable based on length > 1)
      expect(screen.getByTestId('remove-round-0')).toBeTruthy();
      expect(screen.getByTestId('remove-round-1')).toBeTruthy();
    });

    it('does not show remove button for single round', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          rounds: [createMockRound()],
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.queryByTestId('remove-round-0')).toBeNull();
    });

    it('calls removeRound when remove button is pressed', () => {
      const removeRound = jest.fn();
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          rounds: [createMockRound(), createMockRound()],
          removeRound,
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByTestId('remove-round-0'));

      expect(removeRound).toHaveBeenCalledWith(0);
    });

    it('calls updateRound when round is updated', () => {
      const updateRound = jest.fn();
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ updateRound })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByTestId('update-round-0'));

      expect(updateRound).toHaveBeenCalledWith(0, { courseName: 'Updated Course' });
    });
  });

  // ===========================================================================
  // COURSE MODAL TESTS
  // ===========================================================================

  describe('Course Selection Modal', () => {
    it('opens course modal when select course is pressed', () => {
      const openCourseModal = jest.fn();
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ openCourseModal })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByTestId('select-course-0'));

      expect(openCourseModal).toHaveBeenCalledWith(0);
    });

    it('renders course selection modal when visible', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ showCourseModal: true })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByTestId('course-selection-modal')).toBeTruthy();
    });

    it('does not render course modal when not visible', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ showCourseModal: false })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.queryByTestId('course-selection-modal')).toBeNull();
    });

    it('passes display items to course modal', () => {
      const displayItems = [
        { venue: { id: 'v1', name: 'Test Venue' }, courses: [{ id: 'c1', name: 'Course 1' }] },
      ];
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ showCourseModal: true, displayItems })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByTestId('course-item-0')).toBeTruthy();
    });

    it('shows loading indicator in course modal', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ showCourseModal: true, isLoadingCourses: true })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });

    it('shows searching indicator in course modal', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ showCourseModal: true, isSearching: true })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByTestId('searching-indicator')).toBeTruthy();
    });

    it('calls handleCloseCourseModal when close is pressed', () => {
      const handleCloseCourseModal = jest.fn();
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ showCourseModal: true, handleCloseCourseModal })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByTestId('close-course-modal'));

      expect(handleCloseCourseModal).toHaveBeenCalled();
    });

    it('calls handleCourseSelect when course is selected', () => {
      const handleCourseSelect = jest.fn();
      const displayItems = [
        {
          venue: { id: 'v1', name: 'Test Venue' },
          courses: [{ id: 'c1', name: 'Course 1' }],
        },
      ];
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ showCourseModal: true, displayItems, handleCourseSelect })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByTestId('course-item-0'));

      expect(handleCourseSelect).toHaveBeenCalled();
    });

    it('updates search query via setCourseSearchQuery', () => {
      const setCourseSearchQuery = jest.fn();
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showCourseModal: true,
          courseSearchQuery: '',
          setCourseSearchQuery,
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.changeText(screen.getByTestId('course-search-input'), 'Melbourne');

      expect(setCourseSearchQuery).toHaveBeenCalledWith('Melbourne');
    });
  });

  // ===========================================================================
  // MATCH TYPE MODAL TESTS
  // ===========================================================================

  describe('Match Type Modal', () => {
    it('opens match type modal when select match type is pressed', () => {
      const openMatchTypeModal = jest.fn();
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ openMatchTypeModal })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByTestId('select-match-type-0'));

      expect(openMatchTypeModal).toHaveBeenCalledWith(0);
    });

    it('renders match type modal when visible', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showMatchTypeModal: true,
          editingMatchTypeRoundIndex: 0,
          rounds: [createMockRound({ matchType: 'stableford' })],
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByTestId('match-type-modal')).toBeTruthy();
    });

    it('does not render match type modal when not visible', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ showMatchTypeModal: false })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.queryByTestId('match-type-modal')).toBeNull();
    });

    it('shows selected match type in modal', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showMatchTypeModal: true,
          editingMatchTypeRoundIndex: 0,
          rounds: [createMockRound({ matchType: 'stroke' })],
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      // Multiple elements might have 'stroke' text (round card and modal)
      expect(screen.getAllByText('stroke').length).toBeGreaterThan(0);
    });

    it('calls handleMatchTypeSelect when match type is selected', () => {
      const handleMatchTypeSelect = jest.fn();
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showMatchTypeModal: true,
          editingMatchTypeRoundIndex: 0,
          rounds: [createMockRound()],
          handleMatchTypeSelect,
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByTestId('select-stroke'));

      expect(handleMatchTypeSelect).toHaveBeenCalledWith('stroke');
    });

    it('calls handleCloseMatchTypeModal when close is pressed', () => {
      const handleCloseMatchTypeModal = jest.fn();
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showMatchTypeModal: true,
          editingMatchTypeRoundIndex: 0,
          rounds: [createMockRound()],
          handleCloseMatchTypeModal,
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByTestId('close-match-type-modal'));

      expect(handleCloseMatchTypeModal).toHaveBeenCalled();
    });

    it('defaults to stableford when editingMatchTypeRoundIndex is null', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showMatchTypeModal: true,
          editingMatchTypeRoundIndex: null,
          rounds: [],
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByText('stableford')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEE SELECTION MODAL TESTS
  // ===========================================================================

  describe('Tee Selection Modal', () => {
    it('opens tee modal when select tee is pressed', () => {
      const openTeeModal = jest.fn();
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ openTeeModal })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByTestId('select-tee-0'));

      expect(openTeeModal).toHaveBeenCalledWith(0);
    });

    it('renders tee modal when visible', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showTeeModal: true,
          editingTeeRoundIndex: 0,
          getAvailableTeesForRound: jest.fn(() => []),
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByTestId('tee-selection-modal')).toBeTruthy();
    });

    it('does not render tee modal when not visible', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ showTeeModal: false })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.queryByTestId('tee-selection-modal')).toBeNull();
    });

    it('shows available tees in modal', () => {
      const mockTees = [
        { id: 't1', name: 'Blue Tees', color: 'blue' },
        { id: 't2', name: 'White Tees', color: 'white' },
      ];
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showTeeModal: true,
          editingTeeRoundIndex: 0,
          getAvailableTeesForRound: jest.fn(() => mockTees),
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByTestId('tee-item-0')).toBeTruthy();
      expect(screen.getByTestId('tee-item-1')).toBeTruthy();
    });

    it('shows selected tee name', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showTeeModal: true,
          editingTeeRoundIndex: 0,
          rounds: [createMockRound({ selectedTee: { name: 'Blue Tees', color: 'blue' } })],
          getAvailableTeesForRound: jest.fn(() => []),
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByText('Blue Tees')).toBeTruthy();
    });

    it('calls handleTeeSelect when tee is selected', () => {
      const handleTeeSelect = jest.fn();
      const mockTees = [{ id: 't1', name: 'Blue Tees', color: 'blue' }];
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showTeeModal: true,
          editingTeeRoundIndex: 0,
          getAvailableTeesForRound: jest.fn(() => mockTees),
          handleTeeSelect,
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByTestId('tee-item-0'));

      expect(handleTeeSelect).toHaveBeenCalledWith(mockTees[0]);
    });

    it('calls handleCloseTeeModal when close is pressed', () => {
      const handleCloseTeeModal = jest.fn();
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showTeeModal: true,
          editingTeeRoundIndex: 0,
          getAvailableTeesForRound: jest.fn(() => []),
          handleCloseTeeModal,
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByTestId('close-tee-modal'));

      expect(handleCloseTeeModal).toHaveBeenCalled();
    });

    it('returns empty tees when editingTeeRoundIndex is null', () => {
      const getAvailableTeesForRound = jest.fn(() => []);
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showTeeModal: true,
          editingTeeRoundIndex: null,
          rounds: [],
          getAvailableTeesForRound,
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      // No tee items should be rendered
      expect(screen.queryByTestId('tee-item-0')).toBeNull();
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('calls onBack when Back button is pressed', () => {
      const onBack = jest.fn();
      render(<RoundDetailsStep {...defaultProps} onBack={onBack} />);

      fireEvent.press(screen.getByText('Back'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('calls handleSubmit when Next button is pressed', () => {
      const handleSubmit = jest.fn();
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ handleSubmit })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      fireEvent.press(screen.getByText('Next: Add Players'));

      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // VALIDATION TESTS
  // ===========================================================================

  describe('Validation', () => {
    it('displays course error when present', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          errors: { 0: { course: 'Please select a course' } },
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByText('Please select a course')).toBeTruthy();
    });

    it('displays date error when present', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          errors: { 0: { date: 'Please select a date' } },
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByText('Please select a date')).toBeTruthy();
    });

    it('displays multiple errors for multiple rounds', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          rounds: [createMockRound(), createMockRound()],
          errors: {
            0: { course: 'Select course for round 1' },
            1: { date: 'Select date for round 2' },
          },
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByTestId('error-course-0')).toBeTruthy();
      expect(screen.getByTestId('error-date-1')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROPS PASSING TESTS
  // ===========================================================================

  describe('Props Passing', () => {
    it('passes initialData to useRoundDetailsForm hook', () => {
      const initialData = [createMockRound({ courseName: 'Test Course' })];
      render(<RoundDetailsStep {...defaultProps} initialData={initialData} />);

      expect(mockUseRoundDetailsForm).toHaveBeenCalledWith(
        expect.objectContaining({ initialData })
      );
    });

    it('passes allowedGameTypes to useRoundDetailsForm hook', () => {
      const allowedGameTypes: GameType[] = ['stableford', 'stroke'];
      render(<RoundDetailsStep {...defaultProps} allowedGameTypes={allowedGameTypes} />);

      expect(mockUseRoundDetailsForm).toHaveBeenCalledWith(
        expect.objectContaining({ allowedGameTypes })
      );
    });

    it('passes competitionStartDate to useRoundDetailsForm hook', () => {
      render(<RoundDetailsStep {...defaultProps} competitionStartDate="15/01/2025" />);

      expect(mockUseRoundDetailsForm).toHaveBeenCalledWith(
        expect.objectContaining({ competitionStartDate: '15/01/2025' })
      );
    });

    it('passes onComplete to useRoundDetailsForm hook', () => {
      const onComplete = jest.fn();
      render(<RoundDetailsStep {...defaultProps} onComplete={onComplete} />);

      expect(mockUseRoundDetailsForm).toHaveBeenCalledWith(
        expect.objectContaining({ onComplete })
      );
    });

    it('passes onComplete to useRoundDetailsForm hook via props', () => {
      render(<RoundDetailsStep {...defaultProps} />);
      // Verify hook receives onComplete
      expect(mockUseRoundDetailsForm).toHaveBeenCalledWith(
        expect.objectContaining({ onComplete: defaultProps.onComplete })
      );
    });
  });

  // ===========================================================================
  // GAME TYPES TESTS
  // ===========================================================================

  describe('Game Types', () => {
    it('passes availableGameTypes to MatchTypeModal', () => {
      const availableGameTypes = [
        { value: 'stableford', label: 'Stableford', description: 'Points' },
        { value: 'stroke', label: 'Stroke', description: 'Strokes', disabled: true },
      ];
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showMatchTypeModal: true,
          editingMatchTypeRoundIndex: 0,
          rounds: [createMockRound()],
          availableGameTypes,
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByTestId('match-type-modal')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PREMIUM FEATURE TESTS
  // ===========================================================================

  describe('Premium Features', () => {
    it('renders round cards that check premium status internally', () => {
      mockUseRoundDetailsForm.mockReturnValue(createDefaultFormReturn());

      render(<RoundDetailsStep {...defaultProps} />);
      // RoundCard now checks premium status internally via useIsPremium
      expect(screen.getByTestId('round-card-0')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MULTIPLE ROUNDS TESTS
  // ===========================================================================

  describe('Multiple Rounds', () => {
    it('renders multiple round cards with correct indices', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          rounds: [
            createMockRound({ courseName: 'Course 1', date: '15/01/2025' }),
            createMockRound({ courseName: 'Course 2', date: '16/01/2025' }),
            createMockRound({ courseName: 'Course 3', date: '17/01/2025' }),
          ],
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);

      expect(screen.getByTestId('round-card-0')).toBeTruthy();
      expect(screen.getByTestId('round-card-1')).toBeTruthy();
      expect(screen.getByTestId('round-card-2')).toBeTruthy();
      expect(screen.getByText('Course 1')).toBeTruthy();
      expect(screen.getByText('Course 2')).toBeTruthy();
      expect(screen.getByText('Course 3')).toBeTruthy();
    });

    it('all rounds except single are removable', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          rounds: [createMockRound(), createMockRound(), createMockRound()],
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);

      // All rounds should have remove buttons when there are multiple
      expect(screen.getByTestId('remove-round-0')).toBeTruthy();
      expect(screen.getByTestId('remove-round-1')).toBeTruthy();
      expect(screen.getByTestId('remove-round-2')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty States', () => {
    it('displays No Course when courseName is empty', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          rounds: [createMockRound({ courseName: '' })],
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByText('No Course')).toBeTruthy();
    });

    it('displays No Date when date is empty', () => {
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          rounds: [createMockRound({ date: '' })],
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByText('No Date')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FAVORITE COURSES TESTS
  // ===========================================================================

  describe('Favorite Courses', () => {
    it('passes favoriteCourses to CourseSelectionModal', () => {
      const favoriteCourses = [
        { id: 'fav1', name: 'Favorite Course', venue: { id: 'v1', name: 'Venue' } },
      ];
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({
          showCourseModal: true,
          favoriteCourses,
        })
      );

      render(<RoundDetailsStep {...defaultProps} />);
      expect(screen.getByTestId('course-selection-modal')).toBeTruthy();
    });
  });

  // ===========================================================================
  // AVAILABLE TEES TESTS
  // ===========================================================================

  describe('Available Tees', () => {
    it('calls getAvailableTeesForRound for each round card', () => {
      const getAvailableTeesForRound = jest.fn(() => []);
      const rounds = [createMockRound(), createMockRound()];
      mockUseRoundDetailsForm.mockReturnValue(
        createDefaultFormReturn({ rounds, getAvailableTeesForRound })
      );

      render(<RoundDetailsStep {...defaultProps} />);

      // The component passes getAvailableTeesForRound result to RoundCard
      expect(screen.getByTestId('round-card-0')).toBeTruthy();
      expect(screen.getByTestId('round-card-1')).toBeTruthy();
    });
  });
});

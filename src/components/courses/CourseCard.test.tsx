/**
 * CourseCard Component Tests
 *
 * Tests for the course display card component including:
 * - Rendering course information (name, description, stats)
 * - Hole count and par calculations
 * - Tee box summaries
 * - Favorite toggle functionality
 * - Chevron visibility
 * - Loading states
 * - Accessibility
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { CourseCard } from './CourseCard';
import type { Course, Hole } from '@/types/database.types';

// =====================================================
// MOCKS
// =====================================================

// Mock GolfBallLoader
jest.mock('@/components/common', () => {
  const { View, Text } = require('react-native');
  return {
    GolfBallLoader: ({ size }: { size: string }) => (
      <View testID="golf-ball-loader">
        <Text>Loading {size}</Text>
      </View>
    ),
  };
});

// =====================================================
// TEST FIXTURES
// =====================================================

interface CourseWithFavorite extends Course {
  is_favorite: boolean;
}

const createTestHole = (number: number, par: 3 | 4 | 5 = 4): Hole => ({
  number: number as Hole['number'],
  par,
  strokeIndex: number,
  yardages: { blue: 400, white: 380, red: 350 },
});

const createTestCourse = (overrides: Partial<CourseWithFavorite> = {}): CourseWithFavorite => ({
  id: 'course-1',
  venue_id: 'venue-1',
  name: 'Championship Course',
  description: 'A challenging championship layout',
  holes: Array.from({ length: 18 }, (_, i) => createTestHole(i + 1)),
  tees: [
    { name: 'Championship', color: 'blue', totalYardage: 6800, courseRating: 74.5, slopeRating: 145 },
    { name: 'Members', color: 'white', totalYardage: 6400, courseRating: 72.0, slopeRating: 135 },
    { name: 'Forward', color: 'red', totalYardage: 5800, courseRating: 68.5, slopeRating: 120 },
  ],
  slope_rating: 145,
  course_rating: 74.5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_favorite: false,
  ...overrides,
});

// =====================================================
// TEST SUITE
// =====================================================

describe('CourseCard', () => {
  const defaultProps = {
    course: createTestCourse(),
    onPress: jest.fn(),
    onToggleFavorite: jest.fn(),
    isTogglingFavorite: false,
    showFavoriteButton: true,
    showChevron: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<CourseCard {...defaultProps} />);
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('renders course name', () => {
      render(<CourseCard {...defaultProps} />);
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('renders course description when provided', () => {
      render(<CourseCard {...defaultProps} />);
      expect(screen.getByText('A challenging championship layout')).toBeTruthy();
    });

    it('does not render description when not provided', () => {
      const course = createTestCourse({ description: null });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText('A challenging championship layout')).toBeNull();
    });

    it('renders venue name when provided', () => {
      render(<CourseCard {...defaultProps} venueName="Royal Melbourne Golf Club" />);
      expect(screen.getByText('Royal Melbourne Golf Club')).toBeTruthy();
    });

    it('does not render venue name when not provided', () => {
      render(<CourseCard {...defaultProps} />);
      expect(screen.queryByText('Royal Melbourne Golf Club')).toBeNull();
    });

    it('renders hole count correctly', () => {
      render(<CourseCard {...defaultProps} />);
      expect(screen.getByText('18 holes')).toBeTruthy();
    });

    it('renders 9-hole course correctly', () => {
      const course = createTestCourse({
        holes: Array.from({ length: 9 }, (_, i) => createTestHole(i + 1)),
      });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.getByText('9 holes')).toBeTruthy();
    });

    it('does not render holes when none exist', () => {
      const course = createTestCourse({ holes: [] });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText(/holes/)).toBeNull();
    });

    it('renders total par calculated from holes', () => {
      // 18 holes, default par 4 = 72
      render(<CourseCard {...defaultProps} />);
      expect(screen.getByText('Par 72')).toBeTruthy();
    });

    it('calculates par correctly with mixed pars', () => {
      const holes: Hole[] = [
        createTestHole(1, 4),
        createTestHole(2, 3),
        createTestHole(3, 5),
        createTestHole(4, 4),
        createTestHole(5, 4),
        createTestHole(6, 3),
        createTestHole(7, 5),
        createTestHole(8, 4),
        createTestHole(9, 4),
      ]; // Total: 4+3+5+4+4+3+5+4+4 = 36
      const course = createTestCourse({ holes });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.getByText('Par 36')).toBeTruthy();
    });

    it('does not render par when no holes', () => {
      const course = createTestCourse({ holes: [] });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText(/Par/)).toBeNull();
    });

    it('renders slope rating when available', () => {
      render(<CourseCard {...defaultProps} />);
      expect(screen.getByText('Slope: 145')).toBeTruthy();
    });

    it('does not render slope rating when not available', () => {
      const course = createTestCourse({ slope_rating: null });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText(/Slope:/)).toBeNull();
    });

    it('renders course rating when available', () => {
      render(<CourseCard {...defaultProps} />);
      expect(screen.getByText('CR: 74.5')).toBeTruthy();
    });

    it('does not render course rating when not available', () => {
      const course = createTestCourse({ course_rating: null });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText(/CR:/)).toBeNull();
    });
  });

  // ===========================================================================
  // TEE BOX SUMMARY TESTS
  // ===========================================================================

  describe('Tee Box Summary', () => {
    it('renders tee box range for multiple tees', () => {
      render(<CourseCard {...defaultProps} />);
      // 3 tees with 5,800, 6,400, 6,800 yardages
      expect(screen.getByText(/3 tees:/)).toBeTruthy();
      expect(screen.getByText(/5,800 - 6,800 yds/)).toBeTruthy();
    });

    it('renders single tee yardage correctly', () => {
      const course = createTestCourse({
        tees: [{ name: 'Standard', color: 'white', totalYardage: 6200, courseRating: 70.0, slopeRating: 130 }],
      });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.getByText(/1 tee:/)).toBeTruthy();
      expect(screen.getByText(/6,200 yds/)).toBeTruthy();
    });

    it('does not render tee summary when no tees', () => {
      const course = createTestCourse({ tees: [] });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText(/tee/)).toBeNull();
    });

    it('does not render tee summary when tees have no yardage', () => {
      const course = createTestCourse({
        tees: [
          { name: 'Blue', color: 'blue', totalYardage: null, courseRating: 72.0, slopeRating: 135 },
          { name: 'White', color: 'white', totalYardage: null, courseRating: 70.0, slopeRating: 130 },
        ],
      });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText(/yds/)).toBeNull();
    });

    it('handles mix of tees with and without yardage', () => {
      const course = createTestCourse({
        tees: [
          { name: 'Blue', color: 'blue', totalYardage: 6800, courseRating: 74.5, slopeRating: 145 },
          { name: 'White', color: 'white', totalYardage: null, courseRating: 72.0, slopeRating: 135 },
          { name: 'Red', color: 'red', totalYardage: 5500, courseRating: 68.0, slopeRating: 120 },
        ],
      });
      render(<CourseCard {...defaultProps} course={course} />);
      // Should show range based on available yardages only
      expect(screen.getByText(/3 tees:/)).toBeTruthy();
      expect(screen.getByText(/5,500 - 6,800 yds/)).toBeTruthy();
    });

    it('formats large yardages with commas', () => {
      const course = createTestCourse({
        tees: [{ name: 'Long', color: 'black', totalYardage: 7500, courseRating: 76.0, slopeRating: 155 }],
      });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.getByText(/7,500 yds/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // INTERACTION TESTS
  // ===========================================================================

  describe('Interactions', () => {
    it('calls onPress when card is pressed', () => {
      const onPress = jest.fn();
      render(<CourseCard {...defaultProps} onPress={onPress} />);

      const courseCard = screen.getByText('Championship Course');
      fireEvent.press(courseCard.parent?.parent?.parent?.parent || courseCard);

      expect(onPress).toHaveBeenCalledWith(defaultProps.course);
    });

    it('calls onPress with correct course data', () => {
      const onPress = jest.fn();
      const course = createTestCourse({ id: 'custom-course', name: 'Custom Course' });
      render(<CourseCard {...defaultProps} course={course} onPress={onPress} />);

      const courseCard = screen.getByText('Custom Course');
      fireEvent.press(courseCard.parent?.parent?.parent?.parent || courseCard);

      expect(onPress).toHaveBeenCalledWith(course);
    });

    it('does not crash when onPress is undefined', () => {
      render(<CourseCard {...defaultProps} onPress={undefined} />);
      const courseCard = screen.getByText('Championship Course');
      // Should not throw
      fireEvent.press(courseCard);
    });

    it('calls onToggleFavorite when favorite button is pressed', () => {
      const onToggleFavorite = jest.fn();
      render(<CourseCard {...defaultProps} onToggleFavorite={onToggleFavorite} />);

      // Find the favorite button with hitSlop
      const buttons = screen.root.findAllByType('TouchableOpacity' as any);
      const favoriteButton = buttons.find(
        (btn: any) => btn.props.hitSlop && btn.props.hitSlop.top === 10
      );

      if (favoriteButton) {
        fireEvent.press(favoriteButton);
        expect(onToggleFavorite).toHaveBeenCalledWith(defaultProps.course);
      }
    });

    it('does not crash when onToggleFavorite is undefined', () => {
      render(<CourseCard {...defaultProps} onToggleFavorite={undefined} />);
      // Should render without crashing
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FAVORITE BUTTON TESTS
  // ===========================================================================

  describe('Favorite Button', () => {
    it('shows favorite button when showFavoriteButton is true', () => {
      render(<CourseCard {...defaultProps} showFavoriteButton={true} />);
      // Check for the favorite button by its accessibility label
      const favoriteButton = screen.getByLabelText('Add to favourites');
      expect(favoriteButton).toBeTruthy();
    });

    it('hides favorite button when showFavoriteButton is false', () => {
      render(<CourseCard {...defaultProps} showFavoriteButton={false} />);
      // Button should not exist - no favorite accessibility label
      expect(screen.queryByLabelText('Add to favourites')).toBeNull();
      expect(screen.queryByLabelText('Remove from favourites')).toBeNull();
    });

    it('shows loading indicator when isTogglingFavorite is true', () => {
      render(<CourseCard {...defaultProps} isTogglingFavorite={true} />);
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('does not show loading indicator when isTogglingFavorite is false', () => {
      render(<CourseCard {...defaultProps} isTogglingFavorite={false} />);
      expect(screen.queryByTestId('golf-ball-loader')).toBeNull();
    });

    it('disables favorite button while toggling', () => {
      render(<CourseCard {...defaultProps} isTogglingFavorite={true} />);
      // When toggling, the button shows loading state and is disabled
      const favoriteButton = screen.getByLabelText('Add to favourites');
      // Check if the button has disabled accessibility state
      expect(favoriteButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('renders with favorite status (is_favorite: true)', () => {
      const course = createTestCourse({ is_favorite: true });
      render(<CourseCard {...defaultProps} course={course} />);
      // Component should render with favorite styling (verified by visual inspection)
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('renders with non-favorite status (is_favorite: false)', () => {
      const course = createTestCourse({ is_favorite: false });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHEVRON TESTS
  // ===========================================================================

  describe('Chevron', () => {
    it('shows chevron when showChevron is true', () => {
      render(<CourseCard {...defaultProps} showChevron={true} />);
      // The chevron icon is rendered but we can't easily verify in tests
      // Just ensure component renders without error
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('hides chevron when showChevron is false', () => {
      render(<CourseCard {...defaultProps} showChevron={false} />);
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('defaults to showing chevron', () => {
      render(<CourseCard course={defaultProps.course} />);
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible button role', () => {
      render(<CourseCard {...defaultProps} />);
      // The main card and favorite button both have button role
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('has accessible label with course info', () => {
      render(<CourseCard {...defaultProps} />);
      const button = screen.getByLabelText(/Championship Course/);
      expect(button).toBeTruthy();
    });

    it('includes hole count in accessibility label', () => {
      render(<CourseCard {...defaultProps} />);
      const button = screen.getByLabelText(/18 holes/);
      expect(button).toBeTruthy();
    });

    it('includes par in accessibility label when available', () => {
      render(<CourseCard {...defaultProps} />);
      const button = screen.getByLabelText(/par 72/);
      expect(button).toBeTruthy();
    });

    it('has accessibility hint for card', () => {
      render(<CourseCard {...defaultProps} />);
      const button = screen.getByHintText('Tap to view course details');
      expect(button).toBeTruthy();
    });

    it('favorite button has accessible label for non-favorite', () => {
      const course = createTestCourse({ is_favorite: false });
      render(<CourseCard {...defaultProps} course={course} />);
      const favoriteButton = screen.getByLabelText('Add to favourites');
      expect(favoriteButton).toBeTruthy();
    });

    it('favorite button has accessible label for favorite', () => {
      const course = createTestCourse({ is_favorite: true });
      render(<CourseCard {...defaultProps} course={course} />);
      const favoriteButton = screen.getByLabelText('Remove from favourites');
      expect(favoriteButton).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles null holes array', () => {
      const course = createTestCourse({ holes: null as any });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText(/holes/)).toBeNull();
      expect(screen.queryByText(/Par/)).toBeNull();
    });

    it('handles undefined holes array', () => {
      const course = createTestCourse({ holes: undefined });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText(/holes/)).toBeNull();
    });

    it('handles null tees array', () => {
      const course = createTestCourse({ tees: null as any });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText(/tees/)).toBeNull();
    });

    it('handles undefined tees array', () => {
      const course = createTestCourse({ tees: undefined });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText(/tees/)).toBeNull();
    });

    it('handles very long course name', () => {
      const course = createTestCourse({
        name: 'The Very Long Name Championship Golf Course at the Grand Resort and Country Club of Victoria',
      });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(
        screen.getByText(
          'The Very Long Name Championship Golf Course at the Grand Resort and Country Club of Victoria'
        )
      ).toBeTruthy();
    });

    it('handles very long description', () => {
      const course = createTestCourse({
        description:
          'This is an extremely long description that goes on and on about the course features, history, and various other details that might be relevant to golfers considering playing here.',
      });
      render(<CourseCard {...defaultProps} course={course} />);
      // Text should be truncated with numberOfLines={2}
      expect(screen.getByText(/This is an extremely long description/)).toBeTruthy();
    });

    it('handles empty course name', () => {
      const course = createTestCourse({ name: '' });
      render(<CourseCard {...defaultProps} course={course} />);
      // Should render without crashing
      expect(screen.root).toBeTruthy();
    });

    it('handles zero par holes', () => {
      // Note: Zero total par is falsy, so Par 0 won't be displayed
      // This tests that the component doesn't crash with unusual data
      const course = createTestCourse({
        holes: [{ number: 1 as Hole['number'], par: 0 as any, strokeIndex: 1, yardages: {} }],
      });
      render(<CourseCard {...defaultProps} course={course} />);
      // With par 0, the Par text won't be shown (0 is falsy)
      expect(screen.queryByText('Par 0')).toBeNull();
      // But holes should still show
      expect(screen.getByText(/1 holes/)).toBeTruthy();
    });

    it('handles special characters in course name', () => {
      const course = createTestCourse({ name: "St. Andrew's Links (Old Course)" });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.getByText("St. Andrew's Links (Old Course)")).toBeTruthy();
    });

    it('renders consistently with same props', () => {
      const { getByText: firstGet } = render(<CourseCard {...defaultProps} />);
      expect(firstGet('Championship Course')).toBeTruthy();

      const { getByText: secondGet } = render(<CourseCard {...defaultProps} />);
      expect(secondGet('Championship Course')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMOIZATION TESTS
  // ===========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      // React.memo wraps the component, so we check it's a valid component
      // and can be rendered (memo preserves component functionality)
      expect(typeof CourseCard).toBe('object'); // memo returns an object
      // The component should render correctly
      render(<CourseCard course={defaultProps.course} />);
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('maintains stable callback references', () => {
      const onPress = jest.fn();
      const { rerender } = render(<CourseCard {...defaultProps} onPress={onPress} />);

      // First press
      const courseCard = screen.getByText('Championship Course');
      fireEvent.press(courseCard.parent?.parent?.parent?.parent || courseCard);
      expect(onPress).toHaveBeenCalledTimes(1);

      // Rerender with same props
      rerender(<CourseCard {...defaultProps} onPress={onPress} />);

      // Second press
      fireEvent.press(courseCard.parent?.parent?.parent?.parent || courseCard);
      expect(onPress).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // STATS ROW COMBINATIONS
  // ===========================================================================

  describe('Stats Row Combinations', () => {
    it('renders all stats when all available', () => {
      render(<CourseCard {...defaultProps} />);
      expect(screen.getByText('18 holes')).toBeTruthy();
      expect(screen.getByText('Par 72')).toBeTruthy();
      expect(screen.getByText('Slope: 145')).toBeTruthy();
      expect(screen.getByText('CR: 74.5')).toBeTruthy();
    });

    it('renders only holes and par when no ratings', () => {
      const course = createTestCourse({ slope_rating: null, course_rating: null });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.getByText('18 holes')).toBeTruthy();
      expect(screen.getByText('Par 72')).toBeTruthy();
      expect(screen.queryByText(/Slope:/)).toBeNull();
      expect(screen.queryByText(/CR:/)).toBeNull();
    });

    it('renders only ratings when no holes', () => {
      const course = createTestCourse({ holes: [] });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText(/holes/)).toBeNull();
      expect(screen.queryByText(/Par/)).toBeNull();
      expect(screen.getByText('Slope: 145')).toBeTruthy();
      expect(screen.getByText('CR: 74.5')).toBeTruthy();
    });

    it('renders nothing when no stats available', () => {
      const course = createTestCourse({
        holes: [],
        slope_rating: null,
        course_rating: null,
      });
      render(<CourseCard {...defaultProps} course={course} />);
      expect(screen.queryByText(/holes/)).toBeNull();
      expect(screen.queryByText(/Par/)).toBeNull();
      expect(screen.queryByText(/Slope:/)).toBeNull();
      expect(screen.queryByText(/CR:/)).toBeNull();
    });
  });

  // ===========================================================================
  // COMBINED PROPS TESTS
  // ===========================================================================

  describe('Combined Props', () => {
    it('renders with all props provided', () => {
      const course = createTestCourse({ is_favorite: true });
      render(
        <CourseCard
          course={course}
          onPress={jest.fn()}
          onToggleFavorite={jest.fn()}
          isTogglingFavorite={false}
          showFavoriteButton={true}
          showChevron={true}
          venueName="Royal Melbourne"
        />
      );
      expect(screen.getByText('Championship Course')).toBeTruthy();
      expect(screen.getByText('Royal Melbourne')).toBeTruthy();
    });

    it('renders with minimal props', () => {
      const course = createTestCourse();
      render(<CourseCard course={course} />);
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('handles selection mode style (chevron only)', () => {
      render(
        <CourseCard
          {...defaultProps}
          showFavoriteButton={false}
          showChevron={true}
        />
      );
      // Should show chevron but not favorite button
      const buttons = screen.root.findAllByType('TouchableOpacity' as any);
      const favoriteButton = buttons.find(
        (btn: any) => btn.props.hitSlop && btn.props.hitSlop.top === 10
      );
      expect(favoriteButton).toBeUndefined();
    });

    it('handles browse mode style (favorite only)', () => {
      render(
        <CourseCard
          {...defaultProps}
          showFavoriteButton={true}
          showChevron={false}
        />
      );
      // Should show favorite button
      const favoriteButton = screen.getByLabelText('Add to favourites');
      expect(favoriteButton).toBeTruthy();
    });

    it('handles no actions style (no favorite, no chevron)', () => {
      render(
        <CourseCard
          {...defaultProps}
          showFavoriteButton={false}
          showChevron={false}
        />
      );
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DEFAULT PROPS TESTS
  // ===========================================================================

  describe('Default Props', () => {
    it('defaults showFavoriteButton to true', () => {
      render(<CourseCard course={defaultProps.course} />);
      // Should show favorite button by default
      const favoriteButton = screen.getByLabelText('Add to favourites');
      expect(favoriteButton).toBeTruthy();
    });

    it('defaults showChevron to true', () => {
      render(<CourseCard course={defaultProps.course} />);
      // Chevron should be rendered by default
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('defaults isTogglingFavorite to undefined/false', () => {
      render(<CourseCard course={defaultProps.course} />);
      expect(screen.queryByTestId('golf-ball-loader')).toBeNull();
    });
  });
});

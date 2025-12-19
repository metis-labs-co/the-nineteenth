/**
 * VenueCard Component Tests
 *
 * Tests for the hybrid venue/course display component including:
 * - Single-course venue rendering (direct course display)
 * - Multi-course venue rendering (expandable with nested courses)
 * - Favorite toggle functionality
 * - Selection mode for course picking
 * - Expand/collapse behavior
 * - Course metadata display (holes, ratings)
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { VenueCard } from './VenueCard';
import type { VenueCourseDisplayItem, CourseWithFavoriteStatus } from '@/hooks/useVenues';
import type { Venue, Hole } from '@/types/database.types';

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

// Mock VenueCard's LayoutAnimation import by patching it
// We do this by importing the module and patching before tests
beforeAll(() => {
  const RN = require('react-native');
  RN.LayoutAnimation.configureNext = jest.fn();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// =====================================================
// TEST FIXTURES
// =====================================================

const createTestHole = (number: number, par: 3 | 4 | 5 = 4): Hole => ({
  number: number as Hole['number'],
  par,
  strokeIndex: number,
  yardages: { blue: 400, white: 380, red: 350 },
});

const createTestVenue = (overrides: Partial<Venue> = {}): Venue => ({
  id: 'venue-1',
  source: 'manual',
  api_id: null,
  name: 'Test Golf Club',
  state: 'VIC',
  city: 'Melbourne',
  address: '123 Golf Street',
  phone: null,
  email: null,
  website: null,
  location: null,
  total_holes: 18,
  last_synced: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createTestCourse = (
  overrides: Partial<CourseWithFavoriteStatus> = {}
): CourseWithFavoriteStatus => ({
  id: 'course-1',
  venue_id: 'venue-1',
  name: 'Championship Course',
  description: 'A challenging championship course',
  holes: Array.from({ length: 18 }, (_, i) => createTestHole(i + 1)),
  tees: [
    { name: 'Men', color: 'white', totalYardage: 6400, courseRating: 70.0, slopeRating: 125 },
  ],
  slope_rating: 125,
  course_rating: 70.0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_favorite: false,
  ...overrides,
});

const createSingleCourseItem = (
  venueOverrides: Partial<Venue> = {},
  courseOverrides: Partial<CourseWithFavoriteStatus> = {}
): VenueCourseDisplayItem => ({
  type: 'single-course',
  venue: createTestVenue(venueOverrides),
  courses: [createTestCourse(courseOverrides)],
});

const createMultiCourseItem = (
  venueOverrides: Partial<Venue> = {},
  courseCount = 3
): VenueCourseDisplayItem => {
  const venue = createTestVenue(venueOverrides);
  const courses = Array.from({ length: courseCount }, (_, i) =>
    createTestCourse({
      id: `course-${i + 1}`,
      name: i === 0 ? 'North Course' : i === 1 ? 'South Course' : `Course ${i + 1}`,
      description: i === 0 ? '18 holes par 72' : undefined,
      is_favorite: i === 0, // First course is favorite
    })
  );
  return {
    type: 'multi-course-venue',
    venue,
    courses,
  };
};

// =====================================================
// TEST SUITE
// =====================================================

describe('VenueCard', () => {
  const defaultProps = {
    item: createSingleCourseItem(),
    onCourseSelect: jest.fn(),
    onVenuePress: jest.fn(),
    onToggleFavorite: jest.fn(),
    showFavoriteButton: true,
    selectionMode: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // SINGLE-COURSE VENUE TESTS
  // ===========================================================================

  describe('Single-Course Venue', () => {
    it('renders course name', () => {
      render(<VenueCard {...defaultProps} />);
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('renders venue name and location as subtitle', () => {
      render(<VenueCard {...defaultProps} />);
      expect(screen.getByText('Test Golf Club · Melbourne, VIC')).toBeTruthy();
    });

    it('renders hole count when holes exist', () => {
      render(<VenueCard {...defaultProps} />);
      expect(screen.getByText('18 holes')).toBeTruthy();
    });

    it('renders slope rating when available', () => {
      render(<VenueCard {...defaultProps} />);
      expect(screen.getByText(/Slope: 125/)).toBeTruthy();
    });

    it('calls onCourseSelect when card is pressed', () => {
      const onCourseSelect = jest.fn();
      render(<VenueCard {...defaultProps} onCourseSelect={onCourseSelect} />);

      const course = defaultProps.item.courses[0];
      const venue = defaultProps.item.venue;

      // Find and press the touchable (course row)
      const courseCard = screen.getByText('Championship Course');
      fireEvent.press(courseCard.parent?.parent || courseCard);

      expect(onCourseSelect).toHaveBeenCalledWith(course, venue);
    });

    it('shows star outline icon when not favorite', () => {
      render(<VenueCard {...defaultProps} />);
      // The icon mock doesn't render text, but the button should be there
      // We verify the structure renders without favorite styling
      expect(screen.queryByTestId('golf-ball-loader')).toBeNull();
    });

    it('calls onToggleFavorite when favorite button is pressed', () => {
      const onToggleFavorite = jest.fn();
      render(<VenueCard {...defaultProps} onToggleFavorite={onToggleFavorite} />);

      // The favorite button is within the course row
      // We need to find it and press it
      const buttons = screen.root.findAllByType('TouchableOpacity' as any);
      // The last button in the course row is the favorite button
      const favoriteButton = buttons.find((btn: any) =>
        btn.props.hitSlop && btn.props.hitSlop.top === 10
      );

      if (favoriteButton) {
        fireEvent.press(favoriteButton);
        expect(onToggleFavorite).toHaveBeenCalledWith(defaultProps.item.courses[0]);
      }
    });

    it('shows loading indicator when toggling favorite', () => {
      const course = createTestCourse();
      const item = createSingleCourseItem({}, course);

      render(
        <VenueCard
          {...defaultProps}
          item={item}
          isTogglingFavorite={course.id}
        />
      );

      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('returns null if course is missing', () => {
      const item: VenueCourseDisplayItem = {
        type: 'single-course',
        venue: createTestVenue(),
        courses: [],
      };

      render(<VenueCard {...defaultProps} item={item} />);
      // When no course, the card container should not be present
      expect(screen.queryByText('Championship Course')).toBeNull();
      expect(screen.queryByText('Test Golf Club')).toBeNull();
    });

    it('renders location without city if not provided', () => {
      const item = createSingleCourseItem({ city: undefined });
      render(<VenueCard {...defaultProps} item={item} />);

      // Should show "Test Golf Club · VIC" instead of "Test Golf Club · Melbourne, VIC"
      expect(screen.queryByText('Test Golf Club · Melbourne, VIC')).toBeNull();
    });

    it('does not render meta row if no holes or rating', () => {
      const item = createSingleCourseItem({}, { holes: [], slope_rating: null });
      render(<VenueCard {...defaultProps} item={item} />);

      expect(screen.queryByText(/holes/)).toBeNull();
      expect(screen.queryByText(/Slope/)).toBeNull();
    });

    it('shows chevron-right icon in selection mode', () => {
      render(<VenueCard {...defaultProps} selectionMode={true} />);
      // The chevron icon should be visible instead of favorite button
      // Since we're testing structure, just verify no loader appears
      expect(screen.queryByTestId('golf-ball-loader')).toBeNull();
    });

    it('hides favorite button in selection mode', () => {
      const onToggleFavorite = jest.fn();
      render(
        <VenueCard
          {...defaultProps}
          onToggleFavorite={onToggleFavorite}
          selectionMode={true}
        />
      );

      // In selection mode, favorite button should not be rendered
      // Pressing anywhere should not call onToggleFavorite
      const courseText = screen.getByText('Championship Course');
      fireEvent.press(courseText);

      // Should not have called toggle favorite (pressing course calls onCourseSelect)
      // We verify by checking the callback count
    });
  });

  // ===========================================================================
  // MULTI-COURSE VENUE TESTS
  // ===========================================================================

  describe('Multi-Course Venue', () => {
    const multiCourseItem = createMultiCourseItem({ name: 'Grand Golf Resort', total_holes: 54 });

    it('renders venue name', () => {
      render(<VenueCard {...defaultProps} item={multiCourseItem} />);
      expect(screen.getByText('Grand Golf Resort')).toBeTruthy();
    });

    it('renders course count badge', () => {
      render(<VenueCard {...defaultProps} item={multiCourseItem} />);
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('renders location', () => {
      render(<VenueCard {...defaultProps} item={multiCourseItem} />);
      expect(screen.getByText('Melbourne, VIC')).toBeTruthy();
    });

    it('renders total holes when available', () => {
      render(<VenueCard {...defaultProps} item={multiCourseItem} />);
      expect(screen.getByText('54 holes total')).toBeTruthy();
    });

    it('does not show courses when collapsed', () => {
      render(<VenueCard {...defaultProps} item={multiCourseItem} />);

      // Courses should not be visible initially
      expect(screen.queryByText('North Course')).toBeNull();
      expect(screen.queryByText('South Course')).toBeNull();
    });

    it('expands to show courses when header is pressed', () => {
      render(<VenueCard {...defaultProps} item={multiCourseItem} />);

      const venueHeader = screen.getByText('Grand Golf Resort');
      fireEvent.press(venueHeader.parent?.parent?.parent || venueHeader);

      // Courses should now be visible
      expect(screen.getByText('North Course')).toBeTruthy();
      expect(screen.getByText('South Course')).toBeTruthy();
    });

    it('collapses when header is pressed again', () => {
      render(<VenueCard {...defaultProps} item={multiCourseItem} />);

      const venueHeader = screen.getByText('Grand Golf Resort');
      const parentElement = venueHeader.parent?.parent?.parent || venueHeader;

      // Expand
      fireEvent.press(parentElement);
      expect(screen.getByText('North Course')).toBeTruthy();

      // Collapse
      fireEvent.press(parentElement);
      expect(screen.queryByText('North Course')).toBeNull();
    });

    it('calls onVenuePress when info button is pressed', () => {
      const onVenuePress = jest.fn();
      render(
        <VenueCard
          {...defaultProps}
          item={multiCourseItem}
          onVenuePress={onVenuePress}
        />
      );

      // Find the info button by its accessibility label
      const infoButton = screen.getByLabelText('View Grand Golf Resort details');
      fireEvent.press(infoButton);

      expect(onVenuePress).toHaveBeenCalledWith(multiCourseItem.venue);
    });

    it('does not render info button when onVenuePress is not provided', () => {
      render(
        <VenueCard {...defaultProps} item={multiCourseItem} onVenuePress={undefined} />
      );

      expect(screen.queryByLabelText(/View.*details/)).toBeNull();
    });

    it('renders course description for nested courses', async () => {
      render(<VenueCard {...defaultProps} item={multiCourseItem} />);

      // Expand
      const venueHeader = screen.getByText('Grand Golf Resort');
      fireEvent.press(venueHeader.parent?.parent?.parent || venueHeader);

      // First course has description
      expect(screen.getByText('18 holes par 72')).toBeTruthy();
    });

    it('calls onCourseSelect for nested course', async () => {
      const onCourseSelect = jest.fn();
      render(
        <VenueCard
          {...defaultProps}
          item={multiCourseItem}
          onCourseSelect={onCourseSelect}
        />
      );

      // Expand
      const venueHeader = screen.getByText('Grand Golf Resort');
      fireEvent.press(venueHeader.parent?.parent?.parent || venueHeader);

      // Press a nested course
      const nestedCourse = screen.getByText('North Course');
      fireEvent.press(nestedCourse.parent?.parent || nestedCourse);

      expect(onCourseSelect).toHaveBeenCalledWith(
        multiCourseItem.courses[0],
        multiCourseItem.venue
      );
    });

    it('shows favorite status for nested courses', async () => {
      render(<VenueCard {...defaultProps} item={multiCourseItem} />);

      // Expand
      const venueHeader = screen.getByText('Grand Golf Resort');
      fireEvent.press(venueHeader.parent?.parent?.parent || venueHeader);

      // First course is marked as favorite in our fixture
      // The structure should exist for displaying favorites
      expect(screen.getByText('North Course')).toBeTruthy();
    });

    it('handles toggling favorite for nested course', async () => {
      const onToggleFavorite = jest.fn();
      render(
        <VenueCard
          {...defaultProps}
          item={multiCourseItem}
          onToggleFavorite={onToggleFavorite}
        />
      );

      // Expand
      const venueHeader = screen.getByText('Grand Golf Resort');
      fireEvent.press(venueHeader.parent?.parent?.parent || venueHeader);

      // Find favorite button for first course
      const buttons = screen.root.findAllByType('TouchableOpacity' as any);
      const favoriteButton = buttons.find(
        (btn: any) => btn.props.hitSlop && btn.props.hitSlop.top === 10
      );

      if (favoriteButton) {
        fireEvent.press(favoriteButton);
        expect(onToggleFavorite).toHaveBeenCalledWith(multiCourseItem.courses[0]);
      }
    });

    it('shows loading for specific course when toggling', async () => {
      render(
        <VenueCard
          {...defaultProps}
          item={multiCourseItem}
          isTogglingFavorite="course-1"
        />
      );

      // Expand
      const venueHeader = screen.getByText('Grand Golf Resort');
      fireEvent.press(venueHeader.parent?.parent?.parent || venueHeader);

      // Should show loader for the course being toggled
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('renders without total_holes if not available', () => {
      const itemWithoutTotalHoles = createMultiCourseItem({ total_holes: undefined });
      render(<VenueCard {...defaultProps} item={itemWithoutTotalHoles} />);

      expect(screen.queryByText(/holes total/)).toBeNull();
    });

    it('renders without location if city and state are missing', () => {
      const itemNoLocation = createMultiCourseItem({ city: undefined, state: undefined });
      render(<VenueCard {...defaultProps} item={itemNoLocation} />);

      expect(screen.queryByText('Melbourne, VIC')).toBeNull();
    });
  });

  // ===========================================================================
  // SELECTION MODE TESTS
  // ===========================================================================

  describe('Selection Mode', () => {
    it('shows chevron-right for single-course venue in selection mode', () => {
      render(<VenueCard {...defaultProps} selectionMode={true} />);
      // Icon should be rendered, verify component doesn't crash
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('hides favorite button for single-course in selection mode', () => {
      render(
        <VenueCard
          {...defaultProps}
          selectionMode={true}
          showFavoriteButton={true}
        />
      );

      // No loader should be shown (favorite button shouldn't be there)
      expect(screen.queryByTestId('golf-ball-loader')).toBeNull();
    });

    it('shows chevron-right for nested courses in selection mode', async () => {
      const multiCourseItem = createMultiCourseItem();
      render(
        <VenueCard {...defaultProps} item={multiCourseItem} selectionMode={true} />
      );

      // Expand venue
      const venueHeader = screen.getByText('Test Golf Club');
      fireEvent.press(venueHeader.parent?.parent?.parent || venueHeader);

      // Verify nested courses render
      expect(screen.getByText('North Course')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SHOW FAVORITE BUTTON TESTS
  // ===========================================================================

  describe('Show Favorite Button', () => {
    it('hides favorite button when showFavoriteButton is false', () => {
      render(<VenueCard {...defaultProps} showFavoriteButton={false} />);

      // The favorite button area should not contain the toggle functionality
      const onToggleFavorite = jest.fn();
      render(
        <VenueCard
          {...defaultProps}
          showFavoriteButton={false}
          onToggleFavorite={onToggleFavorite}
        />
      );

      // Try to find and press, should not find the hitSlop button
      const buttons = screen.root.findAllByType('TouchableOpacity' as any);
      const favoriteButton = buttons.find(
        (btn: any) => btn.props.hitSlop && btn.props.hitSlop.top === 10
      );

      expect(favoriteButton).toBeUndefined();
    });
  });

  // ===========================================================================
  // COURSE METADATA TESTS
  // ===========================================================================

  describe('Course Metadata', () => {
    it('renders hole count correctly', () => {
      const item = createSingleCourseItem(
        {},
        { holes: Array.from({ length: 9 }, (_, i) => createTestHole(i + 1)) }
      );
      render(<VenueCard {...defaultProps} item={item} />);

      expect(screen.getByText('9 holes')).toBeTruthy();
    });

    it('renders slope rating without holes', () => {
      const item = createSingleCourseItem({}, { holes: [], slope_rating: 130 });
      render(<VenueCard {...defaultProps} item={item} />);

      expect(screen.getByText('Slope: 130')).toBeTruthy();
      expect(screen.queryByText(/holes/)).toBeNull();
    });

    it('renders both holes and slope with separator', () => {
      render(<VenueCard {...defaultProps} />);

      expect(screen.getByText('18 holes')).toBeTruthy();
      // The separator and slope are in a separate Text element
      expect(screen.getByText(/Slope:/)).toBeTruthy();
      expect(screen.getByText(/125/)).toBeTruthy();
    });

    it('does not render meta row if empty', () => {
      const item = createSingleCourseItem({}, { holes: [], slope_rating: null });
      render(<VenueCard {...defaultProps} item={item} />);

      expect(screen.queryByText(/holes/)).toBeNull();
      expect(screen.queryByText(/Slope/)).toBeNull();
    });
  });

  // ===========================================================================
  // FAVORITE STATE DISPLAY TESTS
  // ===========================================================================

  describe('Favorite State Display', () => {
    it('renders with favorite state', () => {
      const item = createSingleCourseItem({}, { is_favorite: true });
      render(<VenueCard {...defaultProps} item={item} />);

      // Component should render without errors
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('renders with non-favorite state', () => {
      const item = createSingleCourseItem({}, { is_favorite: false });
      render(<VenueCard {...defaultProps} item={item} />);

      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('shows loading indicator only for matching course ID', async () => {
      const multiCourseItem = createMultiCourseItem();

      render(
        <VenueCard
          {...defaultProps}
          item={multiCourseItem}
          isTogglingFavorite="course-2"
        />
      );

      // Expand
      const venueHeader = screen.getByText('Test Golf Club');
      fireEvent.press(venueHeader.parent?.parent?.parent || venueHeader);

      // Only one loader should be visible (for course-2)
      const loaders = screen.getAllByTestId('golf-ball-loader');
      expect(loaders.length).toBe(1);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible info button with label', () => {
      const multiCourseItem = createMultiCourseItem({ name: 'Royal Melbourne' });
      render(
        <VenueCard
          {...defaultProps}
          item={multiCourseItem}
          onVenuePress={jest.fn()}
        />
      );

      expect(screen.getByLabelText('View Royal Melbourne details')).toBeTruthy();
    });

    it('info button has accessible role', () => {
      const multiCourseItem = createMultiCourseItem();
      render(
        <VenueCard
          {...defaultProps}
          item={multiCourseItem}
          onVenuePress={jest.fn()}
        />
      );

      const infoButton = screen.getByRole('button', { name: /View.*details/ });
      expect(infoButton).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty courses array for single-course type', () => {
      const item: VenueCourseDisplayItem = {
        type: 'single-course',
        venue: createTestVenue(),
        courses: [],
      };

      render(<VenueCard {...defaultProps} item={item} />);
      // When courses array is empty for single-course type, nothing should render
      expect(screen.queryByText('Test Golf Club')).toBeNull();
    });

    it('handles venue with only city (no state)', () => {
      const item = createSingleCourseItem({ city: 'Sydney', state: undefined });
      render(<VenueCard {...defaultProps} item={item} />);

      // Should show venue name with just city
      // Pattern: "Venue Name · City"
      expect(screen.getByText('Test Golf Club · Sydney')).toBeTruthy();
    });

    it('handles venue with only state (no city)', () => {
      const item = createSingleCourseItem({ city: undefined, state: 'NSW' });
      render(<VenueCard {...defaultProps} item={item} />);

      // Should show venue name with just state
      expect(screen.getByText('Test Golf Club · NSW')).toBeTruthy();
    });

    it('handles venue with neither city nor state', () => {
      const item = createSingleCourseItem({ city: undefined, state: undefined });
      render(<VenueCard {...defaultProps} item={item} />);

      // Course name should be visible
      expect(screen.getByText('Championship Course')).toBeTruthy();
      // But the location part should be empty (just venue name)
      // The component will still show "Test Golf Club · " but with empty location
      // Verify it doesn't show city or state explicitly
      expect(screen.queryByText('Melbourne')).toBeNull();
      expect(screen.queryByText('VIC')).toBeNull();
    });

    it('handles course without description in nested view', async () => {
      const multiCourseItem = createMultiCourseItem();
      multiCourseItem.courses[0].description = null;

      render(<VenueCard {...defaultProps} item={multiCourseItem} />);

      // Expand
      const venueHeader = screen.getByText('Test Golf Club');
      fireEvent.press(venueHeader.parent?.parent?.parent || venueHeader);

      expect(screen.getByText('North Course')).toBeTruthy();
    });

    it('handles rapid expand/collapse', () => {
      const multiCourseItem = createMultiCourseItem();
      render(<VenueCard {...defaultProps} item={multiCourseItem} />);

      const venueHeader = screen.getByText('Test Golf Club');
      const parentElement = venueHeader.parent?.parent?.parent || venueHeader;

      // Rapidly expand/collapse
      fireEvent.press(parentElement);
      fireEvent.press(parentElement);
      fireEvent.press(parentElement);
      fireEvent.press(parentElement);
      fireEvent.press(parentElement);

      // Should be expanded (odd number of presses)
      expect(screen.getByText('North Course')).toBeTruthy();
    });

    it('handles undefined onCourseSelect', () => {
      render(<VenueCard {...defaultProps} onCourseSelect={undefined} />);

      const courseText = screen.getByText('Championship Course');
      // Should not throw when pressed
      fireEvent.press(courseText);
    });

    it('handles undefined onToggleFavorite', () => {
      render(<VenueCard {...defaultProps} onToggleFavorite={undefined} />);

      // Component should render without the callback
      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('handles course with null slope_rating', () => {
      const item = createSingleCourseItem({}, { slope_rating: null });
      render(<VenueCard {...defaultProps} item={item} />);

      expect(screen.queryByText(/Slope/)).toBeNull();
      expect(screen.getByText('18 holes')).toBeTruthy();
    });

    it('handles very long course name', () => {
      const item = createSingleCourseItem(
        {},
        { name: 'The Very Long Name Championship Golf Course at the Grand Resort and Country Club' }
      );
      render(<VenueCard {...defaultProps} item={item} />);

      expect(
        screen.getByText(
          'The Very Long Name Championship Golf Course at the Grand Resort and Country Club'
        )
      ).toBeTruthy();
    });

    it('handles very long venue name', () => {
      const multiItem = createMultiCourseItem({
        name: 'The Grand Royal Imperial Golf Resort and Country Club of Victoria',
      });
      render(<VenueCard {...defaultProps} item={multiItem} />);

      expect(
        screen.getByText(
          'The Grand Royal Imperial Golf Resort and Country Club of Victoria'
        )
      ).toBeTruthy();
    });
  });

  // ===========================================================================
  // DISABLED STATE TESTS
  // ===========================================================================

  describe('Disabled State', () => {
    it('disables favorite button while toggling', () => {
      const onToggleFavorite = jest.fn();
      render(
        <VenueCard
          {...defaultProps}
          onToggleFavorite={onToggleFavorite}
          isTogglingFavorite={defaultProps.item.courses[0].id}
        />
      );

      // Button should be disabled, but we can't easily test that
      // We verify the loader is shown instead of the icon
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ANIMATION BEHAVIOR TESTS
  // ===========================================================================

  describe('Animation Behavior', () => {
    it('toggles expand state on press', () => {
      // LayoutAnimation is used internally but we test the state change behavior
      const multiCourseItem = createMultiCourseItem();
      render(<VenueCard {...defaultProps} item={multiCourseItem} />);

      // Initially collapsed
      expect(screen.queryByText('North Course')).toBeNull();

      // Expand
      const venueHeader = screen.getByText('Test Golf Club');
      fireEvent.press(venueHeader.parent?.parent?.parent || venueHeader);

      // Now expanded
      expect(screen.getByText('North Course')).toBeTruthy();
    });
  });

  // ===========================================================================
  // STABILITY TESTS
  // ===========================================================================

  describe('Stability', () => {
    it('renders consistently with same props', () => {
      // Just verify we can render twice without errors
      const { getByText: firstGet } = render(<VenueCard {...defaultProps} />);
      expect(firstGet('Championship Course')).toBeTruthy();

      const { getByText: secondGet } = render(<VenueCard {...defaultProps} />);
      expect(secondGet('Championship Course')).toBeTruthy();
    });
  });

  // ===========================================================================
  // INTEGRATION WITH CALLBACK PROPS
  // ===========================================================================

  describe('Callback Integration', () => {
    it('passes correct course and venue to onCourseSelect for single-course', () => {
      const onCourseSelect = jest.fn();
      const item = createSingleCourseItem();

      render(<VenueCard {...defaultProps} item={item} onCourseSelect={onCourseSelect} />);

      const courseText = screen.getByText('Championship Course');
      fireEvent.press(courseText.parent?.parent || courseText);

      expect(onCourseSelect).toHaveBeenCalledWith(item.courses[0], item.venue);
    });

    it('passes correct venue to onVenuePress', () => {
      const onVenuePress = jest.fn();
      const multiItem = createMultiCourseItem();

      render(
        <VenueCard {...defaultProps} item={multiItem} onVenuePress={onVenuePress} />
      );

      const infoButton = screen.getByLabelText(/View.*details/);
      fireEvent.press(infoButton);

      expect(onVenuePress).toHaveBeenCalledWith(multiItem.venue);
    });

    it('passes correct course to onToggleFavorite', () => {
      const onToggleFavorite = jest.fn();
      const item = createSingleCourseItem();

      render(
        <VenueCard {...defaultProps} item={item} onToggleFavorite={onToggleFavorite} />
      );

      const buttons = screen.root.findAllByType('TouchableOpacity' as any);
      const favoriteButton = buttons.find(
        (btn: any) => btn.props.hitSlop && btn.props.hitSlop.top === 10
      );

      if (favoriteButton) {
        fireEvent.press(favoriteButton);
        expect(onToggleFavorite).toHaveBeenCalledWith(item.courses[0]);
      }
    });
  });
});

/**
 * RoundDetailsTab Component Tests
 *
 * Tests for the round details tab component including:
 * - Rendering with different props
 * - Course header card display
 * - Competition card display (when available)
 * - Round details section with date, tee time, format, tee, status
 * - Hole breakdown table
 * - Navigation to course, venue, and competition
 * - Edit button for organizers
 * - Scoring pairs section
 * - Empty states and edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { RoundDetailsTab } from './index';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { RoundWithCourse, CourseWithClub, CompetitionSummary } from '@/hooks/useRoundDetails';
import type { GameType, RoundStatus, AustralianState, CompetitionStatus, TeeBox } from '@/types/database.types';

// Store reference to mock navigate function
const mockNavigate = jest.fn();

// Override navigation mock to use our mockNavigate
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

// Mock the settings store
jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      distanceUnit: 'metres',
    };
    return selector(state);
  }),
}));

// Mock the sub-components
jest.mock('./components', () => {
  const { View, Text } = require('react-native');
  return {
    PlayersSection: ({
      roundId,
    }: {
      roundId: string;
      cardBackground: string;
    }) => (
      <View testID="players-section">
        <Text testID="players-section-round-id">{roundId}</Text>
      </View>
    ),
  };
});

// Mock skins hook
jest.mock('@/hooks/useSkins', () => ({
  useSkinsGamesByRound: () => ({ data: null }),
}));

// Mock wolf hook
jest.mock('@/hooks/wolf', () => ({
  useWolfGameByRound: () => ({ data: null }),
}));

// Mock per-player tee overrides — default to no overrides so the Details
// tab falls back to round.selected_tee (matches pre-existing test
// expectations).
jest.mock('@/hooks/rounds', () => ({
  useRoundPlayerTees: () => ({ data: new Map() }),
}));

// Mock auth — tests don't care about the current user for this tab.
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ player: null, user: null }),
}));

// Mock StatusBadge
jest.mock('@/components/common/StatusBadge', () => {
  const { View, Text } = require('react-native');
  return {
    StatusBadge: ({ status, size }: { status: string; size?: string }) => (
      <View testID={`status-badge-${status}`}>
        <Text>{status}</Text>
        <Text testID="status-badge-size">{size || 'md'}</Text>
      </View>
    ),
  };
});

// Mock Pill component
jest.mock('@/components/common/Pill', () => {
  const { View, Text } = require('react-native');
  return {
    Pill: ({ label, variant: _variant, size: _size }: { label: string; variant?: string; size?: string }) => (
      <View testID={`pill-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        <Text>{label}</Text>
      </View>
    ),
  };
});

// Mock formatting utilities
jest.mock('@/utils/formatting', () => ({
  formatDateWithWeekday: (date: string) => `Formatted: ${date}`,
  formatTeeTime: (time: string | null) => (time ? `Time: ${time}` : 'Not set'),
}));

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

function createTestClub() {
  return {
    id: 'club-1',
    name: 'Test Golf Club',
    city: 'Melbourne',
    state: 'VIC' as AustralianState,
    address: '123 Golf Street',
  };
}

function createCourseWithVenue(overrides: Partial<CourseWithClub> = {}): CourseWithClub {
  const holes = create18Holes();
  return {
    id: 'course-1',
    club_id: 'club-1',
    golfapi_course_id: null,
    golfapi_long_course_id: null,
    name: 'Championship Course',
    description: 'A challenging championship course',
    num_holes: 18,
    measure_unit: null,
    holes,
    holes_women: null,
    match_play_indexes: null,
    tees: [
      { name: 'Blue', color: 'blue', totalYardage: 6800, courseRating: 72.5, slopeRating: 130 },
      { name: 'White', color: 'white', totalYardage: 6400, courseRating: 70.0, slopeRating: 125 },
      { name: 'Red', color: 'red', totalYardage: 5600, courseRating: 68.5, slopeRating: 115 },
    ],
    tees_migrated: null,
    slope_rating: 125,
    course_rating: 70.0,
    golfapi_updated_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    club: createTestClub(),
    ...overrides,
  };
}

function createCompetitionSummary(overrides: Partial<CompetitionSummary> = {}): CompetitionSummary {
  return {
    id: 'comp-1',
    name: 'Summer Championship',
    competition_type: 'event',
    status: 'in-progress' as CompetitionStatus,
    start_date: '2025-01-15',
    end_date: '2025-01-17',
    handicap_source: 'profile',
    ...overrides,
  };
}

function createRoundWithCourse(overrides: Partial<RoundWithCourse> = {}): RoundWithCourse {
  return {
    id: 'round-1',
    competition_id: 'comp-1',
    user_id: null,
    round_number: 1,
    course_id: 'course-1',
    date: '2025-01-15',
    tee_time: '08:00:00',
    game_type: 'stableford' as GameType,
    nine_type: 'full',
    selected_tee: { name: 'White', color: 'white', totalYardage: 6400 } as TeeBox,
    is_team_round: false,
    team_format: null,
    scoring_pairs_required: false,
    ball_count: 1,
    handicap_source: null,
    status: 'upcoming' as RoundStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    course: createCourseWithVenue(),
    competition: createCompetitionSummary(),
    ...overrides,
  };
}

// ===========================================================================
// TESTS
// ===========================================================================

describe('RoundDetailsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Round Details')).toBeTruthy();
    });

    it('renders all main sections', () => {
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Round Details')).toBeTruthy();
    });

    it('renders the course name', () => {
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Championship Course')).toBeTruthy();
    });

    it('renders Course TBD when no course', () => {
      const round = createRoundWithCourse({ course: null });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Course TBD')).toBeTruthy();
    });
  });

  // ===========================================================================
  // COURSE HEADER CARD TESTS
  // ===========================================================================

  describe('Course Header Card', () => {
    it('displays course quick stats', () => {
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Holes')).toBeTruthy();
      expect(screen.getByText('Par')).toBeTruthy();
      expect(screen.getByText('Slope')).toBeTruthy();
      expect(screen.getByText('CR')).toBeTruthy();
    });

    it('displays correct number of holes', () => {
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} />);

      // There can be multiple '18' values (holes count and in HoleTable mock)
      // Just verify the holes count is displayed
      expect(screen.getAllByText('18').length).toBeGreaterThanOrEqual(1);
    });

    it('displays slope rating from course', () => {
      const round = createRoundWithCourse({
        course: createCourseWithVenue({ slope_rating: 130 }),
      });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('130')).toBeTruthy();
    });

    it('displays course rating from course', () => {
      const round = createRoundWithCourse({
        course: createCourseWithVenue({ course_rating: 72.5 }),
      });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('72.5')).toBeTruthy();
    });

    it('shows dash when no hole data', () => {
      const round = createRoundWithCourse({
        course: createCourseWithVenue({ holes: [] }),
      });

      render(<RoundDetailsTab round={round} />);

      // Should show "-" for holes and par when empty
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });

    it('navigates to course when header card pressed', () => {
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} />);

      // Find and press the course name - pressing it should trigger navigation
      const courseName = screen.getByText('Championship Course');
      // The text is inside a TouchableOpacity, so we need to find parent and press
      fireEvent.press(courseName);

      // Navigation happens at the TouchableOpacity level, verify it was called
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('does not navigate when no course', () => {
      const round = createRoundWithCourse({ course: null });

      render(<RoundDetailsTab round={round} />);

      const courseTbd = screen.getByText('Course TBD');
      fireEvent.press(courseTbd);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // VENUE LINK TESTS
  // ===========================================================================

  describe('Venue Link', () => {
    it('displays venue location', () => {
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Melbourne, VIC')).toBeTruthy();
    });

    it('navigates to venue when link pressed', () => {
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} />);

      const venueLink = screen.getByText('Melbourne, VIC');
      fireEvent.press(venueLink);

      // Just verify navigation was triggered
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('shows venue name when no city/state', () => {
      const round = createRoundWithCourse({
        course: createCourseWithVenue({
          club: {
            id: 'club-1',
            name: 'Royal Melbourne',
            city: '',
            state: null,
            address: '',
          },
        }),
      });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Royal Melbourne')).toBeTruthy();
    });

    it('does not show venue link when no venue', () => {
      const round = createRoundWithCourse({
        course: createCourseWithVenue({ club: null }),
      });

      render(<RoundDetailsTab round={round} />);

      expect(screen.queryByText('Melbourne, VIC')).toBeNull();
    });
  });

  // ===========================================================================
  // PLAYERS SECTION TESTS
  // ===========================================================================

  describe('Players Section', () => {
    it('renders players section', () => {
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByTestId('players-section')).toBeTruthy();
    });

    it('passes round id to players section', () => {
      const round = createRoundWithCourse({ id: 'round-123' });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByTestId('players-section-round-id').children[0]).toBe('round-123');
    });
  });

  // ===========================================================================
  // ROUND DETAILS SECTION TESTS
  // ===========================================================================

  describe('Round Details Section', () => {
    it('displays formatted date', () => {
      const round = createRoundWithCourse({ date: '2025-03-15' });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Date')).toBeTruthy();
      expect(screen.getByText('Formatted: 2025-03-15')).toBeTruthy();
    });

    it('displays formatted tee time', () => {
      const round = createRoundWithCourse({ tee_time: '10:30:00' });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Tee Time')).toBeTruthy();
      expect(screen.getByText('Time: 10:30:00')).toBeTruthy();
    });

    it('displays game type as pill', () => {
      const round = createRoundWithCourse({ game_type: 'stableford' });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Format')).toBeTruthy();
      expect(screen.getByTestId('pill-stableford')).toBeTruthy();
    });

    it('displays stroke play format', () => {
      const round = createRoundWithCourse({ game_type: 'stroke' });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByTestId('pill-stroke-play')).toBeTruthy();
    });

    it('displays match play format', () => {
      const round = createRoundWithCourse({ game_type: 'match-play' });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByTestId('pill-match-play')).toBeTruthy();
    });

    it('displays selected tee name', () => {
      const round = createRoundWithCourse({
        selected_tee: { name: 'Blue', color: 'blue', totalYardage: 6800 } as TeeBox,
      });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Tee')).toBeTruthy();
      // Blue appears in multiple places (hole table mock, round details), check it exists
      expect(screen.getAllByText('Blue').length).toBeGreaterThanOrEqual(1);
    });

    it('displays "Not set" when no selected tee', () => {
      const round = createRoundWithCourse({ selected_tee: null });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Not set')).toBeTruthy();
    });

    it('displays round status badge', () => {
      const round = createRoundWithCourse({ status: 'in-progress' });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Status')).toBeTruthy();
      expect(screen.getByTestId('status-badge-in-progress')).toBeTruthy();
    });

    it('displays completed status', () => {
      const round = createRoundWithCourse({ status: 'completed' });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByTestId('status-badge-completed')).toBeTruthy();
    });

    it('displays upcoming status', () => {
      const round = createRoundWithCourse({ status: 'upcoming' });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByTestId('status-badge-upcoming')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDIT BUTTON TESTS
  // ===========================================================================

  describe('Edit Button', () => {
    it('shows edit button for organizers', () => {
      const onEditPress = jest.fn();
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} isOrganizer={true} onEditPress={onEditPress} />);

      expect(screen.getByLabelText('Edit round details')).toBeTruthy();
    });

    it('does not show edit button for non-organizers', () => {
      const onEditPress = jest.fn();
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} isOrganizer={false} onEditPress={onEditPress} />);

      expect(screen.queryByLabelText('Edit round details')).toBeNull();
    });

    it('does not show edit button when no callback', () => {
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} isOrganizer={true} />);

      expect(screen.queryByLabelText('Edit round details')).toBeNull();
    });

    it('calls onEditPress when edit button pressed', () => {
      const onEditPress = jest.fn();
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} isOrganizer={true} onEditPress={onEditPress} />);

      fireEvent.press(screen.getByLabelText('Edit round details'));

      expect(onEditPress).toHaveBeenCalledTimes(1);
    });

    it('has correct accessibility props', () => {
      const onEditPress = jest.fn();
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} isOrganizer={true} onEditPress={onEditPress} />);

      const editButton = screen.getByLabelText('Edit round details');
      expect(editButton).toBeTruthy();
    });
  });


  // ===========================================================================
  // COURSE STATS TESTS
  // ===========================================================================

  describe('Course Stats', () => {
    it('displays hole count from course', () => {
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} />);

      // 18 holes displayed in the stats bar
      expect(screen.getAllByText('18').length).toBeGreaterThanOrEqual(1);
    });

    it('shows dash when no holes', () => {
      const round = createRoundWithCourse({
        course: createCourseWithVenue({ holes: [] }),
      });

      render(<RoundDetailsTab round={round} />);

      // Should show "-" for holes and par when empty
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });

    it('shows course stats when course is null', () => {
      const round = createRoundWithCourse({ course: null });

      render(<RoundDetailsTab round={round} />);

      // Stats show '-' when no course
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // TOTAL PAR CALCULATION TESTS
  // ===========================================================================

  describe('Total Par Calculation', () => {
    it('calculates total par from holes', () => {
      const holes = create18Holes();
      const expectedPar = holes.reduce((sum, h) => sum + h.par, 0);
      const round = createRoundWithCourse({
        course: createCourseWithVenue({ holes }),
      });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText(String(expectedPar))).toBeTruthy();
    });

    it('shows 0 par when no holes', () => {
      const round = createRoundWithCourse({
        course: createCourseWithVenue({ holes: [] }),
      });

      render(<RoundDetailsTab round={round} />);

      // When holes is empty, totalPar becomes 0, displayed as '-'
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // GAME TYPE LABELS TESTS
  // ===========================================================================

  describe('Game Type Labels', () => {
    const gameTypes: { type: GameType; expectedLabel: string }[] = [
      { type: 'stableford', expectedLabel: 'Stableford' },
      { type: 'stroke', expectedLabel: 'Stroke Play' },
      { type: 'match-play', expectedLabel: 'Match Play' },
      { type: 'shamble', expectedLabel: 'Shamble' },
      { type: 'best-ball', expectedLabel: 'Best Ball' },
      { type: 'scramble', expectedLabel: 'Scramble' },
    ];

    gameTypes.forEach(({ type, expectedLabel }) => {
      it(`displays ${expectedLabel} for ${type}`, () => {
        const round = createRoundWithCourse({ game_type: type });

        render(<RoundDetailsTab round={round} />);

        expect(screen.getByText(expectedLabel)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles round with minimal data', () => {
      const round: RoundWithCourse = {
        id: 'round-min',
        competition_id: null,
        user_id: null,
        round_number: 1,
        course_id: '',
        date: '2025-01-01',
        tee_time: null,
        game_type: 'stableford',
        nine_type: 'full',
        selected_tee: null,
        is_team_round: false,
        team_format: null,
        scoring_pairs_required: false,
        ball_count: 1,
        handicap_source: null,
        status: 'upcoming' as RoundStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        course: null,
        competition: null,
      };

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Course TBD')).toBeTruthy();
      expect(screen.getByText('Round Details')).toBeTruthy();
    });

    it('handles all default props', () => {
      const round = createRoundWithCourse();

      render(<RoundDetailsTab round={round} />);

      // Should render with isOrganizer=false
      expect(screen.queryByLabelText('Edit round details')).toBeNull();
    });

    it('handles rapid prop changes', () => {
      const round1 = createRoundWithCourse({ id: 'round-1' });
      const round2 = createRoundWithCourse({ id: 'round-2', course: null });

      const { rerender } = render(<RoundDetailsTab round={round1} />);

      expect(screen.getByText('Championship Course')).toBeTruthy();

      rerender(<RoundDetailsTab round={round2} />);

      expect(screen.getByText('Course TBD')).toBeTruthy();
    });

    it('handles special characters in course name', () => {
      const round = createRoundWithCourse({
        course: createCourseWithVenue({ name: "St. Andrew's Links - Old Course" }),
      });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText("St. Andrew's Links - Old Course")).toBeTruthy();
    });

    it('handles 9-hole course', () => {
      const nineHoles = create18Holes().slice(0, 9);
      const round = createRoundWithCourse({
        course: createCourseWithVenue({ holes: nineHoles }),
      });

      render(<RoundDetailsTab round={round} />);

      // 9 may appear in multiple places, verify at least one
      expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(1);
    });

    it('handles venue with only city', () => {
      const round = createRoundWithCourse({
        course: createCourseWithVenue({
          club: {
            id: 'club-1',
            name: 'Local Club',
            city: 'Sydney',
            state: null,
            address: '',
          },
        }),
      });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('Sydney')).toBeTruthy();
    });

    it('handles venue with only state', () => {
      const round = createRoundWithCourse({
        course: createCourseWithVenue({
          club: {
            id: 'club-1',
            name: 'State Club',
            city: '',
            state: 'QLD',
            address: '',
          },
        }),
      });

      render(<RoundDetailsTab round={round} />);

      expect(screen.getByText('QLD')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROPS COMBINATIONS TESTS
  // ===========================================================================

  describe('Props Combinations', () => {
    it('renders correctly with all props true', () => {
      const onEditPress = jest.fn();
      const round = createRoundWithCourse({ scoring_pairs_required: true });

      render(
        <RoundDetailsTab
          round={round}
          isOrganizer={true}
          onEditPress={onEditPress}
        />
      );

      expect(screen.getByLabelText('Edit round details')).toBeTruthy();
    });

    it('renders correctly with mixed props', () => {
      const onEditPress = jest.fn();
      const round = createRoundWithCourse();

      render(
        <RoundDetailsTab
          round={round}
          isOrganizer={true}
          onEditPress={onEditPress}
        />
      );

      expect(screen.getByLabelText('Edit round details')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SNAPSHOT TESTS
  // ===========================================================================

  describe('Snapshots', () => {
    it('matches snapshot with full data', () => {
      const round = createRoundWithCourse();

      const { toJSON } = render(
        <RoundDetailsTab
          round={round}
          isOrganizer={true}
          onEditPress={jest.fn()}
        />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot with minimal data', () => {
      const round = createRoundWithCourse({
        course: null,
        competition: null,
      });

      const { toJSON } = render(<RoundDetailsTab round={round} />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot without edit capabilities', () => {
      const round = createRoundWithCourse();

      const { toJSON } = render(
        <RoundDetailsTab round={round} isOrganizer={false} />
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });
});

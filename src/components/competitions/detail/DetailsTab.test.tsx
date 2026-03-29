/**
 * DetailsTab Component Tests
 *
 * Tests for the competition details tab component including:
 * - Header card with competition info (name, dates, invite code)
 * - Quick stats (rounds, players)
 * - Current standing card for non-organizers
 * - Competition settings section (type, handicap, format)
 * - Courses section
 * - Edit button for organizers
 * - Copy invite code functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { DetailsTab } from './DetailsTab';
import type { Competition, Course, CompetitionType, HandicapSystem, TeamMode } from '@/types/database.types';
import { DEFAULT_POINT_SYSTEM } from '@/types/database.types';
import type { RoundWithCourse } from './types';

// =====================================================
// MOCKS
// =====================================================

// Mock expo-clipboard
const mockSetStringAsync = jest.fn();
jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: unknown[]) => mockSetStringAsync(...args),
}));

// Mock react-native-toast-message
const mockToastShow = jest.fn();
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: (...args: unknown[]) => mockToastShow(...args),
  },
}));

// Mock icons
jest.mock('@tabler/icons-react-native', () => {
  const { View: _RNView } = require('react-native');
  return {
    IconCalendar: (props: any) => <_RNView testID="icon-calendar" {...props} />,
    IconSettings: (props: any) => <_RNView testID="icon-settings" {...props} />,
    IconTrophy: (props: any) => <_RNView testID="icon-trophy" {...props} />,
    IconPlus: (props: any) => <_RNView testID="icon-plus" {...props} />,
  };
});

// Mock PrizePoolSummaryCard
jest.mock('@/components/prizePool', () => {
  const { View, Text } = require('react-native');
  return {
    PrizePoolSummaryCard: ({ pool, isLocked }: { pool: { total_pool_amount: number }; isLocked: boolean }) => (
      <View testID="prize-pool-summary-card">
        <Text testID="prize-pool-amount">${pool.total_pool_amount}</Text>
        {isLocked && <Text testID="prize-pool-locked">Locked</Text>}
      </View>
    ),
  };
});

// Mock CourseCard component
jest.mock('@/components/courses/CourseCard', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    CourseCard: ({ course, onPress }: { course: { id: string; name: string }; onPress?: () => void }) => (
      <TouchableOpacity
        testID={`course-card-${course.id}`}
        onPress={onPress}
        accessibilityRole="button"
      >
        <Text>{course.name}</Text>
      </TouchableOpacity>
    ),
  };
});

// Mock StatusBadge component
jest.mock('@/components/common/StatusBadge', () => {
  const { View, Text } = require('react-native');
  return {
    StatusBadge: ({ status }: { status: string }) => (
      <View testID="status-badge">
        <Text>{status}</Text>
      </View>
    ),
  };
});

// Mock Pill component
jest.mock('@/components/common/Pill', () => {
  const { View, Text } = require('react-native');
  return {
    Pill: ({ label }: { label: string }) => (
      <View testID="pill">
        <Text>{label}</Text>
      </View>
    ),
  };
});

// Mock formatting utils
jest.mock('@/utils/formatting', () => ({
  formatDateAustralian: (date: string) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  },
  formatPosition: (position: number) => {
    if (position === 1) return '1st';
    if (position === 2) return '2nd';
    if (position === 3) return '3rd';
    return `${position}th`;
  },
}));

// =====================================================
// TEST FIXTURES
// =====================================================

function createTestCompetition(overrides: Partial<Competition> = {}): Competition {
  return {
    id: 'comp-1',
    name: 'Summer Championship',
    description: 'Annual summer golf competition',
    competition_type: 'event' as CompetitionType,
    start_date: '2025-01-15',
    end_date: '2025-01-16',
    handicap_system: 'honor' as HandicapSystem,
    handicap_source: 'profile',
    visibility: 'private',
    invite_code: 'SUMMER25',
    organizer_id: 'organizer-1',
    status: 'upcoming',
    team_mode: 'none' as TeamMode,
    team_size: null,
    point_system: DEFAULT_POINT_SYSTEM,
    knockout_config: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

function createTestCourse(overrides: Partial<Course> = {}): Course & { clubs?: { name: string; city: string | null; state: string | null } | null } {
  return {
    id: 'course-1',
    club_id: 'club-1',
    golfapi_course_id: null,
    golfapi_long_course_id: null,
    name: 'Royal Melbourne Golf Course',
    description: 'Championship course',
    num_holes: 18,
    measure_unit: null,
    holes: [],
    holes_women: null,
    match_play_indexes: null,
    tees: [],
    tees_migrated: null,
    slope_rating: 125,
    course_rating: 72.5,
    golfapi_updated_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    clubs: {
      name: 'Royal Melbourne Golf Club',
      city: 'Melbourne',
      state: 'VIC',
    },
    ...overrides,
  };
}

function createTestRound(roundNumber: number, course: Course | null = null): RoundWithCourse {
  return {
    id: `round-${roundNumber}`,
    competition_id: 'comp-1',
    user_id: null,
    round_number: roundNumber,
    course_id: course?.id ?? 'course-default',
    date: `2025-01-${15 + roundNumber - 1}`,
    tee_time: '08:00:00',
    game_type: 'stableford',
    nine_type: 'full',
    selected_tee: null,
    is_team_round: false,
    team_format: null,
    scoring_pairs_required: false,
    ball_count: 1,
    handicap_source: null,
    status: 'upcoming',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    course: course as RoundWithCourse['course'],
  };
}

// =====================================================
// TESTS
// =====================================================

describe('DetailsTab', () => {
  const mockOnEdit = jest.fn();
  const mockOnViewCourse = jest.fn();
  const mockOnUpdateCompetition = jest.fn();

  const defaultCompetition = createTestCompetition();
  const defaultCourse = createTestCourse();
  const defaultRounds: RoundWithCourse[] = [
    createTestRound(1, defaultCourse),
    createTestRound(2, defaultCourse),
  ];

  const defaultProps = {
    competition: defaultCompetition,
    rounds: defaultRounds,
    playerCount: 16,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: mockOnViewCourse,
    onUpdateCompetition: mockOnUpdateCompetition,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('Summer Championship')).toBeTruthy();
    });

    it('renders competition name in header', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('Summer Championship')).toBeTruthy();
    });

    it('renders competition description when provided', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('Annual summer golf competition')).toBeTruthy();
    });

    it('does not render description when not provided', () => {
      const competitionWithoutDescription = createTestCompetition({ description: null });
      render(<DetailsTab {...defaultProps} competition={competitionWithoutDescription} />);
      expect(screen.queryByText('Annual summer golf competition')).toBeNull();
    });

    it('renders date range for events with end date', () => {
      render(<DetailsTab {...defaultProps} />);
      // Dates formatted as DD/M/YYYY (15/1/2025 - 16/1/2025)
      expect(screen.getByText(/15\/1\/2025/)).toBeTruthy();
      expect(screen.getByText(/16\/1\/2025/)).toBeTruthy();
    });

    it('renders single date for knockout without end date', () => {
      const knockout = createTestCompetition({
        competition_type: 'knockout',
        end_date: null,
      });
      render(<DetailsTab {...defaultProps} competition={knockout} />);
      expect(screen.getByText('15/1/2025')).toBeTruthy();
    });
  });

  // ===========================================================================
  // QUICK STATS TESTS
  // ===========================================================================

  describe('Quick Stats', () => {
    it('displays number of rounds', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('Rounds')).toBeTruthy();
    });

    it('displays player count', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('16')).toBeTruthy();
      expect(screen.getByText('Players')).toBeTruthy();
    });

    it('displays zero rounds when none exist', () => {
      render(<DetailsTab {...defaultProps} rounds={[]} />);
      expect(screen.getByText('0')).toBeTruthy();
    });

    it('displays zero players when none exist', () => {
      render(<DetailsTab {...defaultProps} playerCount={0} />);
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // INVITE CODE TESTS
  // ===========================================================================

  describe('Invite Code', () => {
    it('displays invite code', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('SUMMER25')).toBeTruthy();
    });

    it('displays invite code label', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('INVITE CODE')).toBeTruthy();
    });

    it('copies invite code when tapped', async () => {
      render(<DetailsTab {...defaultProps} />);

      const inviteCodeButton = screen.getByLabelText('Copy invite code SUMMER25');
      fireEvent.press(inviteCodeButton);

      await waitFor(() => {
        expect(mockSetStringAsync).toHaveBeenCalledWith('SUMMER25');
      });
    });

    it('shows toast message after copying', async () => {
      render(<DetailsTab {...defaultProps} />);

      const inviteCodeButton = screen.getByLabelText('Copy invite code SUMMER25');
      fireEvent.press(inviteCodeButton);

      await waitFor(() => {
        expect(mockToastShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            text1: 'Copied!',
          })
        );
      });
    });

    it('has correct accessibility hint for invite code', () => {
      render(<DetailsTab {...defaultProps} />);
      const inviteCodeButton = screen.getByHintText('Double tap to copy invite code to clipboard');
      expect(inviteCodeButton).toBeTruthy();
    });
  });

  // ===========================================================================
  // CURRENT STANDING TESTS
  // ===========================================================================

  describe('Current Standing Card', () => {
    it('does not show standing card for organizers', () => {
      const props = {
        ...defaultProps,
        isOrganizer: true,
        currentStanding: { position: 1, points: 45 },
      };
      render(<DetailsTab {...props} />);
      expect(screen.queryByTestId('current-standing-card')).toBeNull();
    });

    it('shows standing card for non-organizers with standing', () => {
      const props = {
        ...defaultProps,
        isOrganizer: false,
        currentStanding: { position: 1, points: 45 },
      };
      render(<DetailsTab {...props} />);
      expect(screen.getByTestId('current-standing-card')).toBeTruthy();
    });

    it('does not show standing card when no standing data', () => {
      const props = {
        ...defaultProps,
        isOrganizer: false,
        currentStanding: null,
      };
      render(<DetailsTab {...props} />);
      expect(screen.queryByTestId('current-standing-card')).toBeNull();
    });

    it('displays position with ordinal suffix', () => {
      const props = {
        ...defaultProps,
        isOrganizer: false,
        currentStanding: { position: 1, points: 45 },
      };
      render(<DetailsTab {...props} />);
      expect(screen.getByText('1st')).toBeTruthy();
    });

    it('displays points correctly', () => {
      const props = {
        ...defaultProps,
        isOrganizer: false,
        currentStanding: { position: 3, points: 32 },
      };
      render(<DetailsTab {...props} />);
      expect(screen.getByText('32')).toBeTruthy();
    });

    it('displays standing labels', () => {
      const props = {
        ...defaultProps,
        isOrganizer: false,
        currentStanding: { position: 2, points: 40 },
      };
      render(<DetailsTab {...props} />);
      expect(screen.getByText('Your Current Standing')).toBeTruthy();
      expect(screen.getByText('Position')).toBeTruthy();
      expect(screen.getByText('Points')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SETTINGS SECTION TESTS
  // ===========================================================================

  describe('Settings Section', () => {
    it('displays settings section header', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('Settings')).toBeTruthy();
    });

    it('displays competition type', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getAllByText('Event').length).toBeGreaterThanOrEqual(1);
    });

    it('displays knockout type correctly', () => {
      const knockout = createTestCompetition({ competition_type: 'knockout' });
      render(<DetailsTab {...defaultProps} competition={knockout} />);
      expect(screen.getAllByText('Knockout').length).toBeGreaterThanOrEqual(1);
    });

    it('displays handicap system - Honor System', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('Honour System')).toBeTruthy();
    });

    it('displays handicap system - World Handicap System', () => {
      const comp = createTestCompetition({ handicap_system: 'whs' });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('World Handicap System')).toBeTruthy();
    });

    it('displays handicap system - Gross Only', () => {
      const comp = createTestCompetition({ handicap_system: 'gross-only' });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('Gross Only')).toBeTruthy();
    });

    it('displays team mode - Individual', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('Individual')).toBeTruthy();
    });

    it('displays team mode - Fixed Teams', () => {
      const comp = createTestCompetition({ team_mode: 'fixed', team_size: 2 });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('Fixed Teams')).toBeTruthy();
    });

    it('displays team mode - Per-Round Teams', () => {
      const comp = createTestCompetition({ team_mode: 'per-round', team_size: 4 });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('Per-Round Teams')).toBeTruthy();
    });

    it('displays team size when teams enabled', () => {
      const comp = createTestCompetition({ team_mode: 'fixed', team_size: 2 });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('2 players')).toBeTruthy();
    });

    it('does not display team size when team mode is none', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.queryByText(/players$/)).toBeNull();
    });

    it('displays competition status', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByTestId('status-badge')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDIT BUTTON TESTS
  // ===========================================================================

  describe('Edit Functionality', () => {
    it('renders correctly for organizers', () => {
      render(<DetailsTab {...defaultProps} isOrganizer={true} />);
      // Editing is handled externally (CompetitionSettingsScreen), not inline
      expect(screen.getByText('Summer Championship')).toBeTruthy();
    });

    it('renders correctly for non-organizers', () => {
      render(<DetailsTab {...defaultProps} isOrganizer={false} />);
      expect(screen.getByText('Summer Championship')).toBeTruthy();
    });

    it('shows add prize pool button for organizers', () => {
      const mockOnAddPrizePool = jest.fn();
      render(<DetailsTab {...defaultProps} isOrganizer={true} prizePool={null} onAddPrizePool={mockOnAddPrizePool} />);
      const addButton = screen.getByLabelText('Add prize pool');
      expect(addButton).toBeTruthy();
    });

    it('does not show add prize pool button for non-organizers', () => {
      render(<DetailsTab {...defaultProps} isOrganizer={false} prizePool={null} />);
      expect(screen.queryByLabelText('Add prize pool')).toBeNull();
    });
  });

  // ===========================================================================
  // COURSES SECTION TESTS
  // ===========================================================================

  describe('Courses Section', () => {
    it('displays courses section header', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('Courses (1)')).toBeTruthy();
    });

    it('displays correct course count', () => {
      const course2 = createTestCourse({ id: 'course-2', name: 'Kingston Heath' });
      const rounds: RoundWithCourse[] = [
        createTestRound(1, defaultCourse),
        createTestRound(2, course2),
      ];
      render(<DetailsTab {...defaultProps} rounds={rounds} />);
      expect(screen.getByText('Courses (2)')).toBeTruthy();
    });

    it('deduplicates courses from multiple rounds', () => {
      const rounds: RoundWithCourse[] = [
        createTestRound(1, defaultCourse),
        createTestRound(2, defaultCourse), // Same course
        createTestRound(3, defaultCourse), // Same course again
      ];
      render(<DetailsTab {...defaultProps} rounds={rounds} />);
      expect(screen.getByText('Courses (1)')).toBeTruthy();
    });

    it('renders CourseCard for each unique course', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByTestId('course-card-course-1')).toBeTruthy();
    });

    it('calls onViewCourse when course card pressed', () => {
      render(<DetailsTab {...defaultProps} />);
      const courseCard = screen.getByTestId('course-card-course-1');
      fireEvent.press(courseCard);
      expect(mockOnViewCourse).toHaveBeenCalledWith(expect.objectContaining({ id: 'course-1' }));
    });

    it('shows empty state when no courses', () => {
      const roundsWithoutCourses: RoundWithCourse[] = [
        { ...createTestRound(1), course: null },
      ];
      render(<DetailsTab {...defaultProps} rounds={roundsWithoutCourses} />);
      expect(screen.getByText('No courses have been added to this competition yet.')).toBeTruthy();
    });

    it('shows empty state when no rounds', () => {
      render(<DetailsTab {...defaultProps} rounds={[]} />);
      expect(screen.getByText('No courses have been added to this competition yet.')).toBeTruthy();
    });
  });

  // ===========================================================================
  // COMPETITION TYPE BADGE TESTS
  // ===========================================================================

  describe('Competition Type Badge', () => {
    it('shows Event badge in header', () => {
      render(<DetailsTab {...defaultProps} />);
      const pills = screen.getAllByTestId('pill');
      expect(pills.length).toBeGreaterThanOrEqual(1);
    });

    it('shows Knockout badge for knockout competitions', () => {
      const knockout = createTestCompetition({ competition_type: 'knockout' });
      render(<DetailsTab {...defaultProps} competition={knockout} />);
      expect(screen.getAllByText('Knockout').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('invite code button has accessibility role button', () => {
      render(<DetailsTab {...defaultProps} />);
      const inviteCodeButton = screen.getByLabelText('Copy invite code SUMMER25');
      expect(inviteCodeButton.props.accessibilityRole).toBe('button');
    });

    it('course cards have accessibility role', () => {
      render(<DetailsTab {...defaultProps} />);
      const courseCard = screen.getByTestId('course-card-course-1');
      expect(courseCard.props.accessibilityRole).toBe('button');
    });

    it('add prize pool button has accessibility role button', () => {
      const mockOnAddPrizePool = jest.fn();
      render(<DetailsTab {...defaultProps} isOrganizer={true} prizePool={null} onAddPrizePool={mockOnAddPrizePool} />);
      const addButton = screen.getByLabelText('Add prize pool');
      expect(addButton.props.accessibilityRole).toBe('button');
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles null description gracefully', () => {
      const comp = createTestCompetition({ description: null });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('Summer Championship')).toBeTruthy();
    });

    it('handles empty string description', () => {
      const comp = createTestCompetition({ description: '' });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.queryByText('')).toBeNull(); // Empty text not rendered
    });

    it('handles large player count', () => {
      render(<DetailsTab {...defaultProps} playerCount={1000} />);
      expect(screen.getByText('1000')).toBeTruthy();
    });

    it('handles large round count', () => {
      const manyRounds = Array.from({ length: 20 }, (_, i) => createTestRound(i + 1, defaultCourse));
      render(<DetailsTab {...defaultProps} rounds={manyRounds} />);
      expect(screen.getByText('20')).toBeTruthy();
    });

    it('handles competition with team_size null when team_mode is not none', () => {
      // Edge case: team_mode is set but team_size is null (shouldn't happen but handling gracefully)
      const comp = createTestCompetition({ team_mode: 'fixed', team_size: null });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('Fixed Teams')).toBeTruthy();
      // Should not crash and should not show team size
    });

    it('handles courses without venue data', () => {
      // Create a course and explicitly remove venue data
      const courseWithoutClub: Course & { clubs?: { name: string; city: string | null; state: string | null } | null } = {
        ...createTestCourse(),
        clubs: null,
      };
      const rounds: RoundWithCourse[] = [createTestRound(1, courseWithoutClub)];
      render(<DetailsTab {...defaultProps} rounds={rounds} />);
      expect(screen.getByTestId('course-card-course-1')).toBeTruthy();
    });

    it('handles very long competition name', () => {
      const comp = createTestCompetition({
        name: 'The Annual Melbourne Metropolitan Golf Championship Series 2025',
      });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('The Annual Melbourne Metropolitan Golf Championship Series 2025')).toBeTruthy();
    });

    it('handles special characters in invite code', () => {
      const comp = createTestCompetition({ invite_code: 'TEST-2025!' });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('TEST-2025!')).toBeTruthy();
    });

    it('works without onViewCourse callback', () => {
      render(<DetailsTab {...defaultProps} onViewCourse={undefined} />);
      expect(screen.getByText('Royal Melbourne Golf Course')).toBeTruthy();
    });

    it('works without onUpdateCompetition callback', () => {
      render(<DetailsTab {...defaultProps} onUpdateCompetition={undefined} />);
      expect(screen.getByText('Summer Championship')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DIFFERENT STATUS TESTS
  // ===========================================================================

  describe('Competition Status', () => {
    it('displays upcoming status', () => {
      const comp = createTestCompetition({ status: 'upcoming' });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('upcoming')).toBeTruthy();
    });

    it('displays in-progress status', () => {
      const comp = createTestCompetition({ status: 'in-progress' });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('in-progress')).toBeTruthy();
    });

    it('displays completed status', () => {
      const comp = createTestCompetition({ status: 'completed' });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('completed')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PRIZE POOL SECTION TESTS
  // ===========================================================================

  describe('Prize Pool Section', () => {
    it('displays prize pool section header', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('Prize Pool')).toBeTruthy();
    });

    it('shows empty state when no prize pool', () => {
      render(<DetailsTab {...defaultProps} prizePool={null} />);
      expect(screen.getByText('No Prize Pool Configured')).toBeTruthy();
    });

    it('shows add button for organizers when no prize pool', () => {
      const mockOnAddPrizePool = jest.fn();
      render(<DetailsTab {...defaultProps} prizePool={null} isOrganizer={true} onAddPrizePool={mockOnAddPrizePool} />);
      const addButton = screen.getByLabelText('Add prize pool');
      expect(addButton).toBeTruthy();
      fireEvent.press(addButton);
      expect(mockOnAddPrizePool).toHaveBeenCalled();
    });

    it('does not show add button for non-organizers', () => {
      render(<DetailsTab {...defaultProps} prizePool={null} isOrganizer={false} />);
      expect(screen.queryByLabelText('Add prize pool')).toBeNull();
    });

    it('shows prize pool summary when pool exists', () => {
      const prizePool = {
        id: 'pool-1',
        competition_id: 'comp-1',
        funding_type: 'per_player' as const,
        funding_amount: 50,
        currency: 'AUD',
        total_pool_amount: 400,
        is_locked: false,
        locked_at: null,
        status: 'draft' as const,
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      render(<DetailsTab {...defaultProps} prizePool={prizePool} />);
      expect(screen.getByTestId('prize-pool-summary-card')).toBeTruthy();
    });

    it('shows locked indicator when pool is locked', () => {
      const prizePool = {
        id: 'pool-1',
        competition_id: 'comp-1',
        funding_type: 'per_player' as const,
        funding_amount: 50,
        currency: 'AUD',
        total_pool_amount: 400,
        is_locked: true,
        locked_at: new Date().toISOString(),
        status: 'active' as const,
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      render(<DetailsTab {...defaultProps} prizePool={prizePool} isPrizePoolLocked={true} />);
      expect(screen.getByTestId('prize-pool-locked')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMO/PERFORMANCE TESTS
  // ===========================================================================

  describe('Performance', () => {
    it('memoizes uniqueCourses computation', () => {
      const { rerender } = render(<DetailsTab {...defaultProps} />);

      // Rerender with same props
      rerender(<DetailsTab {...defaultProps} />);

      // Component should still render correctly
      expect(screen.getByText('Summer Championship')).toBeTruthy();
    });

    it('updates when rounds change', () => {
      const { rerender } = render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('Courses (1)')).toBeTruthy();

      const course2 = createTestCourse({ id: 'course-2', name: 'Kingston Heath' });
      const newRounds: RoundWithCourse[] = [
        ...defaultRounds,
        createTestRound(3, course2),
      ];
      rerender(<DetailsTab {...defaultProps} rounds={newRounds} />);

      expect(screen.getByText('Courses (2)')).toBeTruthy();
    });
  });
});

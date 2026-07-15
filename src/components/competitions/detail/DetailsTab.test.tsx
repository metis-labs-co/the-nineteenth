/**
 * DetailsTab Component Tests
 *
 * Tests for the competition details tab component including:
 * - Header card with competition info (name, dates, invite code)
 * - Quick stats (rounds, players)
 * - Current standing card for non-organizers
 * - Competition settings section (type, handicap, format)
 * - Edit button for organizers
 * - Copy invite code functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { DetailsTab } from './DetailsTab';
import type { Competition, Course, CompetitionType, HandicapSystem, TeamMode, TeamWithMembers } from '@/types/database.types';
import { DEFAULT_POINT_SYSTEM } from '@/types/database.types';
import type { RoundWithCourse } from './types';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';

const miniWithPosition = (position: number, points: number): MiniLeaderboardData => ({
  above:
    position > 1
      ? { id: 'p-above', position: position - 1, name: 'Above', points: points + 4, isCurrent: false }
      : null,
  you: { id: 'p-current', position, name: 'You', points, isCurrent: true },
  below: { id: 'p-below', position: position + 1, name: 'Below', points: points - 4, isCurrent: false },
});

// =====================================================
// MOCKS
// =====================================================

// Mock expo-clipboard
const mockSetStringAsync = jest.fn();
jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: unknown[]) => mockSetStringAsync(...args),
}));

// Mock unified toast system
const mockShowSuccessToast = jest.fn();
jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: jest.fn(),
    showNotificationToast: jest.fn(),
    showAchievementToast: jest.fn(),
    showMultipleToasts: jest.fn(),
    showToast: jest.fn(),
    currentToast: null,
    isVisible: false,
    dismissToast: jest.fn(),
  }),
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
    per_round_rules_enabled: false,
    knockout_config: null,
    whatsapp_group_invite_url: null,
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
    api_locked: false,
    start_hole: 1,
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
    display_order: roundNumber,
    name: null,
    course_id: course?.id ?? 'course-default',
    date: `2025-01-${15 + roundNumber - 1}`,
    tee_time: '08:00:00',
    rules_override: null,
    game_type: 'stableford',
    nine_type: 'full',
    selected_tee: null,
    is_team_round: false,
    team_format: null,
    round_format: 'combined',
    sub_match_size: null,
    team1_id: null,
    team2_id: null,
    scoring_pairs_required: false,
    pairing_source: 'manual',
    pairing_style: null,
    pairing_metric: null,
    ball_count: 1,
    handicap_source: null,
    status: 'upcoming',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    course: course as RoundWithCourse['course'],
  };
}

function createTestTeam(id: string, memberCount: number): TeamWithMembers {
  return {
    id,
    competition_id: 'comp-1',
    name: `Team ${id}`,
    color: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    members: Array.from({ length: memberCount }, (_, i) => ({
      team_id: id,
      player_id: `${id}-player-${i}`,
      joined_at: new Date().toISOString(),
    })),
  };
}

// =====================================================
// TESTS
// =====================================================

describe('DetailsTab', () => {
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
    isPlayer: false,
    miniIndividual: null,
    miniTeam: null,
    isOrganizer: true,
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
      // Dates formatted as DD/M/YYYY (15/1/2025 - 16/1/2025). The start date
      // also appears on the status banner sub-line, so match one-or-more.
      expect(screen.getAllByText(/15\/1\/2025/).length).toBeGreaterThanOrEqual(1);
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
        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          'Copied!',
          'Invite code copied to clipboard',
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
  // MINI-LEADERBOARD TESTS
  // ===========================================================================

  describe('Mini-Leaderboard Section', () => {
    it('renders mini-leaderboard for organiser-player (regression: bug fix)', () => {
      const props = {
        ...defaultProps,
        isOrganizer: true,
        isPlayer: true,
        miniIndividual: miniWithPosition(2, 36),
        miniTeam: null,
      };
      render(<DetailsTab {...props} />);
      expect(screen.getByTestId('mini-leaderboard-card')).toBeTruthy();
    });

    it('renders mini-leaderboard for player who is not organizer', () => {
      const props = {
        ...defaultProps,
        isOrganizer: false,
        isPlayer: true,
        miniIndividual: miniWithPosition(1, 45),
        miniTeam: null,
      };
      render(<DetailsTab {...props} />);
      expect(screen.getByTestId('mini-leaderboard-card')).toBeTruthy();
    });

    it('hides mini-leaderboard when user is not a player', () => {
      const props = {
        ...defaultProps,
        isOrganizer: true,
        isPlayer: false,
        miniIndividual: null,
        miniTeam: null,
      };
      render(<DetailsTab {...props} />);
      expect(screen.queryByTestId('mini-leaderboard-card')).toBeNull();
    });

    it('hides mini-leaderboard when miniIndividual is null', () => {
      const props = {
        ...defaultProps,
        isOrganizer: false,
        isPlayer: true,
        miniIndividual: null,
        miniTeam: null,
      };
      render(<DetailsTab {...props} />);
      expect(screen.queryByTestId('mini-leaderboard-card')).toBeNull();
    });

    it('hides mini-leaderboard for knockout competitions', () => {
      const knockout = createTestCompetition({ competition_type: 'knockout' });
      const props = {
        ...defaultProps,
        competition: knockout,
        isPlayer: true,
        miniIndividual: miniWithPosition(2, 36),
        miniTeam: null,
      };
      render(<DetailsTab {...props} />);
      expect(screen.queryByTestId('mini-leaderboard-card')).toBeNull();
    });

    it('renders both individual and team sub-sections when team data present', () => {
      const props = {
        ...defaultProps,
        isPlayer: true,
        miniIndividual: miniWithPosition(2, 36),
        miniTeam: miniWithPosition(2, 80),
        userTeamName: 'Hawks',
      };
      render(<DetailsTab {...props} />);
      expect(screen.getByTestId('mini-leaderboard-individual')).toBeTruthy();
      expect(screen.getByTestId('mini-leaderboard-team')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SETTINGS SECTION TESTS
  // ===========================================================================

  describe('Settings Section', () => {
    it('displays competition settings', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('Handicap')).toBeTruthy();
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

    it('falls back to competition.team_size when no teams generated', () => {
      const comp = createTestCompetition({ team_mode: 'fixed', team_size: 2 });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('2 players')).toBeTruthy();
    });

    it('displays actual team size from generated teams, not stale team_size', () => {
      // Regression: team_size is a static wizard field; teams are generated by
      // count so the real size lives in member counts. Two teams of 4 → "4 players".
      const comp = createTestCompetition({ team_mode: 'fixed', team_size: 2 });
      const teams = [createTestTeam('a', 4), createTestTeam('b', 4)];
      render(<DetailsTab {...defaultProps} competition={comp} teams={teams} />);
      expect(screen.getByText('4 players')).toBeTruthy();
      expect(screen.queryByText('2 players')).toBeNull();
    });

    it('displays a range when generated teams are uneven', () => {
      const comp = createTestCompetition({ team_mode: 'fixed', team_size: 3 });
      const teams = [createTestTeam('a', 4), createTestTeam('b', 3)];
      render(<DetailsTab {...defaultProps} competition={comp} teams={teams} />);
      expect(screen.getByText('3–4 players')).toBeTruthy();
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
      render(<DetailsTab {...defaultProps} isOrganizer={true} prizePool={null} onManagePrizePools={mockOnAddPrizePool} />);
      const addButton = screen.getByLabelText('Manage prize pools');
      expect(addButton).toBeTruthy();
    });

    it('does not show add prize pool button for non-organizers', () => {
      render(<DetailsTab {...defaultProps} isOrganizer={false} prizePool={null} />);
      expect(screen.queryByLabelText('Manage prize pools')).toBeNull();
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

    it('add prize pool button has accessibility role button', () => {
      const mockOnAddPrizePool = jest.fn();
      render(<DetailsTab {...defaultProps} isOrganizer={true} prizePool={null} onManagePrizePools={mockOnAddPrizePool} />);
      const addButton = screen.getByLabelText('Manage prize pools');
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

    it('handles competition with team_size null when team_mode is not none', () => {
      // Edge case: team_mode is set but team_size is null (shouldn't happen but handling gracefully)
      const comp = createTestCompetition({ team_mode: 'fixed', team_size: null });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.getByText('Fixed Teams')).toBeTruthy();
      // Should not crash and should not show team size
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

    it('hides the redundant info card for in-progress competitions', () => {
      const comp = createTestCompetition({ status: 'in-progress' });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.queryByText('in-progress')).toBeNull();
    });

    it('hides the redundant info card for completed competitions', () => {
      const comp = createTestCompetition({ status: 'completed' });
      render(<DetailsTab {...defaultProps} competition={comp} />);
      expect(screen.queryByText('completed')).toBeNull();
    });
  });

  // ===========================================================================
  // PRIZE POOL SECTION TESTS
  // ===========================================================================

  describe('Prize Pool Section', () => {
    it('displays prize pool section header', () => {
      render(<DetailsTab {...defaultProps} />);
      expect(screen.getByText('Prize Pools')).toBeTruthy();
    });

    it('shows empty state when no prize pool', () => {
      render(<DetailsTab {...defaultProps} prizePool={null} />);
      expect(screen.getByText('No Prize Pools Configured')).toBeTruthy();
    });

    it('shows add button for organizers when no prize pool', () => {
      const mockOnAddPrizePool = jest.fn();
      render(<DetailsTab {...defaultProps} prizePool={null} isOrganizer={true} onManagePrizePools={mockOnAddPrizePool} />);
      const addButton = screen.getByLabelText('Manage prize pools');
      expect(addButton).toBeTruthy();
      fireEvent.press(addButton);
      expect(mockOnAddPrizePool).toHaveBeenCalled();
    });

    it('does not show add button for non-organizers', () => {
      render(<DetailsTab {...defaultProps} prizePool={null} isOrganizer={false} />);
      expect(screen.queryByLabelText('Manage prize pools')).toBeNull();
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
        target_type: 'individual' as const,
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
        target_type: 'individual' as const,
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
      expect(screen.getByText('Handicap')).toBeTruthy();

      const course2 = createTestCourse({ id: 'course-2', name: 'Kingston Heath' });
      const newRounds: RoundWithCourse[] = [
        ...defaultRounds,
        createTestRound(3, course2),
      ];
      rerender(<DetailsTab {...defaultProps} rounds={newRounds} />);

      expect(screen.getByText('Handicap')).toBeTruthy();
    });
  });
});

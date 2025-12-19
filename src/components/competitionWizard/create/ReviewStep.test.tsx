/**
 * ReviewStep Component Tests
 *
 * Tests for the review step in competition creation including:
 * - Competition details display
 * - Team settings display
 * - Rounds summary display
 * - Players list display
 * - Important notes section
 * - Navigation (Back/Create buttons)
 * - Submitting state
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import ReviewStep from './ReviewStep';
import {
  DEFAULT_POINT_SYSTEM,
  type CompetitionDetailsFormData,
  type TeamSettingsFormData,
  type RoundDetailsFormData,
  type PlayerFormData,
} from '@/schemas/competition';

// =====================================================
// MOCKS
// =====================================================

// Mock react-native-paper to include Avatar and Chip
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const actual = jest.requireActual('react-native-paper');

  // Create Avatar namespace with Text component
  const Avatar = {
    Text: ({ label, size, style }: { label: string; size: number; style?: any }) =>
      React.createElement(
        View,
        { testID: 'avatar-text', style },
        React.createElement(Text, null, label)
      ),
    Icon: ({ icon, size, style }: { icon: string; size: number; style?: any }) =>
      React.createElement(View, { testID: `avatar-icon-${icon}`, style }),
    Image: ({ source, size, style }: { source: any; size: number; style?: any }) =>
      React.createElement(View, { testID: 'avatar-image', style }),
  };

  return {
    ...actual,
    Avatar,
    Chip: ({ children, mode, style, textStyle }: { children: React.ReactNode; mode?: string; style?: any; textStyle?: any }) =>
      React.createElement(
        View,
        { testID: 'chip', style },
        React.createElement(Text, { style: textStyle }, children)
      ),
  };
});

// =====================================================
// TEST FIXTURES
// =====================================================

const defaultCompetitionData: CompetitionDetailsFormData = {
  name: 'Summer Championship',
  description: 'Annual summer golf championship',
  competitionType: 'event',
  startDate: '15/01/2025',
  endDate: '16/01/2025',
  handicapSystem: 'honor',
  inviteCode: 'SUMMER-2025',
};

const leagueCompetitionData: CompetitionDetailsFormData = {
  name: 'Weekly League',
  description: '',
  competitionType: 'league',
  startDate: '01/02/2025',
  handicapSystem: 'golf-australia',
};

const grossOnlyCompetitionData: CompetitionDetailsFormData = {
  name: 'Scratch Tournament',
  description: 'For scratch players only',
  competitionType: 'event',
  startDate: '20/03/2025',
  endDate: '21/03/2025',
  handicapSystem: 'gross-only',
};

const defaultTeamSettingsData: TeamSettingsFormData = {
  teamMode: 'none',
  teamSize: 2,
  pointSystem: DEFAULT_POINT_SYSTEM,
};

const fixedTeamsData: TeamSettingsFormData = {
  teamMode: 'fixed',
  teamSize: 2,
  pointSystem: DEFAULT_POINT_SYSTEM,
};

const perRoundTeamsData: TeamSettingsFormData = {
  teamMode: 'per-round',
  teamSize: 4,
  pointSystem: DEFAULT_POINT_SYSTEM,
};

const customPointSystem: TeamSettingsFormData = {
  teamMode: 'none',
  teamSize: 2,
  pointSystem: [
    { position: 1, points: 25 },
    { position: 2, points: 20 },
    { position: 3, points: 15 },
    { position: 4, points: 10 },
    { position: 5, points: 5 },
  ],
};

const largePointSystem: TeamSettingsFormData = {
  teamMode: 'none',
  teamSize: 2,
  pointSystem: [
    { position: 1, points: 25 },
    { position: 2, points: 20 },
    { position: 3, points: 18 },
    { position: 4, points: 16 },
    { position: 5, points: 14 },
    { position: 6, points: 12 },
    { position: 7, points: 10 },
    { position: 8, points: 9 },
  ],
};

const singleRound: RoundDetailsFormData[] = [
  {
    courseId: 'course-1',
    courseName: 'Royal Melbourne Golf Club',
    date: '15/01/2025',
    teeTime: '08:00',
    matchType: 'stableford',
    scoringPairsRequired: false,
  },
];

const multipleRounds: RoundDetailsFormData[] = [
  {
    courseId: 'course-1',
    courseName: 'Royal Melbourne Golf Club',
    date: '15/01/2025',
    teeTime: '08:00',
    matchType: 'stableford',
    scoringPairsRequired: false,
  },
  {
    courseId: 'course-2',
    courseName: 'Kingston Heath Golf Club',
    date: '16/01/2025',
    teeTime: '07:30',
    matchType: 'stroke',
    scoringPairsRequired: false,
  },
  {
    courseId: 'course-3',
    courseName: 'Yarra Yarra Golf Club',
    date: '17/01/2025',
    matchType: 'match-play',
    scoringPairsRequired: false,
  },
];

const roundWithoutTeeTime: RoundDetailsFormData[] = [
  {
    courseId: 'course-1',
    courseName: 'Test Course',
    date: '15/01/2025',
    matchType: 'stableford',
    scoringPairsRequired: false,
  },
];

const defaultPlayers: PlayerFormData[] = [
  { name: 'John Smith', email: 'john@example.com', handicap: '12' },
  { name: 'Jane Doe', email: 'jane@example.com', handicap: '18' },
  { name: 'Bob Wilson', email: 'bob@example.com', handicap: '8' },
  { name: 'Alice Brown', email: '', handicap: '24' },
];

const playersWithoutDetails: PlayerFormData[] = [
  { name: 'Player One', email: '', handicap: '' },
  { name: 'Player Two', email: '', handicap: '' },
];

// =====================================================
// TESTS
// =====================================================

describe('ReviewStep', () => {
  const defaultProps = {
    competitionData: defaultCompetitionData,
    teamSettingsData: defaultTeamSettingsData,
    roundsData: singleRound,
    playersData: defaultPlayers,
    onSubmit: jest.fn(),
    onBack: jest.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Competition Details')).toBeTruthy();
    });

    it('renders step description', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(
        screen.getByText(/Review all details before creating your competition/)
      ).toBeTruthy();
    });

    it('renders all four sections', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Competition Details')).toBeTruthy();
      expect(screen.getByText('Team Settings')).toBeTruthy();
      expect(screen.getByText('Rounds (1)')).toBeTruthy();
      expect(screen.getByText('Players (4)')).toBeTruthy();
    });

    it('renders Back and Create buttons', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Back')).toBeTruthy();
      expect(screen.getByText('Create Competition')).toBeTruthy();
    });

    it('renders important notes section', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Before you continue:')).toBeTruthy();
      expect(
        screen.getByText('• This competition will be created as private')
      ).toBeTruthy();
    });
  });

  // ===========================================================================
  // COMPETITION DETAILS SECTION TESTS
  // ===========================================================================

  describe('Competition Details Section', () => {
    it('displays competition name', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Summer Championship')).toBeTruthy();
    });

    it('displays competition description when provided', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Annual summer golf championship')).toBeTruthy();
    });

    it('does not display description label when empty', () => {
      render(
        <ReviewStep
          {...defaultProps}
          competitionData={leagueCompetitionData}
        />
      );

      // Should not have a description row
      expect(screen.queryByText('Annual summer golf championship')).toBeNull();
    });

    it('displays competition type as badge', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Event')).toBeTruthy();
    });

    it('displays league type correctly', () => {
      render(
        <ReviewStep
          {...defaultProps}
          competitionData={leagueCompetitionData}
        />
      );

      expect(screen.getByText('League')).toBeTruthy();
    });

    it('displays start date in Australian format', () => {
      render(<ReviewStep {...defaultProps} />);

      // Date appears in both competition details and round details - check that at least one exists
      expect(screen.getAllByText('15/01/2025').length).toBeGreaterThan(0);
    });

    it('displays end date for event competitions', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('16/01/2025')).toBeTruthy();
    });

    it('does not display end date for league competitions', () => {
      render(
        <ReviewStep
          {...defaultProps}
          competitionData={leagueCompetitionData}
        />
      );

      // League has no end date
      expect(screen.queryByText('End Date')).toBeNull();
    });

    it('displays Honour System handicap system', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Honour System')).toBeTruthy();
    });

    it('displays Golf Australia Verified handicap system', () => {
      render(
        <ReviewStep
          {...defaultProps}
          competitionData={leagueCompetitionData}
        />
      );

      expect(screen.getByText('Golf Australia Verified')).toBeTruthy();
    });

    it('displays Gross Scores Only handicap system', () => {
      render(
        <ReviewStep
          {...defaultProps}
          competitionData={grossOnlyCompetitionData}
        />
      );

      expect(screen.getByText('Gross Scores Only')).toBeTruthy();
    });

    it('displays invite code when provided', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('SUMMER-2025')).toBeTruthy();
    });

    it('does not display invite code when not provided', () => {
      render(
        <ReviewStep
          {...defaultProps}
          competitionData={leagueCompetitionData}
        />
      );

      expect(screen.queryByText('Invite Code')).toBeNull();
    });

    it('handles ISO date format', () => {
      const isoDateCompetition: CompetitionDetailsFormData = {
        ...defaultCompetitionData,
        startDate: '2025-01-15',
        endDate: '2025-01-16',
      };

      render(
        <ReviewStep
          {...defaultProps}
          competitionData={isoDateCompetition}
        />
      );

      // Should convert to DD/MM/YYYY format - appears in multiple places
      expect(screen.getAllByText('15/01/2025').length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // TEAM SETTINGS SECTION TESTS
  // ===========================================================================

  describe('Team Settings Section', () => {
    it('displays Individual Competition for no teams mode', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Individual Competition')).toBeTruthy();
    });

    it('displays Fixed Teams for fixed team mode', () => {
      render(
        <ReviewStep
          {...defaultProps}
          teamSettingsData={fixedTeamsData}
        />
      );

      expect(screen.getByText('Fixed Teams')).toBeTruthy();
    });

    it('displays Per-Round Teams for per-round mode', () => {
      render(
        <ReviewStep
          {...defaultProps}
          teamSettingsData={perRoundTeamsData}
        />
      );

      expect(screen.getByText('Per-Round Teams')).toBeTruthy();
    });

    it('displays team size for fixed teams', () => {
      render(
        <ReviewStep
          {...defaultProps}
          teamSettingsData={fixedTeamsData}
        />
      );

      expect(screen.getByText('2 players per team')).toBeTruthy();
    });

    it('displays team size for per-round teams', () => {
      render(
        <ReviewStep
          {...defaultProps}
          teamSettingsData={perRoundTeamsData}
        />
      );

      expect(screen.getByText('4 players per team')).toBeTruthy();
    });

    it('does not display team size for individual competition', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.queryByText('players per team')).toBeNull();
    });

    it('displays first 4 positions in point system preview', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('1st')).toBeTruthy();
      expect(screen.getByText('2nd')).toBeTruthy();
      expect(screen.getByText('3rd')).toBeTruthy();
      expect(screen.getByText('4th')).toBeTruthy();
    });

    it('displays point values for preview positions', () => {
      render(<ReviewStep {...defaultProps} />);

      // Default point system: 10, 8, 6, 5 for first 4
      expect(screen.getByText('10')).toBeTruthy();
      expect(screen.getByText('8')).toBeTruthy();
      expect(screen.getByText('6')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('displays +N more text when more than 4 positions', () => {
      render(<ReviewStep {...defaultProps} />);

      // Default has 8 positions, so +4 more
      expect(screen.getByText('+4')).toBeTruthy();
    });

    it('does not display +N more when 4 or fewer positions', () => {
      const fourPositions: TeamSettingsFormData = {
        teamMode: 'none',
        teamSize: 2,
        pointSystem: [
          { position: 1, points: 10 },
          { position: 2, points: 8 },
          { position: 3, points: 6 },
          { position: 4, points: 5 },
        ],
      };

      render(
        <ReviewStep
          {...defaultProps}
          teamSettingsData={fourPositions}
        />
      );

      expect(screen.queryByText(/\+\d+/)).toBeNull();
    });
  });

  // ===========================================================================
  // ROUNDS SECTION TESTS
  // ===========================================================================

  describe('Rounds Section', () => {
    it('displays round count in section title', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Rounds (1)')).toBeTruthy();
    });

    it('displays multiple rounds count', () => {
      render(
        <ReviewStep
          {...defaultProps}
          roundsData={multipleRounds}
        />
      );

      expect(screen.getByText('Rounds (3)')).toBeTruthy();
    });

    it('displays course name', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Royal Melbourne Golf Club')).toBeTruthy();
    });

    it('displays round date', () => {
      render(<ReviewStep {...defaultProps} />);

      // Date appears in both competition details and round details
      expect(screen.getAllByText('15/01/2025').length).toBeGreaterThan(0);
    });

    it('displays tee time when provided', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('08:00')).toBeTruthy();
    });

    it('does not display tee time when not provided', () => {
      render(
        <ReviewStep
          {...defaultProps}
          roundsData={roundWithoutTeeTime}
        />
      );

      expect(screen.queryByText('Tee Time')).toBeNull();
    });

    it('displays match type as badge - Stableford', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Stableford')).toBeTruthy();
    });

    it('displays match type as badge - Stroke Play', () => {
      render(
        <ReviewStep
          {...defaultProps}
          roundsData={multipleRounds}
        />
      );

      expect(screen.getByText('Stroke Play')).toBeTruthy();
    });

    it('displays match type as badge - Match Play', () => {
      render(
        <ReviewStep
          {...defaultProps}
          roundsData={multipleRounds}
        />
      );

      expect(screen.getByText('Match Play')).toBeTruthy();
    });

    it('displays round numbers for multiple rounds', () => {
      render(
        <ReviewStep
          {...defaultProps}
          roundsData={multipleRounds}
        />
      );

      expect(screen.getByText('Round 1')).toBeTruthy();
      expect(screen.getByText('Round 2')).toBeTruthy();
      expect(screen.getByText('Round 3')).toBeTruthy();
    });

    it('does not display round number for single round', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.queryByText('Round 1')).toBeNull();
    });

    it('displays all course names for multiple rounds', () => {
      render(
        <ReviewStep
          {...defaultProps}
          roundsData={multipleRounds}
        />
      );

      expect(screen.getByText('Royal Melbourne Golf Club')).toBeTruthy();
      expect(screen.getByText('Kingston Heath Golf Club')).toBeTruthy();
      expect(screen.getByText('Yarra Yarra Golf Club')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLAYERS SECTION TESTS
  // ===========================================================================

  describe('Players Section', () => {
    it('displays player count in section title', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('Players (4)')).toBeTruthy();
    });

    it('displays player names', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
      expect(screen.getByText('Bob Wilson')).toBeTruthy();
      expect(screen.getByText('Alice Brown')).toBeTruthy();
    });

    it('displays player emails when provided', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText(/john@example\.com/)).toBeTruthy();
      expect(screen.getByText(/jane@example\.com/)).toBeTruthy();
    });

    it('displays "No email" when email not provided', () => {
      render(<ReviewStep {...defaultProps} />);

      // Alice has no email
      expect(screen.getByText(/No email/)).toBeTruthy();
    });

    it('displays player handicaps when provided', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText(/HC: 12/)).toBeTruthy();
      expect(screen.getByText(/HC: 18/)).toBeTruthy();
      expect(screen.getByText(/HC: 8/)).toBeTruthy();
    });

    it('does not display handicap when not provided', () => {
      render(
        <ReviewStep
          {...defaultProps}
          playersData={playersWithoutDetails}
        />
      );

      expect(screen.queryByText(/HC:/)).toBeNull();
    });

    it('displays player avatar with first letter', () => {
      render(<ReviewStep {...defaultProps} />);

      // Avatars should show first letter - multiple J's (John, Jane) so use getAllByText
      expect(screen.getAllByText('J').length).toBeGreaterThanOrEqual(2); // John and Jane
    });

    it('displays player count correctly for different counts', () => {
      render(
        <ReviewStep
          {...defaultProps}
          playersData={playersWithoutDetails}
        />
      );

      expect(screen.getByText('Players (2)')).toBeTruthy();
    });
  });

  // ===========================================================================
  // IMPORTANT NOTES SECTION TESTS
  // ===========================================================================

  describe('Important Notes Section', () => {
    it('displays all warning messages', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(
        screen.getByText('• This competition will be created as private')
      ).toBeTruthy();
      expect(
        screen.getByText("• You'll receive an invite code to share with players")
      ).toBeTruthy();
      expect(
        screen.getByText('• Players can join using the invite code')
      ).toBeTruthy();
      expect(
        screen.getByText('• You can edit details after creation')
      ).toBeTruthy();
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('calls onBack when Back button pressed', () => {
      const onBack = jest.fn();
      render(<ReviewStep {...defaultProps} onBack={onBack} />);

      fireEvent.press(screen.getByText('Back'));

      expect(onBack).toHaveBeenCalled();
    });

    it('calls onSubmit when Create Competition button pressed', () => {
      const onSubmit = jest.fn();
      render(<ReviewStep {...defaultProps} onSubmit={onSubmit} />);

      fireEvent.press(screen.getByText('Create Competition'));

      expect(onSubmit).toHaveBeenCalled();
    });

    it('disables Back button when submitting', () => {
      const onBack = jest.fn();
      render(<ReviewStep {...defaultProps} isSubmitting={true} onBack={onBack} />);

      // The Back button should be rendered but clicking it should not trigger onBack
      const backButton = screen.getByText('Back');
      fireEvent.press(backButton);

      // onBack should not be called because button is disabled
      expect(onBack).not.toHaveBeenCalled();
    });

    it('disables Create button when submitting', () => {
      const onSubmit = jest.fn();
      render(<ReviewStep {...defaultProps} isSubmitting={true} onSubmit={onSubmit} />);

      // The Create button shows "Creating..." when submitting
      const createButton = screen.getByText('Creating...');
      fireEvent.press(createButton);

      // onSubmit should not be called because button is disabled
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows "Creating..." text when submitting', () => {
      render(<ReviewStep {...defaultProps} isSubmitting={true} />);

      expect(screen.getByText('Creating...')).toBeTruthy();
      expect(screen.queryByText('Create Competition')).toBeNull();
    });
  });

  // ===========================================================================
  // SUBMITTING STATE TESTS
  // ===========================================================================

  describe('Submitting State', () => {
    it('shows loading indicator when submitting', () => {
      render(<ReviewStep {...defaultProps} isSubmitting={true} />);

      // The button should show loading state
      expect(screen.getByText('Creating...')).toBeTruthy();
    });

    it('does not call onBack when submitting', () => {
      const onBack = jest.fn();
      render(<ReviewStep {...defaultProps} onBack={onBack} isSubmitting={true} />);

      // Try to press back button
      const backButton = screen.getByText('Back');
      fireEvent.press(backButton);

      // Should not be called because button is disabled
      expect(onBack).not.toHaveBeenCalled();
    });

    it('does not call onSubmit multiple times when already submitting', () => {
      const onSubmit = jest.fn();
      render(<ReviewStep {...defaultProps} onSubmit={onSubmit} isSubmitting={true} />);

      const createButton = screen.getByText('Creating...');
      fireEvent.press(createButton);

      // Should not be called because button is disabled
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // DARK MODE TESTS
  // ===========================================================================

  describe('Dark Mode', () => {
    it('renders correctly in dark mode', () => {
      render(<ReviewStep {...defaultProps} />, { isDarkMode: true });

      expect(screen.getByText('Competition Details')).toBeTruthy();
      expect(screen.getByText('Team Settings')).toBeTruthy();
      expect(screen.getByText('Rounds (1)')).toBeTruthy();
      expect(screen.getByText('Players (4)')).toBeTruthy();
    });

    it('renders players section in dark mode', () => {
      render(<ReviewStep {...defaultProps} />, { isDarkMode: true });

      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('renders important notes in dark mode', () => {
      render(<ReviewStep {...defaultProps} />, { isDarkMode: true });

      expect(screen.getByText('Before you continue:')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty description gracefully', () => {
      render(
        <ReviewStep
          {...defaultProps}
          competitionData={{ ...defaultCompetitionData, description: undefined }}
        />
      );

      expect(screen.getByText('Summer Championship')).toBeTruthy();
    });

    it('handles empty point system gracefully', () => {
      const emptyPoints: TeamSettingsFormData = {
        teamMode: 'none',
        teamSize: 2,
        pointSystem: [],
      };

      render(
        <ReviewStep
          {...defaultProps}
          teamSettingsData={emptyPoints}
        />
      );

      expect(screen.getByText('Team Settings')).toBeTruthy();
    });

    it('handles single player', () => {
      const singlePlayer: PlayerFormData[] = [
        { name: 'Solo Player', email: 'solo@test.com', handicap: '15' },
      ];

      render(
        <ReviewStep
          {...defaultProps}
          playersData={singlePlayer}
        />
      );

      expect(screen.getByText('Players (1)')).toBeTruthy();
      expect(screen.getByText('Solo Player')).toBeTruthy();
    });

    it('handles player with special characters in name', () => {
      const specialNamePlayer: PlayerFormData[] = [
        { name: "O'Brien-Smith", email: 'test@test.com', handicap: '10' },
      ];

      render(
        <ReviewStep
          {...defaultProps}
          playersData={specialNamePlayer}
        />
      );

      expect(screen.getByText("O'Brien-Smith")).toBeTruthy();
    });

    it('handles long competition name', () => {
      const longName: CompetitionDetailsFormData = {
        ...defaultCompetitionData,
        name: 'The Annual Corporate Golf Championship Tournament 2025',
      };

      render(
        <ReviewStep
          {...defaultProps}
          competitionData={longName}
        />
      );

      expect(
        screen.getByText('The Annual Corporate Golf Championship Tournament 2025')
      ).toBeTruthy();
    });

    it('handles round with all game types', () => {
      const allGameTypes: RoundDetailsFormData[] = [
        { courseId: '1', courseName: 'Course 1', date: '15/01/2025', matchType: 'stableford', scoringPairsRequired: false },
        { courseId: '2', courseName: 'Course 2', date: '16/01/2025', matchType: 'stroke', scoringPairsRequired: false },
        { courseId: '3', courseName: 'Course 3', date: '17/01/2025', matchType: 'match-play', scoringPairsRequired: false },
        { courseId: '4', courseName: 'Course 4', date: '18/01/2025', matchType: 'ambrose', scoringPairsRequired: false },
        { courseId: '5', courseName: 'Course 5', date: '19/01/2025', matchType: 'best-ball', scoringPairsRequired: false },
        { courseId: '6', courseName: 'Course 6', date: '20/01/2025', matchType: 'scramble', scoringPairsRequired: false },
      ];

      render(
        <ReviewStep
          {...defaultProps}
          roundsData={allGameTypes}
        />
      );

      expect(screen.getByText('Stableford')).toBeTruthy();
      expect(screen.getByText('Stroke Play')).toBeTruthy();
      expect(screen.getByText('Match Play')).toBeTruthy();
      expect(screen.getByText('Ambrose')).toBeTruthy();
      expect(screen.getByText('Best Ball')).toBeTruthy();
      expect(screen.getByText('Scramble')).toBeTruthy();
    });

    it('handles undefined matchType with default', () => {
      const undefinedMatchType: RoundDetailsFormData[] = [
        { courseId: '1', courseName: 'Course 1', date: '15/01/2025', matchType: undefined as any, scoringPairsRequired: false },
      ];

      render(
        <ReviewStep
          {...defaultProps}
          roundsData={undefinedMatchType}
        />
      );

      // Should default to Stableford
      expect(screen.getByText('Stableford')).toBeTruthy();
    });

    it('handles many players', () => {
      const manyPlayers: PlayerFormData[] = Array.from({ length: 20 }, (_, i) => ({
        name: `Player ${i + 1}`,
        email: `player${i + 1}@test.com`,
        handicap: `${10 + i}`,
      }));

      render(
        <ReviewStep
          {...defaultProps}
          playersData={manyPlayers}
        />
      );

      expect(screen.getByText('Players (20)')).toBeTruthy();
      expect(screen.getByText('Player 1')).toBeTruthy();
      expect(screen.getByText('Player 20')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DATE FORMAT TESTS
  // ===========================================================================

  describe('Date Formatting', () => {
    it('formats DD/MM/YYYY dates correctly', () => {
      render(<ReviewStep {...defaultProps} />);

      // Date appears in multiple places (competition + round)
      expect(screen.getAllByText('15/01/2025').length).toBeGreaterThan(0);
    });

    it('formats ISO dates to DD/MM/YYYY', () => {
      const isoRound: RoundDetailsFormData[] = [
        {
          courseId: 'course-1',
          courseName: 'Test Course',
          date: '2025-03-20',
          matchType: 'stableford',
          scoringPairsRequired: false,
        },
      ];

      render(
        <ReviewStep
          {...defaultProps}
          roundsData={isoRound}
        />
      );

      expect(screen.getByText('20/03/2025')).toBeTruthy();
    });

    it('passes through already formatted dates', () => {
      const formattedRound: RoundDetailsFormData[] = [
        {
          courseId: 'course-1',
          courseName: 'Test Course',
          date: '25/12/2025',
          matchType: 'stableford',
          scoringPairsRequired: false,
        },
      ];

      render(
        <ReviewStep
          {...defaultProps}
          roundsData={formattedRound}
        />
      );

      expect(screen.getByText('25/12/2025')).toBeTruthy();
    });
  });

  // ===========================================================================
  // POSITION SUFFIX TESTS
  // ===========================================================================

  describe('Position Suffixes', () => {
    it('formats 1st correctly', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('1st')).toBeTruthy();
    });

    it('formats 2nd correctly', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('2nd')).toBeTruthy();
    });

    it('formats 3rd correctly', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('3rd')).toBeTruthy();
    });

    it('formats 4th+ correctly', () => {
      render(<ReviewStep {...defaultProps} />);

      expect(screen.getByText('4th')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCROLLVIEW TESTS
  // ===========================================================================

  describe('ScrollView', () => {
    it('renders content inside ScrollView for long content', () => {
      render(<ReviewStep {...defaultProps} />);

      // All sections should be visible within the scrollable content
      expect(screen.getByText('Competition Details')).toBeTruthy();
      expect(screen.getByText('Team Settings')).toBeTruthy();
      expect(screen.getByText('Before you continue:')).toBeTruthy();
    });
  });
});

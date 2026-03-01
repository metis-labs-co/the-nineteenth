/**
 * GeneratedPreview Component Tests
 *
 * Comprehensive tests for the AI-generated competition preview including:
 * - Competition details rendering
 * - Rounds display with warning badges
 * - Teams display (when present)
 * - Players grid display
 * - AI notes (assumptions and validation errors)
 * - Action buttons (Create, Edit Manually)
 * - Warning states (missing courses, validation errors)
 * - Loading/creating states
 * - Edge cases and accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { GeneratedPreview } from './GeneratedPreview';
import type { GeneratedCompetition } from '@/hooks/useGenerateAICompetition';

// ============================================================================
// MOCKS
// ============================================================================

// Mock theme context
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    background: '#FFFFFF',
    surface: '#F5F5F5',
    primary: '#10B981',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    gray100: '#F3F4F6',
    white: '#FFFFFF',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    info: '#3B82F6',
    error: '#EF4444',
  }),
}));

// Mock theme constants
jest.mock('@/constants/theme', () => ({
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
  typography: {
    h3: { fontSize: 20, fontWeight: '600' },
    bodyBold: { fontSize: 16, fontWeight: '600' },
    body: { fontSize: 16 },
    small: { fontSize: 14 },
    caption: { fontSize: 12 },
  },
  shadows: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  },
}));

// Mock status config
jest.mock('@/constants/statusConfig', () => ({
  GAME_TYPE_LABELS: {
    stableford: 'Stableford',
    stroke: 'Stroke Play',
    'match-play': 'Match Play',
    'best-ball': 'Best Ball',
    scramble: 'Scramble',
    shamble: 'Shamble',
  },
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createTestCompetition = (
  overrides: Partial<GeneratedCompetition> = {}
): GeneratedCompetition => ({
  name: 'Summer Golf Championship',
  description: 'Annual golf competition for friends',
  competitionType: 'event',
  startDate: '15/01/2025',
  endDate: '16/01/2025',
  handicapSystem: 'honor',
  teamMode: 'none',
  teamSize: null,
  rounds: [
    {
      roundNumber: 1,
      courseId: 'course-1',
      courseName: 'Championship Course',
      venueName: 'Melbourne Golf Club',
      date: '15/01/2025',
      teeTime: '08:00',
      gameType: 'stableford',
    },
    {
      roundNumber: 2,
      courseId: 'course-2',
      courseName: 'Links Course',
      venueName: 'Melbourne Golf Club',
      date: '16/01/2025',
      teeTime: '09:00',
      gameType: 'stroke',
    },
  ],
  players: [
    { id: 'player-1', name: 'John Smith', handicap: 12 },
    { id: 'player-2', name: 'Jane Doe', handicap: 18 },
    { id: 'player-3', name: 'Bob Johnson', handicap: 8 },
  ],
  ...overrides,
});

const createTeamCompetition = (): GeneratedCompetition =>
  createTestCompetition({
    name: 'Team Challenge',
    teamMode: 'fixed',
    teamSize: 2,
    teams: [
      { name: 'Team Alpha', playerIds: ['player-1', 'player-2'] },
      { name: 'Team Beta', playerIds: ['player-3', 'player-4'] },
    ],
    players: [
      { id: 'player-1', name: 'John Smith', handicap: 12 },
      { id: 'player-2', name: 'Jane Doe', handicap: 18 },
      { id: 'player-3', name: 'Bob Johnson', handicap: 8 },
      { id: 'player-4', name: 'Alice Williams', handicap: 15 },
    ],
  });

const createCompetitionWithWarnings = (): GeneratedCompetition =>
  createTestCompetition({
    rounds: [
      {
        roundNumber: 1,
        courseId: null,
        courseName: 'Unknown Course',
        venueName: 'Unknown Venue',
        date: '15/01/2025',
        teeTime: null,
        gameType: 'stableford',
        courseNotFound: true,
      },
    ],
    validationErrors: ['Course not found in database'],
    assumptions: ['Assumed Stableford format based on context'],
  });

const defaultProps = {
  competition: createTestCompetition(),
  onCreateCompetition: jest.fn(),
  onEditManually: jest.fn(),
};

// ============================================================================
// TESTS
// ============================================================================

describe('GeneratedPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Competition Details')).toBeTruthy();
    });

    it('renders competition name', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Summer Golf Championship')).toBeTruthy();
    });

    it('renders competition description when present', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Annual golf competition for friends')).toBeTruthy();
    });

    it('does not render description when null', () => {
      const competition = createTestCompetition({ description: null });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.queryByText('Annual golf competition for friends')).toBeNull();
    });

    it('renders all section headers', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Competition Details')).toBeTruthy();
      expect(screen.getByText('Rounds (2)')).toBeTruthy();
      expect(screen.getByText('Players (3)')).toBeTruthy();
    });

    it('renders both action buttons', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Edit Manually')).toBeTruthy();
      expect(screen.getByText('Create Competition')).toBeTruthy();
    });
  });

  // ===========================================================================
  // COMPETITION DETAILS TESTS
  // ===========================================================================

  describe('Competition Details', () => {
    it('renders competition type correctly for event', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Event')).toBeTruthy();
    });

    it('renders competition type correctly for knockout', () => {
      const competition = createTestCompetition({ competitionType: 'knockout' });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Knockout')).toBeTruthy();
    });

    it('renders date range when endDate is present', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('15/01/2025 - 16/01/2025')).toBeTruthy();
    });

    it('renders single date when endDate is null', () => {
      const competition = createTestCompetition({ endDate: null });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('15/01/2025')).toBeTruthy();
    });

    it('renders handicap system label for honor', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Honour System')).toBeTruthy();
    });

    it('renders handicap system label for golf-australia', () => {
      const competition = createTestCompetition({ handicapSystem: 'golf-australia' });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Golf Australia')).toBeTruthy();
    });

    it('renders handicap system label for gross-only', () => {
      const competition = createTestCompetition({ handicapSystem: 'gross-only' });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Gross Only')).toBeTruthy();
    });

    it('renders Individual format when teamMode is none', () => {
      render(<GeneratedPreview {...defaultProps} />);
      // There should be 2 "Individual" texts - one from the detail item label and one from the format value
      const individualTexts = screen.getAllByText('Individual');
      expect(individualTexts.length).toBeGreaterThanOrEqual(1);
    });

    it('renders Fixed Teams format with team size', () => {
      const competition = createTeamCompetition();
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Fixed Teams (2 per team)')).toBeTruthy();
    });

    it('renders Rotating Teams format with team size', () => {
      const competition = createTestCompetition({
        teamMode: 'per-round',
        teamSize: 3,
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Rotating Teams (3 per team)')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ROUNDS TESTS
  // ===========================================================================

  describe('Rounds', () => {
    it('renders correct round count in header', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Rounds (2)')).toBeTruthy();
    });

    it('renders round numbers', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('R1')).toBeTruthy();
      expect(screen.getByText('R2')).toBeTruthy();
    });

    it('renders venue and course names', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Melbourne Golf Club - Championship Course')).toBeTruthy();
      expect(screen.getByText('Melbourne Golf Club - Links Course')).toBeTruthy();
    });

    it('renders round dates and game types', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText(/15\/01\/2025.*Stableford.*08:00/)).toBeTruthy();
      expect(screen.getByText(/16\/01\/2025.*Stroke Play.*09:00/)).toBeTruthy();
    });

    it('renders round without tee time', () => {
      const competition = createTestCompetition({
        rounds: [
          {
            roundNumber: 1,
            courseId: 'course-1',
            courseName: 'Test Course',
            venueName: 'Test Venue',
            date: '15/01/2025',
            teeTime: null,
            gameType: 'stableford',
          },
        ],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('15/01/2025 • Stableford')).toBeTruthy();
    });

    it('renders warning badge for course not found', () => {
      const competition = createCompetitionWithWarnings();
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Course not found - select manually')).toBeTruthy();
    });

    it('renders single round correctly', () => {
      const competition = createTestCompetition({
        rounds: [
          {
            roundNumber: 1,
            courseId: 'course-1',
            courseName: 'Test Course',
            venueName: 'Test Venue',
            date: '15/01/2025',
            teeTime: '08:00',
            gameType: 'match-play',
          },
        ],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Rounds (1)')).toBeTruthy();
      expect(screen.getByText('Test Venue - Test Course')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEAMS TESTS
  // ===========================================================================

  describe('Teams', () => {
    it('renders teams section when teams are present', () => {
      const competition = createTeamCompetition();
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Teams (2)')).toBeTruthy();
    });

    it('does not render teams section when teams are not present', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.queryByText(/Teams \(/)).toBeNull();
    });

    it('renders team names', () => {
      const competition = createTeamCompetition();
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Team Alpha')).toBeTruthy();
      expect(screen.getByText('Team Beta')).toBeTruthy();
    });

    it('renders team members with handicaps', () => {
      const competition = createTeamCompetition();
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('John Smith (12), Jane Doe (18)')).toBeTruthy();
      expect(screen.getByText('Bob Johnson (8), Alice Williams (15)')).toBeTruthy();
    });

    it('does not render teams section when teams array is empty', () => {
      const competition = createTestCompetition({ teams: [] });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.queryByText(/Teams \(/)).toBeNull();
    });

    it('handles team with players not in players array', () => {
      const competition = createTestCompetition({
        teamMode: 'fixed',
        teamSize: 2,
        teams: [{ name: 'Orphan Team', playerIds: ['nonexistent-1', 'nonexistent-2'] }],
        players: [{ id: 'player-1', name: 'John Smith', handicap: 12 }],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Orphan Team')).toBeTruthy();
      // Should render empty team members string
      expect(screen.getByText('')).toBeTruthy();
    });

    it('renders player without handicap correctly', () => {
      const competition = createTestCompetition({
        teamMode: 'fixed',
        teamSize: 2,
        teams: [{ name: 'Team A', playerIds: ['player-1', 'player-2'] }],
        players: [
          { id: 'player-1', name: 'John Smith', handicap: null },
          { id: 'player-2', name: 'Jane Doe', handicap: 18 },
        ],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('John Smith, Jane Doe (18)')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLAYERS TESTS
  // ===========================================================================

  describe('Players', () => {
    it('renders correct player count', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Players (3)')).toBeTruthy();
    });

    it('renders player names', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
      expect(screen.getByText('Bob Johnson')).toBeTruthy();
    });

    it('renders player handicaps', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('12')).toBeTruthy();
      expect(screen.getByText('18')).toBeTruthy();
      expect(screen.getByText('8')).toBeTruthy();
    });

    it('does not render handicap when null', () => {
      const competition = createTestCompetition({
        players: [{ id: 'player-1', name: 'No Handicap Player', handicap: null }],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('No Handicap Player')).toBeTruthy();
      expect(screen.getByText('Players (1)')).toBeTruthy();
    });

    it('renders empty players section correctly', () => {
      const competition = createTestCompetition({ players: [] });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Players (0)')).toBeTruthy();
    });

    it('renders many players correctly', () => {
      const competition = createTestCompetition({
        players: Array.from({ length: 10 }, (_, i) => ({
          id: `player-${i + 1}`,
          name: `Player ${i + 1}`,
          handicap: 10 + i,
        })),
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Players (10)')).toBeTruthy();
      expect(screen.getByText('Player 1')).toBeTruthy();
      expect(screen.getByText('Player 10')).toBeTruthy();
    });
  });

  // ===========================================================================
  // AI NOTES TESTS
  // ===========================================================================

  describe('AI Notes', () => {
    it('renders AI Notes section when assumptions are present', () => {
      const competition = createCompetitionWithWarnings();
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('AI Notes')).toBeTruthy();
    });

    it('renders assumptions', () => {
      const competition = createCompetitionWithWarnings();
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Assumed Stableford format based on context')).toBeTruthy();
    });

    it('renders validation errors', () => {
      const competition = createCompetitionWithWarnings();
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Course not found in database')).toBeTruthy();
    });

    it('does not render AI Notes section when no assumptions or errors', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.queryByText('AI Notes')).toBeNull();
    });

    it('renders AI Notes with only assumptions', () => {
      const competition = createTestCompetition({
        assumptions: ['Default handicap applied', 'Time zone set to AEST'],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('AI Notes')).toBeTruthy();
      expect(screen.getByText('Default handicap applied')).toBeTruthy();
      expect(screen.getByText('Time zone set to AEST')).toBeTruthy();
    });

    it('renders AI Notes with only validation errors', () => {
      const competition = createTestCompetition({
        validationErrors: ['Invalid date format', 'Missing required field'],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('AI Notes')).toBeTruthy();
      expect(screen.getByText('Invalid date format')).toBeTruthy();
      expect(screen.getByText('Missing required field')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACTION BUTTONS TESTS
  // ===========================================================================

  describe('Action Buttons', () => {
    it('calls onEditManually when Edit Manually button is pressed', () => {
      const onEditManually = jest.fn();
      render(<GeneratedPreview {...defaultProps} onEditManually={onEditManually} />);

      fireEvent.press(screen.getByText('Edit Manually'));
      expect(onEditManually).toHaveBeenCalledTimes(1);
    });

    it('calls onCreateCompetition when Create Competition button is pressed', () => {
      const onCreateCompetition = jest.fn();
      render(<GeneratedPreview {...defaultProps} onCreateCompetition={onCreateCompetition} />);

      fireEvent.press(screen.getByText('Create Competition'));
      expect(onCreateCompetition).toHaveBeenCalledTimes(1);
    });

    it('disables buttons when isCreating is true', () => {
      const onCreateCompetition = jest.fn();
      const onEditManually = jest.fn();
      render(
        <GeneratedPreview
          {...defaultProps}
          onCreateCompetition={onCreateCompetition}
          onEditManually={onEditManually}
          isCreating={true}
        />
      );

      fireEvent.press(screen.getByText('Edit Manually'));
      fireEvent.press(screen.getByText('Creating...'));

      expect(onCreateCompetition).not.toHaveBeenCalled();
      expect(onEditManually).not.toHaveBeenCalled();
    });

    it('shows Creating... text when isCreating is true', () => {
      render(<GeneratedPreview {...defaultProps} isCreating={true} />);
      expect(screen.getByText('Creating...')).toBeTruthy();
      expect(screen.queryByText('Create Competition')).toBeNull();
    });

    it('shows Create Competition text when isCreating is false', () => {
      render(<GeneratedPreview {...defaultProps} isCreating={false} />);
      expect(screen.getByText('Create Competition')).toBeTruthy();
      expect(screen.queryByText('Creating...')).toBeNull();
    });
  });

  // ===========================================================================
  // WARNING STATE TESTS
  // ===========================================================================

  describe('Warning States', () => {
    it('shows "Create Anyway" when there are warnings', () => {
      const competition = createCompetitionWithWarnings();
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Create Anyway')).toBeTruthy();
    });

    it('shows "Create Competition" when there are no warnings', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Create Competition')).toBeTruthy();
    });

    it('detects warnings from courseNotFound', () => {
      const competition = createTestCompetition({
        rounds: [
          {
            roundNumber: 1,
            courseId: null,
            courseName: 'Unknown',
            venueName: 'Unknown',
            date: '15/01/2025',
            teeTime: null,
            gameType: 'stableford',
            courseNotFound: true,
          },
        ],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Create Anyway')).toBeTruthy();
    });

    it('detects warnings from null courseId', () => {
      const competition = createTestCompetition({
        rounds: [
          {
            roundNumber: 1,
            courseId: null,
            courseName: 'Unknown',
            venueName: 'Unknown',
            date: '15/01/2025',
            teeTime: null,
            gameType: 'stableford',
          },
        ],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Create Anyway')).toBeTruthy();
    });

    it('detects warnings from validationErrors', () => {
      const competition = createTestCompetition({
        validationErrors: ['Some validation error'],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Create Anyway')).toBeTruthy();
    });

    it('shows Creating... even with warnings when isCreating is true', () => {
      const competition = createCompetitionWithWarnings();
      render(
        <GeneratedPreview {...defaultProps} competition={competition} isCreating={true} />
      );
      expect(screen.getByText('Creating...')).toBeTruthy();
      expect(screen.queryByText('Create Anyway')).toBeNull();
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles competition with empty rounds array', () => {
      const competition = createTestCompetition({ rounds: [] });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Rounds (0)')).toBeTruthy();
    });

    it('handles competition with very long name', () => {
      const competition = createTestCompetition({
        name: 'This is an extremely long competition name that might cause layout issues in the UI',
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(
        screen.getByText(
          'This is an extremely long competition name that might cause layout issues in the UI'
        )
      ).toBeTruthy();
    });

    it('handles competition with very long description', () => {
      const competition = createTestCompetition({
        description:
          'This is a very long description that goes on and on about the competition and its various aspects and features and rules and regulations that participants should be aware of.',
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText(/This is a very long description/)).toBeTruthy();
    });

    it('handles all game types', () => {
      const gameTypes = ['stableford', 'stroke', 'match-play', 'best-ball', 'scramble', 'shamble'] as const;

      gameTypes.forEach((gameType) => {
        const competition = createTestCompetition({
          rounds: [
            {
              roundNumber: 1,
              courseId: 'course-1',
              courseName: 'Test',
              venueName: 'Test',
              date: '15/01/2025',
              teeTime: null,
              gameType,
            },
          ],
        });
        const { unmount } = render(
          <GeneratedPreview {...defaultProps} competition={competition} />
        );
        // Each game type should render without crashing
        expect(screen.getByText('Rounds (1)')).toBeTruthy();
        unmount();
      });
    });

    it('handles undefined optional arrays gracefully', () => {
      const competition = {
        name: 'Test',
        description: null,
        competitionType: 'event' as const,
        startDate: '15/01/2025',
        endDate: null,
        handicapSystem: 'honor' as const,
        teamMode: 'none' as const,
        teamSize: null,
        rounds: [],
        players: [],
        // teams, assumptions, validationErrors are undefined
      };
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Test')).toBeTruthy();
    });

    it('handles multiple rounds with mixed courseNotFound states', () => {
      const competition = createTestCompetition({
        rounds: [
          {
            roundNumber: 1,
            courseId: 'course-1',
            courseName: 'Found Course',
            venueName: 'Known Venue',
            date: '15/01/2025',
            teeTime: '08:00',
            gameType: 'stableford',
            courseNotFound: false,
          },
          {
            roundNumber: 2,
            courseId: null,
            courseName: 'Missing Course',
            venueName: 'Unknown Venue',
            date: '16/01/2025',
            teeTime: null,
            gameType: 'stroke',
            courseNotFound: true,
          },
        ],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Known Venue - Found Course')).toBeTruthy();
      expect(screen.getByText('Unknown Venue - Missing Course')).toBeTruthy();
      expect(screen.getByText('Course not found - select manually')).toBeTruthy();
    });

    it('handles player with handicap of 0', () => {
      const competition = createTestCompetition({
        players: [{ id: 'player-1', name: 'Scratch Player', handicap: 0 }],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Scratch Player')).toBeTruthy();
      expect(screen.getByText('0')).toBeTruthy();
    });

    it('handles player with negative handicap (plus handicap)', () => {
      const competition = createTestCompetition({
        players: [{ id: 'player-1', name: 'Pro Player', handicap: -2 }],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText('Pro Player')).toBeTruthy();
      expect(screen.getByText('-2')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DETAIL ITEM TESTS
  // ===========================================================================

  describe('DetailItem', () => {
    it('renders label and value correctly', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Type')).toBeTruthy();
      expect(screen.getByText('Dates')).toBeTruthy();
      expect(screen.getByText('Handicap')).toBeTruthy();
      expect(screen.getByText('Format')).toBeTruthy();
    });

    it('displays correct detail values', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Event')).toBeTruthy();
      expect(screen.getByText('15/01/2025 - 16/01/2025')).toBeTruthy();
      expect(screen.getByText('Honour System')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROPS TESTS
  // ===========================================================================

  describe('Props', () => {
    it('uses default isCreating value of false', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText('Create Competition')).toBeTruthy();
    });

    it('accepts and uses isCreating prop', () => {
      render(<GeneratedPreview {...defaultProps} isCreating={true} />);
      expect(screen.getByText('Creating...')).toBeTruthy();
    });

    it('passes competition data correctly', () => {
      const customCompetition = createTestCompetition({
        name: 'Custom Competition Name',
        description: 'Custom description text',
      });
      render(<GeneratedPreview {...defaultProps} competition={customCompetition} />);
      expect(screen.getByText('Custom Competition Name')).toBeTruthy();
      expect(screen.getByText('Custom description text')).toBeTruthy();
    });
  });

  // ===========================================================================
  // GAME TYPE DISPLAY TESTS
  // ===========================================================================

  describe('Game Type Display', () => {
    it('renders Stableford game type', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText(/Stableford/)).toBeTruthy();
    });

    it('renders Stroke Play game type', () => {
      render(<GeneratedPreview {...defaultProps} />);
      expect(screen.getByText(/Stroke Play/)).toBeTruthy();
    });

    it('renders Match Play game type', () => {
      const competition = createTestCompetition({
        rounds: [
          {
            roundNumber: 1,
            courseId: 'course-1',
            courseName: 'Test',
            venueName: 'Test',
            date: '15/01/2025',
            teeTime: null,
            gameType: 'match-play',
          },
        ],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText(/Match Play/)).toBeTruthy();
    });

    it('renders Shamble game type', () => {
      const competition = createTestCompetition({
        rounds: [
          {
            roundNumber: 1,
            courseId: 'course-1',
            courseName: 'Test',
            venueName: 'Test',
            date: '15/01/2025',
            teeTime: null,
            gameType: 'shamble',
          },
        ],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText(/Shamble/)).toBeTruthy();
    });

    it('renders Best Ball game type', () => {
      const competition = createTestCompetition({
        rounds: [
          {
            roundNumber: 1,
            courseId: 'course-1',
            courseName: 'Test',
            venueName: 'Test',
            date: '15/01/2025',
            teeTime: null,
            gameType: 'best-ball',
          },
        ],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText(/Best Ball/)).toBeTruthy();
    });

    it('renders Scramble game type', () => {
      const competition = createTestCompetition({
        rounds: [
          {
            roundNumber: 1,
            courseId: 'course-1',
            courseName: 'Test',
            venueName: 'Test',
            date: '15/01/2025',
            teeTime: null,
            gameType: 'scramble',
          },
        ],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      expect(screen.getByText(/Scramble/)).toBeTruthy();
    });

    it('falls back to raw game type if label not found', () => {
      const competition = createTestCompetition({
        rounds: [
          {
            roundNumber: 1,
            courseId: 'course-1',
            courseName: 'Test',
            venueName: 'Test',
            date: '15/01/2025',
            teeTime: null,
            gameType: 'unknown-type' as any,
          },
        ],
      });
      render(<GeneratedPreview {...defaultProps} competition={competition} />);
      // Should show the raw value when label not found
      expect(screen.getByText(/unknown-type/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCROLLVIEW TESTS
  // ===========================================================================

  describe('ScrollView', () => {
    it('renders within a ScrollView', () => {
      const { UNSAFE_root } = render(<GeneratedPreview {...defaultProps} />);
      const scrollView = UNSAFE_root.findByType('RCTScrollView');
      expect(scrollView).toBeTruthy();
    });
  });
});

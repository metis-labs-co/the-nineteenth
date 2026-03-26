/**
 * GeneratedPreview Storybook Stories
 *
 * Visual testing for AI-generated competition preview including:
 * - Competition details variations
 * - Rounds with and without warnings
 * - Team competitions
 * - Player grids with various handicaps
 * - AI notes and assumptions
 * - Action button states
 * - Warning states
 * - Loading states
 */

import type { Meta, StoryObj } from '@storybook/react';
import { GeneratedPreview } from './GeneratedPreview';
import type { GeneratedCompetition, GeneratedRound, GeneratedPlayer, GeneratedTeam } from '@/hooks/useGenerateAICompetition';

// ============================================================================
// META CONFIGURATION
// ============================================================================

const meta: Meta<typeof GeneratedPreview> = {
  title: 'AI/GeneratedPreview',
  component: GeneratedPreview,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    isCreating: {
      control: 'boolean',
      description: 'Shows loading state on create button',
    },
    onCreateCompetition: { action: 'onCreateCompetition' },
    onEditManually: { action: 'onEditManually' },
  },
};

export default meta;
type Story = StoryObj<typeof GeneratedPreview>;

// ============================================================================
// HELPER FACTORIES
// ============================================================================

const createRound = (overrides: Partial<GeneratedRound> = {}): GeneratedRound => ({
  roundNumber: 1,
  courseId: 'course-1',
  courseName: 'Championship Course',
  venueName: 'Melbourne Golf Club',
  date: '15/01/2025',
  teeTime: '08:00',
  gameType: 'stableford',
  ...overrides,
});

const createPlayer = (overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer => ({
  id: `player-${Math.random().toString(36).substr(2, 9)}`,
  name: 'John Smith',
  handicap: 12,
  ...overrides,
});

const createTeam = (overrides: Partial<GeneratedTeam> = {}): GeneratedTeam => ({
  name: 'Team Alpha',
  playerIds: ['player-1', 'player-2'],
  ...overrides,
});

const createCompetition = (overrides: Partial<GeneratedCompetition> = {}): GeneratedCompetition => ({
  name: 'Summer Golf Championship',
  description: 'Annual golf competition for friends',
  competitionType: 'event',
  startDate: '15/01/2025',
  endDate: '16/01/2025',
  handicapSystem: 'honor',
  teamMode: 'none',
  teamSize: null,
  rounds: [
    createRound({ roundNumber: 1, gameType: 'stableford' }),
    createRound({ roundNumber: 2, courseId: 'course-2', courseName: 'Links Course', gameType: 'stroke', date: '16/01/2025', teeTime: '09:00' }),
  ],
  players: [
    createPlayer({ id: 'player-1', name: 'John Smith', handicap: 12 }),
    createPlayer({ id: 'player-2', name: 'Jane Doe', handicap: 18 }),
    createPlayer({ id: 'player-3', name: 'Bob Johnson', handicap: 8 }),
  ],
  ...overrides,
});

// ============================================================================
// BASIC STORIES
// ============================================================================

export const Default: Story = {
  args: {
    competition: createCompetition(),
    isCreating: false,
  },
};

export const SingleRound: Story = {
  args: {
    competition: createCompetition({
      name: 'One Round Event',
      description: 'A single round golf event',
      endDate: null,
      rounds: [createRound()],
    }),
    isCreating: false,
  },
};

export const NoDescription: Story = {
  args: {
    competition: createCompetition({
      description: null,
    }),
    isCreating: false,
  },
};

// ============================================================================
// COMPETITION TYPE STORIES
// ============================================================================

export const KnockoutCompetition: Story = {
  args: {
    competition: createCompetition({
      name: 'Summer Golf Knockout',
      description: 'Bracket-style elimination competition',
      competitionType: 'knockout',
      endDate: '15/06/2025',
      rounds: [
        createRound({ roundNumber: 1, date: '15/01/2025' }),
        createRound({ roundNumber: 2, date: '15/02/2025' }),
        createRound({ roundNumber: 3, date: '15/03/2025' }),
        createRound({ roundNumber: 4, date: '15/04/2025' }),
        createRound({ roundNumber: 5, date: '15/05/2025' }),
        createRound({ roundNumber: 6, date: '15/06/2025' }),
      ],
    }),
    isCreating: false,
  },
};

export const EventCompetition: Story = {
  args: {
    competition: createCompetition({
      name: 'Corporate Golf Day',
      competitionType: 'event',
      endDate: null,
      rounds: [createRound()],
    }),
    isCreating: false,
  },
};

// ============================================================================
// HANDICAP SYSTEM STORIES
// ============================================================================

export const HonourSystem: Story = {
  args: {
    competition: createCompetition({
      handicapSystem: 'honor',
    }),
    isCreating: false,
  },
};

export const WHS: Story = {
  args: {
    competition: createCompetition({
      handicapSystem: 'whs',
    }),
    isCreating: false,
  },
};

export const GrossOnly: Story = {
  args: {
    competition: createCompetition({
      handicapSystem: 'gross-only',
    }),
    isCreating: false,
  },
};

// ============================================================================
// TEAM COMPETITION STORIES
// ============================================================================

export const FixedTeams: Story = {
  args: {
    competition: createCompetition({
      name: 'Team Challenge',
      teamMode: 'fixed',
      teamSize: 2,
      teams: [
        createTeam({ name: 'Team Alpha', playerIds: ['player-1', 'player-2'] }),
        createTeam({ name: 'Team Beta', playerIds: ['player-3', 'player-4'] }),
      ],
      players: [
        createPlayer({ id: 'player-1', name: 'John Smith', handicap: 12 }),
        createPlayer({ id: 'player-2', name: 'Jane Doe', handicap: 18 }),
        createPlayer({ id: 'player-3', name: 'Bob Johnson', handicap: 8 }),
        createPlayer({ id: 'player-4', name: 'Alice Williams', handicap: 15 }),
      ],
    }),
    isCreating: false,
  },
};

export const RotatingTeams: Story = {
  args: {
    competition: createCompetition({
      name: 'Rotating Partners Championship',
      teamMode: 'per-round',
      teamSize: 2,
      teams: [
        createTeam({ name: 'Round 1 Pair A', playerIds: ['player-1', 'player-2'] }),
        createTeam({ name: 'Round 1 Pair B', playerIds: ['player-3', 'player-4'] }),
      ],
      players: [
        createPlayer({ id: 'player-1', name: 'John Smith', handicap: 12 }),
        createPlayer({ id: 'player-2', name: 'Jane Doe', handicap: 18 }),
        createPlayer({ id: 'player-3', name: 'Bob Johnson', handicap: 8 }),
        createPlayer({ id: 'player-4', name: 'Alice Williams', handicap: 15 }),
      ],
    }),
    isCreating: false,
  },
};

export const LargeTeams: Story = {
  args: {
    competition: createCompetition({
      name: 'Four-Person Scramble',
      teamMode: 'fixed',
      teamSize: 4,
      teams: [
        createTeam({ name: 'The Eagles', playerIds: ['player-1', 'player-2', 'player-3', 'player-4'] }),
        createTeam({ name: 'The Birdies', playerIds: ['player-5', 'player-6', 'player-7', 'player-8'] }),
      ],
      players: [
        createPlayer({ id: 'player-1', name: 'John Smith', handicap: 12 }),
        createPlayer({ id: 'player-2', name: 'Jane Doe', handicap: 18 }),
        createPlayer({ id: 'player-3', name: 'Bob Johnson', handicap: 8 }),
        createPlayer({ id: 'player-4', name: 'Alice Williams', handicap: 15 }),
        createPlayer({ id: 'player-5', name: 'Tom Brown', handicap: 20 }),
        createPlayer({ id: 'player-6', name: 'Sarah Davis', handicap: 22 }),
        createPlayer({ id: 'player-7', name: 'Mike Wilson', handicap: 5 }),
        createPlayer({ id: 'player-8', name: 'Lisa Anderson', handicap: 14 }),
      ],
    }),
    isCreating: false,
  },
};

// ============================================================================
// GAME TYPE STORIES
// ============================================================================

export const StablefordFormat: Story = {
  args: {
    competition: createCompetition({
      rounds: [createRound({ gameType: 'stableford' })],
    }),
    isCreating: false,
  },
};

export const StrokePlayFormat: Story = {
  args: {
    competition: createCompetition({
      rounds: [createRound({ gameType: 'stroke' })],
    }),
    isCreating: false,
  },
};

export const MatchPlayFormat: Story = {
  args: {
    competition: createCompetition({
      rounds: [createRound({ gameType: 'match-play' })],
    }),
    isCreating: false,
  },
};

export const ScrambleFormat: Story = {
  args: {
    competition: createCompetition({
      teamMode: 'fixed',
      teamSize: 4,
      rounds: [createRound({ gameType: 'scramble' })],
    }),
    isCreating: false,
  },
};

export const BestBallFormat: Story = {
  args: {
    competition: createCompetition({
      teamMode: 'fixed',
      teamSize: 2,
      rounds: [createRound({ gameType: 'best-ball' })],
    }),
    isCreating: false,
  },
};

export const ShambleFormat: Story = {
  args: {
    competition: createCompetition({
      teamMode: 'fixed',
      teamSize: 4,
      rounds: [createRound({ gameType: 'scramble' })],
    }),
    isCreating: false,
  },
};

export const MixedGameTypes: Story = {
  args: {
    competition: createCompetition({
      name: 'Multi-Format Championship',
      rounds: [
        createRound({ roundNumber: 1, gameType: 'stableford', date: '15/01/2025' }),
        createRound({ roundNumber: 2, gameType: 'stroke', date: '16/01/2025' }),
        createRound({ roundNumber: 3, gameType: 'match-play', date: '17/01/2025' }),
      ],
    }),
    isCreating: false,
  },
};

// ============================================================================
// WARNING STATE STORIES
// ============================================================================

export const CourseNotFound: Story = {
  args: {
    competition: createCompetition({
      rounds: [
        createRound({
          courseId: null,
          courseName: 'Unknown Course',
          venueName: 'Unknown Venue',
          courseNotFound: true,
        }),
      ],
    }),
    isCreating: false,
  },
};

export const MultipleMissingCourses: Story = {
  args: {
    competition: createCompetition({
      rounds: [
        createRound({
          roundNumber: 1,
          courseId: null,
          courseName: 'Mystery Links',
          venueName: 'Unknown Venue',
          courseNotFound: true,
        }),
        createRound({
          roundNumber: 2,
          courseId: 'course-1',
          courseName: 'Found Course',
          venueName: 'Melbourne Golf Club',
        }),
        createRound({
          roundNumber: 3,
          courseId: null,
          courseName: 'Another Unknown',
          venueName: 'Somewhere',
          courseNotFound: true,
        }),
      ],
    }),
    isCreating: false,
  },
};

export const WithValidationErrors: Story = {
  args: {
    competition: createCompetition({
      validationErrors: [
        'Course "Mystery Links" not found in database',
        'Date format may need adjustment',
      ],
    }),
    isCreating: false,
  },
};

// ============================================================================
// AI NOTES STORIES
// ============================================================================

export const WithAssumptions: Story = {
  args: {
    competition: createCompetition({
      assumptions: [
        'Assumed Stableford format based on context',
        'Default tee time of 8:00 AM applied',
        'Honour system handicapping assumed',
      ],
    }),
    isCreating: false,
  },
};

export const WithAssumptionsAndErrors: Story = {
  args: {
    competition: createCompetition({
      assumptions: [
        'Assumed individual format',
        'Used default competition dates',
      ],
      validationErrors: [
        'Could not find course information',
        'Player handicaps need verification',
      ],
      rounds: [
        createRound({
          courseId: null,
          courseNotFound: true,
        }),
      ],
    }),
    isCreating: false,
  },
};

// ============================================================================
// PLAYER VARIATIONS STORIES
// ============================================================================

export const ManyPlayers: Story = {
  args: {
    competition: createCompetition({
      name: 'Large Field Event',
      players: Array.from({ length: 16 }, (_, i) =>
        createPlayer({
          id: `player-${i + 1}`,
          name: `Player ${i + 1}`,
          handicap: 5 + i * 2,
        })
      ),
    }),
    isCreating: false,
  },
};

export const PlayersWithoutHandicaps: Story = {
  args: {
    competition: createCompetition({
      players: [
        createPlayer({ id: 'player-1', name: 'New Golfer 1', handicap: null }),
        createPlayer({ id: 'player-2', name: 'New Golfer 2', handicap: null }),
        createPlayer({ id: 'player-3', name: 'Experienced Player', handicap: 10 }),
      ],
    }),
    isCreating: false,
  },
};

export const ScratchPlayers: Story = {
  args: {
    competition: createCompetition({
      players: [
        createPlayer({ id: 'player-1', name: 'Scratch Golfer', handicap: 0 }),
        createPlayer({ id: 'player-2', name: 'Plus Handicap', handicap: -2 }),
        createPlayer({ id: 'player-3', name: 'Low Handicap', handicap: 3 }),
      ],
    }),
    isCreating: false,
  },
};

export const HighHandicapPlayers: Story = {
  args: {
    competition: createCompetition({
      players: [
        createPlayer({ id: 'player-1', name: 'Beginner 1', handicap: 36 }),
        createPlayer({ id: 'player-2', name: 'Beginner 2', handicap: 40 }),
        createPlayer({ id: 'player-3', name: 'Beginner 3', handicap: 45 }),
      ],
    }),
    isCreating: false,
  },
};

// ============================================================================
// LOADING STATE STORIES
// ============================================================================

export const Creating: Story = {
  args: {
    competition: createCompetition(),
    isCreating: true,
  },
};

export const CreatingWithWarnings: Story = {
  args: {
    competition: createCompetition({
      rounds: [
        createRound({
          courseId: null,
          courseNotFound: true,
        }),
      ],
      validationErrors: ['Course not found'],
    }),
    isCreating: true,
  },
};

// ============================================================================
// ROUND VARIATIONS STORIES
// ============================================================================

export const RoundsWithoutTeeTimes: Story = {
  args: {
    competition: createCompetition({
      rounds: [
        createRound({ roundNumber: 1, teeTime: null }),
        createRound({ roundNumber: 2, teeTime: null, date: '16/01/2025' }),
      ],
    }),
    isCreating: false,
  },
};

export const ManyRounds: Story = {
  args: {
    competition: createCompetition({
      name: 'Extended Competition',
      rounds: Array.from({ length: 10 }, (_, i) =>
        createRound({
          roundNumber: i + 1,
          date: `${15 + i}/01/2025`,
          teeTime: `0${8 + (i % 3)}:00`,
        })
      ),
    }),
    isCreating: false,
  },
};

export const DifferentVenues: Story = {
  args: {
    competition: createCompetition({
      name: 'Multi-Venue Championship',
      rounds: [
        createRound({ roundNumber: 1, venueName: 'Royal Melbourne', courseName: 'West Course' }),
        createRound({ roundNumber: 2, venueName: 'Kingston Heath', courseName: 'Main Course', date: '16/01/2025' }),
        createRound({ roundNumber: 3, venueName: 'Victoria Golf Club', courseName: 'Championship', date: '17/01/2025' }),
      ],
    }),
    isCreating: false,
  },
};

// ============================================================================
// EDGE CASE STORIES
// ============================================================================

export const LongCompetitionName: Story = {
  args: {
    competition: createCompetition({
      name: 'The Annual Melbourne Metropolitan Golf Association Championship Trophy Series',
    }),
    isCreating: false,
  },
};

export const LongDescription: Story = {
  args: {
    competition: createCompetition({
      description:
        'This is a comprehensive golf competition that brings together players from across the metropolitan area for a series of challenging rounds at some of the finest courses in the region. Players will compete for the prestigious trophy while enjoying world-class facilities and hospitality.',
    }),
    isCreating: false,
  },
};

export const MinimalCompetition: Story = {
  args: {
    competition: {
      name: 'Quick Round',
      description: null,
      competitionType: 'event',
      startDate: '15/01/2025',
      endDate: null,
      handicapSystem: 'honor',
      teamMode: 'none',
      teamSize: null,
      rounds: [createRound()],
      players: [createPlayer()],
    },
    isCreating: false,
  },
};

export const EmptyPlayersAndRounds: Story = {
  args: {
    competition: createCompetition({
      rounds: [],
      players: [],
    }),
    isCreating: false,
  },
};

export const SinglePlayer: Story = {
  args: {
    competition: createCompetition({
      players: [createPlayer({ id: 'player-1', name: 'Solo Golfer', handicap: 15 })],
    }),
    isCreating: false,
  },
};

// ============================================================================
// INTERACTIVE STORIES
// ============================================================================

export const Interactive: Story = {
  args: {
    competition: createCompetition(),
    isCreating: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive story for testing button actions. Click buttons to see actions logged.',
      },
    },
  },
};

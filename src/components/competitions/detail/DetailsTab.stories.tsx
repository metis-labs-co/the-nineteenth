/**
 * DetailsTab Storybook Stories
 *
 * Stories demonstrating the various configurations of the DetailsTab component.
 * Shows different competition types, organizer/player views, and data scenarios.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { DetailsTab } from './DetailsTab';
import type { Competition, Course, CompetitionType, HandicapSystem, TeamMode } from '@/types/database.types';
import { DEFAULT_POINT_SYSTEM } from '@/types/database.types';
import type { RoundWithCourse } from './types';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof DetailsTab> = {
  title: 'Competitions/DetailsTab',
  component: DetailsTab,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    isOrganizer: { control: 'boolean' },
    playerCount: { control: 'number' },
  },
  decorators: [
    (Story) => (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Story />
        </View>
      </ScrollView>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DetailsTab>;

// ===========================================================================
// HELPERS
// ===========================================================================

function createCompetition(overrides: Partial<Competition> = {}): Competition {
  return {
    id: 'comp-1',
    name: 'Summer Championship 2025',
    description: 'Annual summer golf competition with prizes for top finishers',
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

function createCourse(id: string, name: string, clubName: string): Course & { clubs?: { name: string; city: string | null; state: string | null } | null } {
  return {
    id,
    club_id: `club-${id}`,
    golfapi_course_id: null,
    golfapi_long_course_id: null,
    name,
    description: `${name} - A premier golf course`,
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
      name: clubName,
      city: 'Melbourne',
      state: 'VIC',
    },
  };
}

function createRound(roundNumber: number, course: Course | null, date: string): RoundWithCourse {
  return {
    id: `round-${roundNumber}`,
    competition_id: 'comp-1',
    user_id: null,
    round_number: roundNumber,
    course_id: course?.id ?? 'course-default',
    date,
    tee_time: '08:00:00',
    game_type: 'stableford',
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: spacing.lg,
  },
});

// ===========================================================================
// DEFAULT DATA
// ===========================================================================

const defaultCompetition = createCompetition();
const royalMelbourne = createCourse('course-1', 'Royal Melbourne', 'Royal Melbourne Golf Club');
const kingstonHeath = createCourse('course-2', 'Kingston Heath', 'Kingston Heath Golf Club');

const defaultRounds: RoundWithCourse[] = [
  createRound(1, royalMelbourne, '2025-01-15'),
  createRound(2, kingstonHeath, '2025-01-16'),
];

// ===========================================================================
// STORIES
// ===========================================================================

/**
 * Default view as an organizer
 */
export const OrganizerView: Story = {
  args: {
    competition: defaultCompetition,
    rounds: defaultRounds,
    playerCount: 16,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
    onUpdateCompetition: async (updates) => console.log('Update:', updates),
  },
};

/**
 * Player view with current standing
 */
export const PlayerView: Story = {
  args: {
    competition: defaultCompetition,
    rounds: defaultRounds,
    playerCount: 16,
    currentStanding: { position: 3, points: 32 },
    isOrganizer: false,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Player in first place
 */
export const PlayerInFirstPlace: Story = {
  args: {
    competition: defaultCompetition,
    rounds: defaultRounds,
    playerCount: 16,
    currentStanding: { position: 1, points: 45 },
    isOrganizer: false,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Knockout competition type
 */
export const KnockoutCompetition: Story = {
  args: {
    competition: createCompetition({
      name: 'Melbourne Golf Knockout 2025',
      description: 'Bracket-style elimination competition',
      competition_type: 'knockout',
      start_date: '2025-01-01',
      end_date: null, // Knockouts may not have end date
      status: 'in-progress',
    }),
    rounds: [
      createRound(1, royalMelbourne, '2025-01-15'),
      createRound(2, kingstonHeath, '2025-02-15'),
      createRound(3, royalMelbourne, '2025-03-15'),
      createRound(4, kingstonHeath, '2025-04-15'),
    ],
    playerCount: 24,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Fixed teams competition
 */
export const FixedTeamsCompetition: Story = {
  args: {
    competition: createCompetition({
      name: 'Pairs Championship',
      description: 'Two-person team event with fixed partnerships',
      team_mode: 'fixed',
      team_size: 2,
    }),
    rounds: defaultRounds,
    playerCount: 16,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Per-round teams competition with 4-person teams
 */
export const PerRoundTeamsCompetition: Story = {
  args: {
    competition: createCompetition({
      name: 'Social Scramble Day',
      description: 'Fun event with randomly assigned teams each round',
      team_mode: 'per-round',
      team_size: 4,
    }),
    rounds: defaultRounds,
    playerCount: 20,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * World Handicap System
 */
export const WHSHandicap: Story = {
  args: {
    competition: createCompetition({
      name: 'Official Club Championship',
      description: 'Competition using World Handicap System',
      handicap_system: 'whs',
    }),
    rounds: defaultRounds,
    playerCount: 32,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Gross only scoring
 */
export const GrossOnlyCompetition: Story = {
  args: {
    competition: createCompetition({
      name: 'Scratch Competition',
      description: 'Gross scores only - no handicap adjustments',
      handicap_system: 'gross-only',
    }),
    rounds: defaultRounds,
    playerCount: 12,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Competition with single course (same course for all rounds)
 */
export const SingleCourse: Story = {
  args: {
    competition: createCompetition({
      name: 'Royal Melbourne Classic',
      description: 'Three rounds at the prestigious Royal Melbourne',
    }),
    rounds: [
      createRound(1, royalMelbourne, '2025-01-15'),
      createRound(2, royalMelbourne, '2025-01-16'),
      createRound(3, royalMelbourne, '2025-01-17'),
    ],
    playerCount: 24,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Competition with many courses
 */
export const MultipleCourses: Story = {
  args: {
    competition: createCompetition({
      name: 'Sandbelt Tour',
      description: 'Experience multiple premier courses in the Melbourne Sandbelt',
    }),
    rounds: [
      createRound(1, royalMelbourne, '2025-01-15'),
      createRound(2, kingstonHeath, '2025-01-16'),
      createRound(3, createCourse('course-3', 'Metropolitan Golf Club', 'Metropolitan Golf Club'), '2025-01-17'),
      createRound(4, createCourse('course-4', 'Victoria Golf Club', 'Victoria Golf Club'), '2025-01-18'),
    ],
    playerCount: 20,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Competition with no courses yet
 */
export const NoCourses: Story = {
  args: {
    competition: createCompetition({
      name: 'Draft Competition',
      description: 'Courses to be announced',
      status: 'upcoming',
    }),
    rounds: [
      { ...createRound(1, null, '2025-01-15'), course: null },
      { ...createRound(2, null, '2025-01-16'), course: null },
    ],
    playerCount: 0,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Competition with no rounds
 */
export const NoRounds: Story = {
  args: {
    competition: createCompetition({
      name: 'New Competition',
      description: 'Just created - add rounds to get started',
      status: 'upcoming',
    }),
    rounds: [],
    playerCount: 4,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * In progress competition
 */
export const InProgressCompetition: Story = {
  args: {
    competition: createCompetition({
      status: 'in-progress',
    }),
    rounds: [
      { ...createRound(1, royalMelbourne, '2025-01-15'), status: 'completed' },
      { ...createRound(2, kingstonHeath, '2025-01-16'), status: 'in-progress' },
    ],
    playerCount: 16,
    currentStanding: { position: 5, points: 28 },
    isOrganizer: false,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Completed competition
 */
export const CompletedCompetition: Story = {
  args: {
    competition: createCompetition({
      status: 'completed',
    }),
    rounds: [
      { ...createRound(1, royalMelbourne, '2025-01-15'), status: 'completed' },
      { ...createRound(2, kingstonHeath, '2025-01-16'), status: 'completed' },
    ],
    playerCount: 16,
    currentStanding: { position: 2, points: 42 },
    isOrganizer: false,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Competition without description
 */
export const NoDescription: Story = {
  args: {
    competition: createCompetition({
      description: null,
    }),
    rounds: defaultRounds,
    playerCount: 8,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Competition with long name
 */
export const LongCompetitionName: Story = {
  args: {
    competition: createCompetition({
      name: 'The Annual Melbourne Metropolitan Golf Championship Series 2025',
      description: 'This is a very long description that tests how the component handles extended text content. It should wrap properly and maintain readability throughout the card layout.',
    }),
    rounds: defaultRounds,
    playerCount: 32,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

/**
 * Large competition with many players
 */
export const LargeCompetition: Story = {
  args: {
    competition: createCompetition({
      name: 'Corporate Golf Day',
      description: 'Annual company golf event with prizes and dinner',
    }),
    rounds: [
      createRound(1, royalMelbourne, '2025-01-15'),
    ],
    playerCount: 120,
    currentStanding: null,
    isOrganizer: true,
    onViewCourse: (course) => console.log('View course:', course.name),
    onEdit: () => console.log('Edit clicked'),
  },
};

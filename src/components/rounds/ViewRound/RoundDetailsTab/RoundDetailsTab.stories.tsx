/**
 * RoundDetailsTab Storybook Stories
 *
 * Visual testing stories for the RoundDetailsTab component showing:
 * - Different round statuses
 * - Various game types
 * - With/without course data
 * - With/without competition
 * - Organizer vs player views
 * - Premium vs free features
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { RoundDetailsTab } from './index';
import type { RoundWithCourse, CourseWithVenue, CompetitionSummary } from '@/hooks/useRoundDetails';
import type { Hole, GameType, RoundStatus, CompetitionType, TeamFormat, AustralianState, CompetitionStatus, TeeBox } from '@/types/database.types';

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

function create18Holes(): Hole[] {
  const pars: (3 | 4 | 5)[] = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
  const strokeIndexes = [7, 15, 1, 11, 5, 17, 3, 9, 13, 8, 16, 2, 12, 6, 18, 4, 10, 14];

  return pars.map((par, i) => ({
    number: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18,
    par,
    strokeIndex: strokeIndexes[i],
    yardages: { blue: 400 + i * 10, white: 380 + i * 10, red: 350 + i * 10 },
  }));
}

function create9Holes(): Hole[] {
  return create18Holes().slice(0, 9);
}

function createVenue(overrides = {}) {
  return {
    id: 'venue-1',
    name: 'Royal Melbourne Golf Club',
    city: 'Melbourne',
    state: 'VIC' as AustralianState,
    address: '123 Golf Lane',
    ...overrides,
  };
}

function createCourse(overrides: Partial<CourseWithVenue> = {}): CourseWithVenue {
  return {
    id: 'course-1',
    venue_id: 'venue-1',
    name: 'Championship Course',
    description: 'A challenging championship course',
    holes: create18Holes(),
    tees: [
      { name: 'Blue', color: 'blue', totalYardage: 6800, courseRating: 72.5, slopeRating: 130 },
      { name: 'White', color: 'white', totalYardage: 6400, courseRating: 70.0, slopeRating: 125 },
      { name: 'Red', color: 'red', totalYardage: 5600, courseRating: 68.5, slopeRating: 115 },
    ],
    slope_rating: 125,
    course_rating: 70.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    venue: createVenue(),
    ...overrides,
  };
}

function createCompetition(overrides: Partial<CompetitionSummary> = {}): CompetitionSummary {
  return {
    id: 'comp-1',
    name: 'Summer Championship 2025',
    competition_type: 'event',
    status: 'in-progress' as CompetitionStatus,
    start_date: '2025-01-15',
    end_date: '2025-01-17',
    ...overrides,
  };
}

function createRound(overrides: Partial<RoundWithCourse> = {}): RoundWithCourse {
  return {
    id: 'round-1',
    competition_id: 'comp-1',
    user_id: null,
    round_number: 1,
    course_id: 'course-1',
    date: '2025-01-15',
    tee_time: '08:00:00',
    game_type: 'stableford',
    selected_tee: { name: 'White', color: 'white', totalYardage: 6400 } as TeeBox,
    is_team_round: false,
    team_format: null,
    scoring_pairs_required: false,
    ball_count: 1,
    status: 'upcoming',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    course: createCourse(),
    competition: createCompetition(),
    ...overrides,
  };
}

// ===========================================================================
// DECORATOR
// ===========================================================================

const ScrollDecorator = (Story: React.ComponentType) => (
  <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
    <Story />
  </ScrollView>
);

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof RoundDetailsTab> = {
  title: 'Rounds/ViewRound/RoundDetailsTab',
  component: RoundDetailsTab,
  decorators: [ScrollDecorator],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    isOrganizer: {
      control: 'boolean',
      description: 'Whether the current user is the organizer',
    },
    isPremium: {
      control: 'boolean',
      description: 'Whether the user has premium access',
    },
    onEditPress: {
      action: 'editPressed',
      description: 'Callback when edit button is pressed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RoundDetailsTab>;

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    round: createRound(),
    isOrganizer: false,
    isPremium: false,
  },
};

export const OrganizerView: Story = {
  args: {
    round: createRound(),
    isOrganizer: true,
    isPremium: true,
    onEditPress: () => console.log('Edit pressed'),
  },
};

export const PlayerView: Story = {
  args: {
    round: createRound(),
    isOrganizer: false,
    isPremium: false,
  },
};

// ===========================================================================
// ROUND STATUS STORIES
// ===========================================================================

export const UpcomingRound: Story = {
  args: {
    round: createRound({ status: 'upcoming' }),
  },
};

export const InProgressRound: Story = {
  args: {
    round: createRound({ status: 'in-progress' }),
  },
};

export const CompletedRound: Story = {
  args: {
    round: createRound({ status: 'completed' }),
  },
};

export const UpcomingOrganizerView: Story = {
  args: {
    round: createRound({ status: 'upcoming' }),
    isOrganizer: true,
    onEditPress: () => console.log('Edit pressed'),
  },
};

// ===========================================================================
// GAME TYPE STORIES
// ===========================================================================

export const StablefordFormat: Story = {
  args: {
    round: createRound({ game_type: 'stableford' }),
  },
};

export const StrokePlayFormat: Story = {
  args: {
    round: createRound({ game_type: 'stroke' }),
  },
};

export const MatchPlayFormat: Story = {
  args: {
    round: createRound({ game_type: 'match-play' }),
  },
};

export const AmbroseFormat: Story = {
  args: {
    round: createRound({
      game_type: 'ambrose',
      is_team_round: true,
      team_format: 'scramble',
    }),
  },
};

export const BestBallFormat: Story = {
  args: {
    round: createRound({
      game_type: 'best-ball',
      is_team_round: true,
      team_format: 'best-ball',
    }),
  },
};

export const ScrambleFormat: Story = {
  args: {
    round: createRound({
      game_type: 'scramble',
      is_team_round: true,
      team_format: 'scramble',
    }),
  },
};

// ===========================================================================
// COURSE DATA VARIATIONS
// ===========================================================================

export const WithFullCourseData: Story = {
  args: {
    round: createRound({
      course: createCourse({
        name: 'Royal Melbourne West',
        slope_rating: 140,
        course_rating: 74.5,
      }),
    }),
  },
};

export const NoCourseData: Story = {
  args: {
    round: createRound({ course: null }),
  },
};

export const CourseWithoutVenue: Story = {
  args: {
    round: createRound({
      course: createCourse({ venue: null }),
    }),
  },
};

export const NineHoleCourse: Story = {
  args: {
    round: createRound({
      course: createCourse({ holes: create9Holes() }),
    }),
  },
};

export const CourseWithNoHoles: Story = {
  args: {
    round: createRound({
      course: createCourse({ holes: [] }),
    }),
  },
};

// ===========================================================================
// TEE SELECTION STORIES
// ===========================================================================

export const BlueTeeSelected: Story = {
  args: {
    round: createRound({
      selected_tee: { name: 'Blue', color: 'blue', totalYardage: 6800 } as TeeBox,
    }),
  },
};

export const WhiteTeeSelected: Story = {
  args: {
    round: createRound({
      selected_tee: { name: 'White', color: 'white', totalYardage: 6400 } as TeeBox,
    }),
  },
};

export const RedTeeSelected: Story = {
  args: {
    round: createRound({
      selected_tee: { name: 'Red', color: 'red', totalYardage: 5600 } as TeeBox,
    }),
  },
};

export const NoTeeSelected: Story = {
  args: {
    round: createRound({ selected_tee: null }),
  },
};

// ===========================================================================
// COMPETITION STORIES
// ===========================================================================

export const WithEventCompetition: Story = {
  args: {
    round: createRound({
      competition: createCompetition({ competition_type: 'event' }),
    }),
  },
};

export const WithLeagueCompetition: Story = {
  args: {
    round: createRound({
      competition: createCompetition({
        competition_type: 'league',
        name: 'Winter Golf League',
      }),
    }),
  },
};

export const NoCompetition: Story = {
  args: {
    round: createRound({ competition: null }),
  },
};

export const StandaloneRound: Story = {
  args: {
    round: createRound({
      competition_id: null,
      competition: null,
    }),
  },
};

// ===========================================================================
// SCORING PAIRS STORIES
// ===========================================================================

export const ScoringPairsRequired: Story = {
  args: {
    round: createRound({ scoring_pairs_required: true }),
    isPremium: true,
  },
};

export const ScoringPairsNotRequired: Story = {
  args: {
    round: createRound({ scoring_pairs_required: false }),
  },
};

export const ScoringPairsPremiumLocked: Story = {
  args: {
    round: createRound({ scoring_pairs_required: true }),
    isPremium: false,
  },
};

// ===========================================================================
// VENUE STORIES
// ===========================================================================

export const VenueWithFullAddress: Story = {
  args: {
    round: createRound({
      course: createCourse({
        venue: createVenue({
          city: 'Melbourne',
          state: 'VIC',
          address: '123 Golf Lane, Black Rock',
        }),
      }),
    }),
  },
};

export const VenueCityOnly: Story = {
  args: {
    round: createRound({
      course: createCourse({
        venue: createVenue({
          city: 'Sydney',
          state: '',
        }),
      }),
    }),
  },
};

export const VenueStateOnly: Story = {
  args: {
    round: createRound({
      course: createCourse({
        venue: createVenue({
          city: '',
          state: 'Queensland',
        }),
      }),
    }),
  },
};

export const VenueNameOnly: Story = {
  args: {
    round: createRound({
      course: createCourse({
        venue: createVenue({
          name: 'Private Golf Estate',
          city: '',
          state: '',
        }),
      }),
    }),
  },
};

// ===========================================================================
// PREMIUM FEATURES
// ===========================================================================

export const PremiumUserView: Story = {
  args: {
    round: createRound({ scoring_pairs_required: true }),
    isOrganizer: true,
    isPremium: true,
    onEditPress: () => console.log('Edit pressed'),
  },
};

export const FreeUserView: Story = {
  args: {
    round: createRound(),
    isOrganizer: false,
    isPremium: false,
  },
};

// ===========================================================================
// REAL-WORLD SCENARIOS
// ===========================================================================

export const TournamentRound: Story = {
  args: {
    round: createRound({
      game_type: 'stroke',
      status: 'in-progress',
      competition: createCompetition({
        name: 'Annual Club Championship',
        competition_type: 'event',
      }),
      scoring_pairs_required: true,
    }),
    isPremium: true,
  },
};

export const CasualRound: Story = {
  args: {
    round: createRound({
      game_type: 'stableford',
      status: 'upcoming',
      competition: null,
      tee_time: '14:30:00',
      selected_tee: { name: 'White', color: 'white', totalYardage: 6400 } as TeeBox,
    }),
  },
};

export const LeagueMatchDay: Story = {
  args: {
    round: createRound({
      game_type: 'match-play',
      status: 'in-progress',
      competition: createCompetition({
        name: 'Summer Match Play League',
        competition_type: 'league',
      }),
    }),
  },
};

export const TeamEvent: Story = {
  args: {
    round: createRound({
      game_type: 'ambrose',
      is_team_round: true,
      team_format: 'scramble',
      competition: createCompetition({
        name: 'Corporate Golf Day',
        competition_type: 'event',
      }),
    }),
  },
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const LongCourseName: Story = {
  args: {
    round: createRound({
      course: createCourse({
        name: 'The Royal and Ancient Golf Club of St Andrews - Old Course Links',
      }),
    }),
  },
};

export const LongCompetitionName: Story = {
  args: {
    round: createRound({
      competition: createCompetition({
        name: 'The 150th Annual Spring Golf Championship Tournament and Charity Event',
      }),
    }),
  },
};

export const SpecialCharactersInNames: Story = {
  args: {
    round: createRound({
      course: createCourse({
        name: "St. Andrew's Links & Golf Resort",
        venue: createVenue({
          name: "O'Brien's Golf Club",
          city: "St. John's",
          state: 'NSW',
        }),
      }),
      competition: createCompetition({
        name: "2025 \"Champions\" Cup",
      }),
    }),
  },
};

export const MinimalData: Story = {
  args: {
    round: {
      id: 'round-minimal',
      competition_id: null,
      user_id: null,
      round_number: 1,
      course_id: '',
      date: '2025-01-01',
      tee_time: null,
      game_type: 'stableford',
      selected_tee: null,
      is_team_round: false,
      team_format: null,
      scoring_pairs_required: false,
      ball_count: 1,
      status: 'upcoming' as RoundStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      course: null,
      competition: null,
    },
  },
};

export const HighRatings: Story = {
  args: {
    round: createRound({
      course: createCourse({
        name: 'Professional Championship Course',
        slope_rating: 155,
        course_rating: 77.5,
      }),
    }),
  },
};

export const MorningTeeTime: Story = {
  args: {
    round: createRound({
      tee_time: '06:00:00',
      date: '2025-06-21',
    }),
  },
};

export const AfternoonTeeTime: Story = {
  args: {
    round: createRound({
      tee_time: '15:30:00',
      date: '2025-06-21',
    }),
  },
};

// ===========================================================================
// STYLES
// ===========================================================================

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
});

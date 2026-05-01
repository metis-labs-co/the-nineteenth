/**
 * LeaderboardTab Storybook Stories
 *
 * Stories demonstrating the various configurations of the LeaderboardTab component.
 * Shows different team modes, view states, and round configurations.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { LeaderboardTab } from './LeaderboardTab';
import { spacing, typography } from '@/constants/theme';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof LeaderboardTab> = {
  title: 'Leaderboard/LeaderboardTab',
  component: LeaderboardTab,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    teamMode: {
      control: { type: 'select' },
      options: ['none', 'fixed', 'per-round'],
    },
    autoRefresh: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof LeaderboardTab>;

// ===========================================================================
// MOCK DATA
// ===========================================================================

/**
 * Create a mock round with course
 */
function createMockRound(
  overrides: Partial<RoundWithCourse> = {}
): RoundWithCourse {
  return {
    id: `round-${Math.random().toString(36).substr(2, 9)}`,
    competition_id: 'comp-1',
    user_id: null,
    round_number: 1,
    display_order: 1,
    name: null,
    course_id: 'course-1',
    date: '2025-01-15',
    tee_time: '08:00',
    rules_override: null,
    game_type: 'stableford',
    nine_type: 'full',
    selected_tee: { name: 'White', color: 'white', totalYardage: 6200, courseRating: 72, slopeRating: 125 },
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
    course: {
      id: 'course-1',
      club_id: 'club-1',
      golfapi_course_id: null,
      golfapi_long_course_id: null,
      name: 'Royal Melbourne',
      description: null,
      num_holes: 18,
      measure_unit: null,
      holes: [],
      holes_women: null,
      match_play_indexes: null,
      tees: [],
      tees_migrated: null,
      slope_rating: 125,
      course_rating: 72,
      golfapi_updated_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      api_locked: false,
    },
    ...overrides,
  };
}

// Sample rounds for stories
const _sampleRounds: RoundWithCourse[] = [
  createMockRound({ id: 'round-1', round_number: 1, status: 'completed', game_type: 'stableford' }),
  createMockRound({ id: 'round-2', round_number: 2, status: 'in-progress', game_type: 'stableford' }),
  createMockRound({ id: 'round-3', round_number: 3, status: 'upcoming', game_type: 'stroke' }),
];

const _teamRounds: RoundWithCourse[] = [
  createMockRound({
    id: 'round-1',
    round_number: 1,
    status: 'completed',
    game_type: 'best-ball',
    is_team_round: true,
    team_format: 'best-ball',
  }),
  createMockRound({
    id: 'round-2',
    round_number: 2,
    status: 'in-progress',
    game_type: 'stableford',
    is_team_round: false,
    team_format: null,
  }),
];

const _scrambleRounds: RoundWithCourse[] = [
  createMockRound({
    id: 'round-1',
    round_number: 1,
    status: 'completed',
    game_type: 'scramble',
    is_team_round: true,
    team_format: 'scramble',
  }),
  createMockRound({
    id: 'round-2',
    round_number: 2,
    status: 'in-progress',
    game_type: 'scramble',
    is_team_round: true,
    team_format: 'scramble',
  }),
];

// ===========================================================================
// STORY WRAPPER
// ===========================================================================

interface StoryWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function StoryWrapper({ title, description, children }: StoryWrapperProps) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: '#666666',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.md,
    borderRadius: 12,
  },
  infoText: {
    ...typography.body,
    color: '#333333',
  },
  codeBlock: {
    backgroundColor: '#F0F0F0',
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333333',
  },
});

// ===========================================================================
// STORIES - BASIC VIEWS
// ===========================================================================

/**
 * Individual competition (no teams)
 *
 * Shows the default leaderboard for a competition without team mode.
 * Displays individual player standings with rounds played.
 */
export const IndividualCompetition: Story = {
  render: () => (
    <StoryWrapper
      title="Individual Competition"
      description="Competition without teams - shows individual player standings"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          The LeaderboardTab component fetches data using the useCompetitionLeaderboard hook.
          For individual competitions (teamMode='none'), it displays player rankings with
          position, name, handicap, and total points.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<LeaderboardTab
  competitionId="comp-uuid"
  teamMode="none"
  rounds={rounds}
/>`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

/**
 * Fixed team competition with team/individual toggle
 *
 * Shows the view toggle for competitions with fixed teams.
 * Users can switch between individual and team standings.
 */
export const FixedTeamCompetition: Story = {
  render: () => (
    <StoryWrapper
      title="Fixed Team Competition"
      description="Competition with fixed teams - shows toggle between Individual and Team views"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          When teamMode is 'fixed' or 'per-round', a toggle appears allowing users to
          switch between Individual and Team standings. The default view is Team.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<LeaderboardTab
  competitionId="comp-uuid"
  teamMode="fixed"
  rounds={rounds}
/>`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

/**
 * Per-round team competition
 *
 * Similar to fixed teams but teams change each round.
 */
export const PerRoundTeamCompetition: Story = {
  render: () => (
    <StoryWrapper
      title="Per-Round Team Competition"
      description="Competition where teams change each round"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Per-round competitions allow different team configurations for each round.
          The leaderboard still shows aggregated team standings across all rounds.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<LeaderboardTab
  competitionId="comp-uuid"
  teamMode="per-round"
  rounds={rounds}
/>`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

// ===========================================================================
// STORIES - SCRAMBLE COMPETITIONS
// ===========================================================================

/**
 * Scramble-only competition
 *
 * When all rounds are scramble format, individual standings become
 * irrelevant so the toggle is hidden and only team standings are shown.
 */
export const ScrambleOnlyCompetition: Story = {
  render: () => (
    <StoryWrapper
      title="Scramble-Only Competition"
      description="All rounds are scramble format - no individual toggle"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          For competitions where all rounds use scramble format, individual
          standings don't apply. The component automatically hides the toggle and
          displays only team standings. Member points are also hidden since
          scramble scores are team-based.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`// All rounds have team_format: 'scramble'
<LeaderboardTab
  competitionId="comp-uuid"
  teamMode="fixed"
  rounds={scrambleRounds}
/>`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

// ===========================================================================
// STORIES - ROUND RESULTS
// ===========================================================================

/**
 * With completed rounds
 *
 * Shows the round results section with completed round leaderboards.
 */
export const WithCompletedRounds: Story = {
  render: () => (
    <StoryWrapper
      title="With Completed Rounds"
      description="Shows round-specific leaderboards for completed rounds"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          The Round Results section displays individual round leaderboards for
          completed and in-progress rounds. Completed rounds have auto-refresh
          disabled since scores are final.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<LeaderboardTab
  competitionId="comp-uuid"
  teamMode="none"
  rounds={[
    { status: 'completed', ... },
    { status: 'in-progress', ... },
  ]}
/>`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

/**
 * With in-progress rounds
 *
 * Shows round leaderboards for rounds currently being played.
 */
export const WithInProgressRounds: Story = {
  render: () => (
    <StoryWrapper
      title="With In-Progress Rounds"
      description="Shows live round leaderboard with auto-refresh"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          In-progress rounds display with auto-refresh enabled, showing live
          updates as scores are submitted. The round leaderboard appears in
          the Round Results section.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<LeaderboardTab
  competitionId="comp-uuid"
  teamMode="none"
  rounds={[{ status: 'in-progress', ... }]}
  autoRefresh={true}
/>`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

/**
 * No rounds created yet
 *
 * Shows the empty state for round results section.
 */
export const NoRounds: Story = {
  render: () => (
    <StoryWrapper
      title="No Rounds Yet"
      description="Empty state when no rounds have been created"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          When no rounds exist, the Round Results section shows a friendly
          message explaining that rounds need to be added first.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<LeaderboardTab
  competitionId="comp-uuid"
  teamMode="none"
  rounds={[]}
/>`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

/**
 * Rounds exist but none started
 *
 * All rounds are upcoming, so no round results are shown.
 */
export const UpcomingRoundsOnly: Story = {
  render: () => (
    <StoryWrapper
      title="Upcoming Rounds Only"
      description="All rounds are scheduled but not started"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          When rounds exist but all are in 'upcoming' status, the Round Results
          section shows a message indicating results will appear once scoring begins.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<LeaderboardTab
  competitionId="comp-uuid"
  teamMode="none"
  rounds={[
    { status: 'upcoming', ... },
    { status: 'upcoming', ... },
  ]}
/>`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

// ===========================================================================
// STORIES - STATES
// ===========================================================================

/**
 * Loading state
 *
 * Shows the loading spinner while fetching leaderboard data.
 */
export const LoadingState: Story = {
  render: () => (
    <StoryWrapper
      title="Loading State"
      description="Displayed while fetching leaderboard data"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          A loading spinner with "Loading leaderboard..." message is shown while
          the component fetches data from the server. This includes initial load
          and when switching between Individual/Team views.
        </Text>
      </View>
    </StoryWrapper>
  ),
};

/**
 * Error state
 *
 * Shows the error message with retry button when data fetch fails.
 */
export const ErrorState: Story = {
  render: () => (
    <StoryWrapper
      title="Error State"
      description="Displayed when data fetch fails"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          When data loading fails, an error card is displayed with the error
          message and a "Retry" button. The user can tap Retry to attempt
          fetching the data again.
        </Text>
      </View>
    </StoryWrapper>
  ),
};

/**
 * Empty state - Individual
 *
 * Shows the empty state when no individual scores exist.
 */
export const EmptyStateIndividual: Story = {
  render: () => (
    <StoryWrapper
      title="Empty State - Individual"
      description="No individual standings yet"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          When viewing individual standings and no scores have been submitted,
          a friendly message explains that standings will appear once players
          submit their scorecards.
        </Text>
      </View>
    </StoryWrapper>
  ),
};

/**
 * Empty state - Team
 *
 * Shows the empty state when no team scores exist.
 */
export const EmptyStateTeam: Story = {
  render: () => (
    <StoryWrapper
      title="Empty State - Team"
      description="No team standings yet"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          When viewing team standings and no team scores have been submitted,
          a message explains that standings will appear once team scores are
          submitted.
        </Text>
      </View>
    </StoryWrapper>
  ),
};

// ===========================================================================
// STORIES - USER CONTEXT
// ===========================================================================

/**
 * With current user highlighting
 *
 * Highlights the current user's position in the leaderboard.
 */
export const WithCurrentUser: Story = {
  render: () => (
    <StoryWrapper
      title="Current User Highlighted"
      description="The current user's row is highlighted in the leaderboard"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          When currentUserId is provided, the matching row in the leaderboard
          is highlighted with a different background color, making it easy for
          users to find their position.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<LeaderboardTab
  competitionId="comp-uuid"
  teamMode="none"
  rounds={rounds}
  currentUserId="current-user-uuid"
/>`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

// ===========================================================================
// STORIES - CONFIGURATION
// ===========================================================================

/**
 * Auto-refresh disabled
 *
 * Data is fetched once and not automatically updated.
 */
export const AutoRefreshDisabled: Story = {
  render: () => (
    <StoryWrapper
      title="Auto-Refresh Disabled"
      description="Data is fetched once without automatic updates"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Set autoRefresh to false to disable automatic polling. Useful for
          completed competitions or when manual refresh is preferred.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<LeaderboardTab
  competitionId="comp-uuid"
  teamMode="none"
  rounds={rounds}
  autoRefresh={false}
/>`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

// ===========================================================================
// STORIES - MIXED FORMATS
// ===========================================================================

/**
 * Mixed round formats
 *
 * Competition with different game types across rounds.
 */
export const MixedRoundFormats: Story = {
  render: () => (
    <StoryWrapper
      title="Mixed Round Formats"
      description="Different game types across rounds"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Competitions can have different game types for each round (Stableford,
          Stroke Play, Match Play, etc.). Each round leaderboard displays the
          appropriate format for that round's game type.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<LeaderboardTab
  competitionId="comp-uuid"
  teamMode="none"
  rounds={[
    { game_type: 'stableford', ... },
    { game_type: 'stroke', ... },
    { game_type: 'match-play', ... },
  ]}
/>`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

/**
 * Mixed team and individual rounds
 *
 * Competition with both team and individual rounds.
 */
export const MixedTeamIndividualRounds: Story = {
  render: () => (
    <StoryWrapper
      title="Mixed Team & Individual Rounds"
      description="Some rounds are team-based, others are individual"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Competitions can have a mix of team and individual rounds. The round
          leaderboard adapts to show either team or individual results based on
          each round's configuration.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<LeaderboardTab
  competitionId="comp-uuid"
  teamMode="per-round"
  rounds={[
    { is_team_round: true, team_format: 'best-ball', ... },
    { is_team_round: false, team_format: null, ... },
  ]}
/>`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

// ===========================================================================
// STORIES - TEST SUPPORT
// ===========================================================================

/**
 * With test IDs
 *
 * Component with testID props for automated testing.
 */
export const WithTestIDs: Story = {
  render: () => (
    <StoryWrapper
      title="Test ID Support"
      description="Component provides testIDs for automated testing"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          The component and its children provide testID props for automated
          testing. Key test IDs include:
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`Available Test IDs:
- leaderboard-tab (main container)
- competition-individual-leaderboard
- competition-team-leaderboard
- round-leaderboard-{round_number}
- loading-spinner (when loading)
- error-state (when error)
- retry-button (on error state)`}
          </Text>
        </View>
      </View>
    </StoryWrapper>
  ),
};

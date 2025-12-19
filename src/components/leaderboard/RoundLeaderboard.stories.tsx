/**
 * RoundLeaderboard Storybook Stories
 *
 * Stories demonstrating the various configurations of the RoundLeaderboard component.
 * Shows different game types, states, and data scenarios.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { RoundLeaderboard } from './RoundLeaderboard';
import { spacing, typography } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof RoundLeaderboard> = {
  title: 'Leaderboard/RoundLeaderboard',
  component: RoundLeaderboard,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    gameType: {
      control: { type: 'select' },
      options: ['stableford', 'stroke', 'match-play', 'ambrose', 'best-ball'],
    },
    isTeamRound: { control: 'boolean' },
    autoRefresh: { control: 'boolean' },
    refetchInterval: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof RoundLeaderboard>;

// ===========================================================================
// MOCK DATA PROVIDERS
// ===========================================================================

// Since RoundLeaderboard uses a hook, we can't directly control its data in stories
// Instead, we create wrapper components that show the layout patterns

interface MockLeaderboardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function MockLeaderboard({ title, description, children }: MockLeaderboardProps) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <View style={styles.content}>
        {children}
      </View>
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
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
  },
  infoText: {
    ...typography.body,
    color: '#333333',
    textAlign: 'center',
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
// STORIES
// ===========================================================================

/**
 * Default Stableford leaderboard
 *
 * The RoundLeaderboard component fetches data from the hook, so this story
 * shows the component with a real roundId (data will load from the server).
 */
export const Default: Story = {
  render: () => (
    <MockLeaderboard
      title="Stableford Leaderboard"
      description="Shows player rankings by Stableford points"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          The RoundLeaderboard component requires a valid roundId to fetch data.
          In production, it displays player rankings with position, name, handicap,
          and Stableford points.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<RoundLeaderboard
  roundId="round-uuid"
  gameType="stableford"
  isTeamRound={false}
/>`}
          </Text>
        </View>
      </View>
    </MockLeaderboard>
  ),
};

/**
 * Stroke Play leaderboard with gross and net scores
 */
export const StrokePlay: Story = {
  render: () => (
    <MockLeaderboard
      title="Stroke Play Leaderboard"
      description="Shows both gross and net scores"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Stroke Play leaderboards include an additional "Gross" column
          alongside the Net score. Players are ranked by net score.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<RoundLeaderboard
  roundId="round-uuid"
  gameType="stroke"
  isTeamRound={false}
/>`}
          </Text>
        </View>
      </View>
    </MockLeaderboard>
  ),
};

/**
 * Match Play showing head-to-head matchups
 */
export const MatchPlay: Story = {
  render: () => (
    <MockLeaderboard
      title="Match Play Leaderboard"
      description="Shows head-to-head matchups with results"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Match Play displays cards for each match showing the players,
          result (e.g., "3&2", "1 UP", "Halved"), and hole-by-hole stats.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<RoundLeaderboard
  roundId="round-uuid"
  gameType="match-play"
  isTeamRound={false}
/>`}
          </Text>
        </View>
      </View>
    </MockLeaderboard>
  ),
};

/**
 * Team round with Best Ball format
 */
export const TeamBestBall: Story = {
  render: () => (
    <MockLeaderboard
      title="Team Leaderboard (Best Ball)"
      description="Shows team rankings with member names"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Team rounds display team names with member names listed below.
          The handicap shown is the team average.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<RoundLeaderboard
  roundId="round-uuid"
  gameType="best-ball"
  isTeamRound={true}
/>`}
          </Text>
        </View>
      </View>
    </MockLeaderboard>
  ),
};

/**
 * Team round with Ambrose/Scramble format
 */
export const TeamAmbrose: Story = {
  render: () => (
    <MockLeaderboard
      title="Team Leaderboard (Ambrose)"
      description="Shows team rankings in Scramble format"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Ambrose (Scramble) rounds show combined team scores. Each team
          plays one ball with the best shot selected each time.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<RoundLeaderboard
  roundId="round-uuid"
  gameType="ambrose"
  isTeamRound={true}
/>`}
          </Text>
        </View>
      </View>
    </MockLeaderboard>
  ),
};

/**
 * With current user highlighting
 */
export const WithCurrentUser: Story = {
  render: () => (
    <MockLeaderboard
      title="Current User Highlighted"
      description="The current user's row is highlighted and shows 'You'"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          When currentUserId is provided, the matching row gets a highlighted
          background and displays "You" instead of the player name.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<RoundLeaderboard
  roundId="round-uuid"
  gameType="stableford"
  isTeamRound={false}
  currentUserId="current-user-uuid"
/>`}
          </Text>
        </View>
      </View>
    </MockLeaderboard>
  ),
};

/**
 * Auto-refresh disabled
 */
export const NoAutoRefresh: Story = {
  render: () => (
    <MockLeaderboard
      title="Auto-Refresh Disabled"
      description="Data is fetched once and not automatically updated"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Set autoRefresh to false to disable automatic polling.
          Useful for completed rounds or when manual refresh is preferred.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<RoundLeaderboard
  roundId="round-uuid"
  gameType="stableford"
  isTeamRound={false}
  autoRefresh={false}
/>`}
          </Text>
        </View>
      </View>
    </MockLeaderboard>
  ),
};

/**
 * Custom refresh interval
 */
export const CustomRefreshInterval: Story = {
  render: () => (
    <MockLeaderboard
      title="Custom Refresh Interval"
      description="Data updates every 60 seconds instead of default 30"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Customize the refresh interval for different use cases.
          Default is 30000ms (30 seconds).
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<RoundLeaderboard
  roundId="round-uuid"
  gameType="stableford"
  isTeamRound={false}
  refetchInterval={60000}
/>`}
          </Text>
        </View>
      </View>
    </MockLeaderboard>
  ),
};

/**
 * Custom empty state message
 */
export const CustomEmptyMessage: Story = {
  render: () => (
    <MockLeaderboard
      title="Custom Empty Message"
      description="Customized message when no scores are available"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Provide a custom message for the empty state that matches
          the context of your competition.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<RoundLeaderboard
  roundId="round-uuid"
  gameType="stableford"
  isTeamRound={false}
  emptyMessage="Round hasn't started yet. Check back at tee time!"
/>`}
          </Text>
        </View>
      </View>
    </MockLeaderboard>
  ),
};

/**
 * Loading state
 */
export const LoadingState: Story = {
  render: () => (
    <MockLeaderboard
      title="Loading State"
      description="Displayed while fetching leaderboard data"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          A loading spinner is shown while the component fetches data
          from the server. This includes initial load and refresh.
        </Text>
      </View>
    </MockLeaderboard>
  ),
};

/**
 * Error state
 */
export const ErrorState: Story = {
  render: () => (
    <MockLeaderboard
      title="Error State"
      description="Displayed when data fetch fails"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          When data loading fails, an error message is displayed with
          a retry button to attempt fetching again.
        </Text>
      </View>
    </MockLeaderboard>
  ),
};

/**
 * Empty state
 */
export const EmptyState: Story = {
  render: () => (
    <MockLeaderboard
      title="Empty State"
      description="Displayed when no scores have been submitted"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          When no players have submitted scores yet, a friendly message
          is shown explaining that scores will appear once submitted.
        </Text>
      </View>
    </MockLeaderboard>
  ),
};

/**
 * With test ID for testing
 */
export const WithTestID: Story = {
  render: () => (
    <MockLeaderboard
      title="With Test ID"
      description="Component with testID for automated testing"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          The testID prop enables automated testing by providing
          stable selectors for loading, error, and empty states.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {`<RoundLeaderboard
  roundId="round-uuid"
  gameType="stableford"
  isTeamRound={false}
  testID="round-leaderboard"
/>

// Test selectors:
// - round-leaderboard-loading
// - round-leaderboard-error
// - round-leaderboard-empty`}
          </Text>
        </View>
      </View>
    </MockLeaderboard>
  ),
};

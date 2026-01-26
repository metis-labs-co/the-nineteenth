/**
 * RoundCard Storybook Stories
 *
 * Stories demonstrating the various configurations of the RoundCard component
 * used to display round information in competition views.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Text, Alert } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { RoundCard } from './RoundCard';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof RoundCard> = {
  title: 'CompetitionWizard/RoundCard',
  component: RoundCard,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    roundNumber: { control: { type: 'number', min: 1, max: 10 } },
    status: {
      control: { type: 'select' },
      options: ['upcoming', 'in-progress', 'completed'],
    },
    gameType: {
      control: { type: 'select' },
      options: ['stableford', 'stroke', 'match-play', 'best-ball', 'scramble', 'shamble'],
    },
    hasStartedScoring: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof RoundCard>;

// ===========================================================================
// WRAPPER COMPONENT
// ===========================================================================

function CardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={wrapperStyles.container}>
      <View style={wrapperStyles.content}>{children}</View>
    </ScrollView>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: spacing.lg,
  },
});

// ===========================================================================
// BASIC STATUS STORIES
// ===========================================================================

/**
 * Default upcoming round
 */
export const Default: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-1"
        roundNumber={1}
        courseName="Royal Melbourne Golf Club"
        date="2025-01-15"
        teeTime="09:30:00"
        gameType="stableford"
        status="upcoming"
        onStartRound={(id) => Alert.alert('Start Round', `Starting round ${id}`)}
      />
    </CardWrapper>
  ),
};

/**
 * Upcoming round
 */
export const Upcoming: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-upcoming"
        roundNumber={1}
        courseName="Kingston Heath Golf Club"
        date="2025-02-01"
        teeTime="07:00:00"
        gameType="stableford"
        status="upcoming"
        onStartRound={(id) => console.log('Start round:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * In-progress round
 */
export const InProgress: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-in-progress"
        roundNumber={2}
        courseName="Victoria Golf Club"
        date="2025-01-20"
        teeTime="08:30:00"
        gameType="stroke"
        status="in-progress"
        onStartRound={(id) => console.log('Continue round:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * Completed round
 */
export const Completed: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-completed"
        roundNumber={3}
        courseName="Metropolitan Golf Club"
        date="2025-01-10"
        teeTime="14:00:00"
        gameType="match-play"
        status="completed"
        onViewScorecard={(id) => console.log('View scorecard:', id)}
      />
    </CardWrapper>
  ),
};

// ===========================================================================
// GAME TYPE STORIES
// ===========================================================================

/**
 * Stableford format
 */
export const GameTypeStableford: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-stableford"
        roundNumber={1}
        courseName="Royal Melbourne"
        date="2025-01-15"
        teeTime="09:00:00"
        gameType="stableford"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * Stroke Play format
 */
export const GameTypeStrokePlay: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-stroke"
        roundNumber={1}
        courseName="Kingston Heath"
        date="2025-01-15"
        teeTime="09:00:00"
        gameType="stroke"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * Match Play format
 */
export const GameTypeMatchPlay: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-match"
        roundNumber={1}
        courseName="Victoria Golf Club"
        date="2025-01-15"
        teeTime="09:00:00"
        gameType="match-play"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * Scramble format
 */
export const GameTypeScramble: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-scramble"
        roundNumber={1}
        courseName="Metropolitan GC"
        date="2025-01-15"
        teeTime="09:00:00"
        gameType="scramble"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * Best Ball format
 */
export const GameTypeBestBall: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-bestball"
        roundNumber={1}
        courseName="Peninsula Kingswood"
        date="2025-01-15"
        teeTime="09:00:00"
        gameType="best-ball"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * Scramble format
 */
export const GameTypeScramble: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-scramble"
        roundNumber={1}
        courseName="Commonwealth GC"
        date="2025-01-15"
        teeTime="09:00:00"
        gameType="scramble"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

// ===========================================================================
// DATE AND TIME STORIES
// ===========================================================================

/**
 * With tee time
 */
export const WithTeeTime: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-with-time"
        roundNumber={1}
        courseName="Royal Melbourne"
        date="2025-01-15"
        teeTime="06:30:00"
        gameType="stableford"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * Without tee time
 */
export const WithoutTeeTime: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-no-time"
        roundNumber={1}
        courseName="Royal Melbourne"
        date="2025-01-15"
        teeTime={null}
        gameType="stableford"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * Without date (TBC)
 */
export const WithoutDate: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-no-date"
        roundNumber={1}
        courseName="Royal Melbourne"
        date={null}
        gameType="stableford"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

// ===========================================================================
// HAS STARTED SCORING STORIES
// ===========================================================================

/**
 * Upcoming with scoring started (shows Continue Round)
 */
export const UpcomingWithScoringStarted: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-started"
        roundNumber={1}
        courseName="Royal Melbourne"
        date="2025-01-15"
        teeTime="09:30:00"
        gameType="stableford"
        status="upcoming"
        hasStartedScoring={true}
        onStartRound={(id) => console.log('Continue:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * Upcoming without scoring started (shows Start Round)
 */
export const UpcomingNotStarted: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-not-started"
        roundNumber={1}
        courseName="Royal Melbourne"
        date="2025-01-15"
        teeTime="09:30:00"
        gameType="stableford"
        status="upcoming"
        hasStartedScoring={false}
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

// ===========================================================================
// NO ACTION BUTTON STORIES
// ===========================================================================

/**
 * Upcoming without action (no button)
 */
export const UpcomingNoAction: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-no-action"
        roundNumber={1}
        courseName="Royal Melbourne"
        date="2025-01-15"
        teeTime="09:30:00"
        gameType="stableford"
        status="upcoming"
      />
    </CardWrapper>
  ),
};

/**
 * Completed without action (no button)
 */
export const CompletedNoAction: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-completed-no-action"
        roundNumber={1}
        courseName="Royal Melbourne"
        date="2025-01-15"
        teeTime="09:30:00"
        gameType="stableford"
        status="completed"
      />
    </CardWrapper>
  ),
};

// ===========================================================================
// PRESSABLE CARD STORIES
// ===========================================================================

/**
 * Pressable card
 */
export const Pressable: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-pressable"
        roundNumber={1}
        courseName="Royal Melbourne"
        date="2025-01-15"
        teeTime="09:30:00"
        gameType="stableford"
        status="upcoming"
        onPress={() => Alert.alert('Card Pressed', 'Navigate to round details')}
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * Not pressable card
 */
export const NotPressable: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-not-pressable"
        roundNumber={1}
        courseName="Royal Melbourne"
        date="2025-01-15"
        teeTime="09:30:00"
        gameType="stableford"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

// ===========================================================================
// MULTIPLE ROUNDS STORIES
// ===========================================================================

/**
 * Multiple rounds in a list
 */
export const MultipleRounds: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-1"
        roundNumber={1}
        courseName="Royal Melbourne"
        date="2025-01-15"
        teeTime="07:00:00"
        gameType="stableford"
        status="completed"
        onViewScorecard={(id) => console.log('View:', id)}
      />
      <RoundCard
        roundId="round-2"
        roundNumber={2}
        courseName="Kingston Heath"
        date="2025-01-20"
        teeTime="08:30:00"
        gameType="stroke"
        status="in-progress"
        onStartRound={(id) => console.log('Continue:', id)}
      />
      <RoundCard
        roundId="round-3"
        roundNumber={3}
        courseName="Victoria Golf Club"
        date="2025-01-25"
        teeTime="09:00:00"
        gameType="match-play"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
      <RoundCard
        roundId="round-4"
        roundNumber={4}
        courseName="Metropolitan GC"
        date={null}
        gameType="scramble"
        status="upcoming"
      />
    </CardWrapper>
  ),
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

/**
 * Long course name
 */
export const LongCourseName: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-long-name"
        roundNumber={1}
        courseName="The Royal and Ancient Golf Club of St Andrews - Old Course Championship Links"
        date="2025-01-15"
        teeTime="09:30:00"
        gameType="stableford"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * High round number
 */
export const HighRoundNumber: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-99"
        roundNumber={99}
        courseName="Royal Melbourne"
        date="2025-01-15"
        teeTime="09:30:00"
        gameType="stableford"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

/**
 * Special characters in course name
 */
export const SpecialCharacters: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        roundId="round-special"
        roundNumber={1}
        courseName="St. Andrew's (Old Course) #1 - Championship"
        date="2025-01-15"
        teeTime="09:30:00"
        gameType="stableford"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />
    </CardWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

/**
 * Use Case: Competition round list
 */
export const UseCaseCompetitionRounds: Story = {
  name: 'Use Case: Competition Rounds',
  render: () => (
    <CardWrapper>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
        Summer Championship 2025
      </Text>
      <RoundCard
        roundId="comp-round-1"
        roundNumber={1}
        courseName="Royal Melbourne West"
        date="2025-02-01"
        teeTime="07:00:00"
        gameType="stroke"
        status="completed"
        onViewScorecard={(id) => console.log('View:', id)}
        onPress={() => console.log('Navigate to round details')}
      />
      <RoundCard
        roundId="comp-round-2"
        roundNumber={2}
        courseName="Royal Melbourne East"
        date="2025-02-08"
        teeTime="07:00:00"
        gameType="stroke"
        status="in-progress"
        onStartRound={(id) => console.log('Continue:', id)}
        onPress={() => console.log('Navigate to round details')}
      />
      <RoundCard
        roundId="comp-round-3"
        roundNumber={3}
        courseName="Kingston Heath"
        date="2025-02-15"
        teeTime="07:00:00"
        gameType="stroke"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
        onPress={() => console.log('Navigate to round details')}
      />
    </CardWrapper>
  ),
};

/**
 * Use Case: Social golf day
 */
export const UseCaseSocialGolfDay: Story = {
  name: 'Use Case: Social Golf Day',
  render: () => (
    <CardWrapper>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
        Weekend Fourball
      </Text>
      <RoundCard
        roundId="social-round"
        roundNumber={1}
        courseName="Yarra Yarra Golf Club"
        date="2025-01-18"
        teeTime="10:00:00"
        gameType="best-ball"
        status="upcoming"
        onStartRound={(_id) => Alert.alert('Let\'s Go!', 'Starting your round at Yarra Yarra')}
        onPress={() => console.log('View round details')}
      />
    </CardWrapper>
  ),
};

/**
 * Use Case: Corporate event
 */
export const UseCaseCorporateEvent: Story = {
  name: 'Use Case: Corporate Event',
  render: () => (
    <CardWrapper>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
        Annual Corporate Golf Day
      </Text>
      <RoundCard
        roundId="corp-round"
        roundNumber={1}
        courseName="Commonwealth Golf Club"
        date="2025-03-15"
        teeTime="08:00:00"
        gameType="scramble"
        status="upcoming"
        onStartRound={(id) => console.log('Start team round:', id)}
        onPress={() => console.log('View event details')}
      />
    </CardWrapper>
  ),
};

// ===========================================================================
// ALL STATUSES COMPARISON
// ===========================================================================

/**
 * All statuses comparison
 */
export const AllStatusesComparison: Story = {
  name: 'All Statuses Comparison',
  render: () => (
    <CardWrapper>
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: spacing.md, color: '#666' }}>
        Upcoming
      </Text>
      <RoundCard
        roundId="status-upcoming"
        roundNumber={1}
        courseName="Royal Melbourne"
        date="2025-02-01"
        teeTime="07:00:00"
        gameType="stableford"
        status="upcoming"
        onStartRound={(id) => console.log('Start:', id)}
      />

      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: spacing.md, marginTop: spacing.lg, color: '#666' }}>
        In Progress
      </Text>
      <RoundCard
        roundId="status-in-progress"
        roundNumber={1}
        courseName="Kingston Heath"
        date="2025-01-20"
        teeTime="08:30:00"
        gameType="stroke"
        status="in-progress"
        onStartRound={(id) => console.log('Continue:', id)}
      />

      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: spacing.md, marginTop: spacing.lg, color: '#666' }}>
        Completed
      </Text>
      <RoundCard
        roundId="status-completed"
        roundNumber={1}
        courseName="Victoria Golf Club"
        date="2025-01-10"
        teeTime="09:00:00"
        gameType="match-play"
        status="completed"
        onViewScorecard={(id) => console.log('View:', id)}
      />
    </CardWrapper>
  ),
};

// ===========================================================================
// ALL GAME TYPES COMPARISON
// ===========================================================================

/**
 * All game types comparison
 */
export const AllGameTypesComparison: Story = {
  name: 'All Game Types Comparison',
  render: () => (
    <CardWrapper>
      {(['stableford', 'stroke', 'match-play', 'best-ball', 'scramble', 'shamble'] as const).map(
        (gameType, index) => (
          <RoundCard
            key={gameType}
            roundId={`game-type-${gameType}`}
            roundNumber={index + 1}
            courseName="Royal Melbourne"
            date="2025-01-15"
            teeTime="09:00:00"
            gameType={gameType}
            status="upcoming"
            onStartRound={(id) => console.log('Start:', id)}
          />
        )
      )}
    </CardWrapper>
  ),
};

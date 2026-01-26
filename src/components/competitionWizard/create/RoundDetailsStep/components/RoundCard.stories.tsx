/**
 * RoundCard Storybook Stories
 *
 * Stories demonstrating the various configurations of the RoundCard component
 * used in the competition wizard for configuring individual rounds.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { RoundCard } from './RoundCard';
import type { RoundCardProps } from '../types';
import type { RoundDetailsFormData } from '@/schemas/competition';
import type { TeeBox } from '@/types/database.types';
import { spacing } from '@/constants/theme';

// ===========================================================================
// MOCK DATA HELPERS
// ===========================================================================

const createMockRound = (overrides?: Partial<RoundDetailsFormData>): RoundDetailsFormData => ({
  courseId: '',
  courseName: '',
  date: '',
  teeTime: '',
  matchType: 'stableford',
  scoringPairsRequired: false,
  ...overrides,
});

const createMockTee = (overrides?: Partial<TeeBox>): TeeBox => ({
  name: 'Blue Tees',
  color: 'blue',
  totalYardage: 6500,
  courseRating: 72.5,
  slopeRating: 130,
  ...overrides,
});

const mockTees: TeeBox[] = [
  createMockTee({ name: 'Black Tees', color: 'black', totalYardage: 7200 }),
  createMockTee({ name: 'Blue Tees', color: 'blue', totalYardage: 6500 }),
  createMockTee({ name: 'White Tees', color: 'white', totalYardage: 6100 }),
  createMockTee({ name: 'Yellow Tees', color: 'yellow', totalYardage: 5700 }),
  createMockTee({ name: 'Red Tees', color: 'red', totalYardage: 5200 }),
];

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof RoundCard> = {
  title: 'CompetitionWizard/RoundDetailsStep/RoundCard',
  component: RoundCard,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    index: { control: { type: 'number', min: 0, max: 9 } },
    isRemovable: { control: 'boolean' },
    isPremium: { control: 'boolean' },
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
// INTERACTIVE WRAPPER
// ===========================================================================

function InteractiveRoundCard(
  props: Omit<RoundCardProps, 'onUpdate' | 'onRemove' | 'onOpenCourseModal' | 'onOpenTeeModal' | 'onOpenMatchTypeModal'>
) {
  const [round, setRound] = useState(props.round);

  const handleUpdate = (updates: Partial<RoundDetailsFormData>) => {
    setRound((prev) => ({ ...prev, ...updates }));
    console.log('Round updated:', updates);
  };

  return (
    <CardWrapper>
      <RoundCard
        {...props}
        round={round}
        onUpdate={handleUpdate}
        onRemove={() => console.log('Remove pressed')}
        onOpenCourseModal={() => console.log('Open course modal')}
        onOpenTeeModal={() => console.log('Open tee modal')}
        onOpenMatchTypeModal={() => console.log('Open match type modal')}
      />
      <View style={{ marginTop: spacing.md }}>
        <Text style={{ color: '#666', fontSize: 12 }}>
          Current state: {JSON.stringify(round, null, 2)}
        </Text>
      </View>
    </CardWrapper>
  );
}

// ===========================================================================
// DEFAULT STORIES
// ===========================================================================

/**
 * Default empty round card
 */
export const Default: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * Round 1 card
 */
export const Round1: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * Round 2 card
 */
export const Round2: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={1}
      errors={{}}
      isRemovable={true}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * Round 3 card
 */
export const Round3: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={2}
      errors={{}}
      isRemovable={true}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

// ===========================================================================
// COURSE SELECTION STORIES
// ===========================================================================

/**
 * With selected course
 */
export const WithCourseSelected: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({
        courseId: 'course-1',
        courseName: 'Royal Melbourne Golf Club',
      })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={mockTees}
      isPremium={false}
    />
  ),
};

/**
 * With long course name
 */
export const WithLongCourseName: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({
        courseId: 'course-1',
        courseName: 'The Metropolitan Golf Club - West Course Championship Layout',
      })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={mockTees}
      isPremium={false}
    />
  ),
};

/**
 * With course error
 */
export const WithCourseError: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={0}
      errors={{ course: 'Please select a course' }}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

// ===========================================================================
// TEE SELECTION STORIES
// ===========================================================================

/**
 * With tees available but none selected
 */
export const WithTeesAvailable: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({
        courseId: 'course-1',
        courseName: 'Kingston Heath Golf Club',
      })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={mockTees}
      isPremium={false}
    />
  ),
};

/**
 * With blue tees selected
 */
export const WithBlueTeeSelected: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({
        courseId: 'course-1',
        courseName: 'Kingston Heath Golf Club',
        selectedTee: {
          name: 'Blue Tees',
          color: 'blue',
          totalYardage: 6500,
        },
      })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={mockTees}
      isPremium={false}
    />
  ),
};

/**
 * With white tees selected (border for visibility)
 */
export const WithWhiteTeeSelected: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({
        courseId: 'course-1',
        courseName: 'Kingston Heath Golf Club',
        selectedTee: {
          name: 'White Tees',
          color: 'white',
          totalYardage: 6100,
        },
      })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={mockTees}
      isPremium={false}
    />
  ),
};

/**
 * With red tees selected
 */
export const WithRedTeeSelected: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({
        courseId: 'course-1',
        courseName: 'Kingston Heath Golf Club',
        selectedTee: {
          name: 'Red Tees',
          color: 'red',
          totalYardage: 5200,
        },
      })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={mockTees}
      isPremium={false}
    />
  ),
};

/**
 * With black tees selected
 */
export const WithBlackTeeSelected: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({
        courseId: 'course-1',
        courseName: 'Kingston Heath Golf Club',
        selectedTee: {
          name: 'Black Tees',
          color: 'black',
          totalYardage: 7200,
        },
      })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={mockTees}
      isPremium={false}
    />
  ),
};

// ===========================================================================
// DATE AND TIME STORIES
// ===========================================================================

/**
 * With date set
 */
export const WithDateSet: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({
        date: '15/01/2025',
      })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * With date and tee time set
 */
export const WithDateAndTeeTime: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({
        date: '15/01/2025',
        teeTime: '07:30',
      })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * With date error
 */
export const WithDateError: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={0}
      errors={{ date: 'Date is required' }}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

// ===========================================================================
// MATCH TYPE STORIES
// ===========================================================================

/**
 * Default Stableford
 */
export const MatchTypeStableford: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({ matchType: 'stableford' })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * Stroke Play
 */
export const MatchTypeStrokePlay: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({ matchType: 'stroke' })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * Match Play
 */
export const MatchTypeMatchPlay: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({ matchType: 'match-play' })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * Scramble
 */
export const MatchTypeScramble: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({ matchType: 'scramble' })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * Best Ball
 */
export const MatchTypeBestBall: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({ matchType: 'best-ball' })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * Scramble
 */
export const MatchTypeScramble: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({ matchType: 'scramble' })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

// ===========================================================================
// PREMIUM FEATURES STORIES
// ===========================================================================

/**
 * Premium user - scoring pairs toggle
 */
export const PremiumUser: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={true}
    />
  ),
};

/**
 * Premium user - scoring pairs enabled
 */
export const PremiumWithScoringPairs: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({ scoringPairsRequired: true })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={true}
    />
  ),
};

/**
 * Free user - scoring pairs locked
 */
export const FreeUserLocked: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

// ===========================================================================
// REMOVABLE STORIES
// ===========================================================================

/**
 * Not removable (first round)
 */
export const NotRemovable: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * Removable (additional round)
 */
export const Removable: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={1}
      errors={{}}
      isRemovable={true}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

// ===========================================================================
// ERROR STATES STORIES
// ===========================================================================

/**
 * Multiple errors
 */
export const MultipleErrors: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={0}
      errors={{
        course: 'Course is required',
        date: 'Date is required',
      }}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * All fields with errors
 */
export const AllFieldsError: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={0}
      errors={{
        course: 'Please select a course',
        date: 'Date is required',
        teeTime: 'Invalid tee time',
      }}
      isRemovable={false}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

// ===========================================================================
// FULLY POPULATED STORIES
// ===========================================================================

/**
 * Fully populated round (free user)
 */
export const FullyPopulatedFreeUser: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({
        courseId: 'course-1',
        courseName: 'Royal Melbourne Golf Club',
        date: '20/01/2025',
        teeTime: '08:00',
        matchType: 'stableford',
        scoringPairsRequired: false,
        selectedTee: {
          name: 'Blue Tees',
          color: 'blue',
          totalYardage: 6500,
        },
      })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={mockTees}
      isPremium={false}
    />
  ),
};

/**
 * Fully populated round (premium user)
 */
export const FullyPopulatedPremiumUser: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({
        courseId: 'course-1',
        courseName: 'Royal Melbourne Golf Club',
        date: '20/01/2025',
        teeTime: '08:00',
        matchType: 'stroke',
        scoringPairsRequired: true,
        selectedTee: {
          name: 'Black Tees',
          color: 'black',
          totalYardage: 7200,
        },
      })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={mockTees}
      isPremium={true}
    />
  ),
};

// ===========================================================================
// MULTIPLE ROUNDS STORIES
// ===========================================================================

/**
 * Multiple rounds in a competition
 */
export const MultipleRounds: Story = {
  render: () => (
    <CardWrapper>
      <RoundCard
        round={createMockRound({
          courseId: 'course-1',
          courseName: 'Royal Melbourne',
          date: '20/01/2025',
          matchType: 'stableford',
        })}
        index={0}
        errors={{}}
        isRemovable={false}
        availableTees={mockTees}
        isPremium={true}
        onUpdate={() => {}}
        onRemove={() => {}}
        onOpenCourseModal={() => {}}
        onOpenTeeModal={() => {}}
        onOpenMatchTypeModal={() => {}}
      />
      <RoundCard
        round={createMockRound({
          courseId: 'course-2',
          courseName: 'Kingston Heath',
          date: '21/01/2025',
          matchType: 'stroke',
        })}
        index={1}
        errors={{}}
        isRemovable={true}
        availableTees={mockTees}
        isPremium={true}
        onUpdate={() => {}}
        onRemove={() => {}}
        onOpenCourseModal={() => {}}
        onOpenTeeModal={() => {}}
        onOpenMatchTypeModal={() => {}}
      />
      <RoundCard
        round={createMockRound({
          courseId: 'course-3',
          courseName: 'Victoria Golf Club',
          date: '22/01/2025',
          matchType: 'match-play',
        })}
        index={2}
        errors={{}}
        isRemovable={true}
        availableTees={mockTees}
        isPremium={true}
        onUpdate={() => {}}
        onRemove={() => {}}
        onOpenCourseModal={() => {}}
        onOpenTeeModal={() => {}}
        onOpenMatchTypeModal={() => {}}
      />
    </CardWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

/**
 * Use Case: Setting up a weekend competition
 */
export const UseCaseWeekendCompetition: Story = {
  name: 'Use Case: Weekend Competition',
  render: () => (
    <CardWrapper>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
        Weekend Competition Setup
      </Text>
      <RoundCard
        round={createMockRound({
          courseId: 'course-1',
          courseName: 'Peninsula Kingswood',
          date: '25/01/2025',
          teeTime: '07:00',
          matchType: 'stableford',
          selectedTee: {
            name: 'White Tees',
            color: 'white',
            totalYardage: 6100,
          },
        })}
        index={0}
        errors={{}}
        isRemovable={false}
        availableTees={mockTees}
        isPremium={true}
        onUpdate={() => {}}
        onRemove={() => {}}
        onOpenCourseModal={() => {}}
        onOpenTeeModal={() => {}}
        onOpenMatchTypeModal={() => {}}
      />
    </CardWrapper>
  ),
};

/**
 * Use Case: Corporate event with multiple rounds
 */
export const UseCaseCorporateEvent: Story = {
  name: 'Use Case: Corporate Event',
  render: () => (
    <CardWrapper>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
        Corporate Golf Day
      </Text>
      <RoundCard
        round={createMockRound({
          courseId: 'course-1',
          courseName: 'The Metropolitan Golf Club',
          date: '15/02/2025',
          teeTime: '08:00',
          matchType: 'scramble',
          scoringPairsRequired: true,
          selectedTee: {
            name: 'Yellow Tees',
            color: 'yellow',
            totalYardage: 5700,
          },
        })}
        index={0}
        errors={{}}
        isRemovable={false}
        availableTees={mockTees}
        isPremium={true}
        onUpdate={() => {}}
        onRemove={() => {}}
        onOpenCourseModal={() => {}}
        onOpenTeeModal={() => {}}
        onOpenMatchTypeModal={() => {}}
      />
    </CardWrapper>
  ),
};

/**
 * Use Case: Match Play championship
 */
export const UseCaseMatchPlayChampionship: Story = {
  name: 'Use Case: Match Play Championship',
  render: () => (
    <CardWrapper>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
        Club Match Play Championship
      </Text>
      <RoundCard
        round={createMockRound({
          courseId: 'course-1',
          courseName: 'Commonwealth Golf Club',
          date: '01/03/2025',
          teeTime: '07:30',
          matchType: 'match-play',
          scoringPairsRequired: true,
          selectedTee: {
            name: 'Black Tees',
            color: 'black',
            totalYardage: 7200,
          },
        })}
        index={0}
        errors={{}}
        isRemovable={false}
        availableTees={mockTees}
        isPremium={true}
        onUpdate={() => {}}
        onRemove={() => {}}
        onOpenCourseModal={() => {}}
        onOpenTeeModal={() => {}}
        onOpenMatchTypeModal={() => {}}
      />
    </CardWrapper>
  ),
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

/**
 * Large round number
 */
export const LargeRoundNumber: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound()}
      index={99}
      errors={{}}
      isRemovable={true}
      availableTees={[]}
      isPremium={false}
    />
  ),
};

/**
 * Tee without yardage
 */
export const TeeWithoutYardage: Story = {
  render: () => (
    <InteractiveRoundCard
      round={createMockRound({
        courseId: 'course-1',
        courseName: 'Test Course',
        selectedTee: {
          name: 'Custom Tees',
          color: 'gold',
          totalYardage: undefined,
        },
      })}
      index={0}
      errors={{}}
      isRemovable={false}
      availableTees={mockTees}
      isPremium={false}
    />
  ),
};

/**
 * Empty state with all tee colors
 */
export const AllTeeColors: Story = {
  render: () => (
    <CardWrapper>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
        Different Tee Colors
      </Text>
      {['black', 'blue', 'white', 'yellow', 'red', 'gold', 'green'].map((color, idx) => (
        <View key={color} style={{ marginBottom: spacing.md }}>
          <RoundCard
            round={createMockRound({
              courseId: 'course-1',
              courseName: `Course ${idx + 1}`,
              selectedTee: {
                name: `${color.charAt(0).toUpperCase() + color.slice(1)} Tees`,
                color,
                totalYardage: 6000 + idx * 200,
              },
            })}
            index={idx}
            errors={{}}
            isRemovable={idx > 0}
            availableTees={mockTees}
            isPremium={true}
            onUpdate={() => {}}
            onRemove={() => {}}
            onOpenCourseModal={() => {}}
            onOpenTeeModal={() => {}}
            onOpenMatchTypeModal={() => {}}
          />
        </View>
      ))}
    </CardWrapper>
  ),
};

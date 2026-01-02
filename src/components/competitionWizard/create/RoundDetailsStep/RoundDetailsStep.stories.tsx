/**
 * RoundDetailsStep Storybook Stories
 *
 * Stories demonstrating the various configurations of the RoundDetailsStep component
 * used in the competition creation wizard for adding and configuring rounds.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import RoundDetailsStep from './index';
import type { RoundDetailsStepProps } from './types';
import type { RoundDetailsFormData } from '@/schemas/competition';
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

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof RoundDetailsStep> = {
  title: 'CompetitionWizard/RoundDetailsStep',
  component: RoundDetailsStep,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    maxRoundsPerCompetition: {
      control: { type: 'number', min: 1, max: 10 },
      description: 'Maximum number of rounds allowed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RoundDetailsStep>;

// ===========================================================================
// WRAPPER COMPONENT
// ===========================================================================

function StoryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View style={wrapperStyles.container}>
      <View style={wrapperStyles.content}>{children}</View>
    </View>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
});

// ===========================================================================
// INTERACTIVE WRAPPER
// ===========================================================================

interface InteractiveWrapperProps extends Partial<RoundDetailsStepProps> {
  initialRounds?: RoundDetailsFormData[];
}

function InteractiveWrapper({
  initialRounds = [createMockRound()],
  allowedGameTypes,
  maxRoundsPerCompetition,
  competitionStartDate,
}: InteractiveWrapperProps) {
  const [submittedData, setSubmittedData] = useState<RoundDetailsFormData[] | null>(null);

  const handleComplete = (data: RoundDetailsFormData[]) => {
    setSubmittedData(data);
    Alert.alert(
      'Form Submitted',
      `${data.length} round(s) configured:\n${data
        .map((r, i) => `Round ${i + 1}: ${r.courseName || 'No course'} - ${r.date || 'No date'}`)
        .join('\n')}`
    );
  };

  const handleBack = () => {
    Alert.alert('Back Pressed', 'Would navigate to previous step');
  };

  return (
    <StoryWrapper>
      <RoundDetailsStep
        initialData={initialRounds}
        allowedGameTypes={allowedGameTypes}
        maxRoundsPerCompetition={maxRoundsPerCompetition}
        competitionStartDate={competitionStartDate}
        onComplete={handleComplete}
        onBack={handleBack}
      />
      {submittedData && (
        <View style={submittedStyles.container}>
          <Text style={submittedStyles.title}>Last Submission:</Text>
          <Text style={submittedStyles.data}>{JSON.stringify(submittedData, null, 2)}</Text>
        </View>
      )}
    </StoryWrapper>
  );
}

const submittedStyles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: '#E8F5E9',
    borderTopWidth: 1,
    borderTopColor: '#C8E6C9',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  data: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  render: () => <InteractiveWrapper />,
};

export const EmptyState: Story = {
  render: () => <InteractiveWrapper initialRounds={[createMockRound()]} />,
  parameters: {
    docs: {
      description: {
        story: 'Initial state with a single empty round form.',
      },
    },
  },
};

export const WithDefaultDate: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[createMockRound()]}
      competitionStartDate="25/12/2025"
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Competition start date is passed to pre-fill round dates.',
      },
    },
  },
};

// ===========================================================================
// PRE-FILLED DATA STORIES
// ===========================================================================

export const SingleRoundWithCourse: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Royal Melbourne Golf Club',
          date: '15/01/2025',
          teeTime: '07:30',
          matchType: 'stableford',
        }),
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Single round with course already selected.',
      },
    },
  },
};

export const SingleRoundComplete: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Royal Melbourne Golf Club',
          date: '15/01/2025',
          teeTime: '07:30',
          matchType: 'stableford',
          selectedTee: {
            name: 'Blue Tees',
            color: 'blue',
            totalYardage: 6500,
            courseRating: 72.5,
            slopeRating: 130,
          },
        }),
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Single round with all details filled including tee selection.',
      },
    },
  },
};

export const MultipleRounds: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Royal Melbourne Golf Club',
          date: '15/01/2025',
          teeTime: '07:30',
          matchType: 'stableford',
        }),
        createMockRound({
          courseId: 'course-2',
          courseName: 'Kingston Heath Golf Club',
          date: '22/01/2025',
          teeTime: '08:00',
          matchType: 'stroke',
        }),
        createMockRound({
          courseId: 'course-3',
          courseName: 'Victoria Golf Club',
          date: '29/01/2025',
          teeTime: '07:45',
          matchType: 'stableford',
        }),
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple pre-configured rounds demonstrating a league format.',
      },
    },
  },
};

export const TenRounds: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={Array.from({ length: 10 }, (_, i) =>
        createMockRound({
          courseId: `course-${i + 1}`,
          courseName: `Golf Course ${i + 1}`,
          date: `${(i + 1).toString().padStart(2, '0')}/02/2025`,
          teeTime: '07:30',
          matchType: i % 2 === 0 ? 'stableford' : 'stroke',
        })
      )}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Maximum of 10 rounds showing a full season.',
      },
    },
  },
};

// ===========================================================================
// GAME TYPE STORIES
// ===========================================================================

export const StablefordOnly: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[createMockRound({ matchType: 'stableford' })]}
      allowedGameTypes={['stableford']}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Free tier - Only Stableford game type available.',
      },
    },
  },
};

export const BasicGameTypes: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[createMockRound()]}
      allowedGameTypes={['stableford', 'stroke', 'match-play']}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Social tier - Stableford, Stroke Play, and Match Play available.',
      },
    },
  },
};

export const AllGameTypes: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[createMockRound()]}
      allowedGameTypes={['stableford', 'stroke', 'match-play', 'ambrose', 'best-ball', 'scramble']}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Premium tier - All game types including team formats.',
      },
    },
  },
};

export const StrokePlayRound: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Royal Melbourne Golf Club',
          date: '15/01/2025',
          matchType: 'stroke',
        }),
      ]}
      allowedGameTypes={['stableford', 'stroke']}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Round configured for Stroke Play format.',
      },
    },
  },
};

export const MatchPlayRound: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Metropolitan Golf Club',
          date: '20/01/2025',
          matchType: 'match-play',
        }),
      ]}
      allowedGameTypes={['stableford', 'stroke', 'match-play']}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Round configured for Match Play format.',
      },
    },
  },
};

export const TeamFormatRounds: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Ambrose Challenge Course',
          date: '15/01/2025',
          matchType: 'ambrose',
        }),
        createMockRound({
          courseId: 'course-2',
          courseName: 'Best Ball Course',
          date: '22/01/2025',
          matchType: 'best-ball',
        }),
        createMockRound({
          courseId: 'course-3',
          courseName: 'Scramble Course',
          date: '29/01/2025',
          matchType: 'scramble',
        }),
      ]}
      allowedGameTypes={['stableford', 'ambrose', 'best-ball', 'scramble']}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Rounds with various team format game types.',
      },
    },
  },
};

// ===========================================================================
// ROUND LIMIT STORIES
// ===========================================================================

export const FreeTierLimit: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Round 1 Course',
          date: '15/01/2025',
        }),
        createMockRound({
          courseId: 'course-2',
          courseName: 'Round 2 Course',
          date: '22/01/2025',
        }),
      ]}
      maxRoundsPerCompetition={2}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Free tier limit of 2 rounds - shows upgrade message.',
      },
    },
  },
};

export const SocialTierLimit: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={Array.from({ length: 5 }, (_, i) =>
        createMockRound({
          courseId: `course-${i + 1}`,
          courseName: `Round ${i + 1} Course`,
          date: `${(i + 15).toString().padStart(2, '0')}/01/2025`,
        })
      )}
      maxRoundsPerCompetition={5}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Social tier limit of 5 rounds - shows upgrade message.',
      },
    },
  },
};

export const SingleRoundLimit: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[createMockRound()]}
      maxRoundsPerCompetition={1}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Limit of 1 round - shows singular "round" in message.',
      },
    },
  },
};

export const NoRoundLimit: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[createMockRound()]}
      maxRoundsPerCompetition={-1}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'No round limit (-1) - defaults to 10 rounds maximum.',
      },
    },
  },
};

export const PremiumUnlimited: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={Array.from({ length: 8 }, (_, i) =>
        createMockRound({
          courseId: `course-${i + 1}`,
          courseName: `Premium Round ${i + 1}`,
          date: `${(i + 1).toString().padStart(2, '0')}/03/2025`,
        })
      )}
      maxRoundsPerCompetition={10}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Premium tier with 10 round limit - can still add 2 more rounds.',
      },
    },
  },
};

// ===========================================================================
// SCORING PAIRS STORIES
// ===========================================================================

export const WithScoringPairs: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Championship Course',
          date: '15/01/2025',
          matchType: 'stableford',
          scoringPairsRequired: true,
        }),
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Round with scoring pairs enabled (Premium feature).',
      },
    },
  },
};

// ===========================================================================
// TEE SELECTION STORIES
// ===========================================================================

export const WithTeeSelected: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Royal Melbourne Golf Club',
          date: '15/01/2025',
          matchType: 'stableford',
          selectedTee: {
            name: 'Black Tees',
            color: 'black',
            totalYardage: 7200,
            courseRating: 74.5,
            slopeRating: 140,
          },
        }),
        createMockRound({
          courseId: 'course-2',
          courseName: 'Kingston Heath Golf Club',
          date: '22/01/2025',
          matchType: 'stroke',
          selectedTee: {
            name: 'Blue Tees',
            color: 'blue',
            totalYardage: 6500,
            courseRating: 72.5,
            slopeRating: 130,
          },
        }),
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Rounds with different tee selections.',
      },
    },
  },
};

export const MultipleTeeColors: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Test Course 1',
          date: '15/01/2025',
          selectedTee: { name: 'Black Tees', color: 'black', totalYardage: 7200 },
        }),
        createMockRound({
          courseId: 'course-2',
          courseName: 'Test Course 2',
          date: '16/01/2025',
          selectedTee: { name: 'Blue Tees', color: 'blue', totalYardage: 6500 },
        }),
        createMockRound({
          courseId: 'course-3',
          courseName: 'Test Course 3',
          date: '17/01/2025',
          selectedTee: { name: 'White Tees', color: 'white', totalYardage: 6100 },
        }),
        createMockRound({
          courseId: 'course-4',
          courseName: 'Test Course 4',
          date: '18/01/2025',
          selectedTee: { name: 'Yellow Tees', color: 'yellow', totalYardage: 5700 },
        }),
        createMockRound({
          courseId: 'course-5',
          courseName: 'Test Course 5',
          date: '19/01/2025',
          selectedTee: { name: 'Red Tees', color: 'red', totalYardage: 5200 },
        }),
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Rounds with various tee color selections.',
      },
    },
  },
};

// ===========================================================================
// MIXED CONFIGURATIONS STORIES
// ===========================================================================

export const LeagueCompetition: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Royal Melbourne - West',
          date: '05/01/2025',
          teeTime: '07:00',
          matchType: 'stableford',
          selectedTee: { name: 'Blue Tees', color: 'blue', totalYardage: 6500 },
        }),
        createMockRound({
          courseId: 'course-2',
          courseName: 'Kingston Heath',
          date: '19/01/2025',
          teeTime: '07:30',
          matchType: 'stableford',
          selectedTee: { name: 'Blue Tees', color: 'blue', totalYardage: 6400 },
        }),
        createMockRound({
          courseId: 'course-3',
          courseName: 'Victoria Golf Club',
          date: '02/02/2025',
          teeTime: '07:00',
          matchType: 'stableford',
          selectedTee: { name: 'Blue Tees', color: 'blue', totalYardage: 6600 },
        }),
        createMockRound({
          courseId: 'course-4',
          courseName: 'Metropolitan',
          date: '16/02/2025',
          teeTime: '07:30',
          matchType: 'stableford',
          selectedTee: { name: 'Blue Tees', color: 'blue', totalYardage: 6550 },
        }),
      ]}
      maxRoundsPerCompetition={10}
      allowedGameTypes={['stableford', 'stroke']}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'A typical league competition with 4 rounds on different courses.',
      },
    },
  },
};

export const CorporateEvent: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Corporate Golf Club',
          date: '20/03/2025',
          teeTime: '08:00',
          matchType: 'ambrose',
          scoringPairsRequired: false,
          selectedTee: { name: 'White Tees', color: 'white', totalYardage: 6100 },
        }),
      ]}
      maxRoundsPerCompetition={1}
      allowedGameTypes={['stableford', 'ambrose', 'scramble']}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Single-round corporate event with Ambrose format.',
      },
    },
  },
};

export const WeekendTrip: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Barnbougle Dunes',
          date: '10/04/2025',
          teeTime: '08:00',
          matchType: 'stroke',
        }),
        createMockRound({
          courseId: 'course-2',
          courseName: 'Lost Farm',
          date: '11/04/2025',
          teeTime: '07:30',
          matchType: 'stableford',
        }),
        createMockRound({
          courseId: 'course-1',
          courseName: 'Barnbougle Dunes',
          date: '12/04/2025',
          teeTime: '08:30',
          matchType: 'match-play',
        }),
      ]}
      allowedGameTypes={['stableford', 'stroke', 'match-play']}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'A golf trip with mixed formats across multiple courses.',
      },
    },
  },
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const PartiallyFilledRounds: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Complete Round',
          date: '15/01/2025',
          teeTime: '07:30',
          matchType: 'stableford',
          selectedTee: { name: 'Blue Tees', color: 'blue' },
        }),
        createMockRound({
          courseName: 'Course Only - No Date',
          courseId: 'course-2',
        }),
        createMockRound({
          date: '22/01/2025',
          // No course selected
        }),
        createMockRound(), // Empty round
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Mixed state with some complete, some partial, and some empty rounds.',
      },
    },
  },
};

export const LongCourseNames: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName:
            'The Royal Melbourne Golf Club - West Course Championship Tees',
          date: '15/01/2025',
        }),
        createMockRound({
          courseId: 'course-2',
          courseName:
            'New South Wales Golf Club @ La Perouse Championship Links',
          date: '22/01/2025',
        }),
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Handling of very long course names.',
      },
    },
  },
};

export const NoTeeTimeSet: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[
        createMockRound({
          courseId: 'course-1',
          courseName: 'Royal Melbourne',
          date: '15/01/2025',
          teeTime: '', // No tee time
          matchType: 'stableford',
        }),
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Round with date but no tee time set (optional field).',
      },
    },
  },
};

// ===========================================================================
// INTERACTION DEMONSTRATION
// ===========================================================================

export const InteractiveDemo: Story = {
  render: () => (
    <InteractiveWrapper
      initialRounds={[createMockRound()]}
      maxRoundsPerCompetition={5}
      allowedGameTypes={['stableford', 'stroke', 'match-play']}
      competitionStartDate="01/02/2025"
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Fully interactive demo - try selecting courses, changing dates, and adding/removing rounds.',
      },
    },
  },
};

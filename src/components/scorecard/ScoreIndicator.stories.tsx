/**
 * ScoreIndicator Storybook Stories
 *
 * Visual stories for the ScoreIndicator component showing all score
 * types and visual indicators based on performance relative to par.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { ScoreIndicator } from './ScoreIndicator';
import { spacing, typography } from '@/constants/theme';

// ===========================================================================
// META CONFIGURATION
// ===========================================================================

const meta: Meta<typeof ScoreIndicator> = {
  title: 'Scorecard/ScoreIndicator',
  component: ScoreIndicator,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <View style={decoratorStyles.container}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    strokes: {
      control: { type: 'number', min: 0, max: 15 },
      description: 'Number of strokes for the hole',
    },
    par: {
      control: { type: 'number', min: 3, max: 6 },
      description: 'Par for the hole',
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
      description: 'Size variant of the indicator',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ScoreIndicator>;

const decoratorStyles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    minHeight: 100,
  },
});

// ===========================================================================
// ROW HELPER COMPONENT
// ===========================================================================

interface ScoreRowProps {
  label: string;
  strokes: number | undefined;
  par: number;
  size?: 'small' | 'medium' | 'large';
}

function ScoreRow({ label, strokes, par, size = 'medium' }: ScoreRowProps) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <ScoreIndicator strokes={strokes} par={par} size={size} />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    ...typography.body,
    marginRight: spacing.md,
  },
});

// ===========================================================================
// BASIC STORIES - SCORE TYPES
// ===========================================================================

export const Default: Story = {
  args: {
    strokes: 4,
    par: 4,
    size: 'medium',
  },
};

export const NoScore: Story = {
  args: {
    strokes: undefined,
    par: 4,
    size: 'medium',
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays a dash "-" when no score has been entered.',
      },
    },
  },
};

export const Pickup: Story = {
  args: {
    strokes: 10,
    par: 4,
    size: 'medium',
  },
  parameters: {
    docs: {
      description: {
        story: 'Displays a red "P" for pickup scores (10 or more strokes).',
      },
    },
  },
};

export const Eagle: Story = {
  args: {
    strokes: 2,
    par: 4,
    size: 'medium',
  },
  parameters: {
    docs: {
      description: {
        story: 'Double circle indicator for eagle (2 under par) or better.',
      },
    },
  },
};

export const Birdie: Story = {
  args: {
    strokes: 3,
    par: 4,
    size: 'medium',
  },
  parameters: {
    docs: {
      description: {
        story: 'Single circle indicator for birdie (1 under par).',
      },
    },
  },
};

export const Par: Story = {
  args: {
    strokes: 4,
    par: 4,
    size: 'medium',
  },
  parameters: {
    docs: {
      description: {
        story: 'Plain number with no indicator for par.',
      },
    },
  },
};

export const Bogey: Story = {
  args: {
    strokes: 5,
    par: 4,
    size: 'medium',
  },
  parameters: {
    docs: {
      description: {
        story: 'Single square indicator for bogey (1 over par).',
      },
    },
  },
};

export const DoubleBogey: Story = {
  args: {
    strokes: 6,
    par: 4,
    size: 'medium',
  },
  parameters: {
    docs: {
      description: {
        story: 'Double square indicator for double bogey (2 over par) or worse.',
      },
    },
  },
};

export const TripleBogey: Story = {
  args: {
    strokes: 7,
    par: 4,
    size: 'medium',
  },
  parameters: {
    docs: {
      description: {
        story: 'Double square indicator for triple bogey or worse (still 2+ over par).',
      },
    },
  },
};

// ===========================================================================
// SIZE VARIANTS
// ===========================================================================

export const SizeSmall: Story = {
  args: {
    strokes: 3,
    par: 4,
    size: 'small',
  },
  parameters: {
    docs: {
      description: {
        story: 'Small size variant (22px inner, 28px outer, 12px font).',
      },
    },
  },
};

export const SizeMedium: Story = {
  args: {
    strokes: 3,
    par: 4,
    size: 'medium',
  },
  parameters: {
    docs: {
      description: {
        story: 'Medium size variant - default (28px inner, 34px outer, 14px font).',
      },
    },
  },
};

export const SizeLarge: Story = {
  args: {
    strokes: 3,
    par: 4,
    size: 'large',
  },
  parameters: {
    docs: {
      description: {
        story: 'Large size variant (32px inner, 40px outer, 16px font).',
      },
    },
  },
};

// ===========================================================================
// PAR 3 HOLE STORIES
// ===========================================================================

export const Par3HoleInOne: Story = {
  args: {
    strokes: 1,
    par: 3,
    size: 'medium',
  },
  name: 'Par 3 - Hole in One (Eagle)',
  parameters: {
    docs: {
      description: {
        story: 'Hole-in-one on a par 3 is 2 under par (eagle) - shows double circle.',
      },
    },
  },
};

export const Par3Birdie: Story = {
  args: {
    strokes: 2,
    par: 3,
    size: 'medium',
  },
  name: 'Par 3 - Birdie',
};

export const Par3Par: Story = {
  args: {
    strokes: 3,
    par: 3,
    size: 'medium',
  },
  name: 'Par 3 - Par',
};

export const Par3Bogey: Story = {
  args: {
    strokes: 4,
    par: 3,
    size: 'medium',
  },
  name: 'Par 3 - Bogey',
};

export const Par3DoubleBogey: Story = {
  args: {
    strokes: 5,
    par: 3,
    size: 'medium',
  },
  name: 'Par 3 - Double Bogey',
};

// ===========================================================================
// PAR 4 HOLE STORIES
// ===========================================================================

export const Par4Albatross: Story = {
  args: {
    strokes: 1,
    par: 4,
    size: 'medium',
  },
  name: 'Par 4 - Hole in One (Albatross)',
  parameters: {
    docs: {
      description: {
        story: 'Hole-in-one on a par 4 is 3 under par (albatross/double eagle).',
      },
    },
  },
};

export const Par4Eagle: Story = {
  args: {
    strokes: 2,
    par: 4,
    size: 'medium',
  },
  name: 'Par 4 - Eagle',
};

export const Par4Birdie: Story = {
  args: {
    strokes: 3,
    par: 4,
    size: 'medium',
  },
  name: 'Par 4 - Birdie',
};

export const Par4Par: Story = {
  args: {
    strokes: 4,
    par: 4,
    size: 'medium',
  },
  name: 'Par 4 - Par',
};

export const Par4Bogey: Story = {
  args: {
    strokes: 5,
    par: 4,
    size: 'medium',
  },
  name: 'Par 4 - Bogey',
};

export const Par4DoubleBogey: Story = {
  args: {
    strokes: 6,
    par: 4,
    size: 'medium',
  },
  name: 'Par 4 - Double Bogey',
};

// ===========================================================================
// PAR 5 HOLE STORIES
// ===========================================================================

export const Par5Condor: Story = {
  args: {
    strokes: 1,
    par: 5,
    size: 'medium',
  },
  name: 'Par 5 - Condor (4 under)',
  parameters: {
    docs: {
      description: {
        story: 'Hole-in-one on a par 5 is 4 under par (condor) - extremely rare!',
      },
    },
  },
};

export const Par5Albatross: Story = {
  args: {
    strokes: 2,
    par: 5,
    size: 'medium',
  },
  name: 'Par 5 - Albatross',
};

export const Par5Eagle: Story = {
  args: {
    strokes: 3,
    par: 5,
    size: 'medium',
  },
  name: 'Par 5 - Eagle',
};

export const Par5Birdie: Story = {
  args: {
    strokes: 4,
    par: 5,
    size: 'medium',
  },
  name: 'Par 5 - Birdie',
};

export const Par5Par: Story = {
  args: {
    strokes: 5,
    par: 5,
    size: 'medium',
  },
  name: 'Par 5 - Par',
};

export const Par5Bogey: Story = {
  args: {
    strokes: 6,
    par: 5,
    size: 'medium',
  },
  name: 'Par 5 - Bogey',
};

export const Par5DoubleBogey: Story = {
  args: {
    strokes: 7,
    par: 5,
    size: 'medium',
  },
  name: 'Par 5 - Double Bogey',
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const ScoreOfNine: Story = {
  args: {
    strokes: 9,
    par: 4,
    size: 'medium',
  },
  name: 'Score of 9 (Just Below Pickup)',
  parameters: {
    docs: {
      description: {
        story: 'Score of 9 still shows as double bogey, not pickup (threshold is 10).',
      },
    },
  },
};

export const ZeroStrokes: Story = {
  args: {
    strokes: 0,
    par: 4,
    size: 'medium',
  },
  name: 'Zero Strokes (Shows Dash)',
  parameters: {
    docs: {
      description: {
        story: 'Zero strokes treated as no score, displays dash.',
      },
    },
  },
};

export const HighPickupScore: Story = {
  args: {
    strokes: 15,
    par: 4,
    size: 'medium',
  },
  name: 'High Pickup Score (15)',
  parameters: {
    docs: {
      description: {
        story: 'Any score >= 10 shows as pickup "P".',
      },
    },
  },
};

// ===========================================================================
// COMPARISON STORIES
// ===========================================================================

export const AllScoreTypes: Story = {
  render: () => (
    <View style={comparisonStyles.container}>
      <Text style={comparisonStyles.title}>All Score Types (Par 4)</Text>
      <ScoreRow label="No Score" strokes={undefined} par={4} />
      <ScoreRow label="Eagle (2)" strokes={2} par={4} />
      <ScoreRow label="Birdie (3)" strokes={3} par={4} />
      <ScoreRow label="Par (4)" strokes={4} par={4} />
      <ScoreRow label="Bogey (5)" strokes={5} par={4} />
      <ScoreRow label="Double (6)" strokes={6} par={4} />
      <ScoreRow label="Triple (7)" strokes={7} par={4} />
      <ScoreRow label="Pickup (10)" strokes={10} par={4} />
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comparison of all score types on a par 4 hole.',
      },
    },
  },
};

export const AllSizeComparison: Story = {
  render: () => (
    <View style={comparisonStyles.container}>
      <Text style={comparisonStyles.title}>Size Comparison (Birdie)</Text>
      <View style={comparisonStyles.sizeRow}>
        <View style={comparisonStyles.sizeItem}>
          <Text style={comparisonStyles.sizeLabel}>Small</Text>
          <ScoreIndicator strokes={3} par={4} size="small" />
        </View>
        <View style={comparisonStyles.sizeItem}>
          <Text style={comparisonStyles.sizeLabel}>Medium</Text>
          <ScoreIndicator strokes={3} par={4} size="medium" />
        </View>
        <View style={comparisonStyles.sizeItem}>
          <Text style={comparisonStyles.sizeLabel}>Large</Text>
          <ScoreIndicator strokes={3} par={4} size="large" />
        </View>
      </View>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comparison of all three size variants.',
      },
    },
  },
};

export const AllSizesAllTypes: Story = {
  render: () => (
    <View style={comparisonStyles.container}>
      <Text style={comparisonStyles.title}>All Sizes × All Types</Text>
      <View style={comparisonStyles.grid}>
        {/* Header row */}
        <View style={comparisonStyles.gridRow}>
          <Text style={[comparisonStyles.gridCell, comparisonStyles.headerCell]}>Type</Text>
          <Text style={[comparisonStyles.gridCell, comparisonStyles.headerCell]}>Small</Text>
          <Text style={[comparisonStyles.gridCell, comparisonStyles.headerCell]}>Medium</Text>
          <Text style={[comparisonStyles.gridCell, comparisonStyles.headerCell]}>Large</Text>
        </View>
        {/* Eagle row */}
        <View style={comparisonStyles.gridRow}>
          <Text style={comparisonStyles.gridCell}>Eagle</Text>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={2} par={4} size="small" />
          </View>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={2} par={4} size="medium" />
          </View>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={2} par={4} size="large" />
          </View>
        </View>
        {/* Birdie row */}
        <View style={comparisonStyles.gridRow}>
          <Text style={comparisonStyles.gridCell}>Birdie</Text>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={3} par={4} size="small" />
          </View>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={3} par={4} size="medium" />
          </View>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={3} par={4} size="large" />
          </View>
        </View>
        {/* Par row */}
        <View style={comparisonStyles.gridRow}>
          <Text style={comparisonStyles.gridCell}>Par</Text>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={4} par={4} size="small" />
          </View>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={4} par={4} size="medium" />
          </View>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={4} par={4} size="large" />
          </View>
        </View>
        {/* Bogey row */}
        <View style={comparisonStyles.gridRow}>
          <Text style={comparisonStyles.gridCell}>Bogey</Text>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={5} par={4} size="small" />
          </View>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={5} par={4} size="medium" />
          </View>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={5} par={4} size="large" />
          </View>
        </View>
        {/* Double Bogey row */}
        <View style={comparisonStyles.gridRow}>
          <Text style={comparisonStyles.gridCell}>Double</Text>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={6} par={4} size="small" />
          </View>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={6} par={4} size="medium" />
          </View>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={6} par={4} size="large" />
          </View>
        </View>
        {/* Pickup row */}
        <View style={comparisonStyles.gridRow}>
          <Text style={comparisonStyles.gridCell}>Pickup</Text>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={10} par={4} size="small" />
          </View>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={10} par={4} size="medium" />
          </View>
          <View style={comparisonStyles.gridCell}>
            <ScoreIndicator strokes={10} par={4} size="large" />
          </View>
        </View>
      </View>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete grid showing all size variants for all score types.',
      },
    },
  },
};

export const ParComparison: Story = {
  render: () => (
    <View style={comparisonStyles.container}>
      <Text style={comparisonStyles.title}>Same Score, Different Pars</Text>
      <Text style={comparisonStyles.subtitle}>Score of 3 strokes:</Text>
      <View style={comparisonStyles.sizeRow}>
        <View style={comparisonStyles.sizeItem}>
          <Text style={comparisonStyles.sizeLabel}>Par 3 (Par)</Text>
          <ScoreIndicator strokes={3} par={3} />
        </View>
        <View style={comparisonStyles.sizeItem}>
          <Text style={comparisonStyles.sizeLabel}>Par 4 (Birdie)</Text>
          <ScoreIndicator strokes={3} par={4} />
        </View>
        <View style={comparisonStyles.sizeItem}>
          <Text style={comparisonStyles.sizeLabel}>Par 5 (Eagle)</Text>
          <ScoreIndicator strokes={3} par={5} />
        </View>
      </View>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows how the same score (3) displays differently based on hole par.',
      },
    },
  },
};

export const ScorecardSimulation: Story = {
  render: () => (
    <View style={comparisonStyles.container}>
      <Text style={comparisonStyles.title}>Sample Front 9 Scores</Text>
      <View style={comparisonStyles.scorecardRow}>
        {[
          { strokes: 4, par: 4 }, // Par
          { strokes: 3, par: 3 }, // Par
          { strokes: 5, par: 4 }, // Bogey
          { strokes: 2, par: 3 }, // Birdie
          { strokes: 6, par: 5 }, // Bogey
          { strokes: undefined, par: 4 }, // No score
          { strokes: 3, par: 4 }, // Birdie
          { strokes: 4, par: 3 }, // Bogey
          { strokes: 4, par: 5 }, // Birdie
        ].map((score, index) => (
          <View key={index} style={comparisonStyles.scorecardCell}>
            <Text style={comparisonStyles.holeNumber}>{index + 1}</Text>
            <ScoreIndicator strokes={score.strokes} par={score.par} size="small" />
          </View>
        ))}
      </View>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Simulates how scores would appear in a row on a scorecard.',
      },
    },
  },
};

const comparisonStyles = StyleSheet.create({
  container: {
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 300,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.sm,
    color: '#666',
  },
  sizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.sm,
  },
  sizeItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  sizeLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
    color: '#666',
  },
  grid: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: spacing.xs,
  },
  gridCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    ...typography.body,
  },
  headerCell: {
    fontWeight: 'bold',
  },
  scorecardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  scorecardCell: {
    alignItems: 'center',
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    minWidth: 44,
  },
  holeNumber: {
    ...typography.caption,
    color: '#666',
    marginBottom: 2,
  },
});

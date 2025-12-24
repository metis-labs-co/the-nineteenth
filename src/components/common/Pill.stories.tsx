/**
 * Pill Storybook Stories
 *
 * Stories demonstrating the various configurations of the Pill component.
 * Shows size variants, color variants, filled/unfilled states, and use cases.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { Pill, PillProps, PillSize, PillVariant } from './Pill';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof Pill> = {
  title: 'Common/Pill',
  component: Pill,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    label: { control: 'text' },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: { type: 'select' },
      options: [
        'default',
        'primary',
        'success',
        'warning',
        'error',
        'info',
        'birdie',
        'par',
        'bogey',
        'doubleBogey',
      ],
    },
    filled: { control: 'boolean' },
    accessibilityLabel: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Pill>;

// ===========================================================================
// WRAPPER COMPONENTS
// ===========================================================================

function StoryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={wrapperStyles.container}>
      <View style={wrapperStyles.content}>{children}</View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={wrapperStyles.section}>
      <Text style={wrapperStyles.sectionTitle}>{title}</Text>
      <View style={wrapperStyles.sectionContent}>{children}</View>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={wrapperStyles.row}>{children}</View>;
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.sm,
  },
  sectionContent: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    label: 'Default Pill',
  },
};

export const Primary: Story = {
  args: {
    label: 'Primary',
    variant: 'primary',
  },
};

export const Success: Story = {
  args: {
    label: 'Success',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    label: 'Warning',
    variant: 'warning',
  },
};

export const Error: Story = {
  args: {
    label: 'Error',
    variant: 'error',
  },
};

export const Info: Story = {
  args: {
    label: 'Info',
    variant: 'info',
  },
};

// ===========================================================================
// SIZE STORIES
// ===========================================================================

export const SizeSmall: Story = {
  args: {
    label: 'Small',
    size: 'sm',
  },
};

export const SizeMedium: Story = {
  args: {
    label: 'Medium',
    size: 'md',
  },
};

export const SizeLarge: Story = {
  args: {
    label: 'Large',
    size: 'lg',
  },
};

export const AllSizes: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Size Comparison">
        <Row>
          <Pill label="Small" size="sm" />
          <Pill label="Medium" size="md" />
          <Pill label="Large" size="lg" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// FILLED STORIES
// ===========================================================================

export const FilledPrimary: Story = {
  args: {
    label: 'Filled Primary',
    variant: 'primary',
    filled: true,
  },
};

export const FilledSuccess: Story = {
  args: {
    label: 'Active',
    variant: 'success',
    filled: true,
  },
};

export const FilledWarning: Story = {
  args: {
    label: 'Pending',
    variant: 'warning',
    filled: true,
  },
};

export const FilledError: Story = {
  args: {
    label: 'Failed',
    variant: 'error',
    filled: true,
  },
};

export const FilledVsUnfilled: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Unfilled (Default)">
        <Row>
          <Pill label="Primary" variant="primary" />
          <Pill label="Success" variant="success" />
          <Pill label="Warning" variant="warning" />
          <Pill label="Error" variant="error" />
          <Pill label="Info" variant="info" />
        </Row>
      </Section>
      <Section title="Filled">
        <Row>
          <Pill label="Primary" variant="primary" filled />
          <Pill label="Success" variant="success" filled />
          <Pill label="Warning" variant="warning" filled />
          <Pill label="Error" variant="error" filled />
          <Pill label="Info" variant="info" filled />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// GOLF SCORE STORIES
// ===========================================================================

export const GolfBirdie: Story = {
  args: {
    label: 'Birdie',
    variant: 'birdie',
    filled: true,
  },
};

export const GolfPar: Story = {
  args: {
    label: 'Par',
    variant: 'par',
    filled: true,
  },
};

export const GolfBogey: Story = {
  args: {
    label: 'Bogey',
    variant: 'bogey',
    filled: true,
  },
};

export const GolfDoubleBogey: Story = {
  args: {
    label: 'Double',
    variant: 'doubleBogey',
    filled: true,
  },
};

export const GolfScoreVariants: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Golf Score Pills - Unfilled">
        <Row>
          <Pill label="Birdie" variant="birdie" />
          <Pill label="Par" variant="par" />
          <Pill label="Bogey" variant="bogey" />
          <Pill label="Double" variant="doubleBogey" />
        </Row>
      </Section>
      <Section title="Golf Score Pills - Filled">
        <Row>
          <Pill label="Birdie" variant="birdie" filled />
          <Pill label="Par" variant="par" filled />
          <Pill label="Bogey" variant="bogey" filled />
          <Pill label="Double" variant="doubleBogey" filled />
        </Row>
      </Section>
      <Section title="Score Indicators">
        <Row>
          <Pill label="-2" variant="birdie" filled size="sm" />
          <Pill label="-1" variant="birdie" filled size="sm" />
          <Pill label="E" variant="par" filled size="sm" />
          <Pill label="+1" variant="bogey" filled size="sm" />
          <Pill label="+2" variant="doubleBogey" filled size="sm" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ALL VARIANTS STORIES
// ===========================================================================

export const AllVariants: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="All Variants - Unfilled">
        <Row>
          <Pill label="Default" variant="default" />
          <Pill label="Primary" variant="primary" />
          <Pill label="Success" variant="success" />
          <Pill label="Warning" variant="warning" />
          <Pill label="Error" variant="error" />
          <Pill label="Info" variant="info" />
        </Row>
        <Row>
          <Pill label="Birdie" variant="birdie" />
          <Pill label="Par" variant="par" />
          <Pill label="Bogey" variant="bogey" />
          <Pill label="Double" variant="doubleBogey" />
        </Row>
      </Section>
      <Section title="All Variants - Filled">
        <Row>
          <Pill label="Default" variant="default" filled />
          <Pill label="Primary" variant="primary" filled />
          <Pill label="Success" variant="success" filled />
          <Pill label="Warning" variant="warning" filled />
          <Pill label="Error" variant="error" filled />
          <Pill label="Info" variant="info" filled />
        </Row>
        <Row>
          <Pill label="Birdie" variant="birdie" filled />
          <Pill label="Par" variant="par" filled />
          <Pill label="Bogey" variant="bogey" filled />
          <Pill label="Double" variant="doubleBogey" filled />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

export const RoundIndicator: Story = {
  args: {
    label: 'Round 2 of 4',
  },
};

export const StatusPills: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Status">
        <Row>
          <Pill label="Upcoming" variant="info" />
          <Pill label="In Progress" variant="warning" filled />
          <Pill label="Completed" variant="success" filled />
          <Pill label="Cancelled" variant="error" />
        </Row>
      </Section>
      <Section title="Round Status">
        <Row>
          <Pill label="Draft" variant="default" />
          <Pill label="Ready" variant="primary" />
          <Pill label="Active" variant="success" filled />
          <Pill label="Finalized" variant="success" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const GameTypeLabels: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Game Types">
        <Row>
          <Pill label="Stableford" variant="primary" />
          <Pill label="Stroke Play" variant="primary" />
          <Pill label="Match Play" variant="primary" />
        </Row>
      </Section>
      <Section title="Team Formats">
        <Row>
          <Pill label="Ambrose" variant="info" />
          <Pill label="Best Ball" variant="info" />
          <Pill label="Foursome" variant="info" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const PlayerInfo: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Player Details">
        <Row>
          <Pill label="HC: 12" variant="info" size="sm" />
          <Pill label="8 Players" variant="default" size="sm" />
          <Pill label="Group A" variant="primary" size="sm" />
        </Row>
      </Section>
      <Section title="Scoring Status">
        <Row>
          <Pill label="6/18 Holes" variant="warning" size="sm" />
          <Pill label="Complete" variant="success" size="sm" filled />
          <Pill label="Not Started" variant="default" size="sm" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const ScoreResults: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Hole Results">
        <Row>
          <Pill label="Eagle" variant="birdie" filled />
          <Pill label="Birdie" variant="birdie" filled />
          <Pill label="Par" variant="par" filled />
          <Pill label="Bogey" variant="bogey" filled />
          <Pill label="Double" variant="doubleBogey" filled />
        </Row>
      </Section>
      <Section title="Final Scores">
        <Row>
          <Pill label="39 Points" variant="success" filled size="lg" />
          <Pill label="36 Points" variant="primary" size="lg" />
          <Pill label="32 Points" variant="default" size="lg" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const LeaderboardPositions: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Leaderboard Position Indicators">
        <Row>
          <Pill label="1st" variant="success" filled size="sm" />
          <Pill label="2nd" variant="primary" size="sm" />
          <Pill label="3rd" variant="warning" size="sm" />
          <Pill label="T4" variant="default" size="sm" />
          <Pill label="T4" variant="default" size="sm" />
        </Row>
      </Section>
      <Section title="Movement Indicators">
        <Row>
          <Pill label="↑ 3" variant="success" size="sm" />
          <Pill label="—" variant="default" size="sm" />
          <Pill label="↓ 2" variant="error" size="sm" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

export const LongLabel: Story = {
  args: {
    label: 'This is a very long label that might wrap',
  },
};

export const ShortLabel: Story = {
  args: {
    label: 'OK',
    size: 'sm',
  },
};

export const NumericLabels: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Numeric Labels">
        <Row>
          <Pill label="1" size="sm" />
          <Pill label="42" size="sm" />
          <Pill label="100" size="sm" />
          <Pill label="+5" size="sm" variant="bogey" />
          <Pill label="-3" size="sm" variant="birdie" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

export const SpecialCharacters: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Special Characters">
        <Row>
          <Pill label="#1" size="sm" />
          <Pill label="★ VIP" size="sm" variant="warning" />
          <Pill label="🏌️ Golf" size="sm" variant="success" />
          <Pill label="@ Event" size="sm" />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// SIZE & VARIANT MATRIX
// ===========================================================================

export const SizeVariantMatrix: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Small Pills">
        <Row>
          <Pill label="Default" size="sm" />
          <Pill label="Primary" size="sm" variant="primary" />
          <Pill label="Success" size="sm" variant="success" />
          <Pill label="Error" size="sm" variant="error" filled />
        </Row>
      </Section>
      <Section title="Medium Pills">
        <Row>
          <Pill label="Default" size="md" />
          <Pill label="Primary" size="md" variant="primary" />
          <Pill label="Success" size="md" variant="success" />
          <Pill label="Error" size="md" variant="error" filled />
        </Row>
      </Section>
      <Section title="Large Pills">
        <Row>
          <Pill label="Default" size="lg" />
          <Pill label="Primary" size="lg" variant="primary" />
          <Pill label="Success" size="lg" variant="success" />
          <Pill label="Error" size="lg" variant="error" filled />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ACCESSIBILITY STORIES
// ===========================================================================

export const WithAccessibilityLabel: Story = {
  args: {
    label: 'R2',
    accessibilityLabel: 'Round 2 of 4',
  },
};

export const ScoreAccessibility: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Score Pills with Accessibility Labels">
        <Row>
          <Pill
            label="-2"
            variant="birdie"
            filled
            accessibilityLabel="Eagle, 2 under par"
          />
          <Pill
            label="-1"
            variant="birdie"
            filled
            accessibilityLabel="Birdie, 1 under par"
          />
          <Pill label="E" variant="par" filled accessibilityLabel="Par" />
          <Pill
            label="+1"
            variant="bogey"
            filled
            accessibilityLabel="Bogey, 1 over par"
          />
        </Row>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CUSTOM STYLING STORIES
// ===========================================================================

export const CustomStyles: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Custom Margin">
        <Row>
          <Pill label="No margin" />
          <Pill label="With margin" style={{ marginLeft: 20 }} />
        </Row>
      </Section>
      <Section title="Custom Width">
        <Pill label="Fixed Width" style={{ width: 150, alignSelf: 'center' }} />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    label: 'Playground Pill',
    size: 'md',
    variant: 'primary',
    filled: false,
    accessibilityLabel: '',
  },
};

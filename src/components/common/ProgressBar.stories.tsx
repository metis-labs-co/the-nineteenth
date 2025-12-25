/**
 * ProgressBar Storybook Stories
 *
 * Stories demonstrating the various configurations of the ProgressBar component.
 * Shows size variants, label options, custom colors, and use cases.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from './ProgressBar';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof ProgressBar> = {
  title: 'Common/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    value: { control: { type: 'number', min: 0, max: 100 } },
    max: { control: { type: 'number', min: 1 } },
    label: { control: 'text' },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    fillColor: { control: 'color' },
    backgroundColor: { control: 'color' },
    showPercentage: { control: 'boolean' },
    accessibilityLabel: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

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

function ProgressRow({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={wrapperStyles.progressRow}>
      {label && <Text style={wrapperStyles.progressLabel}>{label}</Text>}
      <View style={wrapperStyles.progressContainer}>{children}</View>
    </View>
  );
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
    gap: spacing.lg,
  },
  progressRow: {
    gap: spacing.xs,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressContainer: {
    flex: 1,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    value: 50,
  },
};

export const WithLabel: Story = {
  args: {
    value: 50,
    max: 100,
    label: '50% complete',
  },
};

export const WithPercentage: Story = {
  args: {
    value: 75,
    showPercentage: true,
  },
};

export const Empty: Story = {
  args: {
    value: 0,
    showPercentage: true,
  },
};

export const Full: Story = {
  args: {
    value: 100,
    showPercentage: true,
  },
};

export const HalfComplete: Story = {
  args: {
    value: 50,
    showPercentage: true,
  },
};

// ===========================================================================
// SIZE VARIANTS
// ===========================================================================

export const SizeSmall: Story = {
  args: {
    value: 60,
    size: 'sm',
    showPercentage: true,
  },
};

export const SizeMedium: Story = {
  args: {
    value: 60,
    size: 'md',
    showPercentage: true,
  },
};

export const SizeLarge: Story = {
  args: {
    value: 60,
    size: 'lg',
    showPercentage: true,
  },
};

export const AllSizes: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Size Comparison">
        <ProgressRow label="Small (4px)">
          <ProgressBar value={60} size="sm" showPercentage />
        </ProgressRow>
        <ProgressRow label="Medium (6px)">
          <ProgressBar value={60} size="md" showPercentage />
        </ProgressRow>
        <ProgressRow label="Large (8px)">
          <ProgressBar value={60} size="lg" showPercentage />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// PROGRESS VALUES
// ===========================================================================

export const ProgressSteps: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Progress Values">
        <ProgressRow label="0%">
          <ProgressBar value={0} showPercentage />
        </ProgressRow>
        <ProgressRow label="25%">
          <ProgressBar value={25} showPercentage />
        </ProgressRow>
        <ProgressRow label="50%">
          <ProgressBar value={50} showPercentage />
        </ProgressRow>
        <ProgressRow label="75%">
          <ProgressBar value={75} showPercentage />
        </ProgressRow>
        <ProgressRow label="100%">
          <ProgressBar value={100} showPercentage />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

export const FineProgress: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Fine-Grained Progress">
        <ProgressRow label="10%">
          <ProgressBar value={10} showPercentage size="md" />
        </ProgressRow>
        <ProgressRow label="20%">
          <ProgressBar value={20} showPercentage size="md" />
        </ProgressRow>
        <ProgressRow label="30%">
          <ProgressBar value={30} showPercentage size="md" />
        </ProgressRow>
        <ProgressRow label="40%">
          <ProgressBar value={40} showPercentage size="md" />
        </ProgressRow>
        <ProgressRow label="50%">
          <ProgressBar value={50} showPercentage size="md" />
        </ProgressRow>
        <ProgressRow label="60%">
          <ProgressBar value={60} showPercentage size="md" />
        </ProgressRow>
        <ProgressRow label="70%">
          <ProgressBar value={70} showPercentage size="md" />
        </ProgressRow>
        <ProgressRow label="80%">
          <ProgressBar value={80} showPercentage size="md" />
        </ProgressRow>
        <ProgressRow label="90%">
          <ProgressBar value={90} showPercentage size="md" />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CUSTOM MAX VALUES
// ===========================================================================

export const CustomMax: Story = {
  args: {
    value: 9,
    max: 18,
    label: '9/18 holes',
  },
};

export const GolfProgress: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Golf Round Progress (18 Holes)">
        <ProgressRow label="Just started">
          <ProgressBar value={1} max={18} label="1/18" />
        </ProgressRow>
        <ProgressRow label="Front 9 complete">
          <ProgressBar value={9} max={18} label="9/18" />
        </ProgressRow>
        <ProgressRow label="Back 9 in progress">
          <ProgressBar value={14} max={18} label="14/18" />
        </ProgressRow>
        <ProgressRow label="Round complete">
          <ProgressBar value={18} max={18} label="18/18" />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CUSTOM COLORS
// ===========================================================================

export const CustomFillColor: Story = {
  args: {
    value: 60,
    fillColor: '#3B82F6',
    showPercentage: true,
  },
};

export const CustomBackgroundColor: Story = {
  args: {
    value: 60,
    backgroundColor: '#FDE68A',
    showPercentage: true,
  },
};

export const CustomColors: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Custom Fill Colors">
        <ProgressRow label="Success (Default)">
          <ProgressBar value={70} showPercentage />
        </ProgressRow>
        <ProgressRow label="Primary Blue">
          <ProgressBar value={70} fillColor="#3B82F6" showPercentage />
        </ProgressRow>
        <ProgressRow label="Warning Orange">
          <ProgressBar value={70} fillColor="#F59E0B" showPercentage />
        </ProgressRow>
        <ProgressRow label="Error Red">
          <ProgressBar value={70} fillColor="#EF4444" showPercentage />
        </ProgressRow>
        <ProgressRow label="Purple">
          <ProgressBar value={70} fillColor="#8B5CF6" showPercentage />
        </ProgressRow>
      </Section>
      <Section title="Custom Background Colors">
        <ProgressRow label="Default Gray">
          <ProgressBar value={50} showPercentage />
        </ProgressRow>
        <ProgressRow label="Light Blue">
          <ProgressBar value={50} backgroundColor="#DBEAFE" showPercentage />
        </ProgressRow>
        <ProgressRow label="Light Yellow">
          <ProgressBar value={50} backgroundColor="#FEF3C7" showPercentage />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

export const StatusColors: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Status Indicator Colors">
        <ProgressRow label="Complete (Green)">
          <ProgressBar value={100} fillColor="#22C55E" label="Complete" />
        </ProgressRow>
        <ProgressRow label="In Progress (Blue)">
          <ProgressBar value={60} fillColor="#3B82F6" label="In Progress" />
        </ProgressRow>
        <ProgressRow label="Warning (Orange)">
          <ProgressBar value={80} fillColor="#F59E0B" label="Almost Full" />
        </ProgressRow>
        <ProgressRow label="Critical (Red)">
          <ProgressBar value={95} fillColor="#EF4444" label="Near Limit" />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// LABEL VARIATIONS
// ===========================================================================

export const LabelVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Label Options">
        <ProgressRow label="No label">
          <ProgressBar value={50} />
        </ProgressRow>
        <ProgressRow label="Percentage only">
          <ProgressBar value={50} showPercentage />
        </ProgressRow>
        <ProgressRow label="Custom label">
          <ProgressBar value={50} label="50 of 100" />
        </ProgressRow>
        <ProgressRow label="Fraction label">
          <ProgressBar value={9} max={18} label="9/18" />
        </ProgressRow>
        <ProgressRow label="Descriptive label">
          <ProgressBar value={75} label="Almost there!" />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

export const HoleProgress: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Golf Hole Progress">
        <ProgressRow label="Current Hole">
          <ProgressBar value={5} max={18} label="Hole 5 of 18" size="md" />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

export const ScorecardEntry: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Scorecard Entry Progress">
        <ProgressRow label="Scores entered">
          <ProgressBar
            value={12}
            max={18}
            label="12/18 holes entered"
            size="sm"
            fillColor="#3B82F6"
          />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

export const CompetitionProgress: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Round Progress">
        <ProgressRow label="Rounds completed">
          <ProgressBar value={2} max={4} label="Round 2 of 4" size="md" />
        </ProgressRow>
      </Section>
      <Section title="Players Submitted">
        <ProgressRow label="Submissions">
          <ProgressBar value={8} max={12} label="8/12 players" size="md" />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

export const SyncProgress: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Sync Progress">
        <ProgressRow label="Uploading...">
          <ProgressBar
            value={65}
            showPercentage
            fillColor="#3B82F6"
            size="sm"
          />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

export const UploadProgress: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="File Upload Progress">
        <ProgressRow label="Uploading photo...">
          <ProgressBar
            value={35}
            showPercentage
            fillColor="#8B5CF6"
            size="md"
          />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

export const CompletionStates: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Completion States">
        <ProgressRow label="Not started">
          <ProgressBar value={0} max={18} label="Not started" />
        </ProgressRow>
        <ProgressRow label="Just started">
          <ProgressBar value={1} max={18} label="1/18" />
        </ProgressRow>
        <ProgressRow label="In progress">
          <ProgressBar value={9} max={18} label="9/18" />
        </ProgressRow>
        <ProgressRow label="Almost done">
          <ProgressBar value={17} max={18} label="17/18" />
        </ProgressRow>
        <ProgressRow label="Complete">
          <ProgressBar
            value={18}
            max={18}
            label="Complete!"
            fillColor="#22C55E"
          />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const EdgeCases: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Edge Cases">
        <ProgressRow label="0% progress">
          <ProgressBar value={0} showPercentage />
        </ProgressRow>
        <ProgressRow label="100% progress">
          <ProgressBar value={100} showPercentage />
        </ProgressRow>
        <ProgressRow label="Over 100% (clamped)">
          <ProgressBar value={150} showPercentage />
        </ProgressRow>
        <ProgressRow label="Negative (clamped to 0)">
          <ProgressBar value={-10} showPercentage />
        </ProgressRow>
        <ProgressRow label="Decimal value">
          <ProgressBar value={33.33} showPercentage />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

export const LongLabels: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Long Labels">
        <ProgressRow label="Long descriptive label">
          <ProgressBar
            value={50}
            label="This is a very long label that describes the progress"
          />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// SIZE AND COLOR MATRIX
// ===========================================================================

export const SizeColorMatrix: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Small Size - Various Colors">
        <ProgressRow>
          <ProgressBar value={50} size="sm" showPercentage />
        </ProgressRow>
        <ProgressRow>
          <ProgressBar value={50} size="sm" fillColor="#3B82F6" showPercentage />
        </ProgressRow>
        <ProgressRow>
          <ProgressBar value={50} size="sm" fillColor="#F59E0B" showPercentage />
        </ProgressRow>
      </Section>
      <Section title="Medium Size - Various Colors">
        <ProgressRow>
          <ProgressBar value={50} size="md" showPercentage />
        </ProgressRow>
        <ProgressRow>
          <ProgressBar value={50} size="md" fillColor="#3B82F6" showPercentage />
        </ProgressRow>
        <ProgressRow>
          <ProgressBar value={50} size="md" fillColor="#F59E0B" showPercentage />
        </ProgressRow>
      </Section>
      <Section title="Large Size - Various Colors">
        <ProgressRow>
          <ProgressBar value={50} size="lg" showPercentage />
        </ProgressRow>
        <ProgressRow>
          <ProgressBar value={50} size="lg" fillColor="#3B82F6" showPercentage />
        </ProgressRow>
        <ProgressRow>
          <ProgressBar value={50} size="lg" fillColor="#F59E0B" showPercentage />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ACCESSIBILITY
// ===========================================================================

export const WithAccessibilityLabel: Story = {
  args: {
    value: 9,
    max: 18,
    label: '9/18',
    accessibilityLabel: 'Golf round progress: 9 holes completed out of 18',
  },
};

export const AccessibilityExamples: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Progress Bars with Custom Accessibility Labels">
        <ProgressRow label="Default accessibility">
          <ProgressBar value={50} showPercentage />
        </ProgressRow>
        <ProgressRow label="Custom accessibility">
          <ProgressBar
            value={50}
            showPercentage
            accessibilityLabel="Download is 50 percent complete"
          />
        </ProgressRow>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    value: 50,
    max: 100,
    label: '',
    size: 'sm',
    fillColor: '',
    backgroundColor: '',
    showPercentage: false,
    accessibilityLabel: '',
  },
};

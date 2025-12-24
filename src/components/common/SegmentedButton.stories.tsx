/**
 * SegmentedButton Storybook Stories
 *
 * Stories demonstrating the various configurations of the SegmentedButton component.
 * Shows size variants, selection states, disabled states, icons, and use cases.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { SegmentedButton, SegmentOption } from './SegmentedButton';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof SegmentedButton> = {
  title: 'Common/SegmentedButton',
  component: SegmentedButton,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    value: { control: 'text' },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof SegmentedButton>;

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
});

// ===========================================================================
// DEFAULT BUTTONS
// ===========================================================================

const defaultButtons: SegmentOption<string>[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

const twoButtons: SegmentOption<string>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

// ===========================================================================
// INTERACTIVE WRAPPER
// ===========================================================================

function InteractiveSegmentedButton({
  initialValue,
  buttons,
  ...props
}: {
  initialValue: string;
  buttons: SegmentOption<string>[];
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: object;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <SegmentedButton
      value={value}
      onValueChange={setValue}
      buttons={buttons}
      {...props}
    />
  );
}

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Default SegmentedButton">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={defaultButtons}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const TwoOptions: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Two Options">
        <InteractiveSegmentedButton initialValue="yes" buttons={twoButtons} />
      </Section>
    </StoryWrapper>
  ),
};

export const ThreeOptions: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Three Options">
        <InteractiveSegmentedButton
          initialValue="option2"
          buttons={defaultButtons}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const FourOptions: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Four Options">
        <InteractiveSegmentedButton
          initialValue="a"
          buttons={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
            { value: 'd', label: 'D' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// SIZE STORIES
// ===========================================================================

export const SizeSmall: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Small Size">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={defaultButtons}
          size="small"
        />
      </Section>
    </StoryWrapper>
  ),
};

export const SizeMedium: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Medium Size (Default)">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={defaultButtons}
          size="medium"
        />
      </Section>
    </StoryWrapper>
  ),
};

export const SizeLarge: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Large Size">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={defaultButtons}
          size="large"
        />
      </Section>
    </StoryWrapper>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Small">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={defaultButtons}
          size="small"
        />
      </Section>
      <Section title="Medium">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={defaultButtons}
          size="medium"
        />
      </Section>
      <Section title="Large">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={defaultButtons}
          size="large"
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// DISABLED STORIES
// ===========================================================================

export const Disabled: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Disabled (Entire Component)">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={defaultButtons}
          disabled
        />
      </Section>
    </StoryWrapper>
  ),
};

export const IndividualButtonDisabled: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Single Button Disabled">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={[
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2', disabled: true },
            { value: 'option3', label: 'Option 3' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const MultipleButtonsDisabled: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Multiple Buttons Disabled">
        <InteractiveSegmentedButton
          initialValue="option3"
          buttons={[
            { value: 'option1', label: 'Option 1', disabled: true },
            { value: 'option2', label: 'Option 2', disabled: true },
            { value: 'option3', label: 'Option 3' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const DisabledComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Enabled">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={defaultButtons}
        />
      </Section>
      <Section title="Disabled">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={defaultButtons}
          disabled
        />
      </Section>
      <Section title="Middle Option Disabled">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={[
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2', disabled: true },
            { value: 'option3', label: 'Option 3' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ICON STORIES
// ===========================================================================

export const WithIcons: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Buttons with Icons">
        <InteractiveSegmentedButton
          initialValue="event"
          buttons={[
            { value: 'event', label: 'Event', icon: 'calendar-star' },
            { value: 'league', label: 'League', icon: 'trophy-outline' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const IconsThreeOptions: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Three Options with Icons">
        <InteractiveSegmentedButton
          initialValue="stableford"
          buttons={[
            { value: 'stableford', label: 'Stableford', icon: 'star' },
            { value: 'stroke', label: 'Stroke', icon: 'counter' },
            { value: 'match', label: 'Match', icon: 'trophy' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const MixedIconsAndText: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Mixed Icons and Text Only">
        <InteractiveSegmentedButton
          initialValue="with"
          buttons={[
            { value: 'with', label: 'With Icon', icon: 'star' },
            { value: 'without', label: 'Without Icon' },
            { value: 'also', label: 'Also Icon', icon: 'heart' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const ViewModeSelector: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="View Mode Selector">
        <InteractiveSegmentedButton
          initialValue="grid"
          buttons={[
            { value: 'grid', label: 'Grid', icon: 'view-grid' },
            { value: 'list', label: 'List', icon: 'view-list' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

export const CompetitionTypeSelector: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Type">
        <InteractiveSegmentedButton
          initialValue="event"
          buttons={[
            { value: 'event', label: 'Event', icon: 'calendar-star' },
            { value: 'league', label: 'League', icon: 'trophy-outline' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const GameTypeSelector: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Game Type">
        <InteractiveSegmentedButton
          initialValue="stableford"
          buttons={[
            { value: 'stableford', label: 'Stableford' },
            { value: 'stroke', label: 'Stroke Play' },
            { value: 'match', label: 'Match Play' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const ScoringFormatSelector: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Scoring Format">
        <InteractiveSegmentedButton
          initialValue="individual"
          buttons={[
            { value: 'individual', label: 'Individual' },
            { value: 'team', label: 'Team' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const StatusFilter: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Status Filter">
        <InteractiveSegmentedButton
          initialValue="all"
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const YesNoToggle: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Yes/No Toggle">
        <InteractiveSegmentedButton
          initialValue="yes"
          buttons={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const TeeSelection: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Tee Selection">
        <InteractiveSegmentedButton
          initialValue="white"
          buttons={[
            { value: 'black', label: 'Black' },
            { value: 'blue', label: 'Blue' },
            { value: 'white', label: 'White' },
            { value: 'red', label: 'Red' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const HandicapMode: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Handicap Mode">
        <InteractiveSegmentedButton
          initialValue="full"
          buttons={[
            { value: 'full', label: 'Full' },
            { value: '3/4', label: '3/4' },
            { value: '1/2', label: '1/2' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const RoundFilter: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Round Filter">
        <InteractiveSegmentedButton
          initialValue="all"
          buttons={[
            { value: 'all', label: 'All Rounds' },
            { value: 'front', label: 'Front 9' },
            { value: 'back', label: 'Back 9' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

export const SingleOption: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Single Option (Edge Case)">
        <InteractiveSegmentedButton
          initialValue="only"
          buttons={[{ value: 'only', label: 'Only Option' }]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const LongLabels: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Long Labels">
        <InteractiveSegmentedButton
          initialValue="short"
          buttons={[
            { value: 'short', label: 'Short' },
            { value: 'long', label: 'This is a very long label' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const ShortLabels: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Short Labels">
        <InteractiveSegmentedButton
          initialValue="a"
          buttons={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
          ]}
          size="small"
        />
      </Section>
    </StoryWrapper>
  ),
};

export const NumericLabels: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Numeric Labels">
        <InteractiveSegmentedButton
          initialValue="9"
          buttons={[
            { value: '9', label: '9' },
            { value: '18', label: '18' },
            { value: '36', label: '36' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

export const SpecialCharacters: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Special Characters">
        <InteractiveSegmentedButton
          initialValue="plus"
          buttons={[
            { value: 'plus', label: '+5' },
            { value: 'even', label: 'E' },
            { value: 'minus', label: '-3' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// SIZE MATRIX
// ===========================================================================

export const SizeWithIcons: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Small with Icons">
        <InteractiveSegmentedButton
          initialValue="event"
          buttons={[
            { value: 'event', label: 'Event', icon: 'calendar' },
            { value: 'league', label: 'League', icon: 'trophy' },
          ]}
          size="small"
        />
      </Section>
      <Section title="Medium with Icons">
        <InteractiveSegmentedButton
          initialValue="event"
          buttons={[
            { value: 'event', label: 'Event', icon: 'calendar' },
            { value: 'league', label: 'League', icon: 'trophy' },
          ]}
          size="medium"
        />
      </Section>
      <Section title="Large with Icons">
        <InteractiveSegmentedButton
          initialValue="event"
          buttons={[
            { value: 'event', label: 'Event', icon: 'calendar' },
            { value: 'league', label: 'League', icon: 'trophy' },
          ]}
          size="large"
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// GOLF APP SPECIFIC
// ===========================================================================

export const GolfAppExamples: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Type">
        <InteractiveSegmentedButton
          initialValue="event"
          buttons={[
            { value: 'event', label: 'Event', icon: 'calendar-star' },
            { value: 'league', label: 'League', icon: 'trophy-outline' },
          ]}
        />
      </Section>
      <Section title="Game Format">
        <InteractiveSegmentedButton
          initialValue="stableford"
          buttons={[
            { value: 'stableford', label: 'Stableford' },
            { value: 'stroke', label: 'Stroke' },
            { value: 'match', label: 'Match' },
          ]}
        />
      </Section>
      <Section title="Team vs Individual">
        <InteractiveSegmentedButton
          initialValue="individual"
          buttons={[
            { value: 'individual', label: 'Individual' },
            { value: 'team', label: 'Team' },
          ]}
        />
      </Section>
      <Section title="Leaderboard View">
        <InteractiveSegmentedButton
          initialValue="overall"
          buttons={[
            { value: 'overall', label: 'Overall' },
            { value: 'round', label: 'This Round' },
          ]}
        />
      </Section>
      <Section title="Scorecard View">
        <InteractiveSegmentedButton
          initialValue="detailed"
          buttons={[
            { value: 'detailed', label: 'Detailed' },
            { value: 'summary', label: 'Summary' },
          ]}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CUSTOM STYLES
// ===========================================================================

export const CustomStyles: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With Margin">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={defaultButtons}
          style={{ marginHorizontal: 20 }}
        />
      </Section>
      <Section title="Full Width">
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={defaultButtons}
          style={{ width: '100%' }}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Interactive Playground">
        <Text style={{ marginBottom: spacing.md, color: '#6B7280' }}>
          Tap the buttons to see selection change
        </Text>
        <InteractiveSegmentedButton
          initialValue="option1"
          buttons={[
            { value: 'option1', label: 'First' },
            { value: 'option2', label: 'Second' },
            { value: 'option3', label: 'Third' },
          ]}
        />
      </Section>
      <Section title="With Icons">
        <InteractiveSegmentedButton
          initialValue="grid"
          buttons={[
            { value: 'grid', label: 'Grid', icon: 'view-grid' },
            { value: 'list', label: 'List', icon: 'view-list' },
            { value: 'card', label: 'Card', icon: 'card' },
          ]}
        />
      </Section>
      <Section title="Large Size">
        <InteractiveSegmentedButton
          initialValue="yes"
          buttons={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          size="large"
        />
      </Section>
    </StoryWrapper>
  ),
};

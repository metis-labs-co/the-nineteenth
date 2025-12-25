/**
 * FeatureButton Storybook Stories
 *
 * Stories demonstrating the various configurations of the FeatureButton component.
 * Shows different variants, disabled states, custom colors, and use case examples.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { FeatureButton } from './FeatureButton';
import { spacing } from '@/constants/theme';
import {
  IconPlus,
  IconTrophy,
  IconGolf,
  IconChartBar,
  IconUsers,
  IconCalendar,
  IconSettings,
  IconTarget,
  IconFlag,
  IconMedal,
  IconClipboardList,
  IconShare,
} from '@tabler/icons-react-native';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof FeatureButton> = {
  title: 'Common/FeatureButton',
  component: FeatureButton,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    backgroundColor: { control: 'color' },
    disabled: { control: 'boolean' },
    showChevron: { control: 'boolean' },
    variant: {
      control: { type: 'select' },
      options: ['horizontal', 'compact'],
    },
    accessibilityLabel: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof FeatureButton>;

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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
    gap: spacing.lg,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    title: 'Score New Round',
    subtitle: 'Start scoring a round at any course',
    icon: <IconPlus size={24} color="#FFFFFF" strokeWidth={2.5} />,
    onPress: () => console.log('Button pressed'),
  },
};

export const WithCustomColor: Story = {
  args: {
    title: 'Create Competition',
    subtitle: 'Organize golf events with friends',
    icon: <IconTrophy size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => console.log('Create competition'),
    backgroundColor: '#8B5CF6',
  },
};

export const Disabled: Story = {
  args: {
    title: 'Premium Feature',
    subtitle: 'Upgrade to unlock',
    icon: <IconMedal size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => console.log('Button pressed'),
    disabled: true,
  },
};

export const WithoutChevron: Story = {
  args: {
    title: 'Submit Scorecard',
    subtitle: 'Confirm your round scores',
    icon: <IconFlag size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => console.log('Submit scorecard'),
    showChevron: false,
  },
};

export const CompactVariant: Story = {
  args: {
    title: 'Quick Score',
    subtitle: 'Enter scores',
    icon: <IconGolf size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => console.log('Quick score'),
    variant: 'compact',
  },
};

// ===========================================================================
// VARIANT COMPARISON
// ===========================================================================

export const VariantComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Horizontal (Default)">
        <FeatureButton
          title="Score New Round"
          subtitle="Start scoring a round at any course"
          icon={<IconPlus size={24} color="#FFFFFF" strokeWidth={2.5} />}
          onPress={() => {}}
          variant="horizontal"
        />
      </Section>
      <Section title="Compact">
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <FeatureButton
              title="Quick Score"
              subtitle="Enter scores"
              icon={<IconGolf size={20} color="#FFFFFF" strokeWidth={2} />}
              onPress={() => {}}
              variant="compact"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FeatureButton
              title="View Stats"
              subtitle="Performance"
              icon={<IconChartBar size={20} color="#FFFFFF" strokeWidth={2} />}
              onPress={() => {}}
              variant="compact"
              backgroundColor="#8B5CF6"
            />
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// COLOR VARIATIONS
// ===========================================================================

export const ColorVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Background Colors">
        <FeatureButton
          title="Primary (Default)"
          subtitle="Default primary green color"
          icon={<IconGolf size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
        />
        <FeatureButton
          title="Purple"
          subtitle="Custom purple background"
          icon={<IconTrophy size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#8B5CF6"
        />
        <FeatureButton
          title="Blue"
          subtitle="Custom blue background"
          icon={<IconChartBar size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#3B82F6"
        />
        <FeatureButton
          title="Orange"
          subtitle="Custom orange background"
          icon={<IconCalendar size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#F97316"
        />
        <FeatureButton
          title="Red"
          subtitle="Custom red background"
          icon={<IconTarget size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#EF4444"
        />
        <FeatureButton
          title="Gray"
          subtitle="Custom gray background"
          icon={<IconSettings size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#6B7280"
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// DISABLED STATES
// ===========================================================================

export const DisabledStates: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Enabled vs Disabled">
        <FeatureButton
          title="Enabled Button"
          subtitle="This button is interactive"
          icon={<IconPlus size={24} color="#FFFFFF" strokeWidth={2.5} />}
          onPress={() => {}}
          disabled={false}
        />
        <FeatureButton
          title="Disabled Button"
          subtitle="This button is not interactive"
          icon={<IconPlus size={24} color="#FFFFFF" strokeWidth={2.5} />}
          onPress={() => {}}
          disabled={true}
        />
      </Section>
      <Section title="Disabled with Different Colors">
        <FeatureButton
          title="Disabled Primary"
          subtitle="Primary color disabled"
          icon={<IconGolf size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          disabled
        />
        <FeatureButton
          title="Disabled Purple"
          subtitle="Purple color disabled"
          icon={<IconTrophy size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#8B5CF6"
          disabled
        />
        <FeatureButton
          title="Disabled Blue"
          subtitle="Blue color disabled"
          icon={<IconChartBar size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#3B82F6"
          disabled
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CHEVRON OPTIONS
// ===========================================================================

export const ChevronOptions: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With Chevron (Default)">
        <FeatureButton
          title="Navigate Somewhere"
          subtitle="This shows the chevron arrow"
          icon={<IconGolf size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          showChevron={true}
        />
      </Section>
      <Section title="Without Chevron">
        <FeatureButton
          title="Action Button"
          subtitle="No chevron for action buttons"
          icon={<IconFlag size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          showChevron={false}
        />
      </Section>
      <Section title="Compact with Chevron">
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <FeatureButton
              title="With Arrow"
              subtitle="Navigate"
              icon={<IconGolf size={20} color="#FFFFFF" strokeWidth={2} />}
              onPress={() => {}}
              variant="compact"
              showChevron={true}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FeatureButton
              title="No Arrow"
              subtitle="Action"
              icon={<IconFlag size={20} color="#FFFFFF" strokeWidth={2} />}
              onPress={() => {}}
              variant="compact"
              showChevron={false}
              backgroundColor="#8B5CF6"
            />
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ICON VARIATIONS
// ===========================================================================

export const IconVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Various Icons">
        <FeatureButton
          title="Score Round"
          subtitle="Start scoring"
          icon={<IconGolf size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
        />
        <FeatureButton
          title="Create Competition"
          subtitle="Organize events"
          icon={<IconTrophy size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#8B5CF6"
        />
        <FeatureButton
          title="View Statistics"
          subtitle="Performance data"
          icon={<IconChartBar size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#3B82F6"
        />
        <FeatureButton
          title="Manage Players"
          subtitle="Add or remove players"
          icon={<IconUsers size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#F97316"
        />
        <FeatureButton
          title="Schedule Round"
          subtitle="Plan your next game"
          icon={<IconCalendar size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#10B981"
        />
        <FeatureButton
          title="Settings"
          subtitle="Configure preferences"
          icon={<IconSettings size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#6B7280"
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

export const ScoreNewRound: Story = {
  args: {
    title: 'Score New Round',
    subtitle: 'Start scoring a round at any course',
    icon: <IconPlus size={24} color="#FFFFFF" strokeWidth={2.5} />,
    onPress: () => console.log('Score new round'),
  },
};

export const CreateCompetition: Story = {
  args: {
    title: 'Create Competition',
    subtitle: 'Organize golf events with friends',
    icon: <IconTrophy size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => console.log('Create competition'),
    backgroundColor: '#8B5CF6',
  },
};

export const ViewLeaderboard: Story = {
  args: {
    title: 'View Leaderboard',
    subtitle: 'See current standings',
    icon: <IconChartBar size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => console.log('View leaderboard'),
    backgroundColor: '#3B82F6',
  },
};

export const JoinCompetition: Story = {
  args: {
    title: 'Join Competition',
    subtitle: 'Enter invite code to join',
    icon: <IconUsers size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => console.log('Join competition'),
    backgroundColor: '#10B981',
  },
};

export const SubmitScorecard: Story = {
  args: {
    title: 'Submit Scorecard',
    subtitle: 'Confirm and submit your round',
    icon: <IconClipboardList size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => console.log('Submit scorecard'),
    showChevron: false,
  },
};

export const ShareResults: Story = {
  args: {
    title: 'Share Results',
    subtitle: 'Share your round with friends',
    icon: <IconShare size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => console.log('Share results'),
    showChevron: false,
    backgroundColor: '#F97316',
  },
};

export const UseCaseGallery: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Home Screen Actions">
        <FeatureButton
          title="Score New Round"
          subtitle="Start scoring a round at any course"
          icon={<IconPlus size={24} color="#FFFFFF" strokeWidth={2.5} />}
          onPress={() => {}}
        />
        <FeatureButton
          title="Create Competition"
          subtitle="Organize golf events with friends"
          icon={<IconTrophy size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#8B5CF6"
        />
      </Section>
      <Section title="Quick Actions (Compact)">
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <FeatureButton
              title="Quick Score"
              subtitle="Enter scores"
              icon={<IconGolf size={20} color="#FFFFFF" strokeWidth={2} />}
              onPress={() => {}}
              variant="compact"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FeatureButton
              title="Leaderboard"
              subtitle="View standings"
              icon={<IconChartBar size={20} color="#FFFFFF" strokeWidth={2} />}
              onPress={() => {}}
              variant="compact"
              backgroundColor="#3B82F6"
            />
          </View>
        </View>
      </Section>
      <Section title="Submit Actions">
        <FeatureButton
          title="Submit Scorecard"
          subtitle="Confirm and submit your scores"
          icon={<IconClipboardList size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          showChevron={false}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const LongTitle: Story = {
  args: {
    title: 'This is a very long title that will be truncated on smaller screens',
    subtitle: 'Short subtitle',
    icon: <IconGolf size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => {},
  },
};

export const LongSubtitle: Story = {
  args: {
    title: 'Short Title',
    subtitle:
      'This is a very long subtitle that provides detailed information and will be truncated',
    icon: <IconGolf size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => {},
  },
};

export const ShortContent: Story = {
  args: {
    title: 'Go',
    subtitle: 'Now',
    icon: <IconPlus size={24} color="#FFFFFF" strokeWidth={2.5} />,
    onPress: () => {},
  },
};

export const WithEmoji: Story = {
  args: {
    title: 'Score Round',
    subtitle: 'Play your best game! ',
    icon: <IconGolf size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => {},
  },
};

export const SpecialCharacters: Story = {
  args: {
    title: 'Round @ Royal Melbourne',
    subtitle: 'Par 72 - 18 holes & more',
    icon: <IconGolf size={24} color="#FFFFFF" strokeWidth={2} />,
    onPress: () => {},
  },
};

export const EdgeCaseGallery: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Long Content">
        <FeatureButton
          title="This title is intentionally very long to test truncation behavior"
          subtitle="And this subtitle is also very long to see how it handles overflow"
          icon={<IconGolf size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
        />
      </Section>
      <Section title="Short Content">
        <FeatureButton
          title="Go"
          subtitle="Now"
          icon={<IconPlus size={24} color="#FFFFFF" strokeWidth={2.5} />}
          onPress={() => {}}
        />
      </Section>
      <Section title="Compact Long Content">
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <FeatureButton
              title="Long Title Here"
              subtitle="Long subtitle text"
              icon={<IconGolf size={20} color="#FFFFFF" strokeWidth={2} />}
              onPress={() => {}}
              variant="compact"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FeatureButton
              title="X"
              subtitle="Y"
              icon={<IconPlus size={20} color="#FFFFFF" strokeWidth={2.5} />}
              onPress={() => {}}
              variant="compact"
              backgroundColor="#8B5CF6"
            />
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ACCESSIBILITY
// ===========================================================================

export const AccessibilityDemo: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Accessibility Features">
        <FeatureButton
          title="Screen Reader Friendly"
          subtitle="This button has proper accessibility labels"
          icon={<IconGolf size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          accessibilityLabel="Start a new golf round"
        />
        <FeatureButton
          title="Custom A11y Label"
          subtitle="Uses custom accessibility label"
          icon={<IconTrophy size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          accessibilityLabel="Create a new golf competition"
          backgroundColor="#8B5CF6"
        />
        <FeatureButton
          title="Disabled State"
          subtitle="Announces as disabled to screen readers"
          icon={<IconMedal size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          disabled
        />
      </Section>
      <Text
        style={{ fontSize: 12, color: '#6B7280', padding: spacing.md }}
      >
        Note: Buttons have accessibility role="button", proper labels, and disabled
        state announcements.
      </Text>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CUSTOM STYLING
// ===========================================================================

export const CustomStyling: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Custom Margins">
        <FeatureButton
          title="No Horizontal Margin"
          subtitle="Custom style removes default margins"
          icon={<IconGolf size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          style={{ marginHorizontal: 0 }}
        />
      </Section>
      <Section title="Extra Bottom Margin">
        <FeatureButton
          title="Extra Spacing Below"
          subtitle="Adds more bottom margin"
          icon={<IconTrophy size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          style={{ marginBottom: 40 }}
          backgroundColor="#8B5CF6"
        />
        <FeatureButton
          title="Next Button"
          subtitle="Notice the gap above"
          icon={<IconChartBar size={24} color="#FFFFFF" strokeWidth={2} />}
          onPress={() => {}}
          backgroundColor="#3B82F6"
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    title: 'Customize Me',
    subtitle: 'Use the controls to customize this button',
    icon: <IconPlus size={24} color="#FFFFFF" strokeWidth={2.5} />,
    onPress: () => console.log('Button pressed'),
    backgroundColor: undefined,
    disabled: false,
    showChevron: true,
    variant: 'horizontal',
    accessibilityLabel: undefined,
  },
};

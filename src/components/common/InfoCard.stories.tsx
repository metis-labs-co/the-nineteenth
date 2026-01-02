/**
 * InfoCard Storybook Stories
 *
 * Stories demonstrating the various configurations of the InfoCard component.
 * Shows basic usage, highlight variant, with/without title, icons, and custom styling.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { InfoCard } from './InfoCard';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof InfoCard> = {
  title: 'Common/InfoCard',
  component: InfoCard,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    title: { control: 'text' },
    variant: {
      control: 'select',
      options: ['default', 'highlight'],
    },
    icon: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof InfoCard>;

// ===========================================================================
// WRAPPER COMPONENTS
// ===========================================================================

function StoryWrapper({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <ScrollView style={[wrapperStyles.container, { backgroundColor: colors.background }]}>
      <View style={wrapperStyles.content}>{children}</View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={wrapperStyles.section}>
      <Text style={[wrapperStyles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={wrapperStyles.sectionContent}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={infoStyles.row}>
      <Text style={[infoStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    gap: spacing.md,
  },
});

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.small,
  },
  value: {
    ...typography.body,
    fontWeight: '500',
  },
  code: {
    ...typography.h2,
    letterSpacing: 4,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  render: () => (
    <StoryWrapper>
      <InfoCard>
        <InfoRow label="Players" value="12" />
        <InfoRow label="Rounds" value="4" />
        <InfoRow label="Status" value="Active" />
      </InfoCard>
    </StoryWrapper>
  ),
};

export const WithTitle: Story = {
  render: () => (
    <StoryWrapper>
      <InfoCard title="Competition Summary">
        <InfoRow label="Players" value="12" />
        <InfoRow label="Rounds" value="4" />
        <InfoRow label="Status" value="Active" />
      </InfoCard>
    </StoryWrapper>
  ),
};

export const WithTitleAndIcon: Story = {
  render: () => (
    <StoryWrapper>
      <InfoCard title="Course Details" icon="golf">
        <InfoRow label="Name" value="Royal Melbourne Golf Club" />
        <InfoRow label="Location" value="Black Rock, VIC" />
        <InfoRow label="Holes" value="18" />
        <InfoRow label="Par" value="72" />
      </InfoCard>
    </StoryWrapper>
  ),
};

// ===========================================================================
// VARIANTS
// ===========================================================================

export const HighlightVariant: Story = {
  render: () => {
    const colors = useThemeColors();
    return (
      <StoryWrapper>
        <InfoCard title="Invite Code" icon="key" variant="highlight">
          <Text style={[infoStyles.code, { color: colors.primary }]}>ABC123</Text>
          <Text style={[infoStyles.hint, { color: colors.textSecondary }]}>
            Share this code with players to join the competition
          </Text>
        </InfoCard>
      </StoryWrapper>
    );
  },
};

export const VariantComparison: Story = {
  render: () => {
    const colors = useThemeColors();
    return (
      <StoryWrapper>
        <Section title="Default Variant">
          <InfoCard title="Standard Information" icon="information">
            <InfoRow label="Status" value="Active" />
            <InfoRow label="Players" value="8 / 16" />
          </InfoCard>
        </Section>

        <Section title="Highlight Variant">
          <InfoCard title="Important Notice" icon="alert-circle" variant="highlight">
            <Text style={[infoStyles.hint, { color: colors.textPrimary }]}>
              Round starts in 2 hours. Make sure all players have confirmed.
            </Text>
          </InfoCard>
        </Section>
      </StoryWrapper>
    );
  },
};

// ===========================================================================
// COMMON USE CASES
// ===========================================================================

export const CourseInfo: Story = {
  render: () => (
    <StoryWrapper>
      <InfoCard title="Course Details" icon="golf">
        <InfoRow label="Name" value="Royal Melbourne Golf Club" />
        <InfoRow label="Location" value="Black Rock, VIC" />
        <InfoRow label="Holes" value="18" />
        <InfoRow label="Par" value="72" />
        <InfoRow label="Slope Rating" value="140" />
        <InfoRow label="Course Rating" value="74.2" />
      </InfoCard>
    </StoryWrapper>
  ),
};

export const RoundDetails: Story = {
  render: () => (
    <StoryWrapper>
      <InfoCard title="Round Summary" icon="calendar">
        <InfoRow label="Date" value="15 Jan 2025" />
        <InfoRow label="Tee Time" value="7:30 AM" />
        <InfoRow label="Format" value="Stableford" />
        <InfoRow label="Players" value="4" />
        <InfoRow label="Course" value="Kingston Heath" />
      </InfoCard>
    </StoryWrapper>
  ),
};

export const PlayerStats: Story = {
  render: () => (
    <StoryWrapper>
      <InfoCard title="Player Statistics" icon="account">
        <InfoRow label="Rounds Played" value="42" />
        <InfoRow label="Average Score" value="87" />
        <InfoRow label="Best Score" value="79" />
        <InfoRow label="Handicap" value="14.2" />
        <InfoRow label="Stableford Avg" value="32" />
      </InfoCard>
    </StoryWrapper>
  ),
};

export const InviteCode: Story = {
  render: () => {
    const colors = useThemeColors();
    return (
      <StoryWrapper>
        <InfoCard title="Competition Invite Code" icon="key" variant="highlight">
          <Text style={[infoStyles.code, { color: colors.primary }]}>GOLF2025</Text>
          <Text style={[infoStyles.hint, { color: colors.textSecondary }]}>
            Share this code with players to join the competition
          </Text>
        </InfoCard>
      </StoryWrapper>
    );
  },
};

export const LeaderboardSummary: Story = {
  render: () => {
    const colors = useThemeColors();
    return (
      <StoryWrapper>
        <InfoCard title="Current Leader" icon="trophy" variant="highlight">
          <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>John Smith</Text>
            <Text style={[typography.h1, { color: colors.primary, marginTop: spacing.sm }]}>
              +42 pts
            </Text>
            <Text style={[infoStyles.hint, { color: colors.textSecondary, marginTop: spacing.xs }]}>
              3 rounds completed
            </Text>
          </View>
        </InfoCard>
      </StoryWrapper>
    );
  },
};

// ===========================================================================
// COMPLEX LAYOUTS
// ===========================================================================

export const MultipleCards: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Dashboard">
        <InfoCard title="Competition Info" icon="trophy">
          <InfoRow label="Name" value="Summer Series 2025" />
          <InfoRow label="Status" value="In Progress" />
          <InfoRow label="Rounds" value="2 of 4" />
        </InfoCard>

        <InfoCard title="Next Round" icon="calendar">
          <InfoRow label="Date" value="22 Jan 2025" />
          <InfoRow label="Course" value="Metropolitan GC" />
          <InfoRow label="Tee Time" value="8:00 AM" />
        </InfoCard>

        <InfoCard title="Your Progress" icon="chart-line">
          <InfoRow label="Position" value="3rd" />
          <InfoRow label="Points" value="68" />
          <InfoRow label="Behind Leader" value="-6 pts" />
        </InfoCard>
      </Section>
    </StoryWrapper>
  ),
};

export const MixedContent: Story = {
  render: () => {
    const colors = useThemeColors();
    return (
      <StoryWrapper>
        <InfoCard title="Round Configuration" icon="cog">
          <View style={{ gap: spacing.md }}>
            <View>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                Game Format
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Individual Stableford with handicap allowance of 100%
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border }} />

            <View>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                Scoring Rules
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Maximum score per hole: Double Par{'\n'}
                Pickup after maximum score
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Players</Text>
                <Text style={[typography.h3, { color: colors.primary }]}>16</Text>
              </View>
              <View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Groups</Text>
                <Text style={[typography.h3, { color: colors.primary }]}>4</Text>
              </View>
              <View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Holes</Text>
                <Text style={[typography.h3, { color: colors.primary }]}>18</Text>
              </View>
            </View>
          </View>
        </InfoCard>
      </StoryWrapper>
    );
  },
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const NoTitle: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="InfoCard Without Title">
        <InfoCard>
          <InfoRow label="Quick Stat 1" value="42" />
          <InfoRow label="Quick Stat 2" value="18" />
        </InfoCard>
      </Section>
    </StoryWrapper>
  ),
};

export const LongTitle: Story = {
  render: () => (
    <StoryWrapper>
      <InfoCard
        title="This is a very long title that might need to wrap to multiple lines on smaller screens"
        icon="information"
      >
        <InfoRow label="Status" value="Active" />
      </InfoCard>
    </StoryWrapper>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Various Icons">
        <InfoCard title="Golf" icon="golf">
          <InfoRow label="Type" value="Golf icon" />
        </InfoCard>

        <InfoCard title="Trophy" icon="trophy">
          <InfoRow label="Type" value="Trophy icon" />
        </InfoCard>

        <InfoCard title="Calendar" icon="calendar">
          <InfoRow label="Type" value="Calendar icon" />
        </InfoCard>

        <InfoCard title="Account" icon="account">
          <InfoRow label="Type" value="Account icon" />
        </InfoCard>
      </Section>
    </StoryWrapper>
  ),
};

export const EmptyContent: Story = {
  render: () => (
    <StoryWrapper>
      <InfoCard title="Empty Section" icon="information">
        <View />
      </InfoCard>
    </StoryWrapper>
  ),
};

export const CustomStyle: Story = {
  render: () => (
    <StoryWrapper>
      <InfoCard
        title="Custom Styled"
        icon="star"
        style={{
          marginHorizontal: spacing.md,
        }}
      >
        <InfoRow label="Custom" value="Styling Applied" />
      </InfoCard>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ALL COMBINATIONS
// ===========================================================================

export const AllCombinations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Default Variant Combinations">
        <InfoCard>
          <InfoRow label="No title" value="Content only" />
        </InfoCard>

        <InfoCard title="Title Only">
          <InfoRow label="Has title" value="No icon" />
        </InfoCard>

        <InfoCard title="Title with Icon" icon="information">
          <InfoRow label="Has title" value="With icon" />
        </InfoCard>
      </Section>

      <Section title="Highlight Variant Combinations">
        <InfoCard variant="highlight">
          <InfoRow label="No title" value="Highlight content" />
        </InfoCard>

        <InfoCard title="Highlight Title" variant="highlight">
          <InfoRow label="Has title" value="No icon" />
        </InfoCard>

        <InfoCard title="Highlight with Icon" icon="alert" variant="highlight">
          <InfoRow label="Has title" value="With icon" />
        </InfoCard>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    title: 'Playground InfoCard',
    variant: 'default',
    icon: 'information',
  },
  render: (args) => (
    <StoryWrapper>
      <InfoCard {...args}>
        <InfoRow label="Field 1" value="Value 1" />
        <InfoRow label="Field 2" value="Value 2" />
        <InfoRow label="Field 3" value="Value 3" />
      </InfoCard>
    </StoryWrapper>
  ),
};

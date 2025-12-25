/**
 * SectionHeader Storybook Stories
 *
 * Stories demonstrating the various configurations of the SectionHeader component.
 * Shows icon usage, description, right content, and style overrides.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { SectionHeader, SectionHeaderProps } from './SectionHeader';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof SectionHeader> = {
  title: 'Common/SectionHeader',
  component: SectionHeader,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    icon: { control: 'text' },
    iconSize: { control: { type: 'number', min: 12, max: 48 } },
    primaryIcon: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof SectionHeader>;

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

function Card({ children }: { children: React.ReactNode }) {
  return <View style={wrapperStyles.card}>{children}</View>;
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
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    title: 'Section Title',
  },
};

export const WithDescription: Story = {
  args: {
    title: 'Section Title',
    description: 'This is a helpful description explaining the section content',
  },
};

export const WithIcon: Story = {
  args: {
    title: 'Section Title',
    icon: 'star',
  },
};

export const WithIconAndDescription: Story = {
  args: {
    title: 'Frequently Asked Questions',
    description: 'Find quick answers to common questions',
    icon: 'frequently-asked-questions',
  },
};

// ===========================================================================
// ICON VARIANTS
// ===========================================================================

export const PrimaryIcon: Story = {
  args: {
    title: 'Primary Icon Color',
    icon: 'star',
    primaryIcon: true,
  },
};

export const SecondaryIcon: Story = {
  args: {
    title: 'Secondary Icon Color',
    icon: 'information',
    primaryIcon: false,
  },
};

export const SmallIcon: Story = {
  args: {
    title: 'Small Icon',
    icon: 'bell',
    iconSize: 16,
  },
};

export const LargeIcon: Story = {
  args: {
    title: 'Large Icon',
    icon: 'trophy',
    iconSize: 32,
  },
};

export const IconVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Icon Sizes">
        <Card>
          <SectionHeader title="Small (16px)" icon="star" iconSize={16} />
          <SectionHeader title="Default (22px)" icon="star" />
          <SectionHeader title="Large (28px)" icon="star" iconSize={28} />
          <SectionHeader title="Extra Large (36px)" icon="star" iconSize={36} />
        </Card>
      </Section>
      <Section title="Icon Colors">
        <Card>
          <SectionHeader title="Primary Color (default)" icon="heart" primaryIcon={true} />
          <SectionHeader title="Secondary Color" icon="heart" primaryIcon={false} />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// RIGHT CONTENT STORIES
// ===========================================================================

export const WithRightContent: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <SectionHeader
          title="Players"
          rightContent={
            <TouchableOpacity>
              <Text style={{ color: '#1E7F5E', fontWeight: '500' }}>View All</Text>
            </TouchableOpacity>
          }
        />
      </Card>
    </StoryWrapper>
  ),
};

export const WithIconButton: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <SectionHeader
          title="Rounds"
          icon="calendar"
          rightContent={
            <TouchableOpacity style={{ padding: 4 }}>
              <Icon source="plus" size={24} color="#1E7F5E" />
            </TouchableOpacity>
          }
        />
      </Card>
    </StoryWrapper>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <SectionHeader
          title="Notifications"
          icon="bell"
          rightContent={
            <View style={{
              backgroundColor: '#EF4444',
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
              minWidth: 24,
              alignItems: 'center',
            }}>
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>3</Text>
            </View>
          }
        />
      </Card>
    </StoryWrapper>
  ),
};

export const RightContentVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Right Content Examples">
        <Card>
          <SectionHeader
            title="With Text Link"
            rightContent={
              <TouchableOpacity>
                <Text style={{ color: '#1E7F5E', fontWeight: '500' }}>See All</Text>
              </TouchableOpacity>
            }
          />
        </Card>
        <Card>
          <SectionHeader
            title="With Icon Button"
            rightContent={
              <TouchableOpacity style={{ padding: 4 }}>
                <Icon source="pencil" size={20} color="#6B7280" />
              </TouchableOpacity>
            }
          />
        </Card>
        <Card>
          <SectionHeader
            title="With Multiple Actions"
            rightContent={
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity>
                  <Icon source="filter" size={20} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Icon source="sort" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            }
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// STYLE OVERRIDE STORIES
// ===========================================================================

export const CustomContainerStyle: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <SectionHeader
          title="Custom Background"
          style={{
            backgroundColor: '#F3F4F6',
            padding: spacing.md,
            borderRadius: 8,
            marginBottom: 0,
          }}
        />
      </Card>
    </StoryWrapper>
  ),
};

export const CustomTitleStyle: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <SectionHeader
          title="Large Bold Title"
          titleStyle={{
            fontSize: 24,
            fontWeight: '700',
          }}
        />
      </Card>
    </StoryWrapper>
  ),
};

export const CustomDescriptionStyle: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <SectionHeader
          title="Title"
          description="Italicized description with custom color"
          descriptionStyle={{
            fontStyle: 'italic',
            color: '#9CA3AF',
          }}
        />
      </Card>
    </StoryWrapper>
  ),
};

// ===========================================================================
// COMMON USE CASES
// ===========================================================================

export const FAQSection: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <SectionHeader
          title="Frequently Asked Questions"
          description="Find quick answers to common questions"
          icon="frequently-asked-questions"
        />
        {/* Placeholder content */}
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <Text style={{ color: '#374151' }}>How do I join a competition?</Text>
          <Text style={{ color: '#374151' }}>How are handicaps calculated?</Text>
          <Text style={{ color: '#374151' }}>Can I score for other players?</Text>
        </View>
      </Card>
    </StoryWrapper>
  ),
};

export const SettingsSection: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <SectionHeader
          title="Account Settings"
          description="Manage your account preferences"
          icon="account-cog"
        />
      </Card>
      <Card>
        <SectionHeader
          title="Notifications"
          description="Control how you receive updates"
          icon="bell-outline"
        />
      </Card>
      <Card>
        <SectionHeader
          title="Privacy"
          description="Manage your data and visibility"
          icon="shield-account"
        />
      </Card>
    </StoryWrapper>
  ),
};

export const LeaderboardSection: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <SectionHeader
          title="Leaderboard"
          icon="trophy"
          rightContent={
            <TouchableOpacity>
              <Text style={{ color: '#1E7F5E', fontWeight: '500' }}>View Full</Text>
            </TouchableOpacity>
          }
        />
        {/* Placeholder leaderboard content */}
        <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
          <Text style={{ color: '#374151' }}>1. John Smith - 42 pts</Text>
          <Text style={{ color: '#374151' }}>2. Jane Doe - 38 pts</Text>
          <Text style={{ color: '#374151' }}>3. Bob Wilson - 36 pts</Text>
        </View>
      </Card>
    </StoryWrapper>
  ),
};

export const PlayersSection: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <SectionHeader
          title="Players"
          description="8 players registered"
          icon="account-multiple"
          rightContent={
            <TouchableOpacity
              style={{
                backgroundColor: '#1E7F5E',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: '500' }}>Add Player</Text>
            </TouchableOpacity>
          }
        />
      </Card>
    </StoryWrapper>
  ),
};

export const RoundsSection: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <SectionHeader
          title="Upcoming Rounds"
          description="Your scheduled rounds"
          icon="calendar"
        />
      </Card>
      <Card>
        <SectionHeader
          title="Completed Rounds"
          description="View past performance"
          icon="calendar-check"
          primaryIcon={false}
        />
      </Card>
    </StoryWrapper>
  ),
};

export const StatisticsSection: Story = {
  render: () => (
    <StoryWrapper>
      <Card>
        <SectionHeader
          title="Performance Statistics"
          description="Your scoring trends and averages"
          icon="chart-line"
        />
      </Card>
      <Card>
        <SectionHeader
          title="Course History"
          description="Your stats by course"
          icon="golf"
        />
      </Card>
    </StoryWrapper>
  ),
};

// ===========================================================================
// FULL PAGE EXAMPLES
// ===========================================================================

export const CompetitionDetailPage: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Detail Page Example">
        <Card>
          <SectionHeader
            title="Competition Details"
            icon="information"
            rightContent={
              <TouchableOpacity>
                <Icon source="pencil" size={20} color="#6B7280" />
              </TouchableOpacity>
            }
          />
        </Card>
        <Card>
          <SectionHeader
            title="Rounds"
            description="4 rounds scheduled"
            icon="calendar"
            rightContent={
              <TouchableOpacity>
                <Text style={{ color: '#1E7F5E' }}>Add Round</Text>
              </TouchableOpacity>
            }
          />
        </Card>
        <Card>
          <SectionHeader
            title="Players"
            description="12 players registered"
            icon="account-multiple"
          />
        </Card>
        <Card>
          <SectionHeader
            title="Leaderboard"
            icon="trophy"
            rightContent={
              <TouchableOpacity>
                <Text style={{ color: '#1E7F5E' }}>Full Standings</Text>
              </TouchableOpacity>
            }
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

export const SettingsPage: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Settings Page Example">
        <Card>
          <SectionHeader title="Profile" icon="account" />
        </Card>
        <Card>
          <SectionHeader title="Preferences" icon="cog" />
        </Card>
        <Card>
          <SectionHeader title="Notifications" icon="bell" />
        </Card>
        <Card>
          <SectionHeader title="Privacy & Security" icon="shield-account" />
        </Card>
        <Card>
          <SectionHeader title="Help & Support" icon="help-circle" />
        </Card>
        <Card>
          <SectionHeader title="About" icon="information" primaryIcon={false} />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const LongTitle: Story = {
  args: {
    title: 'This is a very long section title that might need to wrap to multiple lines',
  },
};

export const LongDescription: Story = {
  args: {
    title: 'Section',
    description:
      'This is a very long description that provides extensive information about the section content and might span multiple lines on smaller screen sizes',
  },
};

export const MinimalContent: Story = {
  args: {
    title: 'A',
  },
};

export const SpecialCharacters: Story = {
  args: {
    title: "FAQ's & Tips #1",
    description: "Find answers & tips @ golf competitions!",
    icon: 'help-circle',
  },
};

export const WithNumbers: Story = {
  args: {
    title: 'Round 2 of 4',
    description: '12 players, 18 holes',
    icon: 'golf',
  },
};

export const NoIcon: Story = {
  args: {
    title: 'Section Without Icon',
    description: 'This section has a description but no icon',
  },
};

// ===========================================================================
// ALL COMBINATIONS
// ===========================================================================

export const AllCombinations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Title Only">
        <Card>
          <SectionHeader title="Just a Title" />
        </Card>
      </Section>

      <Section title="Title + Description">
        <Card>
          <SectionHeader
            title="Title with Description"
            description="Helpful description text"
          />
        </Card>
      </Section>

      <Section title="Title + Icon">
        <Card>
          <SectionHeader title="Title with Icon" icon="star" />
        </Card>
      </Section>

      <Section title="Title + Right Content">
        <Card>
          <SectionHeader
            title="Title with Action"
            rightContent={<Text style={{ color: '#1E7F5E' }}>Action</Text>}
          />
        </Card>
      </Section>

      <Section title="Title + Icon + Description">
        <Card>
          <SectionHeader
            title="Full Header"
            description="Complete with icon and description"
            icon="information"
          />
        </Card>
      </Section>

      <Section title="All Props">
        <Card>
          <SectionHeader
            title="Complete Section"
            description="All props enabled"
            icon="golf"
            iconSize={24}
            rightContent={<Text style={{ color: '#1E7F5E' }}>View</Text>}
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    title: 'Playground Section',
    description: 'Customize this section header',
    icon: 'star',
    iconSize: 22,
    primaryIcon: true,
  },
};

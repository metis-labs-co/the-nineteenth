/**
 * Tabs Storybook Stories
 *
 * Stories demonstrating the various configurations of the Tabs component.
 * Shows size variants, selection states, counts, disabled tabs,
 * and real-world use cases.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsProps, TabItem } from './Tabs';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof Tabs> = {
  title: 'Common/Tabs',
  component: Tabs,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    animated: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

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
// HELPER - DEFAULT TABS
// ===========================================================================

const defaultTabs: TabItem[] = [
  { key: 'tab1', label: 'Tab 1' },
  { key: 'tab2', label: 'Tab 2' },
  { key: 'tab3', label: 'Tab 3' },
];

// ===========================================================================
// INTERACTIVE WRAPPER
// ===========================================================================

function InteractiveTabs({ tabs, ...props }: Omit<TabsProps, 'selectedTab' | 'onTabChange'> & { tabs: TabItem[] }) {
  const [selected, setSelected] = useState(tabs[0]?.key || '');
  return <Tabs tabs={tabs} selectedTab={selected} onTabChange={setSelected} {...props} />;
}

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  render: () => <InteractiveTabs tabs={defaultTabs} />,
};

export const TwoTabs: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'active', label: 'Active' },
        { key: 'history', label: 'History' },
      ]}
    />
  ),
};

export const ThreeTabs: Story = {
  render: () => <InteractiveTabs tabs={defaultTabs} />,
};

export const FourTabs: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'details', label: 'Details' },
        { key: 'rounds', label: 'Rounds' },
        { key: 'players', label: 'Players' },
        { key: 'leaderboard', label: 'Leaderboard' },
      ]}
    />
  ),
};

export const FiveTabs: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'overview', label: 'Overview' },
        { key: 'stats', label: 'Stats' },
        { key: 'history', label: 'History' },
        { key: 'friends', label: 'Friends' },
        { key: 'settings', label: 'Settings' },
      ]}
    />
  ),
};

// ===========================================================================
// SIZE STORIES
// ===========================================================================

export const SizeSmall: Story = {
  render: () => <InteractiveTabs tabs={defaultTabs} size="small" />,
};

export const SizeMedium: Story = {
  render: () => <InteractiveTabs tabs={defaultTabs} size="medium" />,
};

export const SizeLarge: Story = {
  render: () => <InteractiveTabs tabs={defaultTabs} size="large" />,
};

export const AllSizes: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Small">
        <InteractiveTabs tabs={defaultTabs} size="small" />
      </Section>
      <Section title="Medium (Default)">
        <InteractiveTabs tabs={defaultTabs} size="medium" />
      </Section>
      <Section title="Large">
        <InteractiveTabs tabs={defaultTabs} size="large" />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// COUNT BADGE STORIES
// ===========================================================================

export const WithCounts: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'active', label: 'Active', count: 5 },
        { key: 'history', label: 'History', count: 12 },
        { key: 'pending', label: 'Pending', count: 0 },
      ]}
    />
  ),
};

export const MixedCounts: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'all', label: 'All' },
        { key: 'unread', label: 'Unread', count: 3 },
        { key: 'flagged', label: 'Flagged', count: 1 },
      ]}
    />
  ),
};

export const LargeCounts: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'tab1', label: 'Small', count: 9 },
        { key: 'tab2', label: 'Medium', count: 99 },
        { key: 'tab3', label: 'Large', count: 999 },
      ]}
    />
  ),
};

// ===========================================================================
// DISABLED STORIES
// ===========================================================================

export const WithDisabled: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'enabled1', label: 'Enabled' },
        { key: 'disabled', label: 'Disabled', disabled: true },
        { key: 'enabled2', label: 'Also Enabled' },
      ]}
    />
  ),
};

export const MultipleDisabled: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'free', label: 'Free' },
        { key: 'basic', label: 'Basic', disabled: true },
        { key: 'pro', label: 'Pro', disabled: true },
        { key: 'enterprise', label: 'Enterprise', disabled: true },
      ]}
    />
  ),
};

export const DisabledWithCounts: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'active', label: 'Active', count: 5 },
        { key: 'locked', label: 'Locked', count: 3, disabled: true },
        { key: 'archived', label: 'Archived', count: 10 },
      ]}
    />
  ),
};

// ===========================================================================
// MANY TABS (SCROLLABLE) STORIES
// ===========================================================================

export const ManyTabs: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'tab1', label: 'Overview' },
        { key: 'tab2', label: 'Statistics' },
        { key: 'tab3', label: 'History' },
        { key: 'tab4', label: 'Achievements' },
        { key: 'tab5', label: 'Friends' },
        { key: 'tab6', label: 'Settings' },
      ]}
    />
  ),
};

export const ManyTabsWithCounts: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'all', label: 'All', count: 45 },
        { key: 'active', label: 'Active', count: 12 },
        { key: 'upcoming', label: 'Upcoming', count: 8 },
        { key: 'completed', label: 'Completed', count: 20 },
        { key: 'cancelled', label: 'Cancelled', count: 5 },
      ]}
    />
  ),
};

export const TenTabs: Story = {
  render: () => (
    <InteractiveTabs
      tabs={Array.from({ length: 10 }, (_, i) => ({
        key: `tab${i}`,
        label: `Tab ${i + 1}`,
      }))}
    />
  ),
};

// ===========================================================================
// ANIMATION STORIES
// ===========================================================================

export const Animated: Story = {
  render: () => <InteractiveTabs tabs={defaultTabs} animated />,
};

export const NotAnimated: Story = {
  render: () => <InteractiveTabs tabs={defaultTabs} animated={false} />,
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

export const CompetitionView: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'details', label: 'Details' },
        { key: 'rounds', label: 'Rounds', count: 4 },
        { key: 'players', label: 'Players', count: 12 },
        { key: 'teams', label: 'Teams', count: 3 },
        { key: 'leaderboard', label: 'Leaderboard' },
      ]}
    />
  ),
};

export const RoundView: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'scorecard', label: 'Scorecard' },
        { key: 'players', label: 'Players' },
        { key: 'leaderboard', label: 'Leaderboard' },
      ]}
    />
  ),
};

export const CompetitionsList: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'active', label: 'Active', count: 3 },
        { key: 'upcoming', label: 'Upcoming', count: 2 },
        { key: 'completed', label: 'Completed', count: 15 },
      ]}
      size="small"
    />
  ),
};

export const ProfileView: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'stats', label: 'Statistics' },
        { key: 'history', label: 'Round History' },
        { key: 'achievements', label: 'Achievements' },
        { key: 'friends', label: 'Friends', count: 8 },
      ]}
    />
  ),
};

export const FriendsView: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'all', label: 'All Friends', count: 24 },
        { key: 'pending', label: 'Pending', count: 3 },
        { key: 'blocked', label: 'Blocked', count: 0 },
      ]}
    />
  ),
};

export const SettingsCategories: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'account', label: 'Account' },
        { key: 'notifications', label: 'Notifications' },
        { key: 'privacy', label: 'Privacy' },
        { key: 'subscription', label: 'Subscription' },
      ]}
      size="small"
    />
  ),
};

export const ScoreboardFilter: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'overall', label: 'Overall' },
        { key: 'today', label: 'Today' },
        { key: 'front9', label: 'Front 9' },
        { key: 'back9', label: 'Back 9' },
      ]}
      size="small"
    />
  ),
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

export const SingleTab: Story = {
  render: () => (
    <InteractiveTabs tabs={[{ key: 'only', label: 'Only Tab' }]} />
  ),
};

export const LongLabels: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'tab1', label: 'Short' },
        { key: 'tab2', label: 'This is a much longer label' },
        { key: 'tab3', label: 'Also long text here' },
      ]}
    />
  ),
};

export const ShortLabels: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
        { key: 'c', label: 'C' },
      ]}
    />
  ),
};

export const WithEmojis: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'golf', label: '🏌️ Golf' },
        { key: 'trophy', label: '🏆 Wins' },
        { key: 'friends', label: '👥 Friends' },
      ]}
    />
  ),
};

export const SpecialCharacters: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'tab1', label: 'Tab & More' },
        { key: 'tab2', label: 'Tab #2' },
        { key: 'tab3', label: 'Tab "Three"' },
      ]}
    />
  ),
};

// ===========================================================================
// COMBINED FEATURE STORIES
// ===========================================================================

export const SmallScrollableWithCounts: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'all', label: 'All', count: 50 },
        { key: 'active', label: 'Active', count: 5 },
        { key: 'pending', label: 'Pending', count: 3 },
        { key: 'completed', label: 'Completed', count: 40 },
        { key: 'cancelled', label: 'Cancelled', count: 2 },
      ]}
      size="small"
    />
  ),
};

export const LargeWithDisabled: Story = {
  render: () => (
    <InteractiveTabs
      tabs={[
        { key: 'free', label: 'Free Tier' },
        { key: 'pro', label: 'Pro (Upgrade)', disabled: true },
        { key: 'enterprise', label: 'Enterprise', disabled: true },
      ]}
      size="large"
    />
  ),
};

export const AllFeatures: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Full Featured Tabs">
        <InteractiveTabs
          tabs={[
            { key: 'active', label: 'Active', count: 5 },
            { key: 'upcoming', label: 'Upcoming', count: 2 },
            { key: 'locked', label: 'Premium', disabled: true },
            { key: 'completed', label: 'Completed', count: 10 },
          ]}
          size="medium"
          animated
        />
      </Section>
      <Section title="Many Tabs with All Features">
        <InteractiveTabs
          tabs={[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active', count: 5 },
            { key: 'locked', label: 'Premium', disabled: true },
            { key: 'archived', label: 'Archived', count: 15 },
            { key: 'deleted', label: 'Deleted', disabled: true },
          ]}
          size="small"
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// STYLING STORIES
// ===========================================================================

export const WithCustomStyle: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With Margin">
        <InteractiveTabs
          tabs={defaultTabs}
          style={{ marginHorizontal: 20 }}
        />
      </Section>
      <Section title="With Background Color Override">
        <View style={{ backgroundColor: '#E0F2FE', padding: spacing.md, borderRadius: 12 }}>
          <InteractiveTabs tabs={defaultTabs} />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// SIZE & FEATURE MATRIX
// ===========================================================================

export const SizeMatrix: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Small Tabs">
        <InteractiveTabs
          tabs={[
            { key: 'tab1', label: 'Tab 1', count: 5 },
            { key: 'tab2', label: 'Tab 2' },
            { key: 'tab3', label: 'Disabled', disabled: true },
          ]}
          size="small"
        />
      </Section>
      <Section title="Medium Tabs">
        <InteractiveTabs
          tabs={[
            { key: 'tab1', label: 'Tab 1', count: 5 },
            { key: 'tab2', label: 'Tab 2' },
            { key: 'tab3', label: 'Disabled', disabled: true },
          ]}
          size="medium"
        />
      </Section>
      <Section title="Large Tabs">
        <InteractiveTabs
          tabs={[
            { key: 'tab1', label: 'Tab 1', count: 5 },
            { key: 'tab2', label: 'Tab 2' },
            { key: 'tab3', label: 'Disabled', disabled: true },
          ]}
          size="large"
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  render: (args) => {
    // Destructure to avoid duplicate props
    const { tabs: _tabs, selectedTab: _selectedTab, onTabChange: _onTabChange, ...restArgs } = args;
    const StatefulPlayground = () => {
      const [selected, setSelected] = useState('tab1');
      return (
        <Tabs
          tabs={[
            { key: 'tab1', label: 'First Tab', count: 5 },
            { key: 'tab2', label: 'Second Tab' },
            { key: 'tab3', label: 'Third Tab', disabled: false },
          ]}
          selectedTab={selected}
          onTabChange={setSelected}
          {...restArgs}
        />
      );
    };
    return <StatefulPlayground />;
  },
  args: {
    size: 'medium',
    animated: true,
  },
};

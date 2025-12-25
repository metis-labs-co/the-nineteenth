/**
 * BottomNavigation Storybook Stories
 *
 * Stories demonstrating the various configurations of the BottomNavigation component.
 * Shows different active tabs, badge configurations, and interactive behaviors.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { BottomNavigation, NavigationTab } from './BottomNavigation';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof BottomNavigation> = {
  title: 'Layout/BottomNavigation',
  component: BottomNavigation,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    activeTab: {
      control: { type: 'select' },
      options: ['rounds', 'competitions', 'courses', 'friends', 'profile'],
    },
    onTabPress: { action: 'tab pressed' },
  },
};

export default meta;
type Story = StoryObj<typeof BottomNavigation>;

// ===========================================================================
// WRAPPER COMPONENTS
// ===========================================================================

function StoryWrapper({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <View style={wrapperStyles.container}>
      {title && <Text style={wrapperStyles.title}>{title}</Text>}
      <View style={wrapperStyles.content}>{children}</View>
    </View>
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

function MockScreen({ label }: { label: string }) {
  return (
    <View style={wrapperStyles.mockScreen}>
      <Text style={wrapperStyles.screenLabel}>{label}</Text>
    </View>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    gap: spacing.lg,
  },
  mockScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  screenLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    activeTab: 'rounds',
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Rounds Screen" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const RoundsActive: Story = {
  args: {
    activeTab: 'rounds',
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Rounds" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const CompetitionsActive: Story = {
  args: {
    activeTab: 'competitions',
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Competitions" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const CoursesActive: Story = {
  args: {
    activeTab: 'courses',
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Courses" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const FriendsActive: Story = {
  args: {
    activeTab: 'friends',
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Friends" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const ProfileActive: Story = {
  args: {
    activeTab: 'profile',
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Profile" />
      <BottomNavigation {...args} />
    </View>
  ),
};

// ===========================================================================
// BADGE STORIES
// ===========================================================================

export const WithSingleBadge: Story = {
  args: {
    activeTab: 'rounds',
    badges: { friends: 3 },
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Badge on Friends" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const WithMultipleBadges: Story = {
  args: {
    activeTab: 'rounds',
    badges: {
      competitions: 2,
      friends: 5,
    },
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Multiple Badges" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const WithAllBadges: Story = {
  args: {
    activeTab: 'rounds',
    badges: {
      rounds: 1,
      competitions: 2,
      courses: 3,
      friends: 4,
      profile: 5,
    },
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="All Badges" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const WithLargeBadgeCount: Story = {
  args: {
    activeTab: 'rounds',
    badges: { friends: 150 },
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Large Count (99+)" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const WithStringBadge: Story = {
  args: {
    activeTab: 'rounds',
    badges: { friends: 'NEW' },
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="String Badge" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const WithZeroBadge: Story = {
  args: {
    activeTab: 'rounds',
    badges: { friends: 0 },
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Zero Badge (Hidden)" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const BadgeVariations: Story = {
  render: () => (
    <ScrollView style={{ flex: 1 }}>
      <Section title="Single Digit">
        <View style={{ height: 80 }}>
          <BottomNavigation activeTab="rounds" badges={{ friends: 5 }} />
        </View>
      </Section>
      <Section title="Double Digit">
        <View style={{ height: 80 }}>
          <BottomNavigation activeTab="rounds" badges={{ friends: 42 }} />
        </View>
      </Section>
      <Section title="Exactly 99">
        <View style={{ height: 80 }}>
          <BottomNavigation activeTab="rounds" badges={{ friends: 99 }} />
        </View>
      </Section>
      <Section title="Over 99 (99+)">
        <View style={{ height: 80 }}>
          <BottomNavigation activeTab="rounds" badges={{ friends: 100 }} />
        </View>
      </Section>
      <Section title="String Badge">
        <View style={{ height: 80 }}>
          <BottomNavigation activeTab="rounds" badges={{ competitions: '!' }} />
        </View>
      </Section>
    </ScrollView>
  ),
};

// ===========================================================================
// INTERACTIVE STORIES
// ===========================================================================

export const Interactive: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState<NavigationTab['key']>('rounds');

    const handleTabPress = (tab: NavigationTab) => {
      setActiveTab(tab.key);
    };

    return (
      <View style={{ flex: 1 }}>
        <MockScreen label={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} />
        <BottomNavigation
          activeTab={activeTab}
          onTabPress={handleTabPress}
        />
      </View>
    );
  },
};

export const InteractiveWithBadges: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState<NavigationTab['key']>('rounds');
    const [badges, setBadges] = useState({
      friends: 3,
      competitions: 1,
    });

    const handleTabPress = (tab: NavigationTab) => {
      setActiveTab(tab.key);
      // Clear badge when tab is visited
      if (badges[tab.key as keyof typeof badges]) {
        setBadges((prev) => ({ ...prev, [tab.key]: 0 }));
      }
    };

    return (
      <View style={{ flex: 1 }}>
        <View style={wrapperStyles.mockScreen}>
          <Text style={wrapperStyles.screenLabel}>
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </Text>
          <Text style={{ color: '#6B7280', marginTop: spacing.sm }}>
            Tap tabs to clear their badges
          </Text>
        </View>
        <BottomNavigation
          activeTab={activeTab}
          onTabPress={handleTabPress}
          badges={badges}
        />
      </View>
    );
  },
};

// ===========================================================================
// TAB STATE COMPARISON
// ===========================================================================

export const AllTabStates: Story = {
  render: () => (
    <ScrollView style={{ flex: 1 }}>
      <Section title="Rounds Active">
        <View style={{ height: 80 }}>
          <BottomNavigation activeTab="rounds" />
        </View>
      </Section>
      <Section title="Competitions Active">
        <View style={{ height: 80 }}>
          <BottomNavigation activeTab="competitions" />
        </View>
      </Section>
      <Section title="Courses Active">
        <View style={{ height: 80 }}>
          <BottomNavigation activeTab="courses" />
        </View>
      </Section>
      <Section title="Friends Active">
        <View style={{ height: 80 }}>
          <BottomNavigation activeTab="friends" />
        </View>
      </Section>
      <Section title="Profile Active">
        <View style={{ height: 80 }}>
          <BottomNavigation activeTab="profile" />
        </View>
      </Section>
    </ScrollView>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

export const NewUserExperience: Story = {
  args: {
    activeTab: 'rounds',
    badges: {
      friends: 'NEW',
      profile: '!',
    },
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <View style={wrapperStyles.mockScreen}>
        <Text style={wrapperStyles.screenLabel}>Welcome!</Text>
        <Text style={{ color: '#6B7280', marginTop: spacing.sm }}>
          Check out Friends and Profile tabs
        </Text>
      </View>
      <BottomNavigation {...args} />
    </View>
  ),
};

export const NotificationsState: Story = {
  args: {
    activeTab: 'rounds',
    badges: {
      friends: 5,
      competitions: 2,
    },
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <View style={wrapperStyles.mockScreen}>
        <Text style={wrapperStyles.screenLabel}>Notifications</Text>
        <Text style={{ color: '#6B7280', marginTop: spacing.sm }}>
          5 friend requests, 2 competition updates
        </Text>
      </View>
      <BottomNavigation {...args} />
    </View>
  ),
};

export const BusyState: Story = {
  args: {
    activeTab: 'competitions',
    badges: {
      rounds: 3,
      competitions: 8,
      friends: 12,
    },
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <View style={wrapperStyles.mockScreen}>
        <Text style={wrapperStyles.screenLabel}>Lots Happening!</Text>
        <Text style={{ color: '#6B7280', marginTop: spacing.sm }}>
          Active golfer with many updates
        </Text>
      </View>
      <BottomNavigation {...args} />
    </View>
  ),
};

export const QuietState: Story = {
  args: {
    activeTab: 'rounds',
    badges: {},
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <View style={wrapperStyles.mockScreen}>
        <Text style={wrapperStyles.screenLabel}>All Caught Up</Text>
        <Text style={{ color: '#6B7280', marginTop: spacing.sm }}>
          No pending notifications
        </Text>
      </View>
      <BottomNavigation {...args} />
    </View>
  ),
};

// ===========================================================================
// LAYOUT CONTEXT STORIES
// ===========================================================================

export const InFullAppContext: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState<NavigationTab['key']>('rounds');

    const screenContent = {
      rounds: 'Your upcoming and past rounds',
      competitions: 'Manage your golf competitions',
      courses: 'Browse golf courses',
      friends: 'Connect with golf buddies',
      profile: 'Your profile and settings',
    };

    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ padding: spacing.lg, paddingTop: spacing.xl }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#1F2937' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </Text>
            <Text style={{ color: '#6B7280', marginTop: spacing.xs }}>
              {screenContent[activeTab]}
            </Text>
          </View>
        </View>
        <BottomNavigation
          activeTab={activeTab}
          onTabPress={(tab) => setActiveTab(tab.key)}
          badges={{ friends: 2 }}
        />
      </View>
    );
  },
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const EmptyBadges: Story = {
  args: {
    activeTab: 'rounds',
    badges: {},
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Empty Badges Object" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const UndefinedBadges: Story = {
  args: {
    activeTab: 'rounds',
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Undefined Badges" />
      <BottomNavigation {...args} />
    </View>
  ),
};

export const MixedBadgeTypes: Story = {
  args: {
    activeTab: 'rounds',
    badges: {
      rounds: 1,
      competitions: 'NEW',
      friends: 99,
      profile: '!',
    },
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Mixed Badge Types" />
      <BottomNavigation {...args} />
    </View>
  ),
};

// ===========================================================================
// ACCESSIBILITY
// ===========================================================================

export const AccessibilityDemo: Story = {
  render: () => (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: spacing.lg }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.md }}>
          Accessibility Features
        </Text>
        <Text style={{ color: '#6B7280', marginBottom: spacing.sm }}>
          • Container has tablist role
        </Text>
        <Text style={{ color: '#6B7280', marginBottom: spacing.sm }}>
          • Each tab has tab role
        </Text>
        <Text style={{ color: '#6B7280', marginBottom: spacing.sm }}>
          • Active tab has selected state
        </Text>
        <Text style={{ color: '#6B7280', marginBottom: spacing.sm }}>
          • Descriptive accessibility labels
        </Text>
        <Text style={{ color: '#6B7280', marginBottom: spacing.sm }}>
          • Touch targets are 48x48 minimum
        </Text>
      </View>
      <BottomNavigation activeTab="rounds" badges={{ friends: 5 }} />
    </View>
  ),
};

// ===========================================================================
// PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    activeTab: 'rounds',
    badges: {
      friends: 3,
    },
  },
  render: (args) => (
    <View style={{ flex: 1 }}>
      <MockScreen label="Playground" />
      <BottomNavigation {...args} />
    </View>
  ),
};

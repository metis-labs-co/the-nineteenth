/**
 * EmptyState Storybook Stories
 *
 * Stories demonstrating the various configurations of the EmptyState component.
 * Shows different icons, action buttons, compact mode, and use case examples.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof EmptyState> = {
  title: 'Common/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    title: { control: 'text' },
    message: { control: 'text' },
    icon: {
      control: { type: 'select' },
      options: [
        'inbox-outline',
        'golf',
        'trophy-outline',
        'account-group-outline',
        'clipboard-list-outline',
        'calendar-blank-outline',
        'magnify',
      ],
    },
    actionLabel: { control: 'text' },
    compact: { control: 'boolean' },
    iconColor: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

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
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.sm,
  },
  sectionContent: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    title: 'Nothing here yet',
    message: 'Get started by adding some content',
  },
};

export const WithIcon: Story = {
  args: {
    title: 'No competitions found',
    message: 'Create your first competition to get started',
    icon: 'trophy-outline',
  },
};

export const WithAction: Story = {
  args: {
    title: 'No competitions yet',
    message: 'Create your first competition to invite friends and start playing',
    icon: 'trophy-outline',
    actionLabel: 'Create Competition',
    onAction: () => console.log('Create competition clicked'),
  },
};

export const Compact: Story = {
  args: {
    title: 'No players added',
    message: 'Add players to your competition',
    icon: 'account-group-outline',
    compact: true,
  },
};

export const CompactWithAction: Story = {
  args: {
    title: 'No players',
    message: 'Add players to continue',
    icon: 'account-group-outline',
    actionLabel: 'Add Players',
    onAction: () => console.log('Add players clicked'),
    compact: true,
  },
};

// ===========================================================================
// ICON VARIATIONS
// ===========================================================================

export const IconGolf: Story = {
  args: {
    title: 'No rounds scheduled',
    message: 'Schedule your first round',
    icon: 'golf',
  },
};

export const IconTrophy: Story = {
  args: {
    title: 'No competitions',
    message: 'Create a competition to start',
    icon: 'trophy-outline',
  },
};

export const IconPlayers: Story = {
  args: {
    title: 'No players',
    message: 'Add players to your competition',
    icon: 'account-group-outline',
  },
};

export const IconClipboard: Story = {
  args: {
    title: 'No scorecards',
    message: 'Scorecards will appear here',
    icon: 'clipboard-list-outline',
  },
};

export const IconCalendar: Story = {
  args: {
    title: 'No upcoming events',
    message: 'Check back later for scheduled events',
    icon: 'calendar-blank-outline',
  },
};

export const IconSearch: Story = {
  args: {
    title: 'No results found',
    message: 'Try adjusting your search criteria',
    icon: 'magnify',
  },
};

export const IconInbox: Story = {
  args: {
    title: 'Inbox empty',
    message: 'No new notifications',
    icon: 'inbox-outline',
  },
};

export const AllIcons: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="All Icon Options">
        <Card>
          <EmptyState
            title="Default (inbox-outline)"
            message="The default icon when none specified"
          />
        </Card>
        <Card>
          <EmptyState
            title="Golf"
            message="For golf-related empty states"
            icon="golf"
            compact
          />
        </Card>
        <Card>
          <EmptyState
            title="Trophy"
            message="For competitions and achievements"
            icon="trophy-outline"
            compact
          />
        </Card>
        <Card>
          <EmptyState
            title="Players"
            message="For player-related empty states"
            icon="account-group-outline"
            compact
          />
        </Card>
        <Card>
          <EmptyState
            title="Clipboard"
            message="For scorecards and lists"
            icon="clipboard-list-outline"
            compact
          />
        </Card>
        <Card>
          <EmptyState
            title="Calendar"
            message="For dates and events"
            icon="calendar-blank-outline"
            compact
          />
        </Card>
        <Card>
          <EmptyState
            title="Search"
            message="For search results"
            icon="magnify"
            compact
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// COMPACT MODE COMPARISON
// ===========================================================================

export const CompactComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Normal Mode">
        <Card>
          <EmptyState
            title="No competitions"
            message="Create your first competition to get started with organising golf events"
            icon="trophy-outline"
            actionLabel="Create Competition"
            onAction={() => {}}
          />
        </Card>
      </Section>
      <Section title="Compact Mode">
        <Card>
          <EmptyState
            title="No competitions"
            message="Create your first competition to get started with organising golf events"
            icon="trophy-outline"
            actionLabel="Create"
            onAction={() => {}}
            compact
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// CUSTOM ICON COLORS
// ===========================================================================

export const CustomIconColor: Story = {
  args: {
    title: 'Custom Color',
    message: 'Icon with custom color',
    icon: 'trophy-outline',
    iconColor: '#1E7F5E',
  },
};

export const IconColorVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Icon Color Variations">
        <Card>
          <EmptyState
            title="Default Gray"
            message="Default gray icon color"
            icon="trophy-outline"
            compact
          />
        </Card>
        <Card>
          <EmptyState
            title="Primary Green"
            message="Primary brand color"
            icon="trophy-outline"
            iconColor="#1E7F5E"
            compact
          />
        </Card>
        <Card>
          <EmptyState
            title="Error Red"
            message="Error/warning state"
            icon="trophy-outline"
            iconColor="#EF4444"
            compact
          />
        </Card>
        <Card>
          <EmptyState
            title="Info Blue"
            message="Informational state"
            icon="trophy-outline"
            iconColor="#3B82F6"
            compact
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

export const NoCompetitions: Story = {
  args: {
    title: 'No competitions yet',
    message: 'Create your first competition to invite friends and start playing golf together',
    icon: 'trophy-outline',
    actionLabel: 'Create Competition',
    onAction: () => console.log('Create competition'),
  },
};

export const NoSearchResults: Story = {
  args: {
    title: 'No results found',
    message: 'Try adjusting your search terms or filters',
    icon: 'magnify',
  },
};

export const NoPlayers: Story = {
  args: {
    title: 'No players added',
    message: 'Add players to your competition to get started',
    icon: 'account-group-outline',
    actionLabel: 'Add Players',
    onAction: () => console.log('Add players'),
    compact: true,
  },
};

export const NoRounds: Story = {
  args: {
    title: 'No rounds scheduled',
    message: 'Add rounds to your competition calendar',
    icon: 'calendar-blank-outline',
    actionLabel: 'Add Round',
    onAction: () => console.log('Add round'),
  },
};

export const NoScorecards: Story = {
  args: {
    title: 'No scorecards',
    message: 'Scorecards will appear here after rounds are completed',
    icon: 'clipboard-list-outline',
  },
};

export const NoFriends: Story = {
  args: {
    title: 'No friends yet',
    message: 'Find and add friends to play golf together',
    icon: 'account-group-outline',
    actionLabel: 'Find Friends',
    onAction: () => console.log('Find friends'),
  },
};

export const NoNotifications: Story = {
  args: {
    title: 'All caught up!',
    message: 'No new notifications at the moment',
    icon: 'inbox-outline',
  },
};

export const UseCaseGallery: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition States">
        <Card>
          <EmptyState
            title="No competitions"
            message="Create your first competition"
            icon="trophy-outline"
            actionLabel="Create"
            onAction={() => {}}
            compact
          />
        </Card>
      </Section>
      <Section title="Search States">
        <Card>
          <EmptyState
            title="No results"
            message="Try a different search"
            icon="magnify"
            compact
          />
        </Card>
      </Section>
      <Section title="Player States">
        <Card>
          <EmptyState
            title="No players"
            message="Add players to continue"
            icon="account-group-outline"
            actionLabel="Add"
            onAction={() => {}}
            compact
          />
        </Card>
      </Section>
      <Section title="Notification States">
        <Card>
          <EmptyState
            title="All clear!"
            message="No new notifications"
            icon="inbox-outline"
            compact
          />
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
    title: 'This is a very long title that might need to wrap to multiple lines on smaller screens',
    message: 'Short message',
  },
};

export const LongMessage: Story = {
  args: {
    title: 'Empty State',
    message:
      'This is a very long message that provides detailed information about why the current view is empty and what actions the user can take to populate it with content. It should wrap nicely and remain readable.',
  },
};

export const ShortContent: Story = {
  args: {
    title: 'Empty',
    message: 'No data',
    compact: true,
  },
};

export const WithEmoji: Story = {
  args: {
    title: 'No rounds yet! 🏌️',
    message: 'Start your first round and track your scores',
    icon: 'golf',
    actionLabel: 'Start Round',
    onAction: () => console.log('Start round'),
  },
};

export const SpecialCharacters: Story = {
  args: {
    title: 'No results for "player & friend"',
    message: 'Try searching with different terms (e.g., name, email)',
    icon: 'magnify',
  },
};

// ===========================================================================
// BUTTON VARIATIONS
// ===========================================================================

export const ShortActionLabel: Story = {
  args: {
    title: 'Empty',
    message: 'Add content',
    actionLabel: 'Add',
    onAction: () => {},
  },
};

export const LongActionLabel: Story = {
  args: {
    title: 'No data',
    message: 'Get started by creating content',
    actionLabel: 'Create New Competition Now',
    onAction: () => {},
  },
};

export const ActionButtonStyles: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Short Action Label">
        <Card>
          <EmptyState
            title="Empty"
            message="Add content to get started"
            actionLabel="Add"
            onAction={() => {}}
            compact
          />
        </Card>
      </Section>
      <Section title="Medium Action Label">
        <Card>
          <EmptyState
            title="No items"
            message="Create your first item"
            actionLabel="Create Item"
            onAction={() => {}}
            compact
          />
        </Card>
      </Section>
      <Section title="Long Action Label">
        <Card>
          <EmptyState
            title="No data"
            message="Start now"
            actionLabel="Create New Competition"
            onAction={() => {}}
            compact
          />
        </Card>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// WITHOUT ACTION BUTTON
// ===========================================================================

export const InformationalOnly: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Informational Empty States (No Action)">
        <Card>
          <EmptyState
            title="No activity"
            message="Recent activity will appear here"
            icon="clipboard-list-outline"
            compact
          />
        </Card>
        <Card>
          <EmptyState
            title="Coming soon"
            message="This feature is under development"
            icon="calendar-blank-outline"
            compact
          />
        </Card>
        <Card>
          <EmptyState
            title="Processing"
            message="Results will appear once processing is complete"
            icon="inbox-outline"
            compact
          />
        </Card>
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
        <Card>
          <EmptyState
            title="Screen Reader Friendly"
            message="This component has proper accessibility labels and roles"
            icon="trophy-outline"
            actionLabel="Learn More"
            onAction={() => {}}
          />
        </Card>
      </Section>
      <Text style={{ fontSize: 12, color: '#6B7280', padding: spacing.md }}>
        Note: The container has a combined accessibility label, the title has a header role,
        and the button has accessibility label and hint.
      </Text>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    title: 'Customize Me',
    message: 'Use the controls to customize this empty state',
    icon: 'inbox-outline',
    actionLabel: 'Action',
    onAction: () => console.log('Action clicked'),
    compact: false,
    iconColor: undefined,
  },
};

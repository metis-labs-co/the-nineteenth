/**
 * PageHeader Storybook Stories
 *
 * Stories demonstrating the various configurations of the PageHeader component.
 * Shows both default (left-aligned) and centered variants with different prop combinations.
 */

import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { PageHeader } from './PageHeader';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof PageHeader> = {
  title: 'Common/PageHeader',
  component: PageHeader,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    variant: {
      control: { type: 'select' },
      options: ['default', 'centered'],
    },
    showBack: { control: 'boolean' },
    backIcon: {
      control: { type: 'select' },
      options: ['arrow', 'close'],
    },
    backgroundColor: { control: 'color' },
    titleColor: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

// ===========================================================================
// WRAPPER COMPONENT
// ===========================================================================

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View style={wrapperStyles.container}>
      {children}
      <View style={wrapperStyles.content}>
        <Text style={wrapperStyles.text}>Page content goes here</Text>
      </View>
    </View>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  text: {
    color: '#666666',
    fontSize: 16,
  },
});

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

const handleBack = () => Alert.alert('Back pressed');
const handleAdd = () => Alert.alert('Add pressed');
const handleSettings = () => Alert.alert('Settings pressed');
const handleNotifications = () => Alert.alert('Notifications pressed');
const handleSearch = () => Alert.alert('Search pressed');
const handleFilter = () => Alert.alert('Filter pressed');

// ===========================================================================
// DEFAULT VARIANT STORIES
// ===========================================================================

/**
 * Simple header with just a title - the most basic usage
 */
export const Default: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader title="Competitions" />
    </PageWrapper>
  ),
};

/**
 * Header with title and subtitle
 */
export const WithSubtitle: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Summer Championship"
        subtitle="Round 1 of 4"
      />
    </PageWrapper>
  ),
};

/**
 * Header with back button (arrow icon)
 */
export const WithBackButton: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Competition Details"
        showBack
        onBack={handleBack}
      />
    </PageWrapper>
  ),
};

/**
 * Header with back button and subtitle
 */
export const WithBackAndSubtitle: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Round Details"
        subtitle="18 holes at Royal Melbourne"
        showBack
        onBack={handleBack}
      />
    </PageWrapper>
  ),
};

/**
 * Header with close button (for modals)
 */
export const WithCloseButton: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Add Player"
        showBack
        onBack={handleBack}
        backIcon="close"
      />
    </PageWrapper>
  ),
};

/**
 * Header with a single action button
 */
export const WithSingleAction: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Players"
        rightActions={[
          { icon: 'plus', onPress: handleAdd, accessibilityLabel: 'Add player' },
        ]}
      />
    </PageWrapper>
  ),
};

/**
 * Header with two action buttons (maximum recommended)
 */
export const WithTwoActions: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Leaderboard"
        rightActions={[
          { icon: 'magnify', onPress: handleSearch, accessibilityLabel: 'Search' },
          { icon: 'filter-variant', onPress: handleFilter, accessibilityLabel: 'Filter' },
        ]}
      />
    </PageWrapper>
  ),
};

/**
 * Header with action that has a notification badge
 */
export const WithNotificationBadge: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Dashboard"
        rightActions={[
          {
            icon: 'bell-outline',
            onPress: handleNotifications,
            accessibilityLabel: 'Notifications',
            showBadge: true,
          },
          { icon: 'cog-outline', onPress: handleSettings, accessibilityLabel: 'Settings' },
        ]}
      />
    </PageWrapper>
  ),
};

/**
 * Header with back button and actions
 */
export const WithBackAndActions: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Scorecard"
        showBack
        onBack={handleBack}
        rightActions={[
          { icon: 'share-variant', onPress: () => Alert.alert('Share'), accessibilityLabel: 'Share' },
        ]}
      />
    </PageWrapper>
  ),
};

/**
 * Full featured header - back, subtitle, and multiple actions
 */
export const FullFeatured: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Competition Details"
        subtitle="Summer Championship 2024"
        showBack
        onBack={handleBack}
        rightActions={[
          { icon: 'pencil', onPress: () => Alert.alert('Edit'), accessibilityLabel: 'Edit' },
          { icon: 'dots-vertical', onPress: () => Alert.alert('More'), accessibilityLabel: 'More options' },
        ]}
      />
    </PageWrapper>
  ),
};

// ===========================================================================
// CENTERED VARIANT STORIES
// ===========================================================================

/**
 * Centered variant - title centered with balanced layout
 */
export const CenteredVariant: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Profile"
        variant="centered"
      />
    </PageWrapper>
  ),
};

/**
 * Centered variant with back button
 */
export const CenteredWithBack: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Player Details"
        variant="centered"
        showBack
        onBack={handleBack}
      />
    </PageWrapper>
  ),
};

/**
 * Centered variant with close button (modal style)
 */
export const CenteredWithClose: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Settings"
        variant="centered"
        showBack
        onBack={handleBack}
        backIcon="close"
      />
    </PageWrapper>
  ),
};

/**
 * Centered variant with subtitle
 */
export const CenteredWithSubtitle: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Hole 7"
        subtitle="Par 4 - 420 yards"
        variant="centered"
        showBack
        onBack={handleBack}
      />
    </PageWrapper>
  ),
};

/**
 * Centered variant with actions
 */
export const CenteredWithActions: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Scoring"
        variant="centered"
        showBack
        onBack={handleBack}
        rightActions={[
          { icon: 'information-outline', onPress: () => Alert.alert('Info'), accessibilityLabel: 'Information' },
        ]}
      />
    </PageWrapper>
  ),
};

/**
 * Centered fully featured
 */
export const CenteredFullFeatured: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Round Scorecard"
        subtitle="Hole 12 of 18"
        variant="centered"
        showBack
        onBack={handleBack}
        rightActions={[
          { icon: 'chart-line', onPress: () => Alert.alert('Stats'), accessibilityLabel: 'Statistics', showBadge: true },
        ]}
      />
    </PageWrapper>
  ),
};

// ===========================================================================
// CUSTOM CONTENT STORIES
// ===========================================================================

/**
 * Header with custom right content instead of actions
 */
export const WithCustomRightContent: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Create Competition"
        showBack
        onBack={handleBack}
        rightContent={
          <TouchableOpacity
            onPress={() => Alert.alert('Save pressed')}
            style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
          >
            <Text style={{ color: '#2E7D32', fontWeight: '600', fontSize: 16 }}>Save</Text>
          </TouchableOpacity>
        }
      />
    </PageWrapper>
  ),
};

/**
 * Header with custom title node (e.g., with icon)
 */
export const WithCustomTitleNode: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 24, height: 24, backgroundColor: '#2E7D32', borderRadius: 12 }} />
            <Text style={{ fontSize: 20, fontWeight: '600' }}>My Profile</Text>
          </View>
        }
      />
    </PageWrapper>
  ),
};

// ===========================================================================
// STYLING STORIES
// ===========================================================================

/**
 * Header with custom background color
 */
export const CustomBackgroundColor: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Premium Section"
        backgroundColor="#2E7D32"
        titleColor="#FFFFFF"
        showBack
        onBack={handleBack}
      />
    </PageWrapper>
  ),
};

/**
 * Dark themed header (custom colors)
 */
export const DarkThemed: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Night Mode"
        subtitle="Easier on the eyes"
        backgroundColor="#1A1A1A"
        titleColor="#FFFFFF"
        rightActions={[
          { icon: 'brightness-4', onPress: () => Alert.alert('Toggle'), accessibilityLabel: 'Toggle theme', color: '#FFFFFF' },
        ]}
      />
    </PageWrapper>
  ),
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

/**
 * Header with very long title (should truncate)
 */
export const LongTitle: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="This is a very long competition title that should be truncated"
        showBack
        onBack={handleBack}
      />
    </PageWrapper>
  ),
};

/**
 * Header with very long title and subtitle
 */
export const LongTitleAndSubtitle: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Annual Summer Golf Championship 2024"
        subtitle="Sponsored by Golf Australia - Round 3 of 4 at Royal Melbourne Golf Club"
        showBack
        onBack={handleBack}
      />
    </PageWrapper>
  ),
};

/**
 * Centered variant with long title
 */
export const CenteredLongTitle: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader
        title="This is a very long page title centered"
        variant="centered"
        showBack
        onBack={handleBack}
        rightActions={[
          { icon: 'dots-vertical', onPress: () => {}, accessibilityLabel: 'More' },
        ]}
      />
    </PageWrapper>
  ),
};

/**
 * Empty/minimal header
 */
export const MinimalEmpty: Story = {
  render: () => (
    <PageWrapper>
      <PageHeader title="" />
    </PageWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

/**
 * Competition list screen header
 */
export const UseCaseCompetitionList: Story = {
  name: 'Use Case: Competition List',
  render: () => (
    <PageWrapper>
      <PageHeader
        title="My Competitions"
        rightActions={[
          { icon: 'plus', onPress: handleAdd, accessibilityLabel: 'Create competition' },
        ]}
      />
    </PageWrapper>
  ),
};

/**
 * Competition detail screen header
 */
export const UseCaseCompetitionDetail: Story = {
  name: 'Use Case: Competition Detail',
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Summer Championship"
        subtitle="4 rounds - 16 players"
        variant="centered"
        showBack
        onBack={handleBack}
        rightActions={[
          { icon: 'share-variant', onPress: () => Alert.alert('Share'), accessibilityLabel: 'Share' },
        ]}
      />
    </PageWrapper>
  ),
};

/**
 * Scorecard screen header
 */
export const UseCaseScorecard: Story = {
  name: 'Use Case: Scorecard',
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Hole 14"
        subtitle="Par 5 - 540 yards"
        variant="centered"
        showBack
        onBack={handleBack}
        rightActions={[
          { icon: 'information-outline', onPress: () => Alert.alert('Hole info'), accessibilityLabel: 'Hole information' },
        ]}
      />
    </PageWrapper>
  ),
};

/**
 * Modal/form screen header
 */
export const UseCaseModal: Story = {
  name: 'Use Case: Modal Form',
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Add Player"
        variant="centered"
        showBack
        onBack={handleBack}
        backIcon="close"
        rightContent={
          <TouchableOpacity onPress={() => Alert.alert('Done')}>
            <Text style={{ color: '#2E7D32', fontWeight: '600', fontSize: 16 }}>Done</Text>
          </TouchableOpacity>
        }
      />
    </PageWrapper>
  ),
};

/**
 * Settings screen header
 */
export const UseCaseSettings: Story = {
  name: 'Use Case: Settings',
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Settings"
        variant="centered"
        showBack
        onBack={handleBack}
      />
    </PageWrapper>
  ),
};

/**
 * Leaderboard screen header
 */
export const UseCaseLeaderboard: Story = {
  name: 'Use Case: Leaderboard',
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Leaderboard"
        showBack
        onBack={handleBack}
        rightActions={[
          { icon: 'filter-variant', onPress: handleFilter, accessibilityLabel: 'Filter rounds' },
          { icon: 'refresh', onPress: () => Alert.alert('Refresh'), accessibilityLabel: 'Refresh' },
        ]}
      />
    </PageWrapper>
  ),
};

/**
 * Profile screen header with notifications
 */
export const UseCaseProfile: Story = {
  name: 'Use Case: Profile',
  render: () => (
    <PageWrapper>
      <PageHeader
        title="Profile"
        rightActions={[
          { icon: 'bell-outline', onPress: handleNotifications, accessibilityLabel: 'Notifications', showBadge: true },
          { icon: 'cog-outline', onPress: handleSettings, accessibilityLabel: 'Settings' },
        ]}
      />
    </PageWrapper>
  ),
};

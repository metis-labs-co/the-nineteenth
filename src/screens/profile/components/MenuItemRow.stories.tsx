/**
 * MenuItemRow Storybook Stories
 *
 * Stories demonstrating the various configurations of the MenuItemRow component.
 * Shows navigation items, settings toggles, badges, and destructive actions.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { Text, Badge } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { MenuItemRow } from './MenuItemRow';
import { spacing, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof MenuItemRow> = {
  title: 'Profile/MenuItemRow',
  component: MenuItemRow,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    icon: { control: 'text' },
    showChevron: { control: 'boolean' },
    destructive: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof MenuItemRow>;

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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  return (
    <View style={wrapperStyles.section}>
      <Text style={[wrapperStyles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      <View
        style={[
          wrapperStyles.sectionContent,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function Divider() {
  const colors = useThemeColors();
  return (
    <View
      style={[
        wrapperStyles.divider,
        { backgroundColor: colors.border, marginLeft: 56 },
      ]}
    />
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
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: spacing.lg,
  },
  sectionContent: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    title: 'Menu Item',
    icon: 'cog',
    onPress: () => console.log('Pressed'),
  },
};

export const WithSubtitle: Story = {
  args: {
    title: 'My Statistics',
    subtitle: 'View your performance',
    icon: 'chart-line',
    onPress: () => console.log('Pressed'),
  },
};

export const WithoutChevron: Story = {
  args: {
    title: 'Help & Support',
    icon: 'help-circle-outline',
    showChevron: false,
    onPress: () => console.log('Pressed'),
  },
};

export const Destructive: Story = {
  args: {
    title: 'Log Out',
    icon: 'logout',
    destructive: true,
    showChevron: false,
    onPress: () => console.log('Pressed'),
  },
};

export const Disabled: Story = {
  args: {
    title: 'Premium Feature',
    subtitle: 'Upgrade to access',
    icon: 'crown',
    disabled: true,
    onPress: () => console.log('Pressed'),
  },
};

// ===========================================================================
// WITH BADGE
// ===========================================================================

function WithBadgeDemo() {
  const colors = useThemeColors();
  return (
    <StoryWrapper>
      <Section title="With Badge">
        <MenuItemRow
          title="Notifications"
          icon="bell-outline"
          onPress={() => console.log('Notifications')}
          rightContent={
            <Badge
              style={{ backgroundColor: colors.error }}
              size={20}
            >
              5
            </Badge>
          }
        />
      </Section>
    </StoryWrapper>
  );
}

export const WithBadge: Story = {
  render: () => <WithBadgeDemo />,
};

// ===========================================================================
// WITH SWITCH
// ===========================================================================

function WithSwitchDemo() {
  const [enabled, setEnabled] = useState(true);
  const colors = useThemeColors();

  return (
    <StoryWrapper>
      <Section title="With Switch">
        <MenuItemRow
          title="Push Notifications"
          icon="bell"
          showChevron={false}
          rightContent={
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={enabled ? colors.primary : colors.textSecondary}
            />
          }
          onPress={() => setEnabled(!enabled)}
        />
      </Section>
    </StoryWrapper>
  );
}

export const WithSwitch: Story = {
  render: () => <WithSwitchDemo />,
};

// ===========================================================================
// WITH VALUE TEXT
// ===========================================================================

function WithValueDemo() {
  const colors = useThemeColors();
  return (
    <StoryWrapper>
      <Section title="With Value Text">
        <MenuItemRow
          title="Handicap"
          icon="golf"
          onPress={() => console.log('Edit handicap')}
          rightContent={
            <Text style={{ color: colors.textSecondary }}>12.4</Text>
          }
        />
      </Section>
    </StoryWrapper>
  );
}

export const WithValue: Story = {
  render: () => <WithValueDemo />,
};

// ===========================================================================
// PROFILE SCREEN EXAMPLE
// ===========================================================================

function ProfileScreenDemo() {
  const [darkMode, setDarkMode] = useState(false);
  const colors = useThemeColors();

  return (
    <StoryWrapper>
      <Section title="Account">
        <MenuItemRow
          title="Edit Profile"
          subtitle="Change your name, photo, and bio"
          icon="account-edit-outline"
          onPress={() => console.log('Edit Profile')}
        />
        <Divider />
        <MenuItemRow
          title="My Statistics"
          subtitle="View your performance"
          icon="chart-line"
          onPress={() => console.log('My Statistics')}
        />
        <Divider />
        <MenuItemRow
          title="Handicap"
          icon="golf"
          onPress={() => console.log('Edit handicap')}
          rightContent={
            <Text style={{ color: colors.textSecondary }}>12.4</Text>
          }
        />
      </Section>

      <Section title="Preferences">
        <MenuItemRow
          title="Notifications"
          icon="bell-outline"
          onPress={() => console.log('Notifications')}
          rightContent={
            <Badge
              style={{ backgroundColor: colors.error }}
              size={20}
            >
              3
            </Badge>
          }
        />
        <Divider />
        <MenuItemRow
          title="Dark Mode"
          icon="theme-light-dark"
          showChevron={false}
          rightContent={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={darkMode ? colors.primary : colors.textSecondary}
            />
          }
          onPress={() => setDarkMode(!darkMode)}
        />
        <Divider />
        <MenuItemRow
          title="Home Venue"
          subtitle="Royal Melbourne Golf Club"
          icon="golf-tee"
          onPress={() => console.log('Home Venue')}
        />
      </Section>

      <Section title="Support">
        <MenuItemRow
          title="Help & Support"
          icon="help-circle-outline"
          onPress={() => console.log('Help')}
        />
        <Divider />
        <MenuItemRow
          title="Privacy Policy"
          icon="shield-check-outline"
          onPress={() => console.log('Privacy')}
        />
        <Divider />
        <MenuItemRow
          title="Terms of Service"
          icon="file-document-outline"
          onPress={() => console.log('Terms')}
        />
      </Section>

      <Section title="Account Actions">
        <MenuItemRow
          title="Log Out"
          icon="logout"
          destructive
          showChevron={false}
          onPress={() => console.log('Log Out')}
        />
        <Divider />
        <MenuItemRow
          title="Delete Account"
          subtitle="Permanently remove your data"
          icon="trash-can-outline"
          destructive
          showChevron={false}
          onPress={() => console.log('Delete Account')}
        />
      </Section>
    </StoryWrapper>
  );
}

export const ProfileScreenExample: Story = {
  render: () => <ProfileScreenDemo />,
};

// ===========================================================================
// SETTINGS SCREEN EXAMPLE
// ===========================================================================

function SettingsScreenDemo() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [roundReminders, setRoundReminders] = useState(true);
  const [scoreSubmissions, setScoreSubmissions] = useState(false);
  const colors = useThemeColors();

  return (
    <StoryWrapper>
      <Section title="Push Notifications">
        <MenuItemRow
          title="Enable Push Notifications"
          icon="bell"
          showChevron={false}
          rightContent={
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={pushEnabled ? colors.primary : colors.textSecondary}
            />
          }
          onPress={() => setPushEnabled(!pushEnabled)}
        />
      </Section>

      <Section title="Notification Types">
        <MenuItemRow
          title="Round Reminders"
          subtitle="Get notified before your rounds"
          icon="alarm"
          showChevron={false}
          disabled={!pushEnabled}
          rightContent={
            <Switch
              value={roundReminders}
              onValueChange={setRoundReminders}
              disabled={!pushEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={roundReminders && pushEnabled ? colors.primary : colors.textSecondary}
            />
          }
          onPress={() => pushEnabled && setRoundReminders(!roundReminders)}
        />
        <Divider />
        <MenuItemRow
          title="Score Submissions"
          subtitle="When players submit scorecards"
          icon="clipboard-check-outline"
          showChevron={false}
          disabled={!pushEnabled}
          rightContent={
            <Switch
              value={scoreSubmissions}
              onValueChange={setScoreSubmissions}
              disabled={!pushEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={scoreSubmissions && pushEnabled ? colors.primary : colors.textSecondary}
            />
          }
          onPress={() => pushEnabled && setScoreSubmissions(!scoreSubmissions)}
        />
      </Section>

      <Section title="Email Notifications">
        <MenuItemRow
          title="Email Updates"
          subtitle="Weekly competition summaries"
          icon="email-outline"
          showChevron={false}
          rightContent={
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={emailEnabled ? colors.primary : colors.textSecondary}
            />
          }
          onPress={() => setEmailEnabled(!emailEnabled)}
        />
      </Section>
    </StoryWrapper>
  );
}

export const SettingsScreenExample: Story = {
  render: () => <SettingsScreenDemo />,
};

// ===========================================================================
// ALL STATES SHOWCASE
// ===========================================================================

function AllStatesShowcase() {
  const [switchOn, setSwitchOn] = useState(true);
  const colors = useThemeColors();

  return (
    <StoryWrapper>
      <Section title="Default Navigation">
        <MenuItemRow
          title="Default Item"
          icon="cog"
          onPress={() => console.log('Pressed')}
        />
      </Section>

      <Section title="With Subtitle">
        <MenuItemRow
          title="Item with Subtitle"
          subtitle="Additional context information"
          icon="information-outline"
          onPress={() => console.log('Pressed')}
        />
      </Section>

      <Section title="Without Chevron">
        <MenuItemRow
          title="No Chevron"
          icon="star-outline"
          showChevron={false}
          onPress={() => console.log('Pressed')}
        />
      </Section>

      <Section title="Disabled State">
        <MenuItemRow
          title="Disabled Item"
          subtitle="This item is not interactive"
          icon="lock-outline"
          disabled
          onPress={() => console.log('Pressed')}
        />
      </Section>

      <Section title="Destructive Action">
        <MenuItemRow
          title="Delete Something"
          icon="trash-can-outline"
          destructive
          showChevron={false}
          onPress={() => console.log('Delete')}
        />
      </Section>

      <Section title="With Badge">
        <MenuItemRow
          title="Notifications"
          icon="bell-outline"
          onPress={() => console.log('Notifications')}
          rightContent={
            <Badge
              style={{ backgroundColor: colors.error }}
              size={20}
            >
              12
            </Badge>
          }
        />
      </Section>

      <Section title="With Switch">
        <MenuItemRow
          title="Toggle Setting"
          icon="toggle-switch-outline"
          showChevron={false}
          rightContent={
            <Switch
              value={switchOn}
              onValueChange={setSwitchOn}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={switchOn ? colors.primary : colors.textSecondary}
            />
          }
          onPress={() => setSwitchOn(!switchOn)}
        />
      </Section>

      <Section title="With Value Text">
        <MenuItemRow
          title="Selected Value"
          icon="format-list-bulleted"
          onPress={() => console.log('Select')}
          rightContent={
            <Text style={{ color: colors.textSecondary }}>Option A</Text>
          }
        />
      </Section>
    </StoryWrapper>
  );
}

export const AllStates: Story = {
  render: () => <AllStatesShowcase />,
};

// ===========================================================================
// VARIOUS ICONS
// ===========================================================================

function IconShowcase() {
  return (
    <StoryWrapper>
      <Section title="Common Icons">
        <MenuItemRow
          title="Account"
          icon="account-outline"
          onPress={() => {}}
        />
        <Divider />
        <MenuItemRow
          title="Settings"
          icon="cog-outline"
          onPress={() => {}}
        />
        <Divider />
        <MenuItemRow
          title="Notifications"
          icon="bell-outline"
          onPress={() => {}}
        />
        <Divider />
        <MenuItemRow
          title="Privacy"
          icon="shield-check-outline"
          onPress={() => {}}
        />
        <Divider />
        <MenuItemRow
          title="Help"
          icon="help-circle-outline"
          onPress={() => {}}
        />
      </Section>

      <Section title="Golf Icons">
        <MenuItemRow
          title="Golf Ball"
          icon="golf"
          onPress={() => {}}
        />
        <Divider />
        <MenuItemRow
          title="Golf Tee"
          icon="golf-tee"
          onPress={() => {}}
        />
        <Divider />
        <MenuItemRow
          title="Trophy"
          icon="trophy-outline"
          onPress={() => {}}
        />
        <Divider />
        <MenuItemRow
          title="Statistics"
          icon="chart-line"
          onPress={() => {}}
        />
        <Divider />
        <MenuItemRow
          title="Leaderboard"
          icon="format-list-numbered"
          onPress={() => {}}
        />
      </Section>
    </StoryWrapper>
  );
}

export const IconVariants: Story = {
  render: () => <IconShowcase />,
};

// ===========================================================================
// PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    title: 'Playground Item',
    subtitle: 'Use controls to customize',
    icon: 'cog',
    showChevron: true,
    destructive: false,
    disabled: false,
    onPress: () => console.log('Pressed'),
  },
};

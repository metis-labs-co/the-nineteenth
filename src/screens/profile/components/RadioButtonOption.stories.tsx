/**
 * RadioButtonOption Storybook Stories
 *
 * Stories for the radio-style selection option component.
 * Demonstrates different states, variations, and use cases.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { RadioButtonOption } from './RadioButtonOption';

const meta: Meta<typeof RadioButtonOption> = {
  title: 'Profile/RadioButtonOption',
  component: RadioButtonOption,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <View style={styles.container}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    label: {
      control: 'text',
      description: 'Main label text displayed in the option',
    },
    description: {
      control: 'text',
      description: 'Optional secondary text below the label',
    },
    selected: {
      control: 'boolean',
      description: 'Whether this option is currently selected',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the option is disabled',
    },
    icon: {
      control: 'text',
      description: 'Material Community Icons name for left icon',
    },
    onSelect: {
      action: 'selected',
      description: 'Callback when the option is tapped',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RadioButtonOption>;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    minWidth: 320,
    maxWidth: 400,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  optionGroup: {
    gap: 8,
  },
  spacer: {
    height: 12,
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
});

// =========================================================================
// BASIC STORIES
// =========================================================================

export const Default: Story = {
  args: {
    label: 'Option Label',
    selected: false,
    disabled: false,
  },
};

export const Selected: Story = {
  args: {
    label: 'Selected Option',
    selected: true,
    disabled: false,
  },
};

export const Unselected: Story = {
  args: {
    label: 'Unselected Option',
    selected: false,
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Option',
    selected: false,
    disabled: true,
  },
};

export const SelectedAndDisabled: Story = {
  args: {
    label: 'Selected Disabled',
    selected: true,
    disabled: true,
  },
};

// =========================================================================
// WITH DESCRIPTION
// =========================================================================

export const WithDescription: Story = {
  args: {
    label: 'Yards',
    description: 'Imperial measurement system',
    selected: false,
  },
};

export const WithDescriptionSelected: Story = {
  args: {
    label: 'Meters',
    description: 'Metric measurement system',
    selected: true,
  },
};

export const LongDescription: Story = {
  args: {
    label: 'Premium Plan',
    description:
      'Unlimited competitions, all game types, priority support, and advanced analytics',
    selected: false,
  },
};

// =========================================================================
// WITH ICON
// =========================================================================

export const WithIcon: Story = {
  args: {
    label: 'Distance Units',
    icon: 'ruler',
    selected: false,
  },
};

export const WithIconSelected: Story = {
  args: {
    label: 'Push Notifications',
    icon: 'bell',
    selected: true,
  },
};

export const WithIconAndDescription: Story = {
  args: {
    label: 'Yards',
    description: 'Imperial measurement',
    icon: 'ruler',
    selected: true,
  },
};

export const WithIconDisabled: Story = {
  args: {
    label: 'Premium Feature',
    description: 'Upgrade to access',
    icon: 'lock',
    selected: false,
    disabled: true,
  },
};

// =========================================================================
// INTERACTIVE STORIES
// =========================================================================

/**
 * Interactive toggle demonstration
 */
export const InteractiveToggle: Story = {
  render: function ToggleStory() {
    const [selected, setSelected] = useState(false);
    return (
      <View>
        <RadioButtonOption
          label="Toggle Option"
          description="Tap to toggle selection"
          selected={selected}
          onSelect={() => setSelected(!selected)}
        />
        <Text style={styles.hint}>
          State: {selected ? 'Selected' : 'Not selected'}
        </Text>
      </View>
    );
  },
};

/**
 * Single select option group (radio behavior)
 */
export const SingleSelectGroup: Story = {
  render: function SingleSelectStory() {
    const [selected, setSelected] = useState('yards');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Distance Unit</Text>
        <View style={styles.optionGroup}>
          <RadioButtonOption
            label="Yards"
            description="Imperial measurement"
            icon="ruler"
            selected={selected === 'yards'}
            onSelect={() => setSelected('yards')}
          />
          <RadioButtonOption
            label="Meters"
            description="Metric measurement"
            icon="ruler"
            selected={selected === 'meters'}
            onSelect={() => setSelected('meters')}
          />
        </View>
        <Text style={styles.hint}>Selected: {selected}</Text>
      </View>
    );
  },
};

// =========================================================================
// USE CASE STORIES
// =========================================================================

/**
 * Settings: Distance unit preference
 */
export const DistanceUnitSettings: Story = {
  render: function DistanceUnitStory() {
    const [unit, setUnit] = useState('yards');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Distance Unit</Text>
        <View style={styles.optionGroup}>
          <RadioButtonOption
            label="Yards"
            description="Traditional golf measurement"
            icon="golf"
            selected={unit === 'yards'}
            onSelect={() => setUnit('yards')}
          />
          <RadioButtonOption
            label="Meters"
            description="Metric system"
            icon="earth"
            selected={unit === 'meters'}
            onSelect={() => setUnit('meters')}
          />
        </View>
      </View>
    );
  },
};

/**
 * Help & Support: Inquiry type selector
 */
export const InquiryTypeSelector: Story = {
  render: function InquiryTypeStory() {
    const [type, setType] = useState('feedback');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What can we help you with?</Text>
        <View style={styles.optionGroup}>
          <RadioButtonOption
            label="General Feedback"
            description="Share your thoughts about the app"
            icon="message-text"
            selected={type === 'feedback'}
            onSelect={() => setType('feedback')}
          />
          <RadioButtonOption
            label="Bug Report"
            description="Report an issue or unexpected behavior"
            icon="bug"
            selected={type === 'bug'}
            onSelect={() => setType('bug')}
          />
          <RadioButtonOption
            label="Feature Request"
            description="Suggest a new feature or improvement"
            icon="lightbulb"
            selected={type === 'feature'}
            onSelect={() => setType('feature')}
          />
          <RadioButtonOption
            label="Account Issue"
            description="Problems with login, profile, or subscription"
            icon="account-alert"
            selected={type === 'account'}
            onSelect={() => setType('account')}
          />
        </View>
      </View>
    );
  },
};

/**
 * Theme selection
 */
export const ThemeSelection: Story = {
  render: function ThemeStory() {
    const [theme, setTheme] = useState('system');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Theme</Text>
        <View style={styles.optionGroup}>
          <RadioButtonOption
            label="System"
            description="Follow device settings"
            icon="cellphone"
            selected={theme === 'system'}
            onSelect={() => setTheme('system')}
          />
          <RadioButtonOption
            label="Light"
            description="Always use light theme"
            icon="white-balance-sunny"
            selected={theme === 'light'}
            onSelect={() => setTheme('light')}
          />
          <RadioButtonOption
            label="Dark"
            description="Always use dark theme"
            icon="weather-night"
            selected={theme === 'dark'}
            onSelect={() => setTheme('dark')}
          />
        </View>
      </View>
    );
  },
};

/**
 * Notification preferences
 */
export const NotificationPreferences: Story = {
  render: function NotificationStory() {
    const [frequency, setFrequency] = useState('all');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Frequency</Text>
        <View style={styles.optionGroup}>
          <RadioButtonOption
            label="All Notifications"
            description="Get notified about everything"
            icon="bell"
            selected={frequency === 'all'}
            onSelect={() => setFrequency('all')}
          />
          <RadioButtonOption
            label="Important Only"
            description="Only receive critical updates"
            icon="bell-outline"
            selected={frequency === 'important'}
            onSelect={() => setFrequency('important')}
          />
          <RadioButtonOption
            label="None"
            description="Turn off all notifications"
            icon="bell-off"
            selected={frequency === 'none'}
            onSelect={() => setFrequency('none')}
          />
        </View>
      </View>
    );
  },
};

/**
 * Subscription tier selection
 */
export const SubscriptionTiers: Story = {
  render: function SubscriptionStory() {
    const [tier, setTier] = useState('free');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose Your Plan</Text>
        <View style={styles.optionGroup}>
          <RadioButtonOption
            label="Free"
            description="Basic features, 3 competitions"
            icon="account"
            selected={tier === 'free'}
            onSelect={() => setTier('free')}
          />
          <RadioButtonOption
            label="Social"
            description="8 competitions, team formats"
            icon="account-group"
            selected={tier === 'social'}
            onSelect={() => setTier('social')}
          />
          <RadioButtonOption
            label="Premium"
            description="Unlimited competitions, all features"
            icon="crown"
            selected={tier === 'premium'}
            onSelect={() => setTier('premium')}
          />
        </View>
      </View>
    );
  },
};

/**
 * Game type selection
 */
export const GameTypeSelection: Story = {
  render: function GameTypeStory() {
    const [gameType, setGameType] = useState('stableford');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Type</Text>
        <View style={styles.optionGroup}>
          <RadioButtonOption
            label="Stableford"
            description="Points-based scoring system"
            icon="star"
            selected={gameType === 'stableford'}
            onSelect={() => setGameType('stableford')}
          />
          <RadioButtonOption
            label="Stroke Play"
            description="Traditional stroke counting"
            icon="golf"
            selected={gameType === 'stroke'}
            onSelect={() => setGameType('stroke')}
          />
          <RadioButtonOption
            label="Match Play"
            description="Hole-by-hole competition"
            icon="flag"
            selected={gameType === 'match'}
            onSelect={() => setGameType('match')}
          />
        </View>
      </View>
    );
  },
};

// =========================================================================
// STATE COMBINATIONS
// =========================================================================

export const AllStates: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>All States</Text>
      <View style={styles.optionGroup}>
        <RadioButtonOption
          label="Default"
          selected={false}
          onSelect={() => {}}
        />
        <RadioButtonOption
          label="Selected"
          selected
          onSelect={() => {}}
        />
        <RadioButtonOption
          label="Disabled"
          selected={false}
          disabled
          onSelect={() => {}}
        />
        <RadioButtonOption
          label="Selected + Disabled"
          selected
          disabled
          onSelect={() => {}}
        />
      </View>
    </View>
  ),
};

export const AllStatesWithIcon: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>All States with Icon</Text>
      <View style={styles.optionGroup}>
        <RadioButtonOption
          label="Default"
          icon="star-outline"
          selected={false}
          onSelect={() => {}}
        />
        <RadioButtonOption
          label="Selected"
          icon="star"
          selected
          onSelect={() => {}}
        />
        <RadioButtonOption
          label="Disabled"
          icon="star-outline"
          selected={false}
          disabled
          onSelect={() => {}}
        />
        <RadioButtonOption
          label="Selected + Disabled"
          icon="star"
          selected
          disabled
          onSelect={() => {}}
        />
      </View>
    </View>
  ),
};

export const AllStatesWithDescription: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>All States with Description</Text>
      <View style={styles.optionGroup}>
        <RadioButtonOption
          label="Default"
          description="This is a default option"
          selected={false}
          onSelect={() => {}}
        />
        <RadioButtonOption
          label="Selected"
          description="This option is selected"
          selected
          onSelect={() => {}}
        />
        <RadioButtonOption
          label="Disabled"
          description="This option is disabled"
          selected={false}
          disabled
          onSelect={() => {}}
        />
        <RadioButtonOption
          label="Selected + Disabled"
          description="Selected but cannot be changed"
          selected
          disabled
          onSelect={() => {}}
        />
      </View>
    </View>
  ),
};

// =========================================================================
// EDGE CASES
// =========================================================================

export const VeryLongLabel: Story = {
  args: {
    label: 'This is a very long label that should wrap to multiple lines if needed',
    selected: false,
  },
};

export const VeryLongDescription: Story = {
  args: {
    label: 'Option',
    description:
      'This is a very long description that explains the option in great detail and should wrap to multiple lines to test how the component handles long text content gracefully.',
    selected: true,
  },
};

export const MinimalContent: Story = {
  args: {
    label: 'OK',
    selected: false,
  },
};

export const FullFeatures: Story = {
  args: {
    label: 'Full Featured Option',
    description:
      'This option has all features enabled including icon and description',
    icon: 'check-all',
    selected: true,
  },
};

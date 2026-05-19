/**
 * RoundGameTypeSelector Stories
 *
 * Storybook stories for the RoundGameTypeSelector component.
 * Demonstrates different states, subscription tiers, and interactions.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import { RoundGameTypeSelector } from './RoundGameTypeSelector';
import type { GameType } from '@/types/database.types';

// ============================================================================
// META CONFIGURATION
// ============================================================================

const meta: Meta<typeof RoundGameTypeSelector> = {
  title: 'Competition Wizard/RoundGameTypeSelector',
  component: RoundGameTypeSelector,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <View style={styles.container}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    value: {
      control: 'select',
      options: ['stableford', 'stroke', 'match-play'],
      description: 'Currently selected game type',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the selector is disabled',
    },
    allowedGameTypes: {
      control: 'object',
      description: 'Array of allowed game types based on subscription',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RoundGameTypeSelector>;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    minHeight: 400,
  },
  wrapper: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  header: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  stateDisplay: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  stateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  stateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E7F5E',
    marginTop: 4,
  },
});

// ============================================================================
// INTERACTIVE WRAPPER
// ============================================================================

const InteractiveWrapper = ({
  initialValue = 'stableford',
  allowedGameTypes = ['stableford', 'stroke', 'match-play'] as GameType[],
  disabled = false,
  showUpgradeAction = false,
}: {
  initialValue?: GameType;
  allowedGameTypes?: GameType[];
  disabled?: boolean;
  showUpgradeAction?: boolean;
}) => {
  const [value, setValue] = useState<GameType>(initialValue);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Select Game Type</Text>
      <RoundGameTypeSelector
        value={value}
        onChange={setValue}
        allowedGameTypes={allowedGameTypes}
        disabled={disabled}
        onUpgradePress={
          showUpgradeAction
            ? () => Alert.alert('Upgrade', 'Navigate to subscription screen')
            : undefined
        }
      />
      <View style={styles.stateDisplay}>
        <Text style={styles.stateText}>Selected Value:</Text>
        <Text style={styles.stateValue}>{value}</Text>
      </View>
    </View>
  );
};

// ============================================================================
// DEFAULT STORIES
// ============================================================================

export const Default: Story = {
  args: {
    value: 'stableford',
    onChange: () => {},
    allowedGameTypes: ['stableford', 'stroke', 'match-play'],
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <RoundGameTypeSelector {...args} />
    </View>
  ),
};

export const Interactive: Story = {
  render: () => <InteractiveWrapper />,
};

// ============================================================================
// SELECTION STATES
// ============================================================================

export const StablefordSelected: Story = {
  args: {
    value: 'stableford',
    onChange: () => {},
    allowedGameTypes: ['stableford', 'stroke', 'match-play'],
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <RoundGameTypeSelector {...args} />
    </View>
  ),
};

export const StrokePlaySelected: Story = {
  args: {
    value: 'stroke',
    onChange: () => {},
    allowedGameTypes: ['stableford', 'stroke', 'match-play'],
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <RoundGameTypeSelector {...args} />
    </View>
  ),
};

export const MatchPlaySelected: Story = {
  args: {
    value: 'match-play',
    onChange: () => {},
    allowedGameTypes: ['stableford', 'stroke', 'match-play'],
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <RoundGameTypeSelector {...args} />
    </View>
  ),
};

// ============================================================================
// SUBSCRIPTION TIER STORIES
// ============================================================================

export const FreeTierUser: Story = {
  render: () => (
    <InteractiveWrapper
      allowedGameTypes={['stableford']}
      showUpgradeAction
    />
  ),
};

export const SocialTierUser: Story = {
  render: () => (
    <InteractiveWrapper
      allowedGameTypes={['stableford', 'stroke']}
      showUpgradeAction
    />
  ),
};

export const PremiumTierUser: Story = {
  render: () => (
    <InteractiveWrapper
      allowedGameTypes={['stableford', 'stroke', 'match-play']}
    />
  ),
};

export const OnlyStablefordAllowed: Story = {
  args: {
    value: 'stableford',
    onChange: () => {},
    allowedGameTypes: ['stableford'],
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Free Tier - Stableford Only</Text>
      <RoundGameTypeSelector {...args} />
    </View>
  ),
};

export const ParLocked: Story = {
  args: {
    value: 'stableford',
    onChange: () => {},
    allowedGameTypes: ['stableford', 'stroke'],
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Par Requires Social Tier</Text>
      <RoundGameTypeSelector {...args} />
    </View>
  ),
};

export const MatchPlayLocked: Story = {
  args: {
    value: 'stableford',
    onChange: () => {},
    allowedGameTypes: ['stableford', 'stroke'],
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Match Play Requires Premium Tier</Text>
      <RoundGameTypeSelector {...args} />
    </View>
  ),
};

// ============================================================================
// DISABLED STATES
// ============================================================================

export const Disabled: Story = {
  args: {
    value: 'stableford',
    onChange: () => {},
    allowedGameTypes: ['stableford', 'stroke', 'match-play'],
    disabled: true,
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Disabled State</Text>
      <RoundGameTypeSelector {...args} />
    </View>
  ),
};

export const DisabledWithStrokeSelected: Story = {
  args: {
    value: 'stroke',
    onChange: () => {},
    allowedGameTypes: ['stableford', 'stroke', 'match-play'],
    disabled: true,
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Disabled with Stroke Play Selected</Text>
      <RoundGameTypeSelector {...args} />
    </View>
  ),
};

export const DisabledWithLockedOptions: Story = {
  args: {
    value: 'stableford',
    onChange: () => {},
    allowedGameTypes: ['stableford'],
    disabled: true,
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Disabled with Locked Options</Text>
      <RoundGameTypeSelector {...args} />
    </View>
  ),
};

// ============================================================================
// UPGRADE PROMPT STORIES
// ============================================================================

export const WithUpgradeAction: Story = {
  render: () => (
    <InteractiveWrapper
      allowedGameTypes={['stableford']}
      showUpgradeAction
    />
  ),
};

export const FreeTierWithUpgrade: Story = {
  args: {
    value: 'stableford',
    onChange: () => {},
    allowedGameTypes: ['stableford'],
    onUpgradePress: () => Alert.alert('Upgrade', 'Opening subscription screen...'),
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Tap locked options to see upgrade prompt</Text>
      <RoundGameTypeSelector {...args} />
    </View>
  ),
};

// ============================================================================
// ALL LOCKED STATES
// ============================================================================

export const AllOptionsLocked: Story = {
  args: {
    value: 'stableford',
    onChange: () => {},
    allowedGameTypes: [],
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>All Options Locked (Edge Case)</Text>
      <RoundGameTypeSelector {...args} />
    </View>
  ),
};

// ============================================================================
// USE CASE STORIES
// ============================================================================

export const NewCompetitionSetup: Story = {
  render: () => (
    <InteractiveWrapper
      initialValue="stableford"
      allowedGameTypes={['stableford', 'stroke', 'match-play']}
    />
  ),
};

export const EditingExistingRound: Story = {
  render: () => (
    <InteractiveWrapper
      initialValue="stroke"
      allowedGameTypes={['stableford', 'stroke', 'match-play']}
    />
  ),
};

export const CasualGolferSetup: Story = {
  render: () => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Casual Golfer (Free Tier)</Text>
      <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
        Upgrade to access more game types
      </Text>
      <InteractiveWrapper
        allowedGameTypes={['stableford']}
        showUpgradeAction
      />
    </View>
  ),
};

export const CompetitiveGolferSetup: Story = {
  render: () => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Competitive Golfer (Premium Tier)</Text>
      <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
        All game types available
      </Text>
      <InteractiveWrapper
        allowedGameTypes={['stableford', 'stroke', 'match-play']}
      />
    </View>
  ),
};

// ============================================================================
// GAME TYPE SPECIFIC STORIES
// ============================================================================

export const StablefordOnlyCompetition: Story = {
  render: () => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Stableford Competition</Text>
      <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
        Points-based scoring system
      </Text>
      <RoundGameTypeSelector
        value="stableford"
        onChange={() => {}}
        allowedGameTypes={['stableford', 'stroke', 'match-play']}
      />
    </View>
  ),
};

export const StrokePlayCompetition: Story = {
  render: () => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Stroke Play Competition</Text>
      <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
        Traditional stroke counting
      </Text>
      <RoundGameTypeSelector
        value="stroke"
        onChange={() => {}}
        allowedGameTypes={['stableford', 'stroke', 'match-play']}
      />
    </View>
  ),
};

export const MatchPlayCompetition: Story = {
  render: () => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Match Play Competition</Text>
      <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
        Head-to-head hole-by-hole format
      </Text>
      <RoundGameTypeSelector
        value="match-play"
        onChange={() => {}}
        allowedGameTypes={['stableford', 'stroke', 'match-play']}
      />
    </View>
  ),
};

// ============================================================================
// ACCESSIBILITY STORIES
// ============================================================================

export const HighContrastMode: Story = {
  render: () => (
    <View style={[styles.wrapper, { backgroundColor: '#000000' }]}>
      <Text style={[styles.header, { color: '#FFFFFF' }]}>High Contrast (Dark Background)</Text>
      <RoundGameTypeSelector
        value="stableford"
        onChange={() => {}}
        allowedGameTypes={['stableford', 'stroke', 'match-play']}
      />
    </View>
  ),
};

export const LargeTouchTargets: Story = {
  render: () => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Large Touch Targets for Accessibility</Text>
      <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
        Minimum 72px height per option
      </Text>
      <RoundGameTypeSelector
        value="stableford"
        onChange={() => {}}
        allowedGameTypes={['stableford', 'stroke', 'match-play']}
      />
    </View>
  ),
};

// ============================================================================
// RESPONSIVE STORIES
// ============================================================================

export const NarrowContainer: Story = {
  render: () => (
    <View style={[styles.wrapper, { maxWidth: 300 }]}>
      <Text style={styles.header}>Narrow Container</Text>
      <RoundGameTypeSelector
        value="stableford"
        onChange={() => {}}
        allowedGameTypes={['stableford', 'stroke', 'match-play']}
      />
    </View>
  ),
};

export const WideContainer: Story = {
  render: () => (
    <View style={[styles.wrapper, { maxWidth: 600 }]}>
      <Text style={styles.header}>Wide Container</Text>
      <RoundGameTypeSelector
        value="stableford"
        onChange={() => {}}
        allowedGameTypes={['stableford', 'stroke', 'match-play']}
      />
    </View>
  ),
};

// ============================================================================
// STATE TRANSITION STORIES
// ============================================================================

export const SelectionTransition: Story = {
  render: () => {
    const [value, setValue] = useState<GameType>('stableford');
    const [history, setHistory] = useState<GameType[]>(['stableford']);

    const handleChange = (newValue: GameType) => {
      setValue(newValue);
      setHistory((prev) => [...prev, newValue]);
    };

    return (
      <View style={styles.wrapper}>
        <Text style={styles.header}>Selection History</Text>
        <RoundGameTypeSelector
          value={value}
          onChange={handleChange}
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
        <View style={styles.stateDisplay}>
          <Text style={styles.stateText}>Selection History:</Text>
          <Text style={styles.stateValue}>{history.join(' → ')}</Text>
        </View>
      </View>
    );
  },
};

// ============================================================================
// INTEGRATION STORIES
// ============================================================================

export const InCompetitionForm: Story = {
  render: () => (
    <View style={{ padding: 16, backgroundColor: '#FFFFFF' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
        Create Competition
      </Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
        Step 2: Round Settings
      </Text>

      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
        Game Type
      </Text>
      <RoundGameTypeSelector
        value="stableford"
        onChange={() => {}}
        allowedGameTypes={['stableford', 'stroke', 'match-play']}
      />

      <View style={{ height: 24 }} />

      <Text style={{ fontSize: 14, color: '#6B7280', fontStyle: 'italic' }}>
        (Other form fields would go here...)
      </Text>
    </View>
  ),
};

export const InRoundEditModal: Story = {
  render: () => (
    <View style={{ padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
        Edit Round Settings
      </Text>

      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
        Game Type
      </Text>
      <RoundGameTypeSelector
        value="stroke"
        onChange={() => {}}
        allowedGameTypes={['stableford', 'stroke', 'match-play']}
      />
    </View>
  ),
};

/**
 * LimitIndicator Stories
 *
 * Storybook stories for the LimitIndicator component showing:
 * - Default progress bar display
 * - Compact inline display
 * - Various usage states (low, medium, high, at-limit, over-limit)
 * - Unlimited limits (infinity symbol)
 * - Different label variations
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { LimitIndicator } from './LimitIndicator';
import { UNLIMITED, NO_LIMIT } from '@/types/subscription.types';
import { spacing } from '@/constants/theme';

// ============================================================================
// META
// ============================================================================

const meta: Meta<typeof LimitIndicator> = {
  title: 'Subscription/LimitIndicator',
  component: LimitIndicator,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    current: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'Current usage count',
    },
    max: {
      control: { type: 'number', min: -2, max: 100 },
      description: 'Maximum allowed count (-1 for unlimited, -2 for no limit)',
    },
    label: {
      control: { type: 'text' },
      description: 'Label describing what is being counted',
    },
    showBar: {
      control: { type: 'boolean' },
      description: 'Whether to show the progress bar',
    },
  },
  decorators: [
    (Story) => (
      <View style={styles.container}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LimitIndicator>;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    minWidth: 280,
    maxWidth: 400,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: '#666',
  },
  row: {
    marginBottom: spacing.lg,
  },
  compactRow: {
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    flex: 1,
    minWidth: 150,
  },
});

// ============================================================================
// BASIC STORIES
// ============================================================================

export const Default: Story = {
  args: {
    current: 3,
    max: 5,
    label: 'Competitions',
    showBar: true,
  },
};

export const LowUsage: Story = {
  args: {
    current: 1,
    max: 10,
    label: 'Players',
    showBar: true,
  },
};

export const MediumUsage: Story = {
  args: {
    current: 5,
    max: 10,
    label: 'Rounds',
    showBar: true,
  },
};

export const HighUsage: Story = {
  args: {
    current: 8,
    max: 10,
    label: 'Friends',
    showBar: true,
  },
};

export const AtLimit: Story = {
  args: {
    current: 5,
    max: 5,
    label: 'Competitions',
    showBar: true,
  },
};

export const OverLimit: Story = {
  args: {
    current: 7,
    max: 5,
    label: 'Items',
    showBar: true,
  },
};

// ============================================================================
// UNLIMITED STORIES
// ============================================================================

export const UnlimitedWithConstant: Story = {
  args: {
    current: 15,
    max: UNLIMITED,
    label: 'Competitions',
    showBar: true,
  },
  name: 'Unlimited (UNLIMITED constant)',
};

export const NoLimitWithConstant: Story = {
  args: {
    current: 50,
    max: NO_LIMIT,
    label: 'Friends',
    showBar: true,
  },
  name: 'Unlimited (NO_LIMIT constant)',
};

export const UnlimitedZeroUsage: Story = {
  args: {
    current: 0,
    max: UNLIMITED,
    label: 'Rounds',
    showBar: true,
  },
  name: 'Unlimited - Zero Usage',
};

export const UnlimitedHighUsage: Story = {
  args: {
    current: 999,
    max: UNLIMITED,
    label: 'Items',
    showBar: true,
  },
  name: 'Unlimited - High Usage',
};

// ============================================================================
// COMPACT MODE STORIES
// ============================================================================

export const Compact: Story = {
  args: {
    current: 3,
    max: 5,
    label: 'Players',
    showBar: false,
  },
};

export const CompactAtLimit: Story = {
  args: {
    current: 10,
    max: 10,
    label: 'Friends',
    showBar: false,
  },
};

export const CompactUnlimited: Story = {
  args: {
    current: 25,
    max: UNLIMITED,
    label: 'Competitions',
    showBar: false,
  },
};

// ============================================================================
// LABEL VARIATIONS
// ============================================================================

export const ShortLabel: Story = {
  args: {
    current: 3,
    max: 5,
    label: 'Items',
    showBar: true,
  },
};

export const LongLabel: Story = {
  args: {
    current: 12,
    max: 16,
    label: 'Players per competition',
    showBar: true,
  },
};

export const VeryLongLabel: Story = {
  args: {
    current: 5,
    max: 10,
    label: 'Active rounds in current competitions',
    showBar: true,
  },
};

// ============================================================================
// TIER-SPECIFIC EXAMPLES
// ============================================================================

export const FreeTierCompetitions: Story = {
  args: {
    current: 2,
    max: 3,
    label: 'Competitions',
    showBar: true,
  },
  name: 'Free Tier - Competitions',
};

export const FreeTierFriends: Story = {
  args: {
    current: 8,
    max: 10,
    label: 'Friends',
    showBar: true,
  },
  name: 'Free Tier - Friends',
};

export const SocialTierPlayers: Story = {
  args: {
    current: 12,
    max: 16,
    label: 'Players',
    showBar: true,
  },
  name: 'Social Tier - Players',
};

export const SocialTierRounds: Story = {
  args: {
    current: 3,
    max: 5,
    label: 'Rounds',
    showBar: true,
  },
  name: 'Social Tier - Rounds',
};

export const PremiumTierPlayers: Story = {
  args: {
    current: 28,
    max: 40,
    label: 'Players',
    showBar: true,
  },
  name: 'Premium Tier - Players',
};

export const PremiumTierCompetitions: Story = {
  args: {
    current: 5,
    max: UNLIMITED,
    label: 'Competitions',
    showBar: true,
  },
  name: 'Premium Tier - Competitions (Unlimited)',
};

export const SuperAdminUnlimited: Story = {
  args: {
    current: 100,
    max: UNLIMITED,
    label: 'Everything',
    showBar: true,
  },
  name: 'Super Admin - Unlimited',
};

// ============================================================================
// EDGE CASES
// ============================================================================

export const ZeroOfZero: Story = {
  args: {
    current: 0,
    max: 0,
    label: 'Edge Case',
    showBar: true,
  },
};

export const HighNumbers: Story = {
  args: {
    current: 9999,
    max: 10000,
    label: 'Large Limit',
    showBar: true,
  },
};

export const OneOfOne: Story = {
  args: {
    current: 1,
    max: 1,
    label: 'Single Item',
    showBar: true,
  },
};

// ============================================================================
// SHOWCASE STORIES
// ============================================================================

export const AllStates: Story = {
  render: () => (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Bar States</Text>
        <View style={styles.row}>
          <LimitIndicator current={1} max={10} label="Low (10%)" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={3} max={10} label="Low-Medium (30%)" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={5} max={10} label="Medium (50%)" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={7} max={10} label="High (70%)" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={9} max={10} label="Very High (90%)" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={10} max={10} label="At Limit (100%)" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={12} max={10} label="Over Limit (120%)" />
        </View>
      </View>
    </View>
  ),
  name: 'All Usage States',
};

export const CompactComparison: Story = {
  render: () => (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compact Mode Examples</Text>
        <View style={styles.compactRow}>
          <LimitIndicator current={2} max={3} label="Competitions" showBar={false} />
        </View>
        <View style={styles.compactRow}>
          <LimitIndicator current={8} max={10} label="Friends" showBar={false} />
        </View>
        <View style={styles.compactRow}>
          <LimitIndicator current={3} max={5} label="Rounds" showBar={false} />
        </View>
        <View style={styles.compactRow}>
          <LimitIndicator current={5} max={5} label="At Limit" showBar={false} />
        </View>
        <View style={styles.compactRow}>
          <LimitIndicator current={50} max={UNLIMITED} label="Unlimited" showBar={false} />
        </View>
      </View>
    </View>
  ),
  name: 'Compact Mode Comparison',
};

export const TierComparison: Story = {
  render: () => (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Free Tier Limits</Text>
        <View style={styles.row}>
          <LimitIndicator current={2} max={3} label="Competitions" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={1} max={2} label="Rounds per competition" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={6} max={10} label="Friends" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social Tier Limits</Text>
        <View style={styles.row}>
          <LimitIndicator current={5} max={8} label="Competitions" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={3} max={5} label="Rounds per competition" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={12} max={16} label="Players per competition" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Premium Tier Limits</Text>
        <View style={styles.row}>
          <LimitIndicator current={10} max={UNLIMITED} label="Competitions" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={7} max={10} label="Rounds per competition" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={25} max={40} label="Players per competition" />
        </View>
      </View>
    </View>
  ),
  name: 'Tier Limits Comparison',
};

export const UnlimitedShowcase: Story = {
  render: () => (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unlimited Limits</Text>
        <View style={styles.row}>
          <LimitIndicator current={0} max={UNLIMITED} label="Zero usage" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={10} max={UNLIMITED} label="Normal usage" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={100} max={UNLIMITED} label="High usage" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={999} max={UNLIMITED} label="Very high usage" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={50} max={NO_LIMIT} label="NO_LIMIT constant" />
        </View>
      </View>
    </View>
  ),
  name: 'Unlimited Showcase',
};

export const WithAndWithoutBar: Story = {
  render: () => (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>With Progress Bar (default)</Text>
        <View style={styles.row}>
          <LimitIndicator current={3} max={5} label="Competitions" showBar={true} />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={8} max={10} label="Friends" showBar={true} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Without Progress Bar (compact)</Text>
        <View style={styles.compactRow}>
          <LimitIndicator current={3} max={5} label="Competitions" showBar={false} />
        </View>
        <View style={styles.compactRow}>
          <LimitIndicator current={8} max={10} label="Friends" showBar={false} />
        </View>
      </View>
    </View>
  ),
  name: 'With vs Without Bar',
};

export const ProgressionExample: Story = {
  render: () => (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usage Progression Example</Text>
        <View style={styles.row}>
          <LimitIndicator current={0} max={5} label="Starting out (0/5)" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={1} max={5} label="First added (1/5)" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={2} max={5} label="Growing (2/5)" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={3} max={5} label="Halfway (3/5)" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={4} max={5} label="Almost full (4/5)" />
        </View>
        <View style={styles.row}>
          <LimitIndicator current={5} max={5} label="At limit! (5/5)" />
        </View>
      </View>
    </View>
  ),
  name: 'Usage Progression',
};

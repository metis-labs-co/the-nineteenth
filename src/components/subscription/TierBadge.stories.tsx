/**
 * TierBadge Stories
 *
 * Storybook stories for the TierBadge component showing:
 * - All subscription tiers (Free, Social, Premium, Super Admin)
 * - Size variants (small, medium, large)
 * - Icon visibility options
 * - Custom overrides (displayName, badgeColor)
 * - Super Admin special styling with glow effect
 * - Comparison views with multiple badges
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { TierBadge } from './TierBadge';
import { spacing } from '@/constants/theme';
import type { SubscriptionTier } from '@/types/subscription.types';

// ============================================================================
// META
// ============================================================================

const meta: Meta<typeof TierBadge> = {
  title: 'Subscription/TierBadge',
  component: TierBadge,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
      description: 'Size variant of the badge',
    },
    showIcon: {
      control: { type: 'boolean' },
      description: 'Whether to show the tier icon',
    },
    tier: {
      control: { type: 'select' },
      options: ['free', 'social', 'premium', 'super_admin'],
      description: 'Override tier to display',
    },
    badgeColor: {
      control: { type: 'color' },
      description: 'Override badge background color',
    },
    displayName: {
      control: { type: 'text' },
      description: 'Override display name',
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
type Story = StoryObj<typeof TierBadge>;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  section: {
    marginBottom: spacing.xl,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  column: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    color: '#888',
    width: 80,
  },
  darkBg: {
    backgroundColor: '#1a1a1a',
    padding: spacing.lg,
    borderRadius: 8,
  },
  comparisonCard: {
    padding: spacing.md,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardText: {
    fontSize: 14,
    color: '#333',
  },
});

// ============================================================================
// INDIVIDUAL TIER STORIES
// ============================================================================

export const Default: Story = {
  args: {},
};

export const FreeTier: Story = {
  args: {
    tier: 'free',
  },
};

export const SocialTier: Story = {
  args: {
    tier: 'social',
  },
};

export const PremiumTier: Story = {
  args: {
    tier: 'premium',
  },
};

export const SuperAdminTier: Story = {
  args: {
    tier: 'super_admin',
  },
};

// ============================================================================
// SIZE VARIANT STORIES
// ============================================================================

export const SmallSize: Story = {
  args: {
    size: 'small',
  },
};

export const MediumSize: Story = {
  args: {
    size: 'medium',
  },
};

export const LargeSize: Story = {
  args: {
    size: 'large',
  },
};

export const SmallPremium: Story = {
  args: {
    tier: 'premium',
    size: 'small',
  },
};

export const LargeSuperAdmin: Story = {
  args: {
    tier: 'super_admin',
    size: 'large',
  },
};

// ============================================================================
// ICON VISIBILITY STORIES
// ============================================================================

export const WithIcon: Story = {
  args: {
    showIcon: true,
  },
};

export const WithoutIcon: Story = {
  args: {
    showIcon: false,
  },
};

export const SmallWithoutIcon: Story = {
  args: {
    size: 'small',
    showIcon: false,
  },
};

export const LargeWithoutIcon: Story = {
  args: {
    size: 'large',
    showIcon: false,
  },
};

// ============================================================================
// CUSTOM OVERRIDE STORIES
// ============================================================================

export const CustomDisplayName: Story = {
  args: {
    displayName: 'VIP Member',
  },
};

export const CustomBadgeColor: Story = {
  args: {
    badgeColor: '#8b5cf6',
  },
};

export const FullyCustomized: Story = {
  args: {
    tier: 'social',
    displayName: 'Team Pro',
    badgeColor: '#059669',
    size: 'large',
  },
};

export const CustomWithoutIcon: Story = {
  args: {
    displayName: 'Beta Tester',
    badgeColor: '#6366f1',
    showIcon: false,
  },
};

// ============================================================================
// ALL TIERS COMPARISON
// ============================================================================

export const AllTiers: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>All Subscription Tiers</Text>
      <View style={styles.column}>
        <View style={styles.row}>
          <Text style={styles.label}>Free:</Text>
          <TierBadge tier="free" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Social:</Text>
          <TierBadge tier="social" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Premium:</Text>
          <TierBadge tier="premium" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Super Admin:</Text>
          <TierBadge tier="super_admin" />
        </View>
      </View>
    </View>
  ),
};

// ============================================================================
// ALL SIZES COMPARISON
// ============================================================================

export const AllSizes: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Size Variants</Text>
      <View style={styles.column}>
        <View style={styles.row}>
          <Text style={styles.label}>Small:</Text>
          <TierBadge tier="premium" size="small" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Medium:</Text>
          <TierBadge tier="premium" size="medium" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Large:</Text>
          <TierBadge tier="premium" size="large" />
        </View>
      </View>
    </View>
  ),
};

// ============================================================================
// ICON COMPARISON
// ============================================================================

export const IconComparison: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Icon Visibility</Text>
      <View style={styles.column}>
        <View style={styles.row}>
          <Text style={styles.label}>With Icon:</Text>
          <TierBadge tier="social" showIcon={true} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Without:</Text>
          <TierBadge tier="social" showIcon={false} />
        </View>
      </View>
    </View>
  ),
};

// ============================================================================
// DARK BACKGROUND
// ============================================================================

export const OnDarkBackground: Story = {
  render: () => (
    <View style={styles.darkBg}>
      <Text style={[styles.sectionTitle, { color: '#999' }]}>On Dark Background</Text>
      <View style={styles.column}>
        <TierBadge tier="free" />
        <TierBadge tier="social" />
        <TierBadge tier="premium" />
        <TierBadge tier="super_admin" />
      </View>
    </View>
  ),
};

// ============================================================================
// SUPER ADMIN GLOW EFFECT
// ============================================================================

export const SuperAdminGlow: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Super Admin - Special Glow Effect</Text>
      <View style={styles.column}>
        <View style={styles.row}>
          <Text style={styles.label}>Small:</Text>
          <TierBadge tier="super_admin" size="small" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Medium:</Text>
          <TierBadge tier="super_admin" size="medium" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Large:</Text>
          <TierBadge tier="super_admin" size="large" />
        </View>
      </View>
    </View>
  ),
};

// ============================================================================
// PROFILE HEADER USE CASE
// ============================================================================

export const ProfileHeader: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Profile Header Example</Text>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        gap: spacing.md,
      }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: '#ddd',
        }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 4 }}>John Smith</Text>
          <TierBadge tier="premium" size="small" />
        </View>
      </View>
    </View>
  ),
};

// ============================================================================
// COMPARISON VIEW USE CASE
// ============================================================================

export const TierComparisonCards: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tier Comparison View</Text>
      {(['free', 'social', 'premium', 'super_admin'] as SubscriptionTier[]).map((tier) => (
        <View key={tier} style={styles.comparisonCard}>
          <Text style={styles.cardText}>
            {tier === 'free' ? '3 competitions' :
             tier === 'social' ? '8 competitions' :
             tier === 'premium' ? 'Unlimited competitions' :
             'Admin access'}
          </Text>
          <TierBadge tier={tier} size="small" />
        </View>
      ))}
    </View>
  ),
};

// ============================================================================
// ALL TIERS ALL SIZES MATRIX
// ============================================================================

export const TierSizeMatrix: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tier × Size Matrix</Text>
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        {(['small', 'medium', 'large'] as const).map((size) => (
          <View key={size} style={{ alignItems: 'center' }}>
            <Text style={[styles.label, { marginBottom: spacing.sm, width: 'auto' }]}>
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </Text>
            <View style={{ gap: spacing.sm }}>
              <TierBadge tier="free" size={size} />
              <TierBadge tier="social" size={size} />
              <TierBadge tier="premium" size={size} />
              <TierBadge tier="super_admin" size={size} />
            </View>
          </View>
        ))}
      </View>
    </View>
  ),
};

// ============================================================================
// CUSTOM COLORS
// ============================================================================

export const CustomColors: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Custom Badge Colors</Text>
      <View style={styles.column}>
        <View style={styles.row}>
          <Text style={styles.label}>Purple:</Text>
          <TierBadge tier="free" badgeColor="#8b5cf6" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Teal:</Text>
          <TierBadge tier="social" badgeColor="#14b8a6" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pink:</Text>
          <TierBadge tier="premium" badgeColor="#ec4899" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Indigo:</Text>
          <TierBadge tier="super_admin" badgeColor="#6366f1" />
        </View>
      </View>
    </View>
  ),
};

// ============================================================================
// CUSTOM DISPLAY NAMES
// ============================================================================

export const CustomDisplayNames: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Custom Display Names</Text>
      <View style={styles.column}>
        <TierBadge displayName="Starter" badgeColor="#6b7280" />
        <TierBadge displayName="Team Pro" badgeColor="#3b82f6" />
        <TierBadge displayName="Enterprise" badgeColor="#f59e0b" />
        <TierBadge displayName="Internal" badgeColor="#dc2626" />
      </View>
    </View>
  ),
};

// ============================================================================
// EDGE CASES
// ============================================================================

export const LongDisplayName: Story = {
  args: {
    displayName: 'Very Long Subscription Tier Name',
    size: 'medium',
  },
};

export const EmojiDisplayName: Story = {
  args: {
    displayName: 'Premium 🏆',
    tier: 'premium',
  },
};

export const MinimalBadge: Story = {
  args: {
    tier: 'premium',
    size: 'small',
    showIcon: false,
  },
};

// ============================================================================
// INTERACTIVE
// ============================================================================

export const Interactive: Story = {
  args: {
    tier: 'premium',
    size: 'medium',
    showIcon: true,
  },
};

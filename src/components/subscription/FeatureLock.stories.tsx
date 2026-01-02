/**
 * FeatureLock Storybook Stories
 *
 * Visual testing stories for the FeatureLock component which provides
 * graceful degradation for tier-gated features. Demonstrates:
 * - Allowed vs locked states
 * - Different feature types
 * - Custom messages and styling
 * - Upgrade interaction
 * - Various children content
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FeatureLock } from './FeatureLock';
import type { SubscriptionTier } from '@/types/subscription.types';

// ============================================================================
// MOCK PROVIDER WRAPPER
// ============================================================================

// We need to mock the subscription context for stories
// Note: Currently not used - stories demonstrate visual states directly
const _MockSubscriptionProvider = ({
  children,
  allowed: _allowed = true,
  reason: _reason,
  requiredTier: _requiredTier,
}: {
  children: React.ReactNode;
  allowed?: boolean;
  reason?: string;
  requiredTier?: SubscriptionTier;
}) => {
  // For Storybook, we'll wrap children without the actual provider
  // The stories will demonstrate visual states directly
  return <>{children}</>;
};

// ============================================================================
// SAMPLE CHILD COMPONENTS
// ============================================================================

const SampleCard = ({ title, description }: { title: string; description: string }) => (
  <View style={sampleStyles.card}>
    <Text style={sampleStyles.cardTitle}>{title}</Text>
    <Text style={sampleStyles.cardDescription}>{description}</Text>
  </View>
);

const SampleButton = ({ label, onPress }: { label: string; onPress?: () => void }) => (
  <TouchableOpacity style={sampleStyles.button} onPress={onPress}>
    <Text style={sampleStyles.buttonText}>{label}</Text>
  </TouchableOpacity>
);

const SampleFeatureSection = ({ title }: { title: string }) => (
  <View style={sampleStyles.featureSection}>
    <Text style={sampleStyles.featureSectionTitle}>{title}</Text>
    <View style={sampleStyles.featureGrid}>
      <View style={sampleStyles.featureItem}>
        <Text style={sampleStyles.featureItemText}>Option 1</Text>
      </View>
      <View style={sampleStyles.featureItem}>
        <Text style={sampleStyles.featureItemText}>Option 2</Text>
      </View>
      <View style={sampleStyles.featureItem}>
        <Text style={sampleStyles.featureItemText}>Option 3</Text>
      </View>
      <View style={sampleStyles.featureItem}>
        <Text style={sampleStyles.featureItemText}>Option 4</Text>
      </View>
    </View>
  </View>
);

const sampleStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666666',
  },
  button: {
    backgroundColor: '#4a90d9',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  featureSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  featureSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  featureItemText: {
    fontSize: 14,
    color: '#333333',
  },
});

// ============================================================================
// META CONFIGURATION
// ============================================================================

const meta: Meta<typeof FeatureLock> = {
  title: 'Subscription/FeatureLock',
  component: FeatureLock,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: '#f0f0f0', padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    feature: {
      control: 'select',
      options: [
        'create_competition',
        'add_round',
        'add_player',
        'game_type',
        'team_formats',
        'scoring_pairs',
        'add_friend',
        'compare_stats',
        'basic_stats',
        'score_distribution',
        'advanced_stats',
        'export_data',
      ],
      description: 'The feature ID to check access for',
    },
    lockedMessage: {
      control: 'text',
      description: 'Custom message to display when feature is locked',
    },
    lockedOpacity: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: 'Opacity to apply to locked content',
    },
    showLockIcon: {
      control: 'boolean',
      description: 'Whether to show the lock icon overlay',
    },
    hideWhenLocked: {
      control: 'boolean',
      description: 'Whether to completely hide children when locked',
    },
    onUpgradePress: {
      action: 'onUpgradePress',
      description: 'Callback when user taps the upgrade button/overlay',
    },
  },
};

export default meta;
type Story = StoryObj<typeof FeatureLock>;

// ============================================================================
// NOTE: Since FeatureLock uses context, these stories demonstrate the UI
// layout and styling. In actual use, the component checks the subscription
// context to determine if the feature is allowed.
// ============================================================================

// ============================================================================
// ALLOWED STATE STORIES
// ============================================================================

export const AllowedState: Story = {
  args: {
    feature: 'scoring_pairs',
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard
        title="Scoring Pairs"
        description="Configure designated markers for competitive rounds with official verification."
      />
    </FeatureLock>
  ),
  parameters: {
    docs: {
      description: {
        story: 'When the feature is allowed, children render normally without any overlay.',
      },
    },
  },
};

export const AllowedWithButton: Story = {
  args: {
    feature: 'create_competition',
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleButton label="Create Competition" onPress={() => console.log('Create!')} />
    </FeatureLock>
  ),
};

export const AllowedWithFeatureSection: Story = {
  args: {
    feature: 'game_type',
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleFeatureSection title="Select Game Type" />
    </FeatureLock>
  ),
};

// ============================================================================
// LOCKED STATE STORIES (VISUAL MOCKUPS)
// ============================================================================

export const LockedDefault: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: 'Upgrade to unlock',
  },
  render: (_args) => (
    <View style={{ opacity: 0.5 }}>
      <SampleCard
        title="Scoring Pairs"
        description="Configure designated markers for competitive rounds with official verification."
      />
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Visual representation of locked content with default opacity.',
      },
    },
  },
};

export const LockedWithUpgrade: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: 'Scoring pairs requires Premium',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard
        title="Scoring Pairs"
        description="Configure designated markers for competitive rounds."
      />
    </FeatureLock>
  ),
};

export const LockedWithCustomMessage: Story = {
  args: {
    feature: 'team_formats',
    lockedMessage: 'Team formats are a Premium feature. Upgrade to play Best Ball, Scramble, and more!',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleFeatureSection title="Team Formats" />
    </FeatureLock>
  ),
};

export const LockedWithLowOpacity: Story = {
  args: {
    feature: 'advanced_stats',
    lockedMessage: 'Advanced statistics require Premium',
    lockedOpacity: 0.3,
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard
        title="Advanced Statistics"
        description="Fairways hit, greens in regulation, and detailed analytics."
      />
    </FeatureLock>
  ),
};

export const LockedWithHighOpacity: Story = {
  args: {
    feature: 'export_data',
    lockedMessage: 'Data export requires Premium',
    lockedOpacity: 0.7,
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleButton label="Export to CSV" />
    </FeatureLock>
  ),
};

export const LockedWithNoIcon: Story = {
  args: {
    feature: 'compare_stats',
    lockedMessage: 'Stat comparison requires Social tier',
    showLockIcon: false,
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard
        title="Compare Stats"
        description="See how you stack up against friends and competitors."
      />
    </FeatureLock>
  ),
};

export const LockedWithoutUpgrade: Story = {
  args: {
    feature: 'admin_tools',
    lockedMessage: 'Admin tools are restricted',
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard
        title="Admin Tools"
        description="System administration and management features."
      />
    </FeatureLock>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Without an onUpgradePress handler, no "Tap to upgrade" button is shown.',
      },
    },
  },
};

// ============================================================================
// HIDE WHEN LOCKED STORIES
// ============================================================================

export const HiddenWhenLocked: Story = {
  args: {
    feature: 'scoring_pairs',
    hideWhenLocked: true,
  },
  render: (args) => (
    <View>
      <Text style={{ marginBottom: 16, color: '#666' }}>
        The card below will be completely hidden when the feature is locked:
      </Text>
      <FeatureLock {...args}>
        <SampleCard
          title="Hidden Feature"
          description="This card disappears when locked instead of showing dimmed."
        />
      </FeatureLock>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'With hideWhenLocked=true, the children are completely hidden instead of shown dimmed.',
      },
    },
  },
};

// ============================================================================
// FEATURE-SPECIFIC STORIES
// ============================================================================

export const CreateCompetitionFeature: Story = {
  args: {
    feature: 'create_competition',
    context: { currentCount: 3 },
    lockedMessage: 'You have reached the competition limit (3/3)',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleButton label="Create New Competition" />
    </FeatureLock>
  ),
};

export const AddRoundFeature: Story = {
  args: {
    feature: 'add_round',
    context: { roundCount: 2 },
    lockedMessage: 'Upgrade to add more rounds (2/2)',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleButton label="Add Round" />
    </FeatureLock>
  ),
};

export const AddPlayerFeature: Story = {
  args: {
    feature: 'add_player',
    context: { playerCount: 10 },
    lockedMessage: 'Player limit reached (10/10)',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleButton label="Add Player" />
    </FeatureLock>
  ),
};

export const GameTypeFeature: Story = {
  args: {
    feature: 'game_type',
    context: { gameType: 'match-play' as any },
    lockedMessage: 'Match Play requires Social tier',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <View style={sampleStyles.featureItem}>
        <Text style={sampleStyles.featureItemText}>Match Play</Text>
      </View>
    </FeatureLock>
  ),
};

export const TeamFormatsFeature: Story = {
  args: {
    feature: 'team_formats',
    lockedMessage: 'Team formats require Premium tier',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleFeatureSection title="Team Formats" />
    </FeatureLock>
  ),
};

export const ScoringPairsFeature: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: 'Scoring pairs require Premium tier',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard
        title="Scoring Pairs"
        description="Assign designated markers for competitive verification."
      />
    </FeatureLock>
  ),
};

export const AddFriendFeature: Story = {
  args: {
    feature: 'add_friend',
    context: { friendCount: 10 },
    lockedMessage: 'Friend limit reached (10/10)',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleButton label="Add Friend" />
    </FeatureLock>
  ),
};

export const AdvancedStatsFeature: Story = {
  args: {
    feature: 'advanced_stats',
    lockedMessage: 'Advanced statistics require Premium tier',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard
        title="Advanced Statistics"
        description="Fairways hit, GIR, putting stats, and trend analysis."
      />
    </FeatureLock>
  ),
};

export const ExportDataFeature: Story = {
  args: {
    feature: 'export_data',
    lockedMessage: 'Data export requires Premium tier',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <SampleButton label="Export CSV" />
        <SampleButton label="Export PDF" />
      </View>
    </FeatureLock>
  ),
};

// ============================================================================
// CONTENT VARIATION STORIES
// ============================================================================

export const WithSimpleText: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: 'Upgrade to unlock',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <Text style={{ fontSize: 16, padding: 16 }}>
        Simple text content that gets locked
      </Text>
    </FeatureLock>
  ),
};

export const WithMultipleChildren: Story = {
  args: {
    feature: 'team_formats',
    lockedMessage: 'Team features require Premium',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <View style={{ gap: 8 }}>
        <SampleCard title="Best Ball" description="Play your best ball as a team." />
        <SampleCard title="Scramble" description="Everyone plays from the best shot." />
        <SampleCard title="Team Match Play" description="Teams compete hole by hole." />
      </View>
    </FeatureLock>
  ),
};

export const WithComplexLayout: Story = {
  args: {
    feature: 'advanced_stats',
    lockedMessage: 'Advanced analytics require Premium',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
          Performance Dashboard
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#4a90d9' }}>72%</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Fairways</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#4a90d9' }}>65%</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>GIR</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#4a90d9' }}>31.2</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Avg Putts</Text>
          </View>
        </View>
        <View style={{ height: 100, backgroundColor: '#f5f5f5', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#999' }}>Chart Placeholder</Text>
        </View>
      </View>
    </FeatureLock>
  ),
};

export const WithForm: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: 'Scoring pair configuration requires Premium',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
          Assign Scoring Pairs
        </Text>
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Player 1</Text>
          <View style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12 }}>
            <Text>Select player...</Text>
          </View>
        </View>
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Marker</Text>
          <View style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12 }}>
            <Text>Select marker...</Text>
          </View>
        </View>
        <SampleButton label="Save Pair" />
      </View>
    </FeatureLock>
  ),
};

// ============================================================================
// EDGE CASE STORIES
// ============================================================================

export const VeryLongMessage: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: 'This is a very long message that explains in great detail why this particular feature is locked and what the user needs to do to unlock it, including information about the benefits of upgrading.',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard title="Feature" description="Description" />
    </FeatureLock>
  ),
};

export const ShortMessage: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: 'Locked',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard title="Feature" description="Description" />
    </FeatureLock>
  ),
};

export const SpecialCharactersInMessage: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: "Upgrade now & get 100% access! (Premium tier)",
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard title="Feature" description="Description" />
    </FeatureLock>
  ),
};

export const SmallContent: Story = {
  args: {
    feature: 'game_type',
    lockedMessage: 'Requires Social tier',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <View style={{ width: 60, height: 60, backgroundColor: '#e0e0e0', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 24 }}>+</Text>
      </View>
    </FeatureLock>
  ),
};

export const WideContent: Story = {
  args: {
    feature: 'export_data',
    lockedMessage: 'Export requires Premium',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <View style={{ height: 60, backgroundColor: '#4a90d9', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
          Export All Competition Data
        </Text>
      </View>
    </FeatureLock>
  ),
};

export const TallContent: Story = {
  args: {
    feature: 'advanced_stats',
    lockedMessage: 'Statistics require Premium',
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <View style={{ height: 300, backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 16 }}>
          Detailed Statistics
        </Text>
        <View style={{ flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#999' }}>Large chart area</Text>
        </View>
      </View>
    </FeatureLock>
  ),
};

// ============================================================================
// OPACITY VARIATION STORIES
// ============================================================================

export const Opacity0: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: 'Completely hidden content',
    lockedOpacity: 0,
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard title="Hidden" description="This content is invisible behind the lock." />
    </FeatureLock>
  ),
};

export const Opacity25: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: 'Very dim content',
    lockedOpacity: 0.25,
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard title="Barely Visible" description="25% opacity makes content barely visible." />
    </FeatureLock>
  ),
};

export const Opacity50: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: 'Standard dim content',
    lockedOpacity: 0.5,
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard title="Default Opacity" description="50% is the default locked opacity." />
    </FeatureLock>
  ),
};

export const Opacity75: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: 'Slightly dim content',
    lockedOpacity: 0.75,
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard title="More Visible" description="75% opacity shows more of the content." />
    </FeatureLock>
  ),
};

export const Opacity100: Story = {
  args: {
    feature: 'scoring_pairs',
    lockedMessage: 'Full visibility behind lock',
    lockedOpacity: 1,
    onUpgradePress: () => console.log('Upgrade pressed'),
  },
  render: (args) => (
    <FeatureLock {...args}>
      <SampleCard title="Full Visibility" description="100% opacity shows content at full brightness." />
    </FeatureLock>
  ),
};

// ============================================================================
// REAL-WORLD SCENARIO STORIES
// ============================================================================

export const CompetitionLimitReached: Story = {
  args: {
    feature: 'create_competition',
    context: { currentCount: 3 },
    lockedMessage: 'You have reached your competition limit (3 of 3 on Free tier). Upgrade to Social to create up to 8 competitions.',
    onUpgradePress: () => console.log('Upgrade to Social'),
  },
  render: (args) => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1a1a1a' }}>
        Your Competitions
      </Text>
      <View style={{ gap: 8, marginBottom: 16 }}>
        <SampleCard title="Summer Series 2024" description="8 players, 4 rounds" />
        <SampleCard title="Weekend Warriors" description="12 players, 6 rounds" />
        <SampleCard title="Monthly Medal" description="16 players, 1 round" />
      </View>
      <FeatureLock {...args}>
        <SampleButton label="+ Create New Competition" />
      </FeatureLock>
    </View>
  ),
};

export const PlayerLimitReached: Story = {
  args: {
    feature: 'add_player',
    context: { playerCount: 10 },
    lockedMessage: 'Player limit reached (10 of 10 on Free tier). Upgrade to add more players.',
    onUpgradePress: () => console.log('Upgrade'),
  },
  render: (args) => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#1a1a1a' }}>
        Competition Players (10/10)
      </Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
        Add more players to your competition
      </Text>
      <FeatureLock {...args}>
        <SampleButton label="+ Add Player" />
      </FeatureLock>
    </View>
  ),
};

export const GameTypeSelector: Story = {
  args: {
    feature: 'game_type',
    context: { gameType: 'match-play' as any },
    lockedMessage: 'Match Play requires Social tier or higher',
    onUpgradePress: () => console.log('Upgrade'),
  },
  render: (args) => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1a1a1a' }}>
        Select Game Type
      </Text>
      <View style={{ gap: 8 }}>
        <View style={[sampleStyles.featureItem, { backgroundColor: '#4a90d9' }]}>
          <Text style={[sampleStyles.featureItemText, { color: '#fff' }]}>Stableford</Text>
        </View>
        <View style={sampleStyles.featureItem}>
          <Text style={sampleStyles.featureItemText}>Stroke Play</Text>
        </View>
        <FeatureLock {...args}>
          <View style={sampleStyles.featureItem}>
            <Text style={sampleStyles.featureItemText}>Match Play</Text>
          </View>
        </FeatureLock>
      </View>
    </View>
  ),
};

export const StatisticsDashboard: Story = {
  args: {
    feature: 'advanced_stats',
    lockedMessage: 'Detailed statistics require Premium tier',
    onUpgradePress: () => console.log('Upgrade to Premium'),
  },
  render: (args) => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1a1a1a' }}>
        Your Statistics
      </Text>
      <SampleCard
        title="Basic Stats"
        description="Rounds: 24 | Avg Score: 84 | Best: 78"
      />
      <View style={{ height: 16 }} />
      <FeatureLock {...args}>
        <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
            Advanced Analytics
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>68%</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>Fairways</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>58%</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>GIR</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>1.8</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>Putts/GIR</Text>
            </View>
          </View>
        </View>
      </FeatureLock>
    </View>
  ),
};

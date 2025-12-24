/**
 * UpgradePrompt Storybook Stories
 *
 * Visual testing stories for the upgrade prompt modal component.
 * Demonstrates various configurations, tiers, and states.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { UpgradePrompt, UpgradePromptConfig } from './UpgradePrompt';
import type { SubscriptionTier, FeatureId } from '@/types/subscription.types';

// ============================================================================
// META CONFIGURATION
// ============================================================================

const meta: Meta<typeof UpgradePrompt> = {
  title: 'Subscription/UpgradePrompt',
  component: UpgradePrompt,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Whether the modal is visible',
    },
    onUpgrade: {
      action: 'onUpgrade',
      description: 'Callback when upgrade button is pressed',
    },
    onDismiss: {
      action: 'onDismiss',
      description: 'Callback when dismiss button is pressed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof UpgradePrompt>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const createConfig = (
  overrides: Partial<UpgradePromptConfig> = {}
): UpgradePromptConfig => ({
  feature: 'scoring_pairs' as FeatureId,
  title: 'Unlock Scoring Pairs',
  message: 'Get designated markers for competitive rounds',
  targetTier: 'premium' as SubscriptionTier,
  benefits: [
    'Designated scoring pairs',
    'Official marker assignments',
    'Tournament-style verification',
  ],
  ...overrides,
});

// ============================================================================
// DEFAULT STORIES
// ============================================================================

export const Default: Story = {
  args: {
    config: createConfig(),
    visible: true,
  },
};

export const WithDismissButton: Story = {
  args: {
    config: createConfig(),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const Hidden: Story = {
  args: {
    config: createConfig(),
    visible: false,
  },
};

// ============================================================================
// TIER-SPECIFIC STORIES
// ============================================================================

export const FreeTier: Story = {
  args: {
    config: createConfig({
      targetTier: 'free',
      title: 'Free Features',
      message: 'Enjoy basic access to The Nineteenth',
      benefits: ['Basic scoring', 'View leaderboards', 'Join competitions'],
    }),
    visible: true,
  },
};

export const SocialTier: Story = {
  args: {
    config: createConfig({
      targetTier: 'social',
      title: 'Upgrade to Social',
      message: 'Perfect for casual golfers and social rounds',
      benefits: [
        'Up to 8 competitions',
        '16 players per competition',
        'Stroke Play & Match Play',
        'Basic statistics',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const PremiumTier: Story = {
  args: {
    config: createConfig({
      targetTier: 'premium',
      title: 'Go Premium',
      message: 'Unlimited access for serious golf organisers',
      benefits: [
        'Unlimited competitions',
        '40 players per competition',
        'All game types & team formats',
        'Scoring pairs for verification',
        'Advanced statistics & insights',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const SuperAdminTier: Story = {
  args: {
    config: createConfig({
      targetTier: 'super_admin',
      title: 'Super Admin Access',
      message: 'Full system access with no limits',
      benefits: [
        'No limits on anything',
        'Admin tools access',
        'System management',
        'Debug features',
      ],
    }),
    visible: true,
  },
};

// ============================================================================
// FEATURE-SPECIFIC STORIES
// ============================================================================

export const CreateCompetitionFeature: Story = {
  args: {
    config: createConfig({
      feature: 'create_competition',
      title: 'Need More Competitions?',
      message: 'Upgrade to create unlimited competitions',
      targetTier: 'social',
      benefits: [
        'Up to 8 competitions',
        '16 players per comp',
        'Multiple rounds per competition',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const AddRoundFeature: Story = {
  args: {
    config: createConfig({
      feature: 'add_round',
      title: 'Add More Rounds',
      message: 'Upgrade to add multiple rounds to your competitions',
      targetTier: 'social',
      benefits: [
        'Up to 5 rounds per competition',
        'Multiple course support',
        'Progressive leaderboards',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const AddPlayerFeature: Story = {
  args: {
    config: createConfig({
      feature: 'add_player',
      title: 'Bigger Competitions',
      message: 'Upgrade to invite more players to your competitions',
      targetTier: 'premium',
      benefits: [
        'Up to 40 players per competition',
        'Larger group pairings',
        'Team competition support',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const GameTypeFeature: Story = {
  args: {
    config: createConfig({
      feature: 'game_type',
      title: 'Unlock Match Play',
      message: 'Get access to match play and more game types',
      targetTier: 'social',
      benefits: [
        'Match Play scoring',
        'Stroke Play',
        'Head-to-head competitions',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const TeamFormatsFeature: Story = {
  args: {
    config: createConfig({
      feature: 'team_formats',
      title: 'Unlock Team Formats',
      message: 'Play Best Ball, Scramble, and more team games',
      targetTier: 'premium',
      benefits: [
        'Best Ball scoring',
        'Scramble / Ambrose',
        'Team Match Play',
        'Automatic team formation',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const ScoringPairsFeature: Story = {
  args: {
    config: createConfig({
      feature: 'scoring_pairs',
      title: 'Enable Scoring Pairs',
      message: 'Designated markers for competitive verification',
      targetTier: 'premium',
      benefits: [
        'Designated scoring pairs',
        'Official marker assignments',
        'Tournament-style verification',
        'Score attestation',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const AddFriendFeature: Story = {
  args: {
    config: createConfig({
      feature: 'add_friend',
      title: 'Connect with More Golfers',
      message: 'Add more friends to compare scores and stats',
      targetTier: 'social',
      benefits: [
        'Up to 50 friends',
        'Compare round stats',
        'Send competition invites',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const CompareStatsFeature: Story = {
  args: {
    config: createConfig({
      feature: 'compare_stats',
      title: 'Compare Your Stats',
      message: 'See how you stack up against friends',
      targetTier: 'social',
      benefits: [
        'Head-to-head comparisons',
        'Score distributions',
        'Performance over time',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const BasicStatsFeature: Story = {
  args: {
    config: createConfig({
      feature: 'basic_stats',
      title: 'Unlock Statistics',
      message: 'Track your game with detailed stats',
      targetTier: 'social',
      benefits: [
        'Round history',
        'Score averages',
        'Course performance',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const AdvancedStatsFeature: Story = {
  args: {
    config: createConfig({
      feature: 'advanced_stats',
      title: 'Advanced Statistics',
      message: 'Get detailed insights into your game',
      targetTier: 'premium',
      benefits: [
        'Fairways hit percentage',
        'Greens in regulation',
        'Putts per round averages',
        'Course performance breakdown',
        'Trend analysis',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const ScoreDistributionFeature: Story = {
  args: {
    config: createConfig({
      feature: 'score_distribution',
      title: 'Score Distribution Charts',
      message: 'Visualize your scoring patterns',
      targetTier: 'premium',
      benefits: [
        'Birdie/Par/Bogey breakdown',
        'Hole-by-hole analysis',
        'Historical trends',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const ExportDataFeature: Story = {
  args: {
    config: createConfig({
      feature: 'export_data',
      title: 'Export Your Data',
      message: 'Download your golf data in multiple formats',
      targetTier: 'premium',
      benefits: [
        'Export to CSV',
        'PDF reports',
        'Competition summaries',
        'Complete history backup',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

// ============================================================================
// CONTENT VARIATION STORIES
// ============================================================================

export const NoBenefits: Story = {
  args: {
    config: createConfig({
      benefits: [],
      title: 'Simple Upgrade',
      message: 'Upgrade to unlock more features',
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const SingleBenefit: Story = {
  args: {
    config: createConfig({
      benefits: ['Access to premium features'],
      title: 'Quick Upgrade',
      message: 'Get access to premium features',
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const ManyBenefits: Story = {
  args: {
    config: createConfig({
      benefits: [
        'Unlimited competitions',
        'Up to 40 players per competition',
        'All game types',
        'Team formats (Best Ball, Scramble)',
        'Scoring pairs verification',
        'Advanced statistics',
        'Data export',
        'Priority support',
      ],
      title: 'Premium Everything',
      message: 'Get access to all features',
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const LongBenefitText: Story = {
  args: {
    config: createConfig({
      benefits: [
        'This is a very long benefit description that explains the feature in detail',
        'Another lengthy explanation of what this benefit provides to users',
        'A third detailed benefit with comprehensive information',
      ],
      title: 'Detailed Benefits',
      message: 'Read all about what you get',
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const ShortTitle: Story = {
  args: {
    config: createConfig({
      title: 'Upgrade',
      message: 'Get more features',
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const LongTitle: Story = {
  args: {
    config: createConfig({
      title: 'Unlock Premium Features and Get the Most Out of The Nineteenth',
      message: 'Experience the full power of our golf competition platform',
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

// ============================================================================
// SPECIAL CHARACTER STORIES
// ============================================================================

export const SpecialCharacters: Story = {
  args: {
    config: createConfig({
      title: "Unlock Pro Features & More!",
      message: "Get 100% access to advanced stats & team features.",
      benefits: [
        "Statistics & analytics",
        "Team formats: 2's, 3's, 4's",
        'Premium support (24/7)',
        '€0 setup fees!',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const EmojiInContent: Story = {
  args: {
    config: createConfig({
      title: 'Upgrade Today',
      message: 'Unlock premium features for your golf experience',
      benefits: [
        'Unlimited competitions',
        'All game types included',
        'Priority support available',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

// ============================================================================
// INTERACTION STORIES
// ============================================================================

export const WithoutDismiss: Story = {
  args: {
    config: createConfig({
      title: 'Mandatory Upgrade',
      message: 'This feature requires an upgrade to continue',
    }),
    visible: true,
    // No onDismiss - user must upgrade or close via backdrop
  },
};

export const AllTierColors: Story = {
  render: () => (
    <View style={{ flex: 1 }}>
      <UpgradePrompt
        config={createConfig({ targetTier: 'premium' })}
        visible={true}
        onUpgrade={() => console.log('Upgrade to Premium')}
        onDismiss={() => console.log('Dismissed')}
      />
    </View>
  ),
};

// ============================================================================
// REAL-WORLD SCENARIO STORIES
// ============================================================================

export const CompetitionLimitReached: Story = {
  args: {
    config: createConfig({
      feature: 'create_competition',
      title: 'Competition Limit Reached',
      message: 'You have reached the maximum number of competitions for the Free tier (3). Upgrade to Social to create up to 8 competitions.',
      targetTier: 'social',
      benefits: [
        'Up to 8 active competitions',
        'Up to 5 rounds per competition',
        '16 players per competition',
        'Stroke Play & Match Play formats',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const PlayerLimitReached: Story = {
  args: {
    config: createConfig({
      feature: 'add_player',
      title: 'Player Limit Reached',
      message: 'You have reached the maximum number of players for Social tier (16). Upgrade to Premium to add up to 40 players.',
      targetTier: 'premium',
      benefits: [
        'Up to 40 players per competition',
        'Team formation for large groups',
        'Balanced team creation',
        'Multiple group pairings',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const FriendLimitReached: Story = {
  args: {
    config: createConfig({
      feature: 'add_friend',
      title: 'Friend Limit Reached',
      message: 'You have reached the maximum number of friends for Free tier (10). Upgrade to connect with more golfers.',
      targetTier: 'social',
      benefits: [
        'Up to 50 friends',
        'Compare stats with friends',
        'Easy competition invites',
        'Friend activity feed',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const MatchPlayLocked: Story = {
  args: {
    config: createConfig({
      feature: 'game_type',
      title: 'Match Play Locked',
      message: 'Match Play is available on Social and Premium tiers. Upgrade to play head-to-head matches.',
      targetTier: 'social',
      benefits: [
        'Match Play scoring',
        'Hole-by-hole standings',
        'Automatic dormie detection',
        'Match result tracking',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const TeamFormatsLocked: Story = {
  args: {
    config: createConfig({
      feature: 'team_formats',
      title: 'Team Formats Locked',
      message: 'Team formats like Best Ball and Scramble are Premium features. Upgrade to play team competitions.',
      targetTier: 'premium',
      benefits: [
        'Best Ball (better ball)',
        'Scramble / Ambrose',
        'Team Match Play',
        'Automatic team scoring',
        'Team leaderboards',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const StatisticsLocked: Story = {
  args: {
    config: createConfig({
      feature: 'advanced_stats',
      title: 'Statistics Locked',
      message: 'Detailed statistics and insights are available on Premium. Upgrade to analyse your game.',
      targetTier: 'premium',
      benefits: [
        'Fairways hit percentage',
        'Greens in regulation',
        'Putting averages',
        'Score distribution charts',
        'Course-by-course analysis',
        'Trend graphs over time',
      ],
    }),
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

/**
 * Paywall Storybook Stories
 *
 * Visual testing stories for the subscription paywall modal component.
 * Demonstrates tier selection, billing periods, loading states,
 * and various configurations.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, Alert } from 'react-native';
import { Paywall } from './Paywall';

// ============================================================================
// META CONFIGURATION
// ============================================================================

const meta: Meta<typeof Paywall> = {
  title: 'Subscription/Paywall',
  component: Paywall,
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
      description: 'Whether the paywall modal is visible',
    },
    initialTier: {
      control: 'select',
      options: ['social', 'premium'],
      description: 'Pre-selected subscription tier',
    },
    onPurchaseSuccess: {
      action: 'onPurchaseSuccess',
      description: 'Callback when purchase is successful',
    },
    onDismiss: {
      action: 'onDismiss',
      description: 'Callback when paywall is dismissed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Paywall>;

// ============================================================================
// DEFAULT STORIES
// ============================================================================

export const Default: Story = {
  args: {
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
};

export const Hidden: Story = {
  args: {
    visible: false,
    onDismiss: () => console.log('Dismissed'),
  },
};

// ============================================================================
// INITIAL TIER STORIES
// ============================================================================

export const SocialTierSelected: Story = {
  args: {
    visible: true,
    initialTier: 'social',
    onDismiss: () => console.log('Dismissed'),
  },
};

export const PremiumTierSelected: Story = {
  args: {
    visible: true,
    initialTier: 'premium',
    onDismiss: () => console.log('Dismissed'),
  },
};

// ============================================================================
// INTERACTIVE STORIES
// ============================================================================

export const WithPurchaseCallback: Story = {
  args: {
    visible: true,
    onPurchaseSuccess: (tier) => {
      Alert.alert('Purchase Success', `You subscribed to ${tier}!`);
    },
    onDismiss: () => console.log('Dismissed'),
  },
};

export const WithDismissCallback: Story = {
  args: {
    visible: true,
    onDismiss: () => {
      Alert.alert('Dismissed', 'Paywall was closed');
    },
  },
};

// ============================================================================
// TIER SELECTION SHOWCASE
// ============================================================================

export const SocialTierFeatures: Story = {
  args: {
    visible: true,
    initialTier: 'social',
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows the Social tier features including 8 competitions, 16 players, and Stroke/Match Play.',
      },
    },
  },
};

export const PremiumTierFeatures: Story = {
  args: {
    visible: true,
    initialTier: 'premium',
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows the Premium tier features including unlimited competitions, 40 players, and all game types.',
      },
    },
  },
};

// ============================================================================
// PRICING DISPLAY STORIES
// ============================================================================

export const MonthlyPricing: Story = {
  args: {
    visible: true,
    initialTier: 'social',
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Default view shows monthly pricing for the selected tier.',
      },
    },
  },
};

export const YearlyPricingWithSavings: Story = {
  args: {
    visible: true,
    initialTier: 'social',
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Select Yearly billing to see the annual price and 33% savings badge.',
      },
    },
  },
};

// ============================================================================
// FREE TRIAL STORIES
// ============================================================================

export const FreeTrialBadge: Story = {
  args: {
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the 7-day free trial badge and cancellation note.',
      },
    },
  },
};

// ============================================================================
// COMPLETE FLOW STORIES
// ============================================================================

export const FullPurchaseFlow: Story = {
  args: {
    visible: true,
    initialTier: 'social',
    onPurchaseSuccess: (tier) => {
      console.log(`Purchased ${tier}`);
      Alert.alert(
        'Subscription Active',
        `Welcome to The Nineteenth ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`
      );
    },
    onDismiss: () => {
      console.log('Dismissed');
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Complete purchase flow with tier selection, billing period toggle, and purchase button.',
      },
    },
  },
};

export const UpgradeFromSocialToPremium: Story = {
  args: {
    visible: true,
    initialTier: 'premium',
    onPurchaseSuccess: (_tier) => {
      Alert.alert('Upgrade Complete', 'You are now a Premium member!');
    },
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Paywall pre-selected to Premium for users upgrading from Social.',
      },
    },
  },
};

// ============================================================================
// RESTORE PURCHASES STORIES
// ============================================================================

export const RestorePurchasesAvailable: Story = {
  args: {
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows the Restore Purchases button for users who may have previous subscriptions.',
      },
    },
  },
};

// ============================================================================
// LEGAL LINKS STORIES
// ============================================================================

export const LegalLinksDisplay: Story = {
  args: {
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows Terms of Service and Privacy Policy links at the bottom of the paywall.',
      },
    },
  },
};

// ============================================================================
// EDGE CASE STORIES
// ============================================================================

export const RapidTierSwitching: Story = {
  args: {
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Test rapid switching between Social and Premium tiers to verify state management.',
      },
    },
  },
};

export const RapidBillingToggle: Story = {
  args: {
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Test rapid toggling between Monthly and Yearly billing to verify price updates.',
      },
    },
  },
};

// ============================================================================
// REAL-WORLD SCENARIO STORIES
// ============================================================================

export const NewUserFirstPurchase: Story = {
  args: {
    visible: true,
    initialTier: 'social',
    onPurchaseSuccess: (tier) => {
      Alert.alert(
        'Welcome to The Nineteenth!',
        `Your ${tier} subscription is now active. Enjoy your 7-day free trial!`
      );
    },
    onDismiss: () => {
      Alert.alert('Maybe Later', 'You can upgrade anytime from Settings.');
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'First-time user experience with Social tier pre-selected.',
      },
    },
  },
};

export const FreeTierUserUpgrade: Story = {
  args: {
    visible: true,
    initialTier: 'social',
    onPurchaseSuccess: (tier) => {
      Alert.alert('Upgrade Complete', `Welcome to ${tier}! You now have access to more features.`);
    },
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'User on Free tier hitting a limit and being prompted to upgrade.',
      },
    },
  },
};

export const SocialTierUserUpgrade: Story = {
  args: {
    visible: true,
    initialTier: 'premium',
    onPurchaseSuccess: () => {
      Alert.alert(
        'Welcome to Premium!',
        'You now have unlimited competitions, 40 players per competition, and all game types!'
      );
    },
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Social tier user wanting to upgrade to Premium for team formats or more players.',
      },
    },
  },
};

export const FeatureLockedPrompt: Story = {
  args: {
    visible: true,
    initialTier: 'premium',
    onPurchaseSuccess: (_tier) => {
      Alert.alert('Feature Unlocked', 'You can now use scoring pairs!');
    },
    onDismiss: () => {
      Alert.alert('Feature Locked', 'Scoring pairs requires Premium.');
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Paywall shown when user tries to access a Premium-only feature.',
      },
    },
  },
};

// ============================================================================
// ACCESSIBILITY STORIES
// ============================================================================

export const AccessiblePaywall: Story = {
  args: {
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Paywall with proper accessibility labels on all interactive elements.',
      },
    },
  },
};

// ============================================================================
// SUBSCRIPTION INFO STORIES
// ============================================================================

export const AppleSubscriptionInfo: Story = {
  args: {
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows required Apple subscription disclosure text about billing and auto-renewal.',
      },
    },
  },
};

// ============================================================================
// COMPARISON STORIES
// ============================================================================

export const SocialVsPremiumComparison: Story = {
  render: () => (
    <View style={{ flex: 1 }}>
      <Paywall
        visible={true}
        initialTier="social"
        onPurchaseSuccess={(tier) => console.log(`Purchased ${tier}`)}
        onDismiss={() => console.log('Dismissed')}
      />
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Use the tier cards to compare Social and Premium features and pricing.',
      },
    },
  },
};

// ============================================================================
// SAVINGS HIGHLIGHT STORIES
// ============================================================================

export const YearlySavingsHighlight: Story = {
  args: {
    visible: true,
    initialTier: 'premium',
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Toggle to Yearly billing to see the 33% savings badge. Premium yearly is $84.99 vs $119.88 monthly.',
      },
    },
  },
};

// ============================================================================
// DARK MODE STORIES (if theme switching is available)
// ============================================================================

export const LightMode: Story = {
  args: {
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    backgrounds: { default: 'light' },
    docs: {
      description: {
        story: 'Paywall in light mode theme.',
      },
    },
  },
};

export const DarkModePreview: Story = {
  args: {
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Paywall in dark mode theme.',
      },
    },
  },
};

// ============================================================================
// LAYOUT STORIES
// ============================================================================

export const FullscreenModal: Story = {
  args: {
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story: 'Paywall displayed as fullscreen modal on mobile viewport.',
      },
    },
  },
};

export const TabletView: Story = {
  args: {
    visible: true,
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    viewport: { defaultViewport: 'tablet' },
    docs: {
      description: {
        story: 'Paywall on tablet-sized viewport.',
      },
    },
  },
};

// ============================================================================
// COMPLETE TIER WALKTHROUGH
// ============================================================================

export const TierWalkthrough: Story = {
  render: () => (
    <View style={{ flex: 1 }}>
      <Paywall
        visible={true}
        initialTier="social"
        onPurchaseSuccess={(tier) => {
          Alert.alert(
            'Success!',
            `You've subscribed to ${tier.charAt(0).toUpperCase() + tier.slice(1)}.\n\n` +
              'Features unlocked:\n' +
              (tier === 'social'
                ? '- Up to 8 competitions\n- 16 players per competition\n- Stroke Play & Match Play'
                : '- Unlimited competitions\n- 40 players per competition\n- All game types\n- Scoring pairs\n- Priority support')
          );
        }}
        onDismiss={() => console.log('Dismissed')}
      />
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Interactive walkthrough of selecting tiers, billing periods, and making a purchase.',
      },
    },
  },
};

/**
 * DowngradeConfirmationModal Stories
 *
 * Storybook stories for the downgrade confirmation modal component.
 * Shows different tier combinations and interaction states.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DowngradeConfirmationModal } from './DowngradeConfirmationModal';

// Lightweight action logger for stories (addon-actions may not export 'action')
const action = (name: string) => (...args: unknown[]) => {
  console.log(`[action] ${name}`, ...args);
};

// ============================================================================
// META
// ============================================================================

const meta: Meta<typeof DowngradeConfirmationModal> = {
  title: 'Subscription/DowngradeConfirmationModal',
  component: DowngradeConfirmationModal,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Whether the modal is visible',
    },
    currentTier: {
      control: 'select',
      options: ['free', 'social', 'premium', 'super_admin'],
      description: 'Current subscription tier',
    },
    targetTier: {
      control: 'select',
      options: ['free', 'social', 'premium', 'super_admin'],
      description: 'Target tier to downgrade to',
    },
    onConfirm: {
      action: 'confirm',
      description: 'Called when user confirms (opens App Store settings)',
    },
    onDismiss: {
      action: 'dismiss',
      description: 'Called when user dismisses the modal',
    },
  },
};

export default meta;
type Story = StoryObj<typeof DowngradeConfirmationModal>;

// ============================================================================
// STORIES
// ============================================================================

/**
 * Default story - Premium to Social downgrade
 * Shows the most common downgrade scenario
 */
export const Default: Story = {
  args: {
    visible: true,
    currentTier: 'premium',
    targetTier: 'social',
    onConfirm: action('onConfirm'),
    onDismiss: action('onDismiss'),
  },
};

/**
 * Premium to Free downgrade
 * Shows maximum feature loss scenario
 */
export const PremiumToFree: Story = {
  args: {
    visible: true,
    currentTier: 'premium',
    targetTier: 'free',
    onConfirm: action('onConfirm'),
    onDismiss: action('onDismiss'),
  },
};

/**
 * Social to Free downgrade
 * Shows moderate feature loss scenario
 */
export const SocialToFree: Story = {
  args: {
    visible: true,
    currentTier: 'social',
    targetTier: 'free',
    onConfirm: action('onConfirm'),
    onDismiss: action('onDismiss'),
  },
};

/**
 * Super Admin to Premium downgrade
 * Shows admin downgrade scenario (internal use)
 */
export const SuperAdminToPremium: Story = {
  args: {
    visible: true,
    currentTier: 'super_admin',
    targetTier: 'premium',
    onConfirm: action('onConfirm'),
    onDismiss: action('onDismiss'),
  },
};

/**
 * Super Admin to Free downgrade
 * Shows maximum downgrade from admin tier
 */
export const SuperAdminToFree: Story = {
  args: {
    visible: true,
    currentTier: 'super_admin',
    targetTier: 'free',
    onConfirm: action('onConfirm'),
    onDismiss: action('onDismiss'),
  },
};

/**
 * Hidden state
 * Shows the modal when visible is false (should render nothing)
 */
export const Hidden: Story = {
  args: {
    visible: false,
    currentTier: 'premium',
    targetTier: 'social',
    onConfirm: action('onConfirm'),
    onDismiss: action('onDismiss'),
  },
};

/**
 * Interactive story with console logging
 * For manual testing of button interactions
 */
export const Interactive: Story = {
  args: {
    visible: true,
    currentTier: 'premium',
    targetTier: 'social',
    onConfirm: () => {
      console.log('[Interactive] Confirm pressed - would open App Store');
      action('onConfirm')();
    },
    onDismiss: () => {
      console.log('[Interactive] Dismiss pressed - keeping current plan');
      action('onDismiss')();
    },
  },
};

/**
 * With testID
 * Shows the modal with a custom testID for testing purposes
 */
export const WithTestID: Story = {
  args: {
    visible: true,
    currentTier: 'premium',
    targetTier: 'social',
    onConfirm: action('onConfirm'),
    onDismiss: action('onDismiss'),
    testID: 'custom-downgrade-modal',
  },
};

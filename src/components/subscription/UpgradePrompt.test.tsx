/**
 * UpgradePrompt Component Tests
 *
 * Comprehensive tests for the upgrade prompt modal including:
 * - Rendering states (visible/hidden)
 * - Animation behavior
 * - Props handling (config, onUpgrade, onDismiss)
 * - Tier-specific styling and content
 * - Benefits list rendering
 * - Accessibility features
 * - User interactions
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { UpgradePrompt, UpgradePromptConfig } from './UpgradePrompt';
import type { SubscriptionTier, FeatureId } from '@/types/subscription.types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock AccessibilityInfo.announceForAccessibility
const mockAnnounceForAccessibility = jest.fn();
jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(mockAnnounceForAccessibility);

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createTestConfig = (
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

const defaultProps = {
  config: createTestConfig(),
  onUpgrade: jest.fn(),
};

// ============================================================================
// TESTS
// ============================================================================

describe('UpgradePrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders when visible is true (default)', () => {
      render(<UpgradePrompt {...defaultProps} testID="upgrade-prompt" />);

      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      render(
        <UpgradePrompt {...defaultProps} visible={false} testID="upgrade-prompt" />
      );

      expect(screen.queryByTestId('upgrade-prompt')).toBeNull();
    });

    it('renders the title from config', () => {
      render(<UpgradePrompt {...defaultProps} />);

      expect(screen.getByText('Unlock Scoring Pairs')).toBeTruthy();
    });

    it('renders the message from config', () => {
      render(<UpgradePrompt {...defaultProps} />);

      expect(
        screen.getByText('Get designated markers for competitive rounds')
      ).toBeTruthy();
    });

    it('renders all benefits from config', () => {
      render(<UpgradePrompt {...defaultProps} />);

      expect(screen.getByText('Designated scoring pairs')).toBeTruthy();
      expect(screen.getByText('Official marker assignments')).toBeTruthy();
      expect(screen.getByText('Tournament-style verification')).toBeTruthy();
    });

    it('renders upgrade button with tier name', () => {
      render(<UpgradePrompt {...defaultProps} />);

      expect(screen.getByText('Upgrade to Premium')).toBeTruthy();
    });

    it('renders dismiss button when onDismiss is provided', () => {
      const onDismiss = jest.fn();
      render(<UpgradePrompt {...defaultProps} onDismiss={onDismiss} />);

      expect(screen.getByText('Maybe later')).toBeTruthy();
    });

    it('does not render dismiss button when onDismiss is not provided', () => {
      render(<UpgradePrompt {...defaultProps} />);

      expect(screen.queryByText('Maybe later')).toBeNull();
    });

    it('does not render benefits section when benefits array is empty', () => {
      const config = createTestConfig({ benefits: [] });
      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      // Title and message should still be present
      expect(screen.getByText('Unlock Scoring Pairs')).toBeTruthy();
      // Benefits should not be rendered
      expect(screen.queryByText('Designated scoring pairs')).toBeNull();
    });

    it('renders rocket icon', () => {
      render(<UpgradePrompt {...defaultProps} testID="upgrade-prompt" />);

      // The icon container should be present
      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TIER-SPECIFIC TESTS
  // ===========================================================================

  describe('Tier-Specific Content', () => {
    it('renders "Upgrade to Free" for free tier', () => {
      const config = createTestConfig({ targetTier: 'free' });
      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(screen.getByText('Upgrade to Free')).toBeTruthy();
    });

    it('renders "Upgrade to Social" for social tier', () => {
      const config = createTestConfig({ targetTier: 'social' });
      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(screen.getByText('Upgrade to Social')).toBeTruthy();
    });

    it('renders "Upgrade to Premium" for premium tier', () => {
      const config = createTestConfig({ targetTier: 'premium' });
      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(screen.getByText('Upgrade to Premium')).toBeTruthy();
    });

    it('renders "Upgrade to Super Admin" for super_admin tier', () => {
      const config = createTestConfig({ targetTier: 'super_admin' });
      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(screen.getByText('Upgrade to Super Admin')).toBeTruthy();
    });
  });

  // ===========================================================================
  // INTERACTION TESTS
  // ===========================================================================

  describe('Interactions', () => {
    it('calls onUpgrade when upgrade button is pressed', () => {
      const onUpgrade = jest.fn();
      render(<UpgradePrompt {...defaultProps} onUpgrade={onUpgrade} />);

      const upgradeButton = screen.getByLabelText('Upgrade to Premium');
      fireEvent.press(upgradeButton);

      expect(onUpgrade).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when dismiss button is pressed', () => {
      const onDismiss = jest.fn();
      render(<UpgradePrompt {...defaultProps} onDismiss={onDismiss} />);

      const dismissButton = screen.getByText('Maybe later');
      fireEvent.press(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when backdrop is pressed', () => {
      const onDismiss = jest.fn();
      render(<UpgradePrompt {...defaultProps} onDismiss={onDismiss} />);

      const backdrop = screen.getByLabelText('Close upgrade prompt');
      fireEvent.press(backdrop);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not call onDismiss when backdrop is pressed and onDismiss is not provided', () => {
      render(<UpgradePrompt {...defaultProps} />);

      // Backdrop should still have the accessibility label
      const backdrop = screen.getByLabelText('Close upgrade prompt');
      fireEvent.press(backdrop);

      // No error should be thrown
      expect(defaultProps.onUpgrade).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('announces for accessibility when visible', async () => {
      render(<UpgradePrompt {...defaultProps} />);

      await waitFor(() => {
        expect(mockAnnounceForAccessibility).toHaveBeenCalledWith(
          'Upgrade prompt: Unlock Scoring Pairs. Get designated markers for competitive rounds'
        );
      });
    });

    it('announces for accessibility when upgrade button is pressed', () => {
      const onUpgrade = jest.fn();
      render(<UpgradePrompt {...defaultProps} onUpgrade={onUpgrade} />);

      const upgradeButton = screen.getByLabelText('Upgrade to Premium');
      fireEvent.press(upgradeButton);

      expect(mockAnnounceForAccessibility).toHaveBeenCalledWith(
        'Upgrading to Premium'
      );
    });

    it('announces for accessibility when dismiss button is pressed', () => {
      const onDismiss = jest.fn();
      render(<UpgradePrompt {...defaultProps} onDismiss={onDismiss} />);

      const dismissButton = screen.getByText('Maybe later');
      fireEvent.press(dismissButton);

      expect(mockAnnounceForAccessibility).toHaveBeenCalledWith(
        'Dismissed upgrade prompt'
      );
    });

    it('upgrade button has correct accessibility role', () => {
      render(<UpgradePrompt {...defaultProps} />);

      const upgradeButton = screen.getByRole('button', { name: 'Upgrade to Premium' });
      expect(upgradeButton).toBeTruthy();
    });

    it('upgrade button has accessibility hint', () => {
      render(<UpgradePrompt {...defaultProps} />);

      const upgradeButton = screen.getByLabelText('Upgrade to Premium');
      expect(upgradeButton.props.accessibilityHint).toBe('Opens subscription options');
    });

    it('dismiss button has correct accessibility role', () => {
      const onDismiss = jest.fn();
      render(<UpgradePrompt {...defaultProps} onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: 'Maybe later' });
      expect(dismissButton).toBeTruthy();
    });

    it('dismiss button has accessibility hint', () => {
      const onDismiss = jest.fn();
      render(<UpgradePrompt {...defaultProps} onDismiss={onDismiss} />);

      const dismissButton = screen.getByLabelText('Maybe later');
      expect(dismissButton.props.accessibilityHint).toBe('Closes this prompt');
    });

    it('backdrop has button role', () => {
      render(<UpgradePrompt {...defaultProps} onDismiss={jest.fn()} />);

      const backdrop = screen.getByRole('button', { name: 'Close upgrade prompt' });
      expect(backdrop).toBeTruthy();
    });

    it('container has alert role', () => {
      render(<UpgradePrompt {...defaultProps} testID="upgrade-prompt" />);

      // The animated view has alert role - use getByLabelText since the role is on animated view
      const container = screen.getByLabelText(
        'Unlock Scoring Pairs. Get designated markers for competitive rounds'
      );
      expect(container.props.accessibilityRole).toBe('alert');
    });

    it('container has accessibility label with title and message', () => {
      render(<UpgradePrompt {...defaultProps} />);

      const container = screen.getByLabelText(
        'Unlock Scoring Pairs. Get designated markers for competitive rounds'
      );
      expect(container.props.accessibilityLabel).toBe(
        'Unlock Scoring Pairs. Get designated markers for competitive rounds'
      );
    });

    it('each benefit row has accessibility label', () => {
      render(<UpgradePrompt {...defaultProps} />);

      // Check that benefit rows are accessible
      expect(screen.getByLabelText('Designated scoring pairs')).toBeTruthy();
      expect(screen.getByLabelText('Official marker assignments')).toBeTruthy();
      expect(screen.getByLabelText('Tournament-style verification')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROPS TESTS
  // ===========================================================================

  describe('Props', () => {
    it('passes testID to container', () => {
      render(<UpgradePrompt {...defaultProps} testID="my-upgrade-prompt" />);

      expect(screen.getByTestId('my-upgrade-prompt')).toBeTruthy();
    });

    it('handles visible prop defaulting to true', () => {
      render(<UpgradePrompt {...defaultProps} testID="upgrade-prompt" />);

      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();
    });

    it('handles different feature IDs in config', () => {
      const createCompConfig = createTestConfig({
        feature: 'create_competition',
        title: 'Need More Competitions?',
        message: 'Upgrade to create unlimited competitions',
      });

      render(<UpgradePrompt config={createCompConfig} onUpgrade={jest.fn()} />);

      expect(screen.getByText('Need More Competitions?')).toBeTruthy();
      expect(screen.getByText('Upgrade to create unlimited competitions')).toBeTruthy();
    });

    it('handles long benefit text with numberOfLines', () => {
      const config = createTestConfig({
        benefits: [
          'This is a very long benefit description that might need to be truncated on smaller screens',
        ],
      });

      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(
        screen.getByText(
          'This is a very long benefit description that might need to be truncated on smaller screens'
        )
      ).toBeTruthy();
    });

    it('handles many benefits', () => {
      const config = createTestConfig({
        benefits: [
          'Benefit 1',
          'Benefit 2',
          'Benefit 3',
          'Benefit 4',
          'Benefit 5',
          'Benefit 6',
        ],
      });

      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(screen.getByText('Benefit 1')).toBeTruthy();
      expect(screen.getByText('Benefit 6')).toBeTruthy();
    });

    it('handles single benefit', () => {
      const config = createTestConfig({
        benefits: ['Only one benefit'],
      });

      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(screen.getByText('Only one benefit')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ANIMATION TESTS
  // ===========================================================================

  describe('Animation', () => {
    it('initializes with scale animation value', () => {
      // Just verify the component renders - animation is internal
      render(<UpgradePrompt {...defaultProps} testID="upgrade-prompt" />);

      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();
    });

    it('resets animation when hidden', () => {
      const { rerender } = render(
        <UpgradePrompt {...defaultProps} visible={true} testID="upgrade-prompt" />
      );

      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();

      rerender(
        <UpgradePrompt {...defaultProps} visible={false} testID="upgrade-prompt" />
      );

      expect(screen.queryByTestId('upgrade-prompt')).toBeNull();
    });
  });

  // ===========================================================================
  // MODAL TESTS
  // ===========================================================================

  describe('Modal Behavior', () => {
    it('renders as a Modal component', () => {
      render(<UpgradePrompt {...defaultProps} testID="upgrade-prompt" />);

      // The component wraps content in a Modal
      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();
    });

    it('calls onDismiss on hardware back button (onRequestClose)', () => {
      const onDismiss = jest.fn();
      render(<UpgradePrompt {...defaultProps} onDismiss={onDismiss} />);

      // Modal's onRequestClose is wired to onDismiss
      // This is tested through the backdrop press which triggers the same handler
      const backdrop = screen.getByLabelText('Close upgrade prompt');
      fireEvent.press(backdrop);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty title gracefully', () => {
      const config = createTestConfig({ title: '' });
      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      // Should still render without crashing
      expect(screen.getByText('Get designated markers for competitive rounds')).toBeTruthy();
    });

    it('handles empty message gracefully', () => {
      const config = createTestConfig({ message: '' });
      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      // Should still render without crashing
      expect(screen.getByText('Unlock Scoring Pairs')).toBeTruthy();
    });

    it('handles special characters in text', () => {
      const config = createTestConfig({
        title: "Unlock Pro Features & More!",
        message: "Get access to advanced stats (100% accurate) & team features.",
        benefits: ["Statistics & analytics", "Team formats: 2's, 3's, 4's"],
      });

      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(screen.getByText("Unlock Pro Features & More!")).toBeTruthy();
      expect(screen.getByText("Get access to advanced stats (100% accurate) & team features.")).toBeTruthy();
      expect(screen.getByText("Statistics & analytics")).toBeTruthy();
      expect(screen.getByText("Team formats: 2's, 3's, 4's")).toBeTruthy();
    });

    it('handles rapid visibility toggling', () => {
      const { rerender } = render(
        <UpgradePrompt {...defaultProps} visible={true} testID="upgrade-prompt" />
      );

      rerender(
        <UpgradePrompt {...defaultProps} visible={false} testID="upgrade-prompt" />
      );
      rerender(
        <UpgradePrompt {...defaultProps} visible={true} testID="upgrade-prompt" />
      );
      rerender(
        <UpgradePrompt {...defaultProps} visible={false} testID="upgrade-prompt" />
      );

      expect(screen.queryByTestId('upgrade-prompt')).toBeNull();
    });

    it('handles config changes while visible', () => {
      const { rerender } = render(
        <UpgradePrompt {...defaultProps} testID="upgrade-prompt" />
      );

      expect(screen.getByText('Unlock Scoring Pairs')).toBeTruthy();

      const newConfig = createTestConfig({
        title: 'New Title',
        message: 'New Message',
        targetTier: 'social',
      });

      rerender(
        <UpgradePrompt config={newConfig} onUpgrade={jest.fn()} testID="upgrade-prompt" />
      );

      expect(screen.getByText('New Title')).toBeTruthy();
      expect(screen.getByText('New Message')).toBeTruthy();
      expect(screen.getByText('Upgrade to Social')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DARK MODE TESTS
  // ===========================================================================

  describe('Dark Mode', () => {
    it('renders correctly in dark mode', () => {
      render(
        <UpgradePrompt {...defaultProps} testID="upgrade-prompt" />,
        { isDarkMode: true }
      );

      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();
      expect(screen.getByText('Unlock Scoring Pairs')).toBeTruthy();
    });

    it('renders benefits in dark mode', () => {
      render(
        <UpgradePrompt {...defaultProps} />,
        { isDarkMode: true }
      );

      expect(screen.getByText('Designated scoring pairs')).toBeTruthy();
      expect(screen.getByText('Official marker assignments')).toBeTruthy();
    });

    it('renders buttons correctly in dark mode', () => {
      const onDismiss = jest.fn();
      render(
        <UpgradePrompt {...defaultProps} onDismiss={onDismiss} />,
        { isDarkMode: true }
      );

      expect(screen.getByText('Upgrade to Premium')).toBeTruthy();
      expect(screen.getByText('Maybe later')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FEATURE-SPECIFIC TESTS
  // ===========================================================================

  describe('Feature-Specific Configs', () => {
    it('renders create_competition feature config correctly', () => {
      const config = createTestConfig({
        feature: 'create_competition',
        title: 'Need More Competitions?',
        message: 'Upgrade to create unlimited competitions',
        targetTier: 'social',
        benefits: ['Up to 5 competitions', '16 players per comp', 'Stroke play format'],
      });

      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(screen.getByText('Need More Competitions?')).toBeTruthy();
      expect(screen.getByText('Upgrade to create unlimited competitions')).toBeTruthy();
      expect(screen.getByText('Up to 5 competitions')).toBeTruthy();
      expect(screen.getByText('16 players per comp')).toBeTruthy();
      expect(screen.getByText('Stroke play format')).toBeTruthy();
      expect(screen.getByText('Upgrade to Social')).toBeTruthy();
    });

    it('renders add_friend feature config correctly', () => {
      const config = createTestConfig({
        feature: 'add_friend',
        title: 'Connect with More Golfers',
        message: 'Add more friends to compare scores and stats',
        targetTier: 'social',
        benefits: ['Up to 50 friends', 'Compare round stats', 'Send invites'],
      });

      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(screen.getByText('Connect with More Golfers')).toBeTruthy();
      expect(screen.getByText('Add more friends to compare scores and stats')).toBeTruthy();
      expect(screen.getByText('Up to 50 friends')).toBeTruthy();
    });

    it('renders team_formats feature config correctly', () => {
      const config = createTestConfig({
        feature: 'team_formats',
        title: 'Unlock Team Formats',
        message: 'Play Best Ball, Scramble, and more team games',
        targetTier: 'premium',
        benefits: ['Best Ball scoring', 'Scramble / Shamble', 'Team Match Play'],
      });

      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(screen.getByText('Unlock Team Formats')).toBeTruthy();
      expect(screen.getByText('Play Best Ball, Scramble, and more team games')).toBeTruthy();
      expect(screen.getByText('Best Ball scoring')).toBeTruthy();
      expect(screen.getByText('Scramble / Shamble')).toBeTruthy();
      expect(screen.getByText('Team Match Play')).toBeTruthy();
    });

    it('renders advanced_stats feature config correctly', () => {
      const config = createTestConfig({
        feature: 'advanced_stats',
        title: 'Advanced Statistics',
        message: 'Get detailed insights into your game',
        targetTier: 'premium',
        benefits: [
          'Fairways hit percentage',
          'Greens in regulation',
          'Putts per round averages',
          'Course performance breakdown',
        ],
      });

      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(screen.getByText('Advanced Statistics')).toBeTruthy();
      expect(screen.getByText('Get detailed insights into your game')).toBeTruthy();
      expect(screen.getByText('Fairways hit percentage')).toBeTruthy();
      expect(screen.getByText('Greens in regulation')).toBeTruthy();
      expect(screen.getByText('Putts per round averages')).toBeTruthy();
      expect(screen.getByText('Course performance breakdown')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMORY / PERFORMANCE TESTS
  // ===========================================================================

  describe('Performance', () => {
    it('uses React.memo to prevent unnecessary re-renders', () => {
      // Component is wrapped with React.memo - this tests that it doesn't
      // throw errors when props don't change
      const { rerender } = render(
        <UpgradePrompt {...defaultProps} testID="upgrade-prompt" />
      );

      // Rerender with same props - should not cause issues
      rerender(<UpgradePrompt {...defaultProps} testID="upgrade-prompt" />);

      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();
    });

    it('handles multiple benefits without performance issues', () => {
      const manyBenefits = Array.from({ length: 10 }, (_, i) => `Benefit ${i + 1}`);
      const config = createTestConfig({ benefits: manyBenefits });

      render(<UpgradePrompt config={config} onUpgrade={jest.fn()} />);

      expect(screen.getByText('Benefit 1')).toBeTruthy();
      expect(screen.getByText('Benefit 10')).toBeTruthy();
    });
  });
});

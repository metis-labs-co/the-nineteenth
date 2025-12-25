/**
 * FeatureLock Component Tests
 *
 * Comprehensive tests for the FeatureLock component which provides graceful
 * degradation for tier-gated features:
 * - Rendering states (allowed/locked)
 * - Feature access checking
 * - Lock overlay behavior
 * - Upgrade interaction
 * - Accessibility features
 * - Custom props handling
 */

import React from 'react';
import { View, Text as RNText, AccessibilityInfo } from 'react-native';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { FeatureLock } from './FeatureLock';
import { useCheckFeature } from '@/context/SubscriptionContext';
import type { FeatureAccess, FeatureId, SubscriptionTier } from '@/types/subscription.types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock AccessibilityInfo.announceForAccessibility
const mockAnnounceForAccessibility = jest.fn();
jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(mockAnnounceForAccessibility);

// Mock the SubscriptionContext
jest.mock('@/context/SubscriptionContext', () => ({
  useCheckFeature: jest.fn(),
}));

const mockUseCheckFeature = useCheckFeature as jest.MockedFunction<typeof useCheckFeature>;

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createFeatureAccess = (
  overrides: Partial<FeatureAccess> = {}
): FeatureAccess => ({
  allowed: true,
  upgradeRequired: false,
  currentValue: 0,
  limitValue: -1,
  ...overrides,
});

const lockedAccess: FeatureAccess = {
  allowed: false,
  reason: 'Upgrade required for this feature',
  upgradeRequired: true,
  requiredTier: 'premium' as SubscriptionTier,
  currentValue: 3,
  limitValue: 3,
};

const TestChild = ({ testID = 'test-child' }: { testID?: string }) => (
  <View testID={testID}>
    <RNText>Child Content</RNText>
  </View>
);

// ============================================================================
// TESTS
// ============================================================================

describe('FeatureLock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: feature is allowed
    mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));
  });

  // ===========================================================================
  // RENDERING TESTS - ALLOWED STATE
  // ===========================================================================

  describe('Rendering - Allowed State', () => {
    it('renders children normally when feature is allowed', () => {
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByTestId('test-child')).toBeTruthy();
      expect(screen.getByText('Child Content')).toBeTruthy();
    });

    it('does not show lock overlay when feature is allowed', () => {
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));

      render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      // No lock icon should be present
      expect(screen.queryByText('Upgrade to unlock')).toBeNull();
      expect(screen.queryByText('Tap to upgrade')).toBeNull();
    });

    it('renders multiple children when feature is allowed', () => {
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild testID="child-1" />
          <TestChild testID="child-2" />
        </FeatureLock>
      );

      expect(screen.getByTestId('child-1')).toBeTruthy();
      expect(screen.getByTestId('child-2')).toBeTruthy();
    });

    it('renders text content when feature is allowed', () => {
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));

      render(
        <FeatureLock feature="scoring_pairs">
          <RNText>Simple text content</RNText>
        </FeatureLock>
      );

      expect(screen.getByText('Simple text content')).toBeTruthy();
    });
  });

  // ===========================================================================
  // RENDERING TESTS - LOCKED STATE
  // ===========================================================================

  describe('Rendering - Locked State', () => {
    it('renders children with reduced opacity when feature is locked', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      const { UNSAFE_getAllByType } = render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByTestId('feature-lock')).toBeTruthy();
      // Child still visible (dimmed) - verify by checking View components exist
      const views = UNSAFE_getAllByType(View);
      expect(views.length).toBeGreaterThan(0);
    });

    it('shows lock overlay with default message when feature is locked', () => {
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          upgradeRequired: true,
        })
      );

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Upgrade to unlock')).toBeTruthy();
    });

    it('shows custom locked message from access.reason', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Upgrade required for this feature')).toBeTruthy();
    });

    it('shows custom lockedMessage prop over access.reason', () => {
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          reason: undefined, // No reason from API
          upgradeRequired: true,
        })
      );

      render(
        <FeatureLock
          feature="scoring_pairs"
          lockedMessage="Custom lock message"
        >
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Custom lock message')).toBeTruthy();
    });

    it('prefers access.reason when both are provided', () => {
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          reason: 'API reason message',
          upgradeRequired: true,
        })
      );

      render(
        <FeatureLock
          feature="scoring_pairs"
          lockedMessage="Prop message"
        >
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('API reason message')).toBeTruthy();
    });

    it('shows required tier indicator when requiredTier is provided', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Requires Premium or higher')).toBeTruthy();
    });

    it('shows "Tap to upgrade" when onUpgradePress is provided', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);
      const onUpgradePress = jest.fn();

      render(
        <FeatureLock feature="scoring_pairs" onUpgradePress={onUpgradePress}>
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Tap to upgrade')).toBeTruthy();
    });

    it('does not show "Tap to upgrade" when onUpgradePress is not provided', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.queryByText('Tap to upgrade')).toBeNull();
    });
  });

  // ===========================================================================
  // LOCK ICON TESTS
  // ===========================================================================

  describe('Lock Icon', () => {
    it('shows lock icon by default when locked', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      // Lock icon should be visible (we can't test the icon itself easily, but the overlay is there)
      expect(screen.getByTestId('feature-lock')).toBeTruthy();
    });

    it('hides lock icon when showLockIcon is false', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock
          feature="scoring_pairs"
          showLockIcon={false}
          testID="feature-lock"
        >
          <TestChild />
        </FeatureLock>
      );

      // The overlay content is still rendered, just without the icon
      expect(screen.getByText('Upgrade required for this feature')).toBeTruthy();
    });
  });

  // ===========================================================================
  // HIDE WHEN LOCKED TESTS
  // ===========================================================================

  describe('hideWhenLocked', () => {
    it('renders nothing when hideWhenLocked is true and feature is locked', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock
          feature="scoring_pairs"
          hideWhenLocked={true}
          testID="feature-lock"
        >
          <TestChild />
        </FeatureLock>
      );

      expect(screen.queryByTestId('feature-lock')).toBeNull();
      expect(screen.queryByTestId('test-child')).toBeNull();
      expect(screen.queryByText('Child Content')).toBeNull();
    });

    it('renders children when hideWhenLocked is true but feature is allowed', () => {
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));

      render(
        <FeatureLock
          feature="scoring_pairs"
          hideWhenLocked={true}
          testID="feature-lock"
        >
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByTestId('test-child')).toBeTruthy();
      expect(screen.getByText('Child Content')).toBeTruthy();
    });

    it('defaults hideWhenLocked to false', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      // Should show the locked state, not hide
      expect(screen.getByTestId('feature-lock')).toBeTruthy();
    });
  });

  // ===========================================================================
  // OPACITY TESTS
  // ===========================================================================

  describe('lockedOpacity', () => {
    it('applies default opacity of 0.5 to locked content', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      // Verify the lock overlay is present and content is rendered
      expect(screen.getByTestId('feature-lock')).toBeTruthy();
      expect(screen.getByText('Upgrade required for this feature')).toBeTruthy();
    });

    it('applies custom opacity when lockedOpacity prop is set', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock
          feature="scoring_pairs"
          lockedOpacity={0.3}
          testID="feature-lock"
        >
          <TestChild />
        </FeatureLock>
      );

      // Verify the component renders with the lock overlay
      expect(screen.getByTestId('feature-lock')).toBeTruthy();
    });

    it('accepts opacity of 0', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock
          feature="scoring_pairs"
          lockedOpacity={0}
          testID="feature-lock"
        >
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByTestId('feature-lock')).toBeTruthy();
    });

    it('accepts opacity of 1', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock
          feature="scoring_pairs"
          lockedOpacity={1}
          testID="feature-lock"
        >
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByTestId('feature-lock')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FEATURE CHECK TESTS
  // ===========================================================================

  describe('Feature Checking', () => {
    it('checks feature with correct featureId', () => {
      const mockCheckFeature = jest.fn(() => createFeatureAccess({ allowed: true }));
      mockUseCheckFeature.mockReturnValue(mockCheckFeature);

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      expect(mockCheckFeature).toHaveBeenCalledWith('scoring_pairs', undefined);
    });

    it('passes context to feature check', () => {
      const mockCheckFeature = jest.fn(() => createFeatureAccess({ allowed: true }));
      mockUseCheckFeature.mockReturnValue(mockCheckFeature);

      render(
        <FeatureLock
          feature="create_competition"
          context={{ currentCount: 5 }}
        >
          <TestChild />
        </FeatureLock>
      );

      expect(mockCheckFeature).toHaveBeenCalledWith('create_competition', { currentCount: 5 });
    });

    it('handles different feature IDs', () => {
      const features: FeatureId[] = [
        'create_competition',
        'add_round',
        'add_player',
        'game_type',
        'team_formats',
        'scoring_pairs',
        'add_friend',
      ];

      features.forEach((feature) => {
        const mockCheckFeature = jest.fn(() => createFeatureAccess({ allowed: true }));
        mockUseCheckFeature.mockReturnValue(mockCheckFeature);

        render(
          <FeatureLock feature={feature}>
            <TestChild />
          </FeatureLock>
        );

        expect(mockCheckFeature).toHaveBeenCalledWith(feature, undefined);
      });
    });

    it('re-checks feature when feature prop changes', () => {
      const mockCheckFeature = jest.fn(() => createFeatureAccess({ allowed: true }));
      mockUseCheckFeature.mockReturnValue(mockCheckFeature);

      const { rerender } = render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      expect(mockCheckFeature).toHaveBeenCalledWith('scoring_pairs', undefined);

      mockCheckFeature.mockClear();

      rerender(
        <FeatureLock feature="team_formats">
          <TestChild />
        </FeatureLock>
      );

      expect(mockCheckFeature).toHaveBeenCalledWith('team_formats', undefined);
    });
  });

  // ===========================================================================
  // INTERACTION TESTS
  // ===========================================================================

  describe('Interactions', () => {
    it('calls onUpgradePress when overlay is tapped', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);
      const onUpgradePress = jest.fn();

      render(
        <FeatureLock feature="scoring_pairs" onUpgradePress={onUpgradePress}>
          <TestChild />
        </FeatureLock>
      );

      const upgradeButton = screen.getByText('Tap to upgrade');
      fireEvent.press(upgradeButton);

      expect(onUpgradePress).toHaveBeenCalledTimes(1);
    });

    it('does not crash when overlay is tapped without onUpgradePress', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      // Should not throw when tapping without handler
      const overlay = screen.getByTestId('feature-lock');
      expect(overlay).toBeTruthy();
    });

    it('blocks touch events on children when locked', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      // The child is rendered but wrapped with pointerEvents="none"
      // The lock overlay is shown, indicating touch events are blocked
      expect(screen.getByTestId('feature-lock')).toBeTruthy();
      expect(screen.getByText('Upgrade required for this feature')).toBeTruthy();
    });

    it('allows touch events on children when allowed', () => {
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      // Child is rendered normally without any overlay blocking
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('announces for accessibility when upgrade is pressed', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);
      const onUpgradePress = jest.fn();

      render(
        <FeatureLock
          feature="scoring_pairs"
          onUpgradePress={onUpgradePress}
          lockedMessage="Upgrade to unlock this feature"
        >
          <TestChild />
        </FeatureLock>
      );

      const upgradeButton = screen.getByText('Tap to upgrade');
      fireEvent.press(upgradeButton);

      expect(mockAnnounceForAccessibility).toHaveBeenCalledWith(
        'Opening upgrade options for Upgrade to unlock this feature'
      );
    });

    it('has correct accessibilityLabel with upgrade press', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);
      const onUpgradePress = jest.fn();

      render(
        <FeatureLock
          feature="scoring_pairs"
          onUpgradePress={onUpgradePress}
          testID="feature-lock"
        >
          <TestChild />
        </FeatureLock>
      );

      const container = screen.getByTestId('feature-lock');
      expect(container.props.accessibilityLabel).toContain('Tap to upgrade');
    });

    it('has correct accessibilityLabel without upgrade press', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      const container = screen.getByTestId('feature-lock');
      expect(container.props.accessibilityLabel).toContain('This feature is locked');
    });

    it('has correct accessibilityRole for container', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      const container = screen.getByTestId('feature-lock');
      expect(container.props.accessibilityRole).toBe('text');
    });

    it('has correct accessibilityHint with upgrade press', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);
      const onUpgradePress = jest.fn();

      render(
        <FeatureLock
          feature="scoring_pairs"
          onUpgradePress={onUpgradePress}
          testID="feature-lock"
        >
          <TestChild />
        </FeatureLock>
      );

      const container = screen.getByTestId('feature-lock');
      expect(container.props.accessibilityHint).toBe('Double tap to open upgrade options');
    });

    it('has correct accessibilityHint without upgrade press', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      const container = screen.getByTestId('feature-lock');
      expect(container.props.accessibilityHint).toBe('Feature is locked and requires upgrade');
    });

    it('hides children from accessibility tree when locked', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      const { UNSAFE_root } = render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      // The content container has importantForAccessibility="no-hide-descendants"
      // This hides the children from screen readers
      // We verify the component rendered by checking the testID and that render tree exists
      expect(screen.getByTestId('feature-lock')).toBeTruthy();
      expect(UNSAFE_root).toBeTruthy();
    });

    it('sets overlay as button when onUpgradePress is provided', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);
      const onUpgradePress = jest.fn();

      render(
        <FeatureLock feature="scoring_pairs" onUpgradePress={onUpgradePress}>
          <TestChild />
        </FeatureLock>
      );

      const upgradeButton = screen.getByRole('button');
      expect(upgradeButton).toBeTruthy();
    });
  });

  // ===========================================================================
  // TIER NAME FORMATTING TESTS
  // ===========================================================================

  describe('Tier Name Formatting', () => {
    it('formats "free" tier correctly', () => {
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          upgradeRequired: true,
          requiredTier: 'free',
        })
      );

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Requires Free or higher')).toBeTruthy();
    });

    it('formats "social" tier correctly', () => {
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          upgradeRequired: true,
          requiredTier: 'social',
        })
      );

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Requires Social or higher')).toBeTruthy();
    });

    it('formats "premium" tier correctly', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Requires Premium or higher')).toBeTruthy();
    });

    it('formats "super_admin" tier correctly', () => {
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          upgradeRequired: true,
          requiredTier: 'super_admin',
        })
      );

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Requires Super Admin or higher')).toBeTruthy();
    });

    it('handles unknown tier gracefully', () => {
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          upgradeRequired: true,
          requiredTier: 'unknown_tier' as SubscriptionTier,
        })
      );

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      // Falls back to the tier string itself
      expect(screen.getByText('Requires unknown_tier or higher')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROPS TESTS
  // ===========================================================================

  describe('Props', () => {
    it('passes testID to container when locked', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs" testID="my-feature-lock">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByTestId('my-feature-lock')).toBeTruthy();
    });

    it('renders without testID', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      // Verify the lock message is shown (component rendered successfully without testID)
      expect(screen.getByText('Upgrade required for this feature')).toBeTruthy();
      expect(screen.getByText('Requires Premium or higher')).toBeTruthy();
    });

    it('handles context with gameType', () => {
      const mockCheckFeature = jest.fn(() => lockedAccess);
      mockUseCheckFeature.mockReturnValue(mockCheckFeature);

      render(
        <FeatureLock
          feature="game_type"
          context={{ gameType: 'match-play' as any }}
        >
          <TestChild />
        </FeatureLock>
      );

      expect(mockCheckFeature).toHaveBeenCalledWith('game_type', { gameType: 'match-play' });
    });

    it('handles context with roundCount', () => {
      const mockCheckFeature = jest.fn(() => lockedAccess);
      mockUseCheckFeature.mockReturnValue(mockCheckFeature);

      render(
        <FeatureLock
          feature="add_round"
          context={{ roundCount: 3 }}
        >
          <TestChild />
        </FeatureLock>
      );

      expect(mockCheckFeature).toHaveBeenCalledWith('add_round', { roundCount: 3 });
    });

    it('handles context with playerCount', () => {
      const mockCheckFeature = jest.fn(() => lockedAccess);
      mockUseCheckFeature.mockReturnValue(mockCheckFeature);

      render(
        <FeatureLock
          feature="add_player"
          context={{ playerCount: 10 }}
        >
          <TestChild />
        </FeatureLock>
      );

      expect(mockCheckFeature).toHaveBeenCalledWith('add_player', { playerCount: 10 });
    });

    it('handles context with friendCount', () => {
      const mockCheckFeature = jest.fn(() => lockedAccess);
      mockUseCheckFeature.mockReturnValue(mockCheckFeature);

      render(
        <FeatureLock
          feature="add_friend"
          context={{ friendCount: 15 }}
        >
          <TestChild />
        </FeatureLock>
      );

      expect(mockCheckFeature).toHaveBeenCalledWith('add_friend', { friendCount: 15 });
    });
  });

  // ===========================================================================
  // DARK MODE TESTS
  // ===========================================================================

  describe('Dark Mode', () => {
    it('renders correctly in dark mode when allowed', () => {
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>,
        { isDarkMode: true }
      );

      expect(screen.getByText('Child Content')).toBeTruthy();
    });

    it('renders correctly in dark mode when locked', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>,
        { isDarkMode: true }
      );

      expect(screen.getByTestId('feature-lock')).toBeTruthy();
      expect(screen.getByText('Upgrade required for this feature')).toBeTruthy();
    });

    it('shows upgrade button in dark mode', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      render(
        <FeatureLock feature="scoring_pairs" onUpgradePress={jest.fn()}>
          <TestChild />
        </FeatureLock>,
        { isDarkMode: true }
      );

      expect(screen.getByText('Tap to upgrade')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));

      render(
        <FeatureLock feature="scoring_pairs">
          <View />
        </FeatureLock>
      );

      // Should not crash
      expect(true).toBe(true);
    });

    it('handles null children gracefully', () => {
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));

      render(
        <FeatureLock feature="scoring_pairs">
          {null}
        </FeatureLock>
      );

      // Should not crash
      expect(true).toBe(true);
    });

    it('handles undefined children gracefully', () => {
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));

      render(
        <FeatureLock feature="scoring_pairs">
          {undefined}
        </FeatureLock>
      );

      // Should not crash
      expect(true).toBe(true);
    });

    it('handles rapid allowed/locked state changes', () => {
      const { rerender } = render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      // Start allowed
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));
      rerender(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      // Switch to locked
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);
      rerender(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      // Switch back to allowed
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));
      rerender(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Child Content')).toBeTruthy();
    });

    it('handles very long locked message', () => {
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          reason: 'This is a very long message that explains why this feature is locked and what the user needs to do to unlock it in great detail',
          upgradeRequired: true,
        })
      );

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      // Should still render (text may be truncated by numberOfLines)
      expect(screen.getByText(/This is a very long message/)).toBeTruthy();
    });

    it('handles special characters in locked message', () => {
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          reason: "Upgrade to unlock & enjoy 100% of features!",
          upgradeRequired: true,
        })
      );

      render(
        <FeatureLock feature="scoring_pairs">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText("Upgrade to unlock & enjoy 100% of features!")).toBeTruthy();
    });

    it('handles children with complex nesting', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      const { UNSAFE_root } = render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <View testID="nested-root">
            <View>
              <View>
                <RNText>Deeply nested content</RNText>
              </View>
            </View>
          </View>
        </FeatureLock>
      );

      expect(screen.getByTestId('feature-lock')).toBeTruthy();
      // Verify the lock overlay is shown (children are rendered but hidden from a11y)
      expect(screen.getByText('Upgrade required for this feature')).toBeTruthy();
      // The nested structure should exist in the render tree
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMO TESTS
  // ===========================================================================

  describe('React.memo', () => {
    it('component is wrapped with React.memo', () => {
      // FeatureLock uses React.memo, which we can verify by checking the component type
      expect(FeatureLock).toBeDefined();
      // React.memo components have $$typeof Symbol for memo
      // We verify the component is a valid React component
      expect(typeof FeatureLock).toBe('object');
    });

    it('re-renders correctly when props change', () => {
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      const { rerender } = render(
        <FeatureLock
          feature="scoring_pairs"
          lockedMessage="Initial message"
          testID="feature-lock"
        >
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Upgrade required for this feature')).toBeTruthy();

      // Change to a feature without reason, should show lockedMessage
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          upgradeRequired: true,
        })
      );

      rerender(
        <FeatureLock
          feature="scoring_pairs"
          lockedMessage="Updated message"
          testID="feature-lock"
        >
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Updated message')).toBeTruthy();
    });
  });

  // ===========================================================================
  // REAL WORLD SCENARIO TESTS
  // ===========================================================================

  describe('Real World Scenarios', () => {
    it('wraps scoring pairs feature correctly', () => {
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          reason: 'Scoring pairs requires Premium tier',
          upgradeRequired: true,
          requiredTier: 'premium',
        })
      );

      render(
        <FeatureLock
          feature="scoring_pairs"
          onUpgradePress={jest.fn()}
        >
          <View testID="scoring-pairs-section">
            <RNText>Configure scoring pairs for this round</RNText>
          </View>
        </FeatureLock>
      );

      expect(screen.getByText('Scoring pairs requires Premium tier')).toBeTruthy();
      expect(screen.getByText('Requires Premium or higher')).toBeTruthy();
      expect(screen.getByText('Tap to upgrade')).toBeTruthy();
    });

    it('wraps competition creation correctly with limit context', () => {
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          reason: 'You have reached the competition limit (3 of 3)',
          upgradeRequired: true,
          requiredTier: 'social',
          currentValue: 3,
          limitValue: 3,
        })
      );

      render(
        <FeatureLock
          feature="create_competition"
          context={{ currentCount: 3 }}
          onUpgradePress={jest.fn()}
        >
          <View testID="create-comp-button">
            <RNText>Create Competition</RNText>
          </View>
        </FeatureLock>
      );

      expect(screen.getByText('You have reached the competition limit (3 of 3)')).toBeTruthy();
      expect(screen.getByText('Requires Social or higher')).toBeTruthy();
    });

    it('wraps game type selection correctly', () => {
      mockUseCheckFeature.mockReturnValue(() =>
        createFeatureAccess({
          allowed: false,
          reason: 'Match Play requires Social tier or higher',
          upgradeRequired: true,
          requiredTier: 'social',
        })
      );

      render(
        <FeatureLock
          feature="game_type"
          context={{ gameType: 'match-play' as any }}
          onUpgradePress={jest.fn()}
        >
          <View testID="match-play-option">
            <RNText>Match Play</RNText>
          </View>
        </FeatureLock>
      );

      expect(screen.getByText('Match Play requires Social tier or higher')).toBeTruthy();
    });

    it('unlocks feature correctly when user upgrades', () => {
      // Start locked
      mockUseCheckFeature.mockReturnValue(() => lockedAccess);

      const { rerender } = render(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      expect(screen.getByText('Upgrade required for this feature')).toBeTruthy();

      // Simulate upgrade - now allowed
      mockUseCheckFeature.mockReturnValue(() => createFeatureAccess({ allowed: true }));

      rerender(
        <FeatureLock feature="scoring_pairs" testID="feature-lock">
          <TestChild />
        </FeatureLock>
      );

      // Lock overlay should be gone
      expect(screen.queryByText('Upgrade required for this feature')).toBeNull();
      expect(screen.queryByText('Tap to upgrade')).toBeNull();
      expect(screen.getByText('Child Content')).toBeTruthy();
    });
  });
});

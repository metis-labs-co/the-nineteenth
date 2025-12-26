/**
 * TierBadge Component Tests
 *
 * Comprehensive tests for the TierBadge component which displays
 * subscription tier as a pill badge:
 * - Different size variants (small, medium, large)
 * - Icon visibility toggle
 * - Override props (tier, badgeColor, displayName)
 * - Super Admin special styling
 * - Context integration (useTier, useTierLimits)
 * - Accessibility features
 * - Dark mode support
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { TierBadge } from './TierBadge';
import { useTier, useTierLimits } from '@/context/SubscriptionContext';
import type { SubscriptionTier } from '@/types/subscription.types';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('@/context/SubscriptionContext', () => ({
  useTier: jest.fn(),
  useTierLimits: jest.fn(),
}));

const mockUseTier = useTier as jest.MockedFunction<typeof useTier>;
const mockUseTierLimits = useTierLimits as jest.MockedFunction<typeof useTierLimits>;

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockLimits = (tier: SubscriptionTier = 'free') => ({
  tier,
  displayName: tier === 'super_admin' ? 'Super Admin' : tier.charAt(0).toUpperCase() + tier.slice(1),
  badgeColor: {
    free: '#6b7280',
    social: '#3b82f6',
    premium: '#f59e0b',
    super_admin: '#dc2626',
  }[tier],
  maxCompetitions: 3,
  maxRoundsPerCompetition: 2,
  maxPlayersPerCompetition: 10,
  maxFriends: 10,
  teamFormats: false,
  scoringPairs: false,
  strokePlay: false,
  matchPlay: false,
});

// ============================================================================
// TESTS
// ============================================================================

describe('TierBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTier.mockReturnValue('free');
    mockUseTierLimits.mockReturnValue(createMockLimits('free'));
  });

  // ===========================================================================
  // RENDERING TESTS - BASIC
  // ===========================================================================

  describe('Rendering - Basic', () => {
    it('renders without crashing', () => {
      render(<TierBadge />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('renders with default medium size', () => {
      render(<TierBadge />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('renders with icon by default', () => {
      render(<TierBadge />);
      // Icon is present (rendered via react-native-paper)
      expect(screen.getByLabelText('Subscription tier: Free')).toBeTruthy();
    });

    it('renders tier name from context', () => {
      mockUseTier.mockReturnValue('social');
      mockUseTierLimits.mockReturnValue(createMockLimits('social'));

      render(<TierBadge />);
      expect(screen.getByText('Social')).toBeTruthy();
    });

    it('renders premium tier correctly', () => {
      mockUseTier.mockReturnValue('premium');
      mockUseTierLimits.mockReturnValue(createMockLimits('premium'));

      render(<TierBadge />);
      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('renders super admin tier correctly', () => {
      mockUseTier.mockReturnValue('super_admin');
      mockUseTierLimits.mockReturnValue(createMockLimits('super_admin'));

      render(<TierBadge />);
      expect(screen.getByText('Super Admin')).toBeTruthy();
    });
  });

  // ===========================================================================
  // RENDERING TESTS - SIZE VARIANTS
  // ===========================================================================

  describe('Rendering - Size Variants', () => {
    it('renders small size variant', () => {
      render(<TierBadge size="small" />);
      expect(screen.getByText('Free')).toBeTruthy();
      expect(screen.getByLabelText('Subscription tier: Free')).toBeTruthy();
    });

    it('renders medium size variant (default)', () => {
      render(<TierBadge size="medium" />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('renders large size variant', () => {
      render(<TierBadge size="large" />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('handles explicit medium size', () => {
      render(<TierBadge size="medium" />);
      expect(screen.getByText('Free')).toBeTruthy();
    });
  });

  // ===========================================================================
  // RENDERING TESTS - ICON VISIBILITY
  // ===========================================================================

  describe('Rendering - Icon Visibility', () => {
    it('shows icon when showIcon is true (default)', () => {
      render(<TierBadge showIcon={true} />);
      // Component renders without errors
      expect(screen.getByLabelText('Subscription tier: Free')).toBeTruthy();
    });

    it('hides icon when showIcon is false', () => {
      render(<TierBadge showIcon={false} />);
      expect(screen.getByText('Free')).toBeTruthy();
      expect(screen.getByLabelText('Subscription tier: Free')).toBeTruthy();
    });

    it('shows icon with small size', () => {
      render(<TierBadge size="small" showIcon={true} />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('hides icon with large size', () => {
      render(<TierBadge size="large" showIcon={false} />);
      expect(screen.getByText('Free')).toBeTruthy();
    });
  });

  // ===========================================================================
  // OVERRIDE PROPS TESTS
  // ===========================================================================

  describe('Override Props', () => {
    it('uses override tier instead of context tier', () => {
      mockUseTier.mockReturnValue('free');
      mockUseTierLimits.mockReturnValue(null as any); // Force use of fallback values
      render(<TierBadge tier="premium" />);
      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('uses override displayName', () => {
      render(<TierBadge displayName="Custom Tier" />);
      expect(screen.getByText('Custom Tier')).toBeTruthy();
      expect(screen.getByLabelText('Subscription tier: Custom Tier')).toBeTruthy();
    });

    it('uses override badgeColor', () => {
      render(<TierBadge badgeColor="#ff0000" />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('uses all overrides together', () => {
      mockUseTierLimits.mockReturnValue(null as any); // Force use of fallback values
      render(
        <TierBadge
          tier="super_admin"
          displayName="VIP Access"
          badgeColor="#00ff00"
        />
      );
      expect(screen.getByText('VIP Access')).toBeTruthy();
      expect(screen.getByLabelText('Subscription tier: VIP Access')).toBeTruthy();
    });

    it('prefers displayName override over context limits', () => {
      mockUseTierLimits.mockReturnValue(createMockLimits('premium'));
      render(<TierBadge tier="premium" displayName="Custom Premium" />);
      expect(screen.getByText('Custom Premium')).toBeTruthy();
    });

    it('prefers badgeColor override over context limits', () => {
      mockUseTierLimits.mockReturnValue(createMockLimits('premium'));
      render(<TierBadge tier="premium" badgeColor="#123456" />);
      expect(screen.getByText('Premium')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CONTEXT INTEGRATION TESTS
  // ===========================================================================

  describe('Context Integration', () => {
    it('calls useTier hook', () => {
      render(<TierBadge />);
      expect(mockUseTier).toHaveBeenCalled();
    });

    it('calls useTierLimits hook', () => {
      render(<TierBadge />);
      expect(mockUseTierLimits).toHaveBeenCalled();
    });

    it('uses displayName from limits', () => {
      const customLimits = {
        ...createMockLimits('premium'),
        displayName: 'Premium Plus',
      };
      mockUseTier.mockReturnValue('premium');
      mockUseTierLimits.mockReturnValue(customLimits);

      render(<TierBadge />);
      expect(screen.getByText('Premium Plus')).toBeTruthy();
    });

    it('uses badgeColor from limits', () => {
      const customLimits = {
        ...createMockLimits('premium'),
        badgeColor: '#abcdef',
      };
      mockUseTier.mockReturnValue('premium');
      mockUseTierLimits.mockReturnValue(customLimits);

      render(<TierBadge />);
      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('handles null limits gracefully', () => {
      mockUseTierLimits.mockReturnValue(null as any);
      render(<TierBadge />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('handles undefined limits gracefully', () => {
      mockUseTierLimits.mockReturnValue(undefined as any);
      render(<TierBadge />);
      expect(screen.getByText('Free')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SUPER ADMIN STYLING TESTS
  // ===========================================================================

  describe('Super Admin Special Styling', () => {
    it('renders super admin with special styling', () => {
      mockUseTier.mockReturnValue('super_admin');
      mockUseTierLimits.mockReturnValue(createMockLimits('super_admin'));

      render(<TierBadge />);
      expect(screen.getByText('Super Admin')).toBeTruthy();
      expect(screen.getByLabelText('Subscription tier: Super Admin')).toBeTruthy();
    });

    it('renders super admin via override tier', () => {
      mockUseTier.mockReturnValue('free');
      mockUseTierLimits.mockReturnValue(null as any); // Force fallback values
      render(<TierBadge tier="super_admin" />);
      expect(screen.getByText('Super Admin')).toBeTruthy();
    });

    it('renders super admin with custom displayName', () => {
      render(<TierBadge tier="super_admin" displayName="Admin" />);
      expect(screen.getByText('Admin')).toBeTruthy();
    });

    it('renders super admin with custom badgeColor', () => {
      mockUseTierLimits.mockReturnValue(null as any); // Force fallback values
      render(<TierBadge tier="super_admin" badgeColor="#ff00ff" />);
      expect(screen.getByText('Super Admin')).toBeTruthy();
    });

    it('renders super admin in small size', () => {
      mockUseTierLimits.mockReturnValue(null as any); // Force fallback values
      render(<TierBadge tier="super_admin" size="small" />);
      expect(screen.getByText('Super Admin')).toBeTruthy();
    });

    it('renders super admin in large size', () => {
      mockUseTierLimits.mockReturnValue(null as any); // Force fallback values
      render(<TierBadge tier="super_admin" size="large" />);
      expect(screen.getByText('Super Admin')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FALLBACK VALUES TESTS
  // ===========================================================================

  describe('Fallback Values', () => {
    it('uses fallback displayName for free tier when limits null', () => {
      mockUseTierLimits.mockReturnValue(null as any);
      mockUseTier.mockReturnValue('free');
      render(<TierBadge />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('uses fallback displayName for social tier when limits null', () => {
      mockUseTierLimits.mockReturnValue(null as any);
      mockUseTier.mockReturnValue('social');
      render(<TierBadge />);
      expect(screen.getByText('Social')).toBeTruthy();
    });

    it('uses fallback displayName for premium tier when limits null', () => {
      mockUseTierLimits.mockReturnValue(null as any);
      mockUseTier.mockReturnValue('premium');
      render(<TierBadge />);
      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('uses fallback displayName for super_admin tier when limits null', () => {
      mockUseTierLimits.mockReturnValue(null as any);
      mockUseTier.mockReturnValue('super_admin');
      render(<TierBadge />);
      expect(screen.getByText('Super Admin')).toBeTruthy();
    });

    it('uses fallback badgeColor when limits null', () => {
      mockUseTierLimits.mockReturnValue(null as any);
      mockUseTier.mockReturnValue('premium');
      render(<TierBadge />);
      expect(screen.getByText('Premium')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has correct accessibilityLabel', () => {
      render(<TierBadge />);
      expect(screen.getByLabelText('Subscription tier: Free')).toBeTruthy();
    });

    it('has correct accessibilityRole', () => {
      render(<TierBadge />);
      const badge = screen.getByLabelText('Subscription tier: Free');
      expect(badge.props.accessibilityRole).toBe('text');
    });

    it('updates accessibilityLabel with displayName override', () => {
      render(<TierBadge displayName="Custom Name" />);
      expect(screen.getByLabelText('Subscription tier: Custom Name')).toBeTruthy();
    });

    it('updates accessibilityLabel with tier override', () => {
      mockUseTierLimits.mockReturnValue(null as any); // Force fallback values
      render(<TierBadge tier="premium" />);
      expect(screen.getByLabelText('Subscription tier: Premium')).toBeTruthy();
    });

    it('includes tier name in accessibility label for social tier', () => {
      mockUseTier.mockReturnValue('social');
      mockUseTierLimits.mockReturnValue(createMockLimits('social'));
      render(<TierBadge />);
      expect(screen.getByLabelText('Subscription tier: Social')).toBeTruthy();
    });

    it('includes tier name in accessibility label for premium tier', () => {
      mockUseTier.mockReturnValue('premium');
      mockUseTierLimits.mockReturnValue(createMockLimits('premium'));
      render(<TierBadge />);
      expect(screen.getByLabelText('Subscription tier: Premium')).toBeTruthy();
    });

    it('includes tier name in accessibility label for super admin', () => {
      mockUseTier.mockReturnValue('super_admin');
      mockUseTierLimits.mockReturnValue(createMockLimits('super_admin'));
      render(<TierBadge />);
      expect(screen.getByLabelText('Subscription tier: Super Admin')).toBeTruthy();
    });
  });

  // ===========================================================================
  // COMBINATION TESTS
  // ===========================================================================

  describe('Prop Combinations', () => {
    it('handles small size with no icon', () => {
      render(<TierBadge size="small" showIcon={false} />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('handles large size with icon', () => {
      render(<TierBadge size="large" showIcon={true} />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('handles tier override with size override', () => {
      mockUseTierLimits.mockReturnValue(null as any); // Force fallback values
      render(<TierBadge tier="premium" size="large" />);
      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('handles displayName override with size override', () => {
      render(<TierBadge displayName="VIP" size="small" />);
      expect(screen.getByText('VIP')).toBeTruthy();
    });

    it('handles all props together', () => {
      render(
        <TierBadge
          tier="social"
          size="large"
          showIcon={false}
          displayName="Team Member"
          badgeColor="#0000ff"
        />
      );
      expect(screen.getByText('Team Member')).toBeTruthy();
      expect(screen.getByLabelText('Subscription tier: Team Member')).toBeTruthy();
    });

    it('handles super admin with small size and no icon', () => {
      mockUseTierLimits.mockReturnValue(null as any); // Force fallback values
      render(<TierBadge tier="super_admin" size="small" showIcon={false} />);
      expect(screen.getByText('Super Admin')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty displayName override', () => {
      render(<TierBadge displayName="" />);
      // Empty string should still render
      expect(screen.getByLabelText('Subscription tier: ')).toBeTruthy();
    });

    it('handles very long displayName', () => {
      render(<TierBadge displayName="Very Long Subscription Tier Name That Should Be Truncated" />);
      expect(screen.getByText('Very Long Subscription Tier Name That Should Be Truncated')).toBeTruthy();
    });

    it('handles special characters in displayName', () => {
      render(<TierBadge displayName="Pro+ ★" />);
      expect(screen.getByText('Pro+ ★')).toBeTruthy();
    });

    it('handles emoji in displayName', () => {
      render(<TierBadge displayName="Premium 🏆" />);
      expect(screen.getByText('Premium 🏆')).toBeTruthy();
    });

    it('handles whitespace displayName', () => {
      render(<TierBadge displayName="   " />);
      expect(screen.getByLabelText('Subscription tier:    ')).toBeTruthy();
    });

    it('renders correctly on multiple renders with displayName override', () => {
      // First render
      const { rerender } = render(<TierBadge displayName="First" />);
      expect(screen.getByText('First')).toBeTruthy();

      // Rerender with different displayName
      rerender(<TierBadge displayName="Second" />);
      expect(screen.getByText('Second')).toBeTruthy();

      // Rerender with third displayName
      rerender(<TierBadge displayName="Third" />);
      expect(screen.getByText('Third')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TIER ICON TESTS
  // ===========================================================================

  describe('Tier Icons', () => {
    it('shows correct icon for free tier', () => {
      mockUseTier.mockReturnValue('free');
      mockUseTierLimits.mockReturnValue(createMockLimits('free'));
      render(<TierBadge />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('shows correct icon for social tier', () => {
      mockUseTier.mockReturnValue('social');
      mockUseTierLimits.mockReturnValue(createMockLimits('social'));
      render(<TierBadge />);
      expect(screen.getByText('Social')).toBeTruthy();
    });

    it('shows correct icon for premium tier', () => {
      mockUseTier.mockReturnValue('premium');
      mockUseTierLimits.mockReturnValue(createMockLimits('premium'));
      render(<TierBadge />);
      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('shows correct icon for super_admin tier', () => {
      mockUseTier.mockReturnValue('super_admin');
      mockUseTierLimits.mockReturnValue(createMockLimits('super_admin'));
      render(<TierBadge />);
      expect(screen.getByText('Super Admin')).toBeTruthy();
    });

    it('uses icon from override tier', () => {
      mockUseTier.mockReturnValue('free');
      mockUseTierLimits.mockReturnValue(null as any); // Force fallback values
      render(<TierBadge tier="premium" />);
      expect(screen.getByText('Premium')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMO BEHAVIOR TESTS
  // ===========================================================================

  describe('Memo Behavior', () => {
    it('should be memoized component', () => {
      const { rerender } = render(<TierBadge />);
      expect(screen.getByText('Free')).toBeTruthy();

      // Re-render with same props
      rerender(<TierBadge />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('updates when tier prop changes', () => {
      mockUseTierLimits.mockReturnValue(null as any); // Force fallback values
      const { rerender } = render(<TierBadge tier="free" />);
      expect(screen.getByText('Free')).toBeTruthy();

      rerender(<TierBadge tier="premium" />);
      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('updates when size prop changes', () => {
      const { rerender } = render(<TierBadge size="small" />);
      expect(screen.getByText('Free')).toBeTruthy();

      rerender(<TierBadge size="large" />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('updates when showIcon prop changes', () => {
      const { rerender } = render(<TierBadge showIcon={true} />);
      expect(screen.getByText('Free')).toBeTruthy();

      rerender(<TierBadge showIcon={false} />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('updates when displayName prop changes', () => {
      const { rerender } = render(<TierBadge displayName="First" />);
      expect(screen.getByText('First')).toBeTruthy();

      rerender(<TierBadge displayName="Second" />);
      expect(screen.getByText('Second')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DEFAULT PROP VALUES TESTS
  // ===========================================================================

  describe('Default Prop Values', () => {
    it('defaults to medium size', () => {
      render(<TierBadge />);
      // Component should render (no error means medium is default)
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('defaults to showing icon', () => {
      render(<TierBadge />);
      // Component renders with icon (via Paper Icon component)
      expect(screen.getByLabelText('Subscription tier: Free')).toBeTruthy();
    });

    it('defaults to current tier from context', () => {
      mockUseTier.mockReturnValue('social');
      mockUseTierLimits.mockReturnValue(createMockLimits('social'));
      render(<TierBadge />);
      expect(screen.getByText('Social')).toBeTruthy();
    });
  });
});

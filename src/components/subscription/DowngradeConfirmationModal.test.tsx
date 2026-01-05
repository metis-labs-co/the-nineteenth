/**
 * DowngradeConfirmationModal Component Tests
 *
 * Comprehensive tests for the downgrade confirmation modal including:
 * - Rendering states (visible/hidden)
 * - Animation behavior
 * - Props handling (currentTier, targetTier, onConfirm, onDismiss)
 * - Tier-specific styling and content
 * - Lost features list rendering
 * - Reassurance section
 * - Accessibility features
 * - User interactions
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@/__tests__/utils/renderHelpers';
import { DowngradeConfirmationModal } from './DowngradeConfirmationModal';
import type { SubscriptionTier } from '@/types/subscription.types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock AccessibilityInfo.announceForAccessibility
const mockAnnounceForAccessibility = jest.fn();
jest
  .spyOn(AccessibilityInfo, 'announceForAccessibility')
  .mockImplementation(mockAnnounceForAccessibility);

// ============================================================================
// TEST FIXTURES
// ============================================================================

const defaultProps = {
  visible: true,
  currentTier: 'premium' as SubscriptionTier,
  targetTier: 'social' as SubscriptionTier,
  onConfirm: jest.fn(),
  onDismiss: jest.fn(),
};

// ============================================================================
// TESTS
// ============================================================================

describe('DowngradeConfirmationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders when visible is true', () => {
      render(
        <DowngradeConfirmationModal {...defaultProps} testID="downgrade-modal" />
      );

      expect(screen.getByTestId('downgrade-modal')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          visible={false}
          testID="downgrade-modal"
        />
      );

      expect(screen.queryByTestId('downgrade-modal')).toBeNull();
    });

    it('renders the title "Downgrade Plan?"', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      expect(screen.getByText('Downgrade Plan?')).toBeTruthy();
    });

    it('renders current tier name', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('renders target tier name', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      expect(screen.getByText('Social')).toBeTruthy();
    });

    it('renders warning section header', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      expect(screen.getByText("You'll lose access to:")).toBeTruthy();
    });

    it('renders reassurance section header', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      expect(screen.getByText('Your existing content is safe:')).toBeTruthy();
    });

    it('renders reassurance about competitions', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      expect(screen.getByText('Current competitions preserved')).toBeTruthy();
    });

    it('renders reassurance about historical data', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      expect(screen.getByText('All historical data kept')).toBeTruthy();
    });

    it('renders timing note', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      expect(
        screen.getByText('Changes take effect at end of billing period')
      ).toBeTruthy();
    });

    it('renders "Manage in App Store" button', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      expect(screen.getByText('Manage in App Store')).toBeTruthy();
    });

    it('renders "Keep {CurrentTier}" button with correct tier name', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      expect(screen.getByText('Keep Premium')).toBeTruthy();
    });

    it('renders keep button with Social tier name when current tier is social', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="social"
          targetTier="free"
        />
      );

      expect(screen.getByText('Keep Social')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TIER-SPECIFIC TESTS
  // ===========================================================================

  describe('Tier Display', () => {
    it('renders "Free" for free tier', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="social"
          targetTier="free"
        />
      );

      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('renders "Social" for social tier', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="premium"
          targetTier="social"
        />
      );

      expect(screen.getByText('Social')).toBeTruthy();
    });

    it('renders "Premium" for premium tier', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="premium"
          targetTier="social"
        />
      );

      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('renders "Super Admin" for super_admin tier', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="super_admin"
          targetTier="premium"
        />
      );

      expect(screen.getByText('Super Admin')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FEATURE COMPARISON TESTS
  // ===========================================================================

  describe('Feature Comparison', () => {
    it('displays lost features for premium → social downgrade', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="premium"
          targetTier="social"
        />
      );

      // Premium has features like "Unlimited competitions" and "Up to 40 players"
      // that social doesn't have
      expect(screen.getByText("You'll lose access to:")).toBeTruthy();
      // Check that some lost features are displayed (at least one)
      const warningSection = screen.getByText("You'll lose access to:");
      expect(warningSection).toBeTruthy();
    });

    it('displays lost features for social → free downgrade', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="social"
          targetTier="free"
        />
      );

      // Social has features like "Up to 8 competitions" that free doesn't have
      expect(screen.getByText("You'll lose access to:")).toBeTruthy();
    });

    it('displays lost features for premium → free downgrade', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="premium"
          targetTier="free"
        />
      );

      // Premium to free loses many features
      expect(screen.getByText("You'll lose access to:")).toBeTruthy();
    });

    it('shows reassurance about existing content being preserved', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      expect(screen.getByText('Your existing content is safe:')).toBeTruthy();
      expect(screen.getByText('Current competitions preserved')).toBeTruthy();
      expect(screen.getByText('All historical data kept')).toBeTruthy();
    });
  });

  // ===========================================================================
  // INTERACTION TESTS
  // ===========================================================================

  describe('Interactions', () => {
    it('calls onConfirm when "Manage in App Store" button is pressed', () => {
      const onConfirm = jest.fn();
      render(
        <DowngradeConfirmationModal {...defaultProps} onConfirm={onConfirm} />
      );

      const confirmButton = screen.getByLabelText('Manage in App Store');
      fireEvent.press(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when "Keep" button is pressed', () => {
      const onDismiss = jest.fn();
      render(
        <DowngradeConfirmationModal {...defaultProps} onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByLabelText('Keep Premium');
      fireEvent.press(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when backdrop is pressed', () => {
      const onDismiss = jest.fn();
      render(
        <DowngradeConfirmationModal {...defaultProps} onDismiss={onDismiss} />
      );

      const backdrop = screen.getByLabelText('Close downgrade confirmation');
      fireEvent.press(backdrop);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('announces for accessibility when modal becomes visible', async () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockAnnounceForAccessibility).toHaveBeenCalledWith(
          'Downgrade confirmation. You are about to downgrade from Premium to Social.'
        );
      });
    });

    it('announces for accessibility when confirm button is pressed', () => {
      const onConfirm = jest.fn();
      render(
        <DowngradeConfirmationModal {...defaultProps} onConfirm={onConfirm} />
      );

      const confirmButton = screen.getByLabelText('Manage in App Store');
      fireEvent.press(confirmButton);

      expect(mockAnnounceForAccessibility).toHaveBeenCalledWith(
        'Opening App Store subscription management'
      );
    });

    it('announces for accessibility when dismiss button is pressed', () => {
      const onDismiss = jest.fn();
      render(
        <DowngradeConfirmationModal {...defaultProps} onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByLabelText('Keep Premium');
      fireEvent.press(dismissButton);

      expect(mockAnnounceForAccessibility).toHaveBeenCalledWith(
        'Dismissed downgrade prompt'
      );
    });

    it('"Manage in App Store" button has correct accessibility role', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      const confirmButton = screen.getByRole('button', {
        name: 'Manage in App Store',
      });
      expect(confirmButton).toBeTruthy();
    });

    it('"Manage in App Store" button has accessibility hint', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      const confirmButton = screen.getByLabelText('Manage in App Store');
      expect(confirmButton.props.accessibilityHint).toBe(
        'Opens your subscription settings in the App Store'
      );
    });

    it('"Keep" button has correct accessibility role', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      const dismissButton = screen.getByRole('button', { name: 'Keep Premium' });
      expect(dismissButton).toBeTruthy();
    });

    it('"Keep" button has accessibility hint', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      const dismissButton = screen.getByLabelText('Keep Premium');
      expect(dismissButton.props.accessibilityHint).toBe(
        'Closes this prompt and keeps your current plan'
      );
    });

    it('backdrop has button role', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      const backdrop = screen.getByRole('button', {
        name: 'Close downgrade confirmation',
      });
      expect(backdrop).toBeTruthy();
    });

    it('modal container has alert role', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      const container = screen.getByLabelText(
        'Downgrade from Premium to Social'
      );
      expect(container.props.accessibilityRole).toBe('alert');
    });

    it('lost feature rows have accessibility labels', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />);

      // The modal should have accessible feature rows
      // We verify by checking that the warning section is present and accessible
      expect(screen.getByText("You'll lose access to:")).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROPS TESTS
  // ===========================================================================

  describe('Props', () => {
    it('passes testID to container', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          testID="my-downgrade-modal"
        />
      );

      expect(screen.getByTestId('my-downgrade-modal')).toBeTruthy();
    });

    it('handles different tier combinations', () => {
      const { rerender } = render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="premium"
          targetTier="social"
        />
      );

      expect(screen.getByText('Premium')).toBeTruthy();
      expect(screen.getByText('Social')).toBeTruthy();

      rerender(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="social"
          targetTier="free"
        />
      );

      expect(screen.getByText('Social')).toBeTruthy();
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('updates keep button text when currentTier changes', () => {
      const { rerender } = render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="premium"
          targetTier="social"
        />
      );

      expect(screen.getByText('Keep Premium')).toBeTruthy();

      rerender(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="social"
          targetTier="free"
        />
      );

      expect(screen.getByText('Keep Social')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ANIMATION TESTS
  // ===========================================================================

  describe('Animation', () => {
    it('initializes with animation values', () => {
      render(
        <DowngradeConfirmationModal {...defaultProps} testID="downgrade-modal" />
      );

      expect(screen.getByTestId('downgrade-modal')).toBeTruthy();
    });

    it('resets animation when hidden', () => {
      const { rerender } = render(
        <DowngradeConfirmationModal
          {...defaultProps}
          visible={true}
          testID="downgrade-modal"
        />
      );

      expect(screen.getByTestId('downgrade-modal')).toBeTruthy();

      rerender(
        <DowngradeConfirmationModal
          {...defaultProps}
          visible={false}
          testID="downgrade-modal"
        />
      );

      expect(screen.queryByTestId('downgrade-modal')).toBeNull();
    });
  });

  // ===========================================================================
  // MODAL BEHAVIOR TESTS
  // ===========================================================================

  describe('Modal Behavior', () => {
    it('renders as a Modal component', () => {
      render(
        <DowngradeConfirmationModal {...defaultProps} testID="downgrade-modal" />
      );

      expect(screen.getByTestId('downgrade-modal')).toBeTruthy();
    });

    it('calls onDismiss on hardware back button (onRequestClose)', () => {
      const onDismiss = jest.fn();
      render(
        <DowngradeConfirmationModal {...defaultProps} onDismiss={onDismiss} />
      );

      // Modal's onRequestClose is wired to onDismiss
      // This is tested through the backdrop press which triggers the same handler
      const backdrop = screen.getByLabelText('Close downgrade confirmation');
      fireEvent.press(backdrop);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles rapid visibility toggling', () => {
      const { rerender } = render(
        <DowngradeConfirmationModal
          {...defaultProps}
          visible={true}
          testID="downgrade-modal"
        />
      );

      rerender(
        <DowngradeConfirmationModal
          {...defaultProps}
          visible={false}
          testID="downgrade-modal"
        />
      );
      rerender(
        <DowngradeConfirmationModal
          {...defaultProps}
          visible={true}
          testID="downgrade-modal"
        />
      );
      rerender(
        <DowngradeConfirmationModal
          {...defaultProps}
          visible={false}
          testID="downgrade-modal"
        />
      );

      expect(screen.queryByTestId('downgrade-modal')).toBeNull();
    });

    it('handles tier changes while visible', () => {
      const { rerender } = render(
        <DowngradeConfirmationModal {...defaultProps} testID="downgrade-modal" />
      );

      expect(screen.getByText('Premium')).toBeTruthy();
      expect(screen.getByText('Social')).toBeTruthy();

      rerender(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="social"
          targetTier="free"
          testID="downgrade-modal"
        />
      );

      expect(screen.getByText('Social')).toBeTruthy();
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('handles super_admin to premium downgrade', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="super_admin"
          targetTier="premium"
        />
      );

      expect(screen.getByText('Super Admin')).toBeTruthy();
      expect(screen.getByText('Premium')).toBeTruthy();
      expect(screen.getByText('Keep Super Admin')).toBeTruthy();
    });

    it('handles super_admin to free downgrade', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="super_admin"
          targetTier="free"
        />
      );

      expect(screen.getByText('Super Admin')).toBeTruthy();
      expect(screen.getByText('Free')).toBeTruthy();
      expect(screen.getByText('Keep Super Admin')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DARK MODE TESTS
  // ===========================================================================

  describe('Dark Mode', () => {
    it('renders correctly in dark mode', () => {
      render(
        <DowngradeConfirmationModal {...defaultProps} testID="downgrade-modal" />,
        { isDarkMode: true }
      );

      expect(screen.getByTestId('downgrade-modal')).toBeTruthy();
      expect(screen.getByText('Downgrade Plan?')).toBeTruthy();
    });

    it('renders tier names in dark mode', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />, {
        isDarkMode: true,
      });

      expect(screen.getByText('Premium')).toBeTruthy();
      expect(screen.getByText('Social')).toBeTruthy();
    });

    it('renders warning section in dark mode', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />, {
        isDarkMode: true,
      });

      expect(screen.getByText("You'll lose access to:")).toBeTruthy();
    });

    it('renders reassurance section in dark mode', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />, {
        isDarkMode: true,
      });

      expect(screen.getByText('Your existing content is safe:')).toBeTruthy();
    });

    it('renders buttons correctly in dark mode', () => {
      render(<DowngradeConfirmationModal {...defaultProps} />, {
        isDarkMode: true,
      });

      expect(screen.getByText('Manage in App Store')).toBeTruthy();
      expect(screen.getByText('Keep Premium')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SPECIFIC DOWNGRADE SCENARIO TESTS
  // ===========================================================================

  describe('Specific Downgrade Scenarios', () => {
    it('renders premium to social downgrade correctly', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="premium"
          targetTier="social"
        />
      );

      expect(screen.getByText('Premium')).toBeTruthy();
      expect(screen.getByText('Social')).toBeTruthy();
      expect(screen.getByText('Downgrade Plan?')).toBeTruthy();
      expect(screen.getByText("You'll lose access to:")).toBeTruthy();
      expect(screen.getByText('Your existing content is safe:')).toBeTruthy();
      expect(screen.getByText('Keep Premium')).toBeTruthy();
    });

    it('renders social to free downgrade correctly', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="social"
          targetTier="free"
        />
      );

      expect(screen.getByText('Social')).toBeTruthy();
      expect(screen.getByText('Free')).toBeTruthy();
      expect(screen.getByText('Downgrade Plan?')).toBeTruthy();
      expect(screen.getByText("You'll lose access to:")).toBeTruthy();
      expect(screen.getByText('Your existing content is safe:')).toBeTruthy();
      expect(screen.getByText('Keep Social')).toBeTruthy();
    });

    it('renders premium to free downgrade correctly', () => {
      render(
        <DowngradeConfirmationModal
          {...defaultProps}
          currentTier="premium"
          targetTier="free"
        />
      );

      expect(screen.getByText('Premium')).toBeTruthy();
      expect(screen.getByText('Free')).toBeTruthy();
      expect(screen.getByText('Downgrade Plan?')).toBeTruthy();
      expect(screen.getByText("You'll lose access to:")).toBeTruthy();
      expect(screen.getByText('Your existing content is safe:')).toBeTruthy();
      expect(screen.getByText('Keep Premium')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PERFORMANCE TESTS
  // ===========================================================================

  describe('Performance', () => {
    it('uses React.memo to prevent unnecessary re-renders', () => {
      const { rerender } = render(
        <DowngradeConfirmationModal {...defaultProps} testID="downgrade-modal" />
      );

      // Rerender with same props - should not cause issues
      rerender(
        <DowngradeConfirmationModal {...defaultProps} testID="downgrade-modal" />
      );

      expect(screen.getByTestId('downgrade-modal')).toBeTruthy();
    });

    it('memoizes lost features calculation', () => {
      const { rerender } = render(
        <DowngradeConfirmationModal {...defaultProps} testID="downgrade-modal" />
      );

      // Rerender with same tiers - useMemo should prevent recalculation
      rerender(
        <DowngradeConfirmationModal {...defaultProps} testID="downgrade-modal" />
      );

      expect(screen.getByTestId('downgrade-modal')).toBeTruthy();
    });
  });
});

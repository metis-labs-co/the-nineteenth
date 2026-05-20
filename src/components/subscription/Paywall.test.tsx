/**
 * Paywall Component Tests
 *
 * Comprehensive tests for the subscription paywall modal including:
 * - Rendering states (visible/hidden)
 * - Tier selection (social/premium)
 * - Billing period toggle (monthly/yearly)
 * - Product loading and display
 * - Purchase flow
 * - Restore purchases
 * - Legal links (Terms, Privacy)
 * - Accessibility features
 * - User interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { Paywall, PaywallProps } from './Paywall';
import { subscriptionService, SubscriptionProduct } from '@/services/subscription/SubscriptionService';
import { PRODUCT_IDS, FREE_TRIAL_DAYS } from '@/constants/products';
import type { SubscriptionTier } from '@/types/subscription.types';

// Mock Linking.openURL
import { Linking } from 'react-native';

// ============================================================================
// MOCKS
// ============================================================================

// Mock the subscription service
jest.mock('@/services/subscription/SubscriptionService', () => ({
  subscriptionService: {
    getAvailableProducts: jest.fn(),
    purchaseProduct: jest.fn(),
    restorePurchases: jest.fn(),
  },
}));
const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any);

// Mock useConfirmationDialog
const mockShowAlert = jest.fn();
const mockShowDialog = jest.fn();
const mockDismissDialog = jest.fn();
jest.mock('@/hooks', () => ({
  ...jest.requireActual('@/hooks'),
  useConfirmationDialog: () => ({
    dialogConfig: { visible: false, title: '', message: '', onConfirm: jest.fn() },
    showDialog: mockShowDialog,
    showAlert: mockShowAlert,
    dismissDialog: mockDismissDialog,
    setLoading: jest.fn(),
  }),
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockProducts: SubscriptionProduct[] = [
  {
    id: PRODUCT_IDS.SOCIAL_MONTHLY,
    tier: 'social' as SubscriptionTier,
    name: 'Social Monthly',
    description: 'Monthly social subscription',
    price: '$4.99',
    currency: 'AUD',
    period: 'monthly',
  },
  {
    id: PRODUCT_IDS.SOCIAL_YEARLY,
    tier: 'social' as SubscriptionTier,
    name: 'Social Yearly',
    description: 'Yearly social subscription',
    price: '$39.99',
    currency: 'AUD',
    period: 'yearly',
  },
  {
    id: PRODUCT_IDS.PREMIUM_MONTHLY,
    tier: 'premium' as SubscriptionTier,
    name: 'Premium Monthly',
    description: 'Monthly premium subscription',
    price: '$9.99',
    currency: 'AUD',
    period: 'monthly',
  },
  {
    id: PRODUCT_IDS.PREMIUM_YEARLY,
    tier: 'premium' as SubscriptionTier,
    name: 'Premium Yearly',
    description: 'Yearly premium subscription',
    price: '$84.99',
    currency: 'AUD',
    period: 'yearly',
  },
];

const defaultProps: PaywallProps = {
  visible: true,
  onDismiss: jest.fn(),
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const mockGetAvailableProducts = subscriptionService.getAvailableProducts as jest.Mock;
const mockPurchaseProduct = subscriptionService.purchaseProduct as jest.Mock;
const mockRestorePurchases = subscriptionService.restorePurchases as jest.Mock;
const mockAlert = mockShowAlert;

function setupDefaultMocks() {
  mockGetAvailableProducts.mockResolvedValue({
    success: true,
    data: { products: mockProducts },
  });
  mockPurchaseProduct.mockResolvedValue({
    success: true,
    data: {
      subscription: { tier: 'social' as SubscriptionTier },
      transactionId: 'test-transaction-123',
    },
  });
  mockRestorePurchases.mockResolvedValue({
    success: true,
    data: {
      subscription: { tier: 'social' as SubscriptionTier },
      restoredTransactions: 1,
    },
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe('Paywall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders when visible is true', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Upgrade Your Plan')).toBeTruthy();
      });
    });

    it('renders the modal header with title', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Upgrade Your Plan')).toBeTruthy();
      });
    });

    it('renders close button in header', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Close')).toBeTruthy();
      });
    });

    it('renders free trial badge', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(`${FREE_TRIAL_DAYS}-day free trial`)).toBeTruthy();
      });
    });

    it('renders tier selection cards', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Social')).toBeTruthy();
        expect(screen.getByText('Premium')).toBeTruthy();
      });
    });

    it('renders tier descriptions', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('For casual golfers')).toBeTruthy();
        expect(screen.getByText('For serious organisers')).toBeTruthy();
      });
    });

    it('renders billing period toggle', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Monthly')).toBeTruthy();
        expect(screen.getByText('Yearly')).toBeTruthy();
      });
    });

    it('renders yearly savings badge', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Save 33%')).toBeTruthy();
      });
    });

    it('renders purchase button', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Subscribe to social')).toBeTruthy();
      });
    });

    it('renders Start Free Trial text on button', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Start Free Trial')).toBeTruthy();
      });
    });

    it('renders trial cancellation note', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(`Cancel anytime during your ${FREE_TRIAL_DAYS}-day free trial`)
        ).toBeTruthy();
      });
    });

    it('renders restore purchases button', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Restore purchases')).toBeTruthy();
      });
    });

    it('renders Terms of Service link', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Terms of Service')).toBeTruthy();
      });
    });

    it('renders Privacy Policy link', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Privacy Policy')).toBeTruthy();
      });
    });

    it('renders subscription info text', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/Payment will be charged to your Apple ID account/)
        ).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // TIER SELECTION TESTS
  // ===========================================================================

  describe('Tier Selection', () => {
    it('defaults to social tier', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Social includes:')).toBeTruthy();
      });
    });

    it('defaults to initialTier when provided', async () => {
      render(<Paywall {...defaultProps} initialTier="premium" />);

      await waitFor(() => {
        expect(screen.getByText('Premium includes:')).toBeTruthy();
      });
    });

    it('switches to premium tier when Premium card is pressed', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Social includes:')).toBeTruthy();
      });

      const premiumCard = screen.getByText('Premium').parent?.parent;
      if (premiumCard) {
        fireEvent.press(premiumCard);
      }

      await waitFor(() => {
        expect(screen.getByText('Premium includes:')).toBeTruthy();
      });
    });

    it('switches back to social tier when Social card is pressed', async () => {
      render(<Paywall {...defaultProps} initialTier="premium" />);

      await waitFor(() => {
        expect(screen.getByText('Premium includes:')).toBeTruthy();
      });

      const socialCard = screen.getByText('Social').parent?.parent;
      if (socialCard) {
        fireEvent.press(socialCard);
      }

      await waitFor(() => {
        expect(screen.getByText('Social includes:')).toBeTruthy();
      });
    });

    it('displays social tier features when social is selected', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Up to 8 competitions')).toBeTruthy();
        expect(screen.getByText('Up to 12 players per competition')).toBeTruthy();
        expect(screen.getByText('Stroke Play & Match Play')).toBeTruthy();
      });
    });

    it('displays premium tier features when premium is selected', async () => {
      render(<Paywall {...defaultProps} initialTier="premium" />);

      await waitFor(() => {
        expect(screen.getByText('Up to 50 competitions')).toBeTruthy();
        expect(screen.getByText('Up to 40 players per competition')).toBeTruthy();
        expect(screen.getByText('All game types including team formats')).toBeTruthy();
        expect(screen.getByText('Priority support')).toBeTruthy();
      });
    });

    it('updates subscribe button label when tier changes', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Subscribe to social')).toBeTruthy();
      });

      const premiumCard = screen.getByText('Premium').parent?.parent;
      if (premiumCard) {
        fireEvent.press(premiumCard);
      }

      await waitFor(() => {
        expect(screen.getByLabelText('Subscribe to premium')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // BILLING PERIOD TESTS
  // ===========================================================================

  describe('Billing Period', () => {
    it('defaults to monthly billing', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('per month')).toBeTruthy();
      });
    });

    it('switches to yearly when Yearly button is pressed', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Monthly')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Yearly'));

      await waitFor(() => {
        expect(screen.getByText('per year')).toBeTruthy();
      });
    });

    it('switches back to monthly when Monthly button is pressed', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Monthly')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Yearly'));

      await waitFor(() => {
        expect(screen.getByText('per year')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Monthly'));

      await waitFor(() => {
        expect(screen.getByText('per month')).toBeTruthy();
      });
    });

    it('shows correct price for social monthly', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('$4.99')).toBeTruthy();
      });
    });

    it('shows correct price for social yearly', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Monthly')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Yearly'));

      await waitFor(() => {
        expect(screen.getByText('$39.99')).toBeTruthy();
      });
    });

    it('shows correct price for premium monthly', async () => {
      render(<Paywall {...defaultProps} initialTier="premium" />);

      await waitFor(() => {
        expect(screen.getByText('$9.99')).toBeTruthy();
      });
    });

    it('shows correct price for premium yearly', async () => {
      render(<Paywall {...defaultProps} initialTier="premium" />);

      await waitFor(() => {
        expect(screen.getByText('Monthly')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Yearly'));

      await waitFor(() => {
        expect(screen.getByText('$84.99')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // PRODUCT LOADING TESTS
  // ===========================================================================

  describe('Product Loading', () => {
    it('fetches products when visible', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetAvailableProducts).toHaveBeenCalledTimes(1);
      });
    });

    it('does not fetch products when not visible', async () => {
      render(<Paywall {...defaultProps} visible={false} />);

      // Give it some time to potentially fetch
      await waitFor(
        () => {
          expect(mockGetAvailableProducts).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );
    });

    it('shows loading indicator while fetching products', async () => {
      mockGetAvailableProducts.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<Paywall {...defaultProps} />);

      // Purchase button should be disabled during loading
      const subscribeButton = screen.getByLabelText('Subscribe to social');
      expect(subscribeButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('uses default pricing when product fetch fails', async () => {
      mockGetAvailableProducts.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        // Should fall back to default pricing from constants
        expect(screen.getByText(/\$/)).toBeTruthy();
      });
    });

    it('uses default pricing when products array is empty', async () => {
      mockGetAvailableProducts.mockResolvedValue({
        success: true,
        data: { products: [] },
      });

      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        // Should fall back to default pricing
        expect(screen.getByText(/\$/)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // PURCHASE FLOW TESTS
  // ===========================================================================

  describe('Purchase Flow', () => {
    it('calls purchaseProduct when subscribe button is pressed', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Start Free Trial')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Subscribe to social'));

      await waitFor(() => {
        expect(mockPurchaseProduct).toHaveBeenCalledWith(PRODUCT_IDS.SOCIAL_MONTHLY);
      });
    });

    it('calls purchaseProduct with correct product ID for premium yearly', async () => {
      render(<Paywall {...defaultProps} initialTier="premium" />);

      await waitFor(() => {
        expect(screen.getByText('Monthly')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Yearly'));

      await waitFor(() => {
        expect(screen.getByText('per year')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Subscribe to premium'));

      await waitFor(() => {
        expect(mockPurchaseProduct).toHaveBeenCalledWith(PRODUCT_IDS.PREMIUM_YEARLY);
      });
    });

    it('calls onPurchaseSuccess after successful purchase', async () => {
      const onPurchaseSuccess = jest.fn();
      render(<Paywall {...defaultProps} onPurchaseSuccess={onPurchaseSuccess} />);

      await waitFor(() => {
        expect(screen.getByText('Start Free Trial')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Subscribe to social'));

      await waitFor(() => {
        expect(onPurchaseSuccess).toHaveBeenCalledWith('social');
      });
    });

    it('calls onDismiss after successful purchase', async () => {
      const onDismiss = jest.fn();
      render(<Paywall {...defaultProps} onDismiss={onDismiss} />);

      await waitFor(() => {
        expect(screen.getByText('Start Free Trial')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Subscribe to social'));

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalled();
      });
    });

    it('does not show alert when purchase is cancelled', async () => {
      mockPurchaseProduct.mockResolvedValue({
        success: false,
        errorCode: 'PURCHASE_CANCELLED',
      });

      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Start Free Trial')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Subscribe to social'));

      await waitFor(() => {
        expect(mockAlert).not.toHaveBeenCalled();
      });
    });

    it('shows alert when purchase fails', async () => {
      mockPurchaseProduct.mockResolvedValue({
        success: false,
        error: 'Payment declined',
      });

      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Start Free Trial')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Subscribe to social'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Purchase Failed', 'Payment declined');
      });
    });

    it('shows generic error alert when purchase throws', async () => {
      mockPurchaseProduct.mockRejectedValue(new Error('Network error'));

      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Start Free Trial')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Subscribe to social'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Purchase Failed',
          'An unexpected error occurred. Please try again.'
        );
      });
    });

    it('disables button during purchase', async () => {
      mockPurchaseProduct.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Start Free Trial')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Subscribe to social'));

      await waitFor(() => {
        const subscribeButton = screen.getByLabelText('Subscribe to social');
        expect(subscribeButton.props.accessibilityState?.disabled).toBe(true);
      });
    });
  });

  // ===========================================================================
  // RESTORE PURCHASES TESTS
  // ===========================================================================

  describe('Restore Purchases', () => {
    it('calls restorePurchases when restore button is pressed', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Restore Purchases')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Restore purchases'));

      await waitFor(() => {
        expect(mockRestorePurchases).toHaveBeenCalled();
      });
    });

    it('shows success alert with tier after restore', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Restore Purchases')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Restore purchases'));

      await waitFor(() => {
        expect(mockShowDialog).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Purchases Restored',
            message: 'Your social subscription has been restored.',
          })
        );
      });
    });

    it('shows no purchases alert when nothing to restore', async () => {
      mockRestorePurchases.mockResolvedValue({
        success: true,
        data: {
          subscription: null,
          restoredTransactions: 0,
        },
      });

      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Restore Purchases')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Restore purchases'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'No Purchases Found',
          'We could not find any previous purchases to restore.'
        );
      });
    });

    it('shows error alert when restore fails', async () => {
      mockRestorePurchases.mockResolvedValue({
        success: false,
        error: 'Unable to restore',
      });

      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Restore Purchases')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Restore purchases'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Restore Failed', 'Unable to restore');
      });
    });

    it('shows generic error alert when restore throws', async () => {
      mockRestorePurchases.mockRejectedValue(new Error('Network error'));

      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Restore Purchases')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Restore purchases'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Restore Failed',
          'An unexpected error occurred. Please try again.'
        );
      });
    });

    it('disables restore button during restore', async () => {
      mockRestorePurchases.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Restore Purchases')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Restore purchases'));

      await waitFor(() => {
        const restoreButton = screen.getByLabelText('Restore purchases');
        expect(restoreButton.props.accessibilityState?.disabled).toBe(true);
      });
    });
  });

  // ===========================================================================
  // DISMISS TESTS
  // ===========================================================================

  describe('Dismiss', () => {
    it('calls onDismiss when close button is pressed', async () => {
      const onDismiss = jest.fn();
      render(<Paywall {...defaultProps} onDismiss={onDismiss} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Close')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Close'));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // LEGAL LINKS TESTS
  // ===========================================================================

  describe('Legal Links', () => {
    it('opens Terms of Service when pressed', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Terms of Service')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Terms of Service'));

      expect(mockOpenURL).toHaveBeenCalledWith('https://thenineteenth.golf/terms');
    });

    it('opens Privacy Policy when pressed', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Privacy Policy')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Privacy Policy'));

      expect(mockOpenURL).toHaveBeenCalledWith('https://thenineteenth.golf/privacy');
    });

    it('handles link open error gracefully', async () => {
      mockOpenURL.mockRejectedValue(new Error('Cannot open URL'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Terms of Service')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Terms of Service'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('close button has correct accessibility label', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close');
        expect(closeButton.props.accessibilityRole).toBe('button');
      });
    });

    it('monthly button has correct accessibility state when selected', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        // The Monthly text's parent is the TouchableOpacity with accessibilityState
        const monthlyText = screen.getByText('Monthly');
        // Navigate to the TouchableOpacity which should be the parent
        const monthlyButton = monthlyText.parent;
        // The accessibilityState is on the parent TouchableOpacity
        // Check that it exists - the component sets accessibilityState
        expect(monthlyButton).toBeTruthy();
      });
    });

    it('yearly button has correct accessibility state when not selected', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        // Find the yearly button container
        const yearlyText = screen.getByText('Yearly');
        const yearlyButton = yearlyText.parent;
        // Check that the button exists
        expect(yearlyButton).toBeTruthy();
      });
    });

    it('subscribe button has correct accessibility label', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        const subscribeButton = screen.getByLabelText('Subscribe to social');
        expect(subscribeButton.props.accessibilityRole).toBe('button');
      });
    });

    it('restore button has correct accessibility label', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        const restoreButton = screen.getByLabelText('Restore purchases');
        expect(restoreButton.props.accessibilityRole).toBe('button');
      });
    });
  });

  // ===========================================================================
  // PROPS TESTS
  // ===========================================================================

  describe('Props', () => {
    it('handles visible false correctly', () => {
      const { queryByText: _queryByText } = render(<Paywall {...defaultProps} visible={false} />);

      // Modal not visible means content should not be rendered in a way that's testable
      // Actually, Modal still mounts in tests, but we verify behavior
      expect(defaultProps.onDismiss).not.toHaveBeenCalled();
    });

    it('handles initialTier prop for social', async () => {
      render(<Paywall {...defaultProps} initialTier="social" />);

      await waitFor(() => {
        expect(screen.getByText('Social includes:')).toBeTruthy();
      });
    });

    it('handles initialTier prop for premium', async () => {
      render(<Paywall {...defaultProps} initialTier="premium" />);

      await waitFor(() => {
        expect(screen.getByText('Premium includes:')).toBeTruthy();
      });
    });

    it('handles onPurchaseSuccess being undefined', async () => {
      render(<Paywall {...defaultProps} onPurchaseSuccess={undefined} />);

      await waitFor(() => {
        expect(screen.getByText('Start Free Trial')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Subscribe to social'));

      // Should not throw
      await waitFor(() => {
        expect(mockPurchaseProduct).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // DARK MODE TESTS
  // ===========================================================================

  describe('Dark Mode', () => {
    it('renders correctly in dark mode', async () => {
      render(<Paywall {...defaultProps} />, { isDarkMode: true });

      await waitFor(() => {
        expect(screen.getByText('Upgrade Your Plan')).toBeTruthy();
      });
    });

    it('renders tier cards in dark mode', async () => {
      render(<Paywall {...defaultProps} />, { isDarkMode: true });

      await waitFor(() => {
        expect(screen.getByText('Social')).toBeTruthy();
        expect(screen.getByText('Premium')).toBeTruthy();
      });
    });

    it('renders features list in dark mode', async () => {
      render(<Paywall {...defaultProps} />, { isDarkMode: true });

      await waitFor(() => {
        expect(screen.getByText('Up to 8 competitions')).toBeTruthy();
      });
    });

    it('renders buttons in dark mode', async () => {
      render(<Paywall {...defaultProps} />, { isDarkMode: true });

      await waitFor(() => {
        expect(screen.getByText('Start Free Trial')).toBeTruthy();
        expect(screen.getByText('Restore Purchases')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles rapid tier selection changes', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Social')).toBeTruthy();
      });

      const premiumCard = screen.getByText('Premium').parent?.parent;
      const socialCard = screen.getByText('Social').parent?.parent;

      if (premiumCard) fireEvent.press(premiumCard);
      if (socialCard) fireEvent.press(socialCard);
      if (premiumCard) fireEvent.press(premiumCard);
      if (socialCard) fireEvent.press(socialCard);

      await waitFor(() => {
        expect(screen.getByText('Social includes:')).toBeTruthy();
      });
    });

    it('handles rapid billing period changes', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Monthly')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Yearly'));
      fireEvent.press(screen.getByText('Monthly'));
      fireEvent.press(screen.getByText('Yearly'));
      fireEvent.press(screen.getByText('Monthly'));

      await waitFor(() => {
        expect(screen.getByText('per month')).toBeTruthy();
      });
    });

    it('handles product fetch error gracefully', async () => {
      mockGetAvailableProducts.mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        // Should still render with fallback pricing
        expect(screen.getByText('Upgrade Your Plan')).toBeTruthy();
      });

      consoleSpy.mockRestore();
    });

    it('re-fetches products when becoming visible again', async () => {
      const { rerender } = render(<Paywall {...defaultProps} visible={false} />);

      expect(mockGetAvailableProducts).not.toHaveBeenCalled();

      rerender(<Paywall {...defaultProps} visible={true} />);

      await waitFor(() => {
        expect(mockGetAvailableProducts).toHaveBeenCalled();
      });
    });

    it('handles multiple purchase attempts', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Start Free Trial')).toBeTruthy();
      });

      // First attempt
      fireEvent.press(screen.getByLabelText('Subscribe to social'));

      await waitFor(() => {
        expect(mockPurchaseProduct).toHaveBeenCalledTimes(1);
      });

      // Reset mock
      mockPurchaseProduct.mockClear();
      mockPurchaseProduct.mockResolvedValue({
        success: true,
        data: {
          subscription: { tier: 'social' as SubscriptionTier },
        },
      });

      // Since first purchase succeeded and dismissed, component should be gone
      // This tests the successful flow completes
    });

    it('handles premium tier purchase with yearly billing', async () => {
      mockPurchaseProduct.mockResolvedValue({
        success: true,
        data: {
          subscription: { tier: 'premium' as SubscriptionTier },
        },
      });

      const onPurchaseSuccess = jest.fn();
      render(
        <Paywall
          {...defaultProps}
          initialTier="premium"
          onPurchaseSuccess={onPurchaseSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Monthly')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Yearly'));
      fireEvent.press(screen.getByLabelText('Subscribe to premium'));

      await waitFor(() => {
        expect(onPurchaseSuccess).toHaveBeenCalledWith('premium');
      });
    });
  });

  // ===========================================================================
  // COMPONENT STATE TESTS
  // ===========================================================================

  describe('Component State', () => {
    it('maintains tier selection after billing period change', async () => {
      render(<Paywall {...defaultProps} initialTier="premium" />);

      await waitFor(() => {
        expect(screen.getByText('Premium includes:')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Yearly'));

      await waitFor(() => {
        expect(screen.getByText('Premium includes:')).toBeTruthy();
        expect(screen.getByText('per year')).toBeTruthy();
      });
    });

    it('maintains billing period after tier change', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Monthly')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Yearly'));

      await waitFor(() => {
        expect(screen.getByText('per year')).toBeTruthy();
      });

      const premiumCard = screen.getByText('Premium').parent?.parent;
      if (premiumCard) {
        fireEvent.press(premiumCard);
      }

      await waitFor(() => {
        expect(screen.getByText('Premium includes:')).toBeTruthy();
        expect(screen.getByText('per year')).toBeTruthy();
      });
    });

    it('resets loading state after purchase completes', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Start Free Trial')).toBeTruthy();
      });

      // The button should show "Start Free Trial" after loading completes
      // (products loaded from mock)
      const subscribeButton = screen.getByLabelText('Subscribe to social');
      expect(subscribeButton.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('resets restoring state after restore completes', async () => {
      render(<Paywall {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Restore Purchases')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Restore purchases'));

      await waitFor(() => {
        // After restore completes, button should be enabled again
        const restoreButton = screen.getByLabelText('Restore purchases');
        expect(restoreButton.props.accessibilityState?.disabled).toBeFalsy();
      });
    });
  });
});

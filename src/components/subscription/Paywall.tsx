/**
 * Paywall Component
 *
 * A modal for purchasing subscriptions via App Store.
 * Displays available products with real pricing from RevenueCat.
 *
 * Features:
 * - Product cards with pricing from App Store
 * - Free trial badge (7-day trial)
 * - Monthly/Yearly toggle
 * - Purchase button with loading state
 * - Restore purchases option
 * - Required Apple links (Terms, Privacy Policy)
 *
 * @see https://developer.apple.com/app-store/subscriptions/
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { subscriptionKeys } from '@/hooks/queryKeys';
import { useConfirmationDialog } from '@/hooks';
import { ConfirmationDialog, SystemModalTheme } from '@/components/common';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows } from '@/constants/theme';
import {
  subscriptionService,
  SubscriptionProduct,
} from '@/services/subscription/SubscriptionService';
import { DEFAULT_PRICING_AUD, FREE_TRIAL_DAYS, PRODUCT_IDS } from '@/constants/products';
import type { SubscriptionTier } from '@/types/subscription.types';
import { TierCard } from './TierCard';
import { FeaturesList } from './FeaturesList';
import { styles } from './Paywall.styles';
import type { PaywallTier } from './tierConfig';

// ============================================================================
// TYPES
// ============================================================================

export interface PaywallProps {
  /** Whether the paywall is visible */
  visible: boolean;
  /** Called when purchase is successful */
  onPurchaseSuccess?: (tier: SubscriptionTier) => void;
  /** Called when paywall is dismissed */
  onDismiss: () => void;
  /** Pre-selected tier (optional) */
  initialTier?: PaywallTier;
}

type BillingPeriod = 'monthly' | 'yearly' | 'lifetime';

// ============================================================================
// CONSTANTS
// ============================================================================

const TERMS_URL = 'https://thenineteenth.golf/terms';
const PRIVACY_URL = 'https://thenineteenth.golf/privacy';

// ============================================================================
// COMPONENT
// ============================================================================

export function Paywall({
  visible,
  onPurchaseSuccess,
  onDismiss,
  initialTier = 'social',
}: PaywallProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Dialog state
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // State
  const [selectedTier, setSelectedTier] = useState<PaywallTier>(initialTier);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Fetch products from RevenueCat on mount
  useEffect(() => {
    async function fetchProducts() {
      setIsLoadingProducts(true);
      try {
        const result = await subscriptionService.getAvailableProducts();
        if (result.success && result.data) {
          setProducts(result.data.products);
        }
      } catch (err) {
        console.error('[Paywall] Failed to fetch products:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    if (visible) {
      fetchProducts();
    }
  }, [visible]);

  // Get the selected product
  const selectedProduct = useMemo(() => {
    const productId =
      billingPeriod === 'lifetime'
        ? selectedTier === 'social'
          ? PRODUCT_IDS.SOCIAL_LIFETIME
          : PRODUCT_IDS.PREMIUM_LIFETIME
        : selectedTier === 'social'
          ? billingPeriod === 'monthly'
            ? PRODUCT_IDS.SOCIAL_MONTHLY
            : PRODUCT_IDS.SOCIAL_YEARLY
          : billingPeriod === 'monthly'
            ? PRODUCT_IDS.PREMIUM_MONTHLY
            : PRODUCT_IDS.PREMIUM_YEARLY;

    const fetchedProduct = products.find((p) => p.id === productId);
    if (fetchedProduct) return fetchedProduct;

    const defaultPricing = DEFAULT_PRICING_AUD[productId as keyof typeof DEFAULT_PRICING_AUD];
    return {
      id: productId,
      tier: selectedTier,
      name: selectedTier === 'social' ? 'Social' : 'Premium',
      description: '',
      price: defaultPricing?.displayPrice ?? '$0.00',
      currency: 'AUD',
      period: billingPeriod,
    } as SubscriptionProduct;
  }, [selectedTier, billingPeriod, products]);

  const isLifetime = billingPeriod === 'lifetime';

  // Handle purchase
  const handlePurchase = useCallback(async () => {
    if (!selectedProduct) return;

    setIsPurchasing(true);
    try {
      const result = await subscriptionService.purchaseProduct(selectedProduct.id);

      if (result.success && result.data) {
        // Refresh subscription data from Supabase so the UI updates immediately
        await queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() });
        onPurchaseSuccess?.(result.data.subscription.tier);
        onDismiss();
      } else if (result.errorCode === 'PURCHASE_CANCELLED') {
        // User cancelled - do nothing
      } else {
        showAlert('Purchase Failed', result.error ?? 'Please try again.');
      }
    } catch (err) {
      console.error('[Paywall] Purchase error:', err);
      showAlert('Purchase Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  }, [selectedProduct, onPurchaseSuccess, onDismiss, showAlert, queryClient]);

  // Handle restore purchases
  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    try {
      const result = await subscriptionService.restorePurchases();

      if (result.success && result.data) {
        if (result.data.subscription) {
          showDialog({
            title: 'Purchases Restored',
            message: `Your ${result.data.subscription.tier} subscription has been restored.`,
            confirmLabel: 'OK',
            cancelLabel: '',
            onConfirm: () => {
              dismissDialog();
              onDismiss();
            },
          });
        } else {
          showAlert('No Purchases Found', 'We could not find any previous purchases to restore.');
        }
      } else {
        showAlert('Restore Failed', result.error ?? 'Please try again.');
      }
    } catch (err) {
      console.error('[Paywall] Restore error:', err);
      showAlert('Restore Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }, [onDismiss, showDialog, showAlert, dismissDialog]);

  const handleOpenLink = useCallback((url: string) => {
    Linking.openURL(url).catch((err) => console.error('[Paywall] Failed to open URL:', err));
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <SystemModalTheme>
      {/* surfaceElevated (not background) so the modal stays opaque even when
          the image backdrop is enabled. `colors.background` is transparent in
          that mode and the system pageSheet's default white shows through. */}
      <View style={[styles.container, { backgroundColor: colors.surfaceElevated }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + spacing.md, backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity style={styles.closeButton} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close">
            <Icon source="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Upgrade Your Plan</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        >
          {/* Free Trial Badge */}
          {!isLifetime && (
            <View style={[styles.trialBadge, { backgroundColor: colors.successBackground }]}>
              <Icon source="gift-outline" size={20} color={colors.success} />
              <Text style={[styles.trialText, { color: colors.success }]}>{FREE_TRIAL_DAYS}-day free trial</Text>
            </View>
          )}

          {/* Tier Selection */}
          <View style={styles.tierSelection}>
            <TierCard tier="social" selected={selectedTier === 'social'} onSelect={() => setSelectedTier('social')} />
            <TierCard tier="premium" selected={selectedTier === 'premium'} onSelect={() => setSelectedTier('premium')} />
          </View>

          {/* Billing Period Toggle */}
          <View style={[styles.periodToggle, { backgroundColor: colors.surfaceVariant }]}>
            <TouchableOpacity
              style={[styles.periodOption, billingPeriod === 'monthly' && { backgroundColor: colors.surface, ...shadows.sm }]}
              onPress={() => setBillingPeriod('monthly')}
              accessibilityRole="button"
              accessibilityState={{ selected: billingPeriod === 'monthly' }}
            >
              <Text style={[styles.periodText, { color: billingPeriod === 'monthly' ? colors.textPrimary : colors.textSecondary }]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodOption, billingPeriod === 'yearly' && { backgroundColor: colors.surface, ...shadows.sm }]}
              onPress={() => setBillingPeriod('yearly')}
              accessibilityRole="button"
              accessibilityState={{ selected: billingPeriod === 'yearly' }}
            >
              <Text style={[styles.periodText, { color: billingPeriod === 'yearly' ? colors.textPrimary : colors.textSecondary }]}>
                Yearly
              </Text>
              <View style={[styles.saveBadge, { backgroundColor: colors.success }]}>
                <Text style={[styles.saveBadgeText, { color: colors.white }]}>Save 33%</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodOption, billingPeriod === 'lifetime' && { backgroundColor: colors.surface, ...shadows.sm }]}
              onPress={() => setBillingPeriod('lifetime')}
              accessibilityRole="button"
              accessibilityState={{ selected: billingPeriod === 'lifetime' }}
            >
              <Text style={[styles.periodText, { color: billingPeriod === 'lifetime' ? colors.textPrimary : colors.textSecondary }]}>
                Lifetime
              </Text>
            </TouchableOpacity>
          </View>

          {/* Features List */}
          <FeaturesList tier={selectedTier} />

          {/* Price Display */}
          <View style={styles.priceSection}>
            {isLoadingProducts ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Text style={[styles.price, { color: colors.textPrimary }]}>{selectedProduct.price}</Text>
                <Text style={[styles.priceSubtext, { color: colors.textSecondary }]}>
                  {isLifetime ? 'one-time payment' : `per ${billingPeriod === 'monthly' ? 'month' : 'year'}`}
                </Text>
              </>
            )}
          </View>

          {/* Purchase Button */}
          <TouchableOpacity
            style={[styles.purchaseButton, { backgroundColor: colors.primary }, (isPurchasing || isLoadingProducts) && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={isPurchasing || isLoadingProducts}
            accessibilityRole="button"
            accessibilityLabel={`Subscribe to ${selectedTier}`}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[styles.purchaseButtonText, { color: colors.white }]}>
                {isLifetime ? 'Buy Lifetime' : 'Start Free Trial'}
              </Text>
            )}
          </TouchableOpacity>

          {!isLifetime && (
            <Text style={[styles.trialNote, { color: colors.textSecondary }]}>
              Cancel anytime during your {FREE_TRIAL_DAYS}-day free trial
            </Text>
          )}

          <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Restore Purchases */}
          <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} disabled={isRestoring} accessibilityRole="button" accessibilityLabel="Restore purchases">
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.restoreText, { color: colors.primary }]}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          {/* Legal Links */}
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => handleOpenLink(TERMS_URL)}>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={[styles.legalSeparator, { color: colors.textSecondary }]}>•</Text>
            <TouchableOpacity onPress={() => handleOpenLink(PRIVACY_URL)}>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          {/* Subscription / Purchase Info */}
          {isLifetime ? (
            <Text style={[styles.subscriptionInfo, { color: colors.textSecondary }]}>
              {`The Nineteenth ${selectedProduct.name} Lifetime: ${selectedProduct.price} (one-time). `}
              Payment will be charged to your Apple ID account at the confirmation of purchase. This is a
              one-time, non-renewing purchase that grants permanent access — there is no subscription and
              nothing to cancel. If you reinstall the app, use &ldquo;Restore Purchases&rdquo; to regain access.
            </Text>
          ) : (
            <Text style={[styles.subscriptionInfo, { color: colors.textSecondary }]}>
              {`The Nineteenth ${selectedProduct.name} (${billingPeriod === 'monthly' ? '1 month' : '1 year'}): ${selectedProduct.price}/${billingPeriod === 'monthly' ? 'month' : 'year'}. `}
              Includes a {FREE_TRIAL_DAYS}-day free trial. Payment will be charged to your Apple ID account at the
              confirmation of purchase. Subscription automatically renews unless it is cancelled at least 24 hours before
              the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of
              the current period. You can manage and cancel your subscriptions by going to your account settings on the
              App Store after purchase.
            </Text>
          )}
        </ScrollView>

        {/* Confirmation/Error Dialog */}
        <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
      </View>
      </SystemModalTheme>
    </Modal>
  );
}

export default Paywall;

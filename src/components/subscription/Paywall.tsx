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
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  subscriptionService,
  SubscriptionProduct,
} from '@/services/subscription/SubscriptionService';
import {
  DEFAULT_PRICING_AUD,
  FREE_TRIAL_DAYS,
  PRODUCT_IDS,
} from '@/constants/products';
import type { SubscriptionTier } from '@/types/subscription.types';

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
  initialTier?: 'social' | 'premium';
}

type BillingPeriod = 'monthly' | 'yearly';

// ============================================================================
// CONSTANTS
// ============================================================================

const TERMS_URL = 'https://thenineteenth.golf/terms';
const PRIVACY_URL = 'https://thenineteenth.golf/privacy';

/**
 * Feature lists for each tier
 */
const TIER_FEATURES: Record<'social' | 'premium', string[]> = {
  social: [
    'Up to 8 competitions',
    'Up to 16 players per competition',
    'Stroke Play & Match Play',
    'Compare stats with friends',
    'Score distribution analytics',
  ],
  premium: [
    'Unlimited competitions',
    'Up to 40 players per competition',
    'All game types including team formats',
    'Advanced analytics & trends',
    'Scoring pairs for competitive rounds',
    'Priority support',
  ],
};

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

  // State
  const [selectedTier, setSelectedTier] = useState<'social' | 'premium'>(initialTier);
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
      selectedTier === 'social'
        ? billingPeriod === 'monthly'
          ? PRODUCT_IDS.SOCIAL_MONTHLY
          : PRODUCT_IDS.SOCIAL_YEARLY
        : billingPeriod === 'monthly'
          ? PRODUCT_IDS.PREMIUM_MONTHLY
          : PRODUCT_IDS.PREMIUM_YEARLY;

    // Try to find from fetched products (real prices)
    const fetchedProduct = products.find((p) => p.id === productId);
    if (fetchedProduct) return fetchedProduct;

    // Fallback to default pricing
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

  // Handle purchase
  const handlePurchase = useCallback(async () => {
    if (!selectedProduct) return;

    setIsPurchasing(true);
    try {
      const result = await subscriptionService.purchaseProduct(selectedProduct.id);

      if (result.success && result.data) {
        onPurchaseSuccess?.(result.data.subscription.tier);
        onDismiss();
      } else if (result.errorCode === 'PURCHASE_CANCELLED') {
        // User cancelled - do nothing
      } else {
        Alert.alert('Purchase Failed', result.error ?? 'Please try again.');
      }
    } catch (err) {
      console.error('[Paywall] Purchase error:', err);
      Alert.alert('Purchase Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  }, [selectedProduct, onPurchaseSuccess, onDismiss]);

  // Handle restore purchases
  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    try {
      const result = await subscriptionService.restorePurchases();

      if (result.success && result.data) {
        if (result.data.subscription) {
          Alert.alert(
            'Purchases Restored',
            `Your ${result.data.subscription.tier} subscription has been restored.`,
            [{ text: 'OK', onPress: onDismiss }]
          );
        } else {
          Alert.alert(
            'No Purchases Found',
            'We could not find any previous purchases to restore.'
          );
        }
      } else {
        Alert.alert('Restore Failed', result.error ?? 'Please try again.');
      }
    } catch (err) {
      console.error('[Paywall] Restore error:', err);
      Alert.alert('Restore Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }, [onDismiss]);

  // Handle opening links
  const handleOpenLink = useCallback((url: string) => {
    Linking.openURL(url).catch((err) => {
      console.error('[Paywall] Failed to open URL:', err);
    });
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + spacing.md,
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Icon source="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Upgrade Your Plan
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          {/* Free Trial Badge */}
          <View style={[styles.trialBadge, { backgroundColor: colors.successBackground }]}>
            <Icon source="gift-outline" size={20} color={colors.success} />
            <Text style={[styles.trialText, { color: colors.success }]}>
              {FREE_TRIAL_DAYS}-day free trial
            </Text>
          </View>

          {/* Tier Selection */}
          <View style={styles.tierSelection}>
            <TierCard
              tier="social"
              selected={selectedTier === 'social'}
              onSelect={() => setSelectedTier('social')}
              colors={colors}
            />
            <TierCard
              tier="premium"
              selected={selectedTier === 'premium'}
              onSelect={() => setSelectedTier('premium')}
              colors={colors}
            />
          </View>

          {/* Billing Period Toggle */}
          <View style={[styles.periodToggle, { backgroundColor: colors.surfaceVariant }]}>
            <TouchableOpacity
              style={[
                styles.periodOption,
                billingPeriod === 'monthly' && {
                  backgroundColor: colors.surface,
                  ...shadows.sm,
                },
              ]}
              onPress={() => setBillingPeriod('monthly')}
              accessibilityRole="button"
              accessibilityState={{ selected: billingPeriod === 'monthly' }}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: billingPeriod === 'monthly' ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodOption,
                billingPeriod === 'yearly' && {
                  backgroundColor: colors.surface,
                  ...shadows.sm,
                },
              ]}
              onPress={() => setBillingPeriod('yearly')}
              accessibilityRole="button"
              accessibilityState={{ selected: billingPeriod === 'yearly' }}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: billingPeriod === 'yearly' ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                Yearly
              </Text>
              <View style={[styles.saveBadge, { backgroundColor: colors.success }]}>
                <Text style={[styles.saveBadgeText, { color: colors.white }]}>
                  Save 33%
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Features List */}
          <View style={[styles.featuresCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.featuresTitle, { color: colors.textPrimary }]}>
              {selectedTier === 'social' ? 'Social' : 'Premium'} includes:
            </Text>
            {TIER_FEATURES[selectedTier].map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Icon source="check-circle" size={20} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Price Display */}
          <View style={styles.priceSection}>
            {isLoadingProducts ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Text style={[styles.price, { color: colors.textPrimary }]}>
                  {selectedProduct.price}
                </Text>
                <Text style={[styles.priceSubtext, { color: colors.textSecondary }]}>
                  per {billingPeriod === 'monthly' ? 'month' : 'year'}
                </Text>
              </>
            )}
          </View>

          {/* Purchase Button */}
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              { backgroundColor: colors.primary },
              (isPurchasing || isLoadingProducts) && styles.purchaseButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing || isLoadingProducts}
            accessibilityRole="button"
            accessibilityLabel={`Subscribe to ${selectedTier}`}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[styles.purchaseButtonText, { color: colors.white }]}>
                Start Free Trial
              </Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.trialNote, { color: colors.textSecondary }]}>
            Cancel anytime during your {FREE_TRIAL_DAYS}-day free trial
          </Text>

          <Divider style={{ backgroundColor: colors.border, marginVertical: spacing.lg }} />

          {/* Restore Purchases */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.restoreText, { color: colors.primary }]}>
                Restore Purchases
              </Text>
            )}
          </TouchableOpacity>

          {/* Legal Links */}
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => handleOpenLink(TERMS_URL)}>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>
                Terms of Service
              </Text>
            </TouchableOpacity>
            <Text style={[styles.legalSeparator, { color: colors.textSecondary }]}>•</Text>
            <TouchableOpacity onPress={() => handleOpenLink(PRIVACY_URL)}>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>

          {/* Subscription Info */}
          <Text style={[styles.subscriptionInfo, { color: colors.textSecondary }]}>
            Payment will be charged to your Apple ID account at the confirmation of
            purchase. Subscription automatically renews unless it is cancelled at least
            24 hours before the end of the current period. You can manage and cancel your
            subscriptions by going to your account settings on the App Store after purchase.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TierCardProps {
  tier: 'social' | 'premium';
  selected: boolean;
  onSelect: () => void;
  colors: ReturnType<typeof useThemeColors>;
}

// Tier-specific colors (matching UpgradePrompt)
const TIER_COLORS = {
  social: '#3b82f6',
  premium: '#f59e0b',
} as const;

function TierCard({ tier, selected, onSelect, colors }: TierCardProps) {
  const tierColor = TIER_COLORS[tier];
  const icon = tier === 'social' ? 'account-group-outline' : 'crown-outline';
  const name = tier === 'social' ? 'Social' : 'Premium';
  const description =
    tier === 'social'
      ? 'For casual golfers'
      : 'For serious organizers';

  return (
    <TouchableOpacity
      style={[
        styles.tierCard,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? tierColor : colors.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.tierIcon, { backgroundColor: tierColor + '20' }]}>
        <Icon source={icon} size={24} color={tierColor} />
      </View>
      <Text style={[styles.tierName, { color: colors.textPrimary }]}>{name}</Text>
      <Text style={[styles.tierDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
      {selected && (
        <View style={[styles.selectedIndicator, { backgroundColor: tierColor }]}>
          <Icon source="check" size={16} color={colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  trialText: {
    ...typography.bodyBold,
  },
  tierSelection: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tierCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  tierIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierName: {
    ...typography.bodyBold,
  },
  tierDescription: {
    ...typography.caption,
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodToggle: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  periodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  periodText: {
    ...typography.bodyBold,
  },
  saveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  saveBadgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  featuresCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  featuresTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    ...typography.body,
    flex: 1,
  },
  priceSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  price: {
    ...typography.h1,
  },
  priceSubtext: {
    ...typography.body,
  },
  purchaseButton: {
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    ...typography.bodyBold,
    fontSize: 18,
  },
  trialNote: {
    ...typography.small,
    textAlign: 'center',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  restoreText: {
    ...typography.body,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legalLink: {
    ...typography.small,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    ...typography.small,
  },
  subscriptionInfo: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default Paywall;

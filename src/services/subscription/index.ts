/**
 * Subscription Services Barrel Export
 *
 * Exports all subscription-related services:
 * - subscriptionService: Provider abstraction for subscription management
 * - grandfatheringService: Handle downgrade scenarios
 * - (Future) webhooks: IAP webhook handlers
 */

// Subscription service - main provider abstraction
export {
  subscriptionService,
  createSubscriptionProvider,
} from './SubscriptionService';

// Types from SubscriptionService
export type {
  SubscriptionProvider,
  SubscriptionResult,
  SubscriptionErrorCode,
  SubscriptionProduct,
  AvailableProductsResult,
  PurchaseResult,
  RestorePurchasesResult,
  ProviderType,
} from './SubscriptionService';

// Grandfathering service for downgrade handling
export {
  grandfatheringService,
  checkGrandfatheredAccess,
  applyGracefulDegradation,
  getCompetitionsOverLimit,
  isActionAllowed,
} from './grandfathering';

// Types from grandfathering
export type {
  GrandfatheredAccessResult,
  GracefulDegradationResult,
  GrandfatheringAction,
  CompetitionWithCounts,
  OverLimitCompetition,
  GrandfatheringServiceError,
} from './grandfathering';

// Webhook handlers for RevenueCat IAP events
export {
  handleRevenueCatWebhook,
  mapProductToTier,
  updateSubscription,
  verifyWebhookSignature,
  // Individual handlers (for testing)
  handleInitialPurchase,
  handleRenewal,
  handleCancellation,
  handleExpiration,
  handleBillingIssue,
  handleProductChange,
  handleUncancellation,
} from './webhooks';

// Types from webhooks
export type {
  RevenueCatEventType,
  RevenueCatSubscriber,
  RevenueCatWebhookEvent,
  WebhookHandlerResult,
  SubscriptionUpdate,
} from './webhooks';

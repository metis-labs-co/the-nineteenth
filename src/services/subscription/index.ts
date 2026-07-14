/**
 * Subscription Services Barrel Export
 *
 * Exports all subscription-related services:
 * - subscriptionService: Provider abstraction for subscription management
 * - grandfatheringService: Handle downgrade scenarios
 * Server-side webhook handling lives exclusively in the Supabase Edge Function.
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

// RevenueCat user ID management helpers
export {
  loginToRevenueCat,
  logoutFromRevenueCat,
  isRevenueCatAvailable,
} from './revenueCatAuth';

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
} from './grandfathering';

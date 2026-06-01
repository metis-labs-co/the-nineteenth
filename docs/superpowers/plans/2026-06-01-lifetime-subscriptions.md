# Lifetime Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-time lifetime purchase for the Social and Premium tiers alongside the existing monthly/yearly subscriptions.

**Architecture:** Lifetime is a non-consumable store product mapped to the existing `social_access` / `premium_access` RevenueCat entitlements. Granting it writes a `user_subscriptions` row with `status='active'` and `expires_at=NULL`, which the existing `get_user_subscription_tier()` DB function already treats as "never expires." No DB migration. The work is: product constants, a real webhook handler for the `NON_RENEWING_PURCHASE` event (currently a no-op), refund handling, paywall UI, a lifetime indicator on the subscription screen, plus manual store/RevenueCat config.

**Tech Stack:** TypeScript, React Native (Expo), RevenueCat (`react-native-purchases`), Supabase Edge Functions (Deno), Jest (`jest-expo` preset).

**Reference spec:** `docs/superpowers/specs/2026-06-01-lifetime-subscriptions-design.md`

**Pricing:** Social lifetime **$119.99 AUD**, Premium lifetime **$249.99 AUD**.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/constants/products.ts` | Product IDs, tier mapping, pricing fallbacks | Modify |
| `src/constants/__tests__/products.test.ts` | Unit tests for product helpers | Create |
| `supabase/functions/revenuecat-webhook/index.ts` | Server sync of RevenueCat events → DB | Modify |
| `supabase/functions/sync-subscription-from-revenuecat/index.ts` | Eager post-purchase sync | Verify only (no code expected) |
| `src/components/subscription/Paywall.tsx` | Purchase UI | Modify |
| `src/screens/subscription/useSubscriptionState.ts` | Subscription screen business logic | Modify |
| `src/screens/subscription/__tests__/useSubscriptionState.test.ts` | Unit test for lifetime helper | Create |
| `src/screens/subscription/SubscriptionScreen.tsx` | Subscription management screen | Modify |

---

## Task 1: Product constants + helpers

**Files:**
- Modify: `src/constants/products.ts`
- Test: `src/constants/__tests__/products.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/constants/__tests__/products.test.ts`:

```typescript
import {
  PRODUCT_IDS,
  PRODUCT_ID_TO_TIER,
  TIER_TO_PRODUCT_IDS,
  DEFAULT_PRICING_AUD,
  getBillingPeriod,
  getTierFromProductId,
  isValidProductId,
} from '@/constants/products';

describe('lifetime products', () => {
  it('exposes lifetime product IDs', () => {
    expect(PRODUCT_IDS.SOCIAL_LIFETIME).toBe('the.nineteenth.social.lifetime');
    expect(PRODUCT_IDS.PREMIUM_LIFETIME).toBe('the.nineteenth.premium.lifetime');
  });

  it('maps lifetime products to their tier', () => {
    expect(PRODUCT_ID_TO_TIER[PRODUCT_IDS.SOCIAL_LIFETIME]).toBe('social');
    expect(PRODUCT_ID_TO_TIER[PRODUCT_IDS.PREMIUM_LIFETIME]).toBe('premium');
    expect(getTierFromProductId('the.nineteenth.premium.lifetime')).toBe('premium');
  });

  it('lists lifetime products under each tier', () => {
    expect(TIER_TO_PRODUCT_IDS.social).toContain(PRODUCT_IDS.SOCIAL_LIFETIME);
    expect(TIER_TO_PRODUCT_IDS.premium).toContain(PRODUCT_IDS.PREMIUM_LIFETIME);
  });

  it('detects the lifetime billing period', () => {
    expect(getBillingPeriod('the.nineteenth.social.lifetime')).toBe('lifetime');
    expect(getBillingPeriod('the.nineteenth.social.yearly')).toBe('yearly');
    expect(getBillingPeriod('the.nineteenth.social.monthly')).toBe('monthly');
  });

  it('has fallback pricing for lifetime products', () => {
    expect(DEFAULT_PRICING_AUD[PRODUCT_IDS.SOCIAL_LIFETIME].price).toBe(119.99);
    expect(DEFAULT_PRICING_AUD[PRODUCT_IDS.PREMIUM_LIFETIME].price).toBe(249.99);
  });

  it('treats lifetime IDs as valid', () => {
    expect(isValidProductId('the.nineteenth.premium.lifetime')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/constants/__tests__/products.test.ts`
Expected: FAIL — `PRODUCT_IDS.SOCIAL_LIFETIME` is `undefined`.

- [ ] **Step 3: Add the lifetime product IDs**

In `src/constants/products.ts`, add a `SOCIAL_LIFETIME` and `PREMIUM_LIFETIME` entry to **each** of the three objects `IOS_PRODUCT_IDS`, `ANDROID_PRODUCT_IDS`, and `PRODUCT_IDS`. For each object, add these two lines alongside the existing social/premium entries:

```typescript
  // Lifetime (one-time, non-consumable)
  SOCIAL_LIFETIME: `${BUNDLE_ID}.social.lifetime`,
  PREMIUM_LIFETIME: `${BUNDLE_ID}.premium.lifetime`,
```

- [ ] **Step 4: Add tier mappings**

In `PRODUCT_ID_TO_TIER`, add:

```typescript
  [PRODUCT_IDS.SOCIAL_LIFETIME]: 'social',
  [PRODUCT_IDS.PREMIUM_LIFETIME]: 'premium',
```

In `TIER_TO_PRODUCT_IDS`, update the `social` and `premium` arrays:

```typescript
  social: [PRODUCT_IDS.SOCIAL_MONTHLY, PRODUCT_IDS.SOCIAL_YEARLY, PRODUCT_IDS.SOCIAL_LIFETIME],
  premium: [PRODUCT_IDS.PREMIUM_MONTHLY, PRODUCT_IDS.PREMIUM_YEARLY, PRODUCT_IDS.PREMIUM_LIFETIME],
```

- [ ] **Step 5: Extend the billing period helper**

Replace the `BillingPeriod` type and `getBillingPeriod` function with:

```typescript
export type BillingPeriod = 'monthly' | 'yearly' | 'lifetime';

export function getBillingPeriod(productId: string): BillingPeriod | null {
  if (productId.endsWith('.monthly')) return 'monthly';
  if (productId.endsWith('.yearly')) return 'yearly';
  if (productId.endsWith('.lifetime')) return 'lifetime';
  return null;
}
```

- [ ] **Step 6: Add fallback pricing**

In `DEFAULT_PRICING_AUD`, add two entries:

```typescript
  [PRODUCT_IDS.SOCIAL_LIFETIME]: {
    price: 119.99,
    currency: 'AUD',
    displayPrice: '$119.99',
  },
  [PRODUCT_IDS.PREMIUM_LIFETIME]: {
    price: 249.99,
    currency: 'AUD',
    displayPrice: '$249.99',
  },
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm jest src/constants/__tests__/products.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 8: Type-check**

Run: `pnpm type-check`
Expected: no new errors. (`PRODUCT_ID_TO_TIER` is typed `Record<ProductId, ...>`, so the new keys are required and now present.)

- [ ] **Step 9: Commit**

```bash
git add src/constants/products.ts src/constants/__tests__/products.test.ts
git commit -m "feat(subscriptions): add lifetime product IDs, mappings, and pricing"
```

---

## Task 2: Webhook `NON_RENEWING_PURCHASE` handler + refund handling

**Files:**
- Modify: `supabase/functions/revenuecat-webhook/index.ts`

This is a Deno edge function; it is not covered by the Jest suite. Verification is via a crafted HTTP request against the deployed function (Step 6) plus a sandbox purchase in Task 6.

- [ ] **Step 1: Add explicit lifetime product mappings**

In the local `PRODUCT_ID_TO_TIER` map (around line 81), add the two lifetime IDs:

```typescript
const PRODUCT_ID_TO_TIER: Record<string, SubscriptionTier> = {
  'the.nineteenth.social.monthly': 'social',
  'the.nineteenth.social.yearly': 'social',
  'the.nineteenth.social.lifetime': 'social',
  'the.nineteenth.premium.monthly': 'premium',
  'the.nineteenth.premium.yearly': 'premium',
  'the.nineteenth.premium.lifetime': 'premium',
};
```

- [ ] **Step 2: Add a lifetime-product helper and the non-renewing handler**

Add this helper above the event handlers (near `mapProductToTier`):

```typescript
function isLifetimeProduct(productId: string): boolean {
  return productId.endsWith('.lifetime');
}
```

Add a new handler alongside the others (e.g. after `handleInitialPurchase`):

```typescript
async function handleNonRenewingPurchase(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  const tier = mapProductToTier(event.product_id);

  // One-time lifetime purchase: never expires.
  return updateSubscription(supabase, event.app_user_id, {
    tier,
    status: 'active',
    external_id: event.original_transaction_id,
    product_id: event.product_id,
    expires_at: null,
    cancelled_at: null,
    trial_started_at: null,
    trial_ends_at: null,
  });
}
```

- [ ] **Step 3: Route the event**

In `handleWebhook`'s `switch`, remove `NON_RENEWING_PURCHASE` from the shared acknowledgement group and give it its own case. The combined case currently reads:

```typescript
    case 'NON_RENEWING_PURCHASE':
    case 'SUBSCRIBER_ALIAS':
    case 'TRANSFER':
      console.log(`[Webhook] Event ${event.type} acknowledged`);
      return {
        success: true,
        message: `Event ${event.type} acknowledged`,
        userId: event.app_user_id,
      };
```

Change it to:

```typescript
    case 'NON_RENEWING_PURCHASE':
      return handleNonRenewingPurchase(supabase, event);

    case 'SUBSCRIBER_ALIAS':
    case 'TRANSFER':
      console.log(`[Webhook] Event ${event.type} acknowledged`);
      return {
        success: true,
        message: `Event ${event.type} acknowledged`,
        userId: event.app_user_id,
      };
```

- [ ] **Step 4: Handle refunds of lifetime purchases in `handleCancellation`**

A refund of a non-consumable arrives as a `CANCELLATION`. The current handler keeps the tier and sets `expires_at` from `expiration_at_ms` (null for lifetime → user keeps access forever). Replace `handleCancellation` with a lifetime-aware version:

```typescript
async function handleCancellation(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  // Refund/cancellation of a one-time lifetime purchase: revoke access now.
  if (isLifetimeProduct(event.product_id)) {
    return updateSubscription(supabase, event.app_user_id, {
      tier: 'free',
      status: 'expired',
      expires_at: new Date().toISOString(),
      cancelled_at: new Date().toISOString(),
    });
  }

  // Auto-renewing sub: user turned off renewal but keeps access until expiry.
  return updateSubscription(supabase, event.app_user_id, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
  });
}
```

- [ ] **Step 5: Deploy to the dev project**

> ⚠️ The app's dev environment is Supabase project `uoqofjwtdgdzhpwfzklo`; the CLI may be linked to prod (`bvnxfhuvocxyilhlenka`). Pass `--project-ref` explicitly so you deploy to dev for testing.

Run:
```bash
supabase functions deploy revenuecat-webhook --no-verify-jwt --project-ref uoqofjwtdgdzhpwfzklo
```
Expected: "Deployed Function revenuecat-webhook".

- [ ] **Step 6: Verify with a crafted webhook request**

Pick a real test user's `auth.uid()` (call it `<USER_ID>`) and the webhook secret (call it `<SECRET>`). Run:

```bash
curl -i -X POST \
  "https://uoqofjwtdgdzhpwfzklo.supabase.co/functions/v1/revenuecat-webhook" \
  -H "Authorization: <SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"api_version":"1.0","event":{"id":"evt_test_lifetime","type":"NON_RENEWING_PURCHASE","app_user_id":"<USER_ID>","original_app_user_id":"<USER_ID>","aliases":[],"product_id":"the.nineteenth.premium.lifetime","period_type":"NORMAL","purchased_at_ms":1717200000000,"expiration_at_ms":null,"environment":"SANDBOX","entitlement_id":"premium_access","entitlement_ids":["premium_access"],"presented_offering_id":null,"transaction_id":"txn_test","original_transaction_id":"otxn_test","is_family_share":false,"store":"APP_STORE","takehome_percentage":0.7,"price":249.99,"currency":"AUD"}}'
```

Expected: HTTP `200` with `{"success":true,...,"tier":"premium"}`.

Then confirm the DB row (via Supabase SQL editor or psql):

```sql
select tier, status, expires_at, product_id
from user_subscriptions where user_id = '<USER_ID>';
```

Expected: `tier='premium'`, `status='active'`, `expires_at` is `NULL`, `product_id='the.nineteenth.premium.lifetime'`.

- [ ] **Step 7: Verify the refund path**

Re-run the curl from Step 6 but with `"type":"CANCELLATION"`. Then re-query the row.
Expected: `tier='free'`, `status='expired'`, `expires_at` set to ~now.

> Reset the test user afterward (re-send the `NON_RENEWING_PURCHASE` event, or set them back via the dev tier switch) so they aren't left downgraded.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/revenuecat-webhook/index.ts
git commit -m "feat(subscriptions): handle lifetime purchases and refunds in RevenueCat webhook"
```

---

## Task 3: Verify the eager sync edge function (no code expected)

**Files:**
- Verify: `supabase/functions/sync-subscription-from-revenuecat/index.ts`

The function resolves the highest active entitlement from `subscriber.entitlements`. A lifetime entitlement returns `expires_date: null`, treated as `Infinity > now` = active, writing `expires_at = null` (lines ~185–192). No code change is anticipated — this task confirms that.

- [ ] **Step 1: Confirm by reading the resolution logic**

Open the file and confirm at lines ~184–192 that `ent.expires_date` of `null` produces `expiresMs = Infinity`, `isActive = true`, and `resolvedExpiresAt = null`. Confirm the cancellation lookup at ~197 keys into `subscriptions[...]` (subscriptions only), so a non-subscription product leaves `cancelledAt = null` → `status='active'`.

- [ ] **Step 2: Record the conclusion**

If the logic is as above, no change is needed; the end-to-end sandbox purchase in Task 6 is the real verification. If RevenueCat's sandbox response unexpectedly classifies the lifetime grant differently (e.g. omits it from `entitlements`), note it and add a follow-up — do **not** invent a speculative fix here.

No commit (verification only) unless a change proves necessary.

---

## Task 4: Paywall UI — add the Lifetime option

**Files:**
- Modify: `src/components/subscription/Paywall.tsx`

No automated test (the existing `Paywall` has no test file and is heavily RevenueCat-coupled); verification is via the sandbox run in Task 6 and a visual check.

- [ ] **Step 1: Widen the local billing-period type**

Change line ~61 from:

```typescript
type BillingPeriod = 'monthly' | 'yearly';
```
to:
```typescript
type BillingPeriod = 'monthly' | 'yearly' | 'lifetime';
```

- [ ] **Step 2: Map the selected lifetime product**

Replace the `selectedProduct` `useMemo` body (lines ~117–140) so it resolves lifetime IDs. New body:

```typescript
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
```

- [ ] **Step 3: Add an `isLifetime` flag**

Immediately after the `selectedProduct` memo, add:

```typescript
  const isLifetime = billingPeriod === 'lifetime';
```

- [ ] **Step 4: Hide the trial badge for lifetime**

Wrap the trial badge block (lines ~234–238) so it only renders when not lifetime:

```tsx
          {/* Free Trial Badge */}
          {!isLifetime && (
            <View style={[styles.trialBadge, { backgroundColor: colors.successBackground }]}>
              <Icon source="gift-outline" size={20} color={colors.success} />
              <Text style={[styles.trialText, { color: colors.success }]}>{FREE_TRIAL_DAYS}-day free trial</Text>
            </View>
          )}
```

- [ ] **Step 5: Add the Lifetime toggle option**

Add a third `TouchableOpacity` inside the `periodToggle` view, after the "Yearly" option (after line ~270):

```tsx
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
```

- [ ] **Step 6: Fix the price subtext for lifetime**

Replace the price subtext (lines ~283–285) with:

```tsx
                <Text style={[styles.priceSubtext, { color: colors.textSecondary }]}>
                  {isLifetime ? 'one-time payment' : `per ${billingPeriod === 'monthly' ? 'month' : 'year'}`}
                </Text>
```

- [ ] **Step 7: Fix the button label and the trial note**

Replace the purchase button label (line ~301) so it reads:

```tsx
              <Text style={[styles.purchaseButtonText, { color: colors.white }]}>
                {isLifetime ? 'Buy Lifetime' : 'Start Free Trial'}
              </Text>
```

Wrap the trial note (lines ~305–307) so it is hidden for lifetime:

```tsx
          {!isLifetime && (
            <Text style={[styles.trialNote, { color: colors.textSecondary }]}>
              Cancel anytime during your {FREE_TRIAL_DAYS}-day free trial
            </Text>
          )}
```

- [ ] **Step 8: Fix the legal disclosure text for lifetime**

Replace the `subscriptionInfo` block (lines ~332–339) with a conditional:

```tsx
          {/* Subscription / Purchase Info */}
          {isLifetime ? (
            <Text style={[styles.subscriptionInfo, { color: colors.textSecondary }]}>
              {`The Nineteenth ${selectedProduct.name} Lifetime: ${selectedProduct.price} (one-time). `}
              Payment will be charged to your Apple ID account at the confirmation of purchase. This is a
              one-time, non-renewing purchase that grants permanent access — there is no subscription and
              nothing to cancel. If you reinstall the app, use "Restore Purchases" to regain access.
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
```

- [ ] **Step 9: Type-check and lint**

Run: `pnpm type-check && pnpm lint src/components/subscription/Paywall.tsx`
Expected: no new errors.

- [ ] **Step 10: Commit**

```bash
git add src/components/subscription/Paywall.tsx
git commit -m "feat(subscriptions): add lifetime option to paywall with one-time-purchase copy"
```

---

## Task 5: "Lifetime access" indicator on the Subscription screen

**Files:**
- Modify: `src/screens/subscription/useSubscriptionState.ts`
- Test: `src/screens/subscription/__tests__/useSubscriptionState.test.ts` (create)
- Modify: `src/screens/subscription/SubscriptionScreen.tsx`

- [ ] **Step 1: Write the failing test for the pure helper**

Create `src/screens/subscription/__tests__/useSubscriptionState.test.ts`:

```typescript
import { computeIsLifetime } from '../useSubscriptionState';

describe('computeIsLifetime', () => {
  it('is true for an active paid sub with no expiry', () => {
    expect(computeIsLifetime({ status: 'active', expiresAt: null }, 'premium')).toBe(true);
    expect(computeIsLifetime({ status: 'active', expiresAt: null }, 'social')).toBe(true);
  });

  it('is false for free tier even with no expiry', () => {
    expect(computeIsLifetime({ status: 'active', expiresAt: null }, 'free')).toBe(false);
  });

  it('is false when an expiry date exists (normal yearly sub)', () => {
    expect(computeIsLifetime({ status: 'active', expiresAt: new Date() }, 'premium')).toBe(false);
  });

  it('is false when not active', () => {
    expect(computeIsLifetime({ status: 'expired', expiresAt: null }, 'premium')).toBe(false);
  });

  it('is false when there is no subscription', () => {
    expect(computeIsLifetime(null, 'premium')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/screens/subscription/__tests__/useSubscriptionState.test.ts`
Expected: FAIL — `computeIsLifetime` is not exported.

- [ ] **Step 3: Add and export the helper**

In `src/screens/subscription/useSubscriptionState.ts`, add near the other helpers (after `getTrialDaysRemaining`, ~line 78):

```typescript
/**
 * A lifetime purchase is an active, paid subscription that never expires
 * (expires_at is NULL). Free tier also has no expiry, so it is excluded.
 */
export function computeIsLifetime(
  subscription: { status: string; expiresAt: Date | string | null } | null | undefined,
  tier: SubscriptionTier
): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  if (subscription.expiresAt != null) return false;
  return tier === 'social' || tier === 'premium' || tier === 'enterprise';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/screens/subscription/__tests__/useSubscriptionState.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Compute and expose `isLifetime` from the hook**

In `useSubscriptionState()`, after the `isOnTrial` line (~265), add:

```typescript
  const isLifetime = useMemo(
    () => computeIsLifetime(subscription, tier),
    [subscription, tier]
  );
```

Then add `isLifetime` to the hook's returned object, in the "Computed state" group (next to `isOnTrial`):

```typescript
    isOnTrial,
    isLifetime,
```

- [ ] **Step 6: Render the indicator on the screen**

In `src/screens/subscription/SubscriptionScreen.tsx`, add `isLifetime` to the destructured values from `useSubscriptionState()` (in the "Computed state" group near `isOnTrial`, ~line 80):

```typescript
    trialDaysRemaining,
    isOnTrial,
    isLifetime,
```

Then, in the tier badge section, render a lifetime chip when applicable. Replace the existing block (lines ~180–187) with:

```tsx
        {/* Tier Badge Section */}
        <View style={[styles.section, styles.tierBadgeSection]}>
          <TierBadge size="large" />
          {isLifetime && (
            <View style={styles.trialBadgeContainer}>
              <View style={[styles.lifetimeChip, { backgroundColor: colors.surfaceVariant }]}>
                <Icon source="infinity" size={16} color={colors.textPrimary} />
                <Text style={[styles.lifetimeChipText, { color: colors.textPrimary }]}>
                  Lifetime access
                </Text>
              </View>
            </View>
          )}
          {isOnTrial && trialDaysRemaining !== null && (
            <View style={styles.trialBadgeContainer}>
              <TrialBadge daysRemaining={trialDaysRemaining} />
            </View>
          )}
        </View>
```

Add the two styles to the `StyleSheet.create` block at the bottom of the file (after `trialBadgeContainer`, ~line 300):

```typescript
  lifetimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  lifetimeChipText: {
    ...typography.small,
    fontWeight: '600',
  },
```

- [ ] **Step 7: Type-check, lint, run the focused tests**

Run: `pnpm type-check && pnpm jest src/screens/subscription/__tests__/useSubscriptionState.test.ts`
Expected: no type errors; tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/screens/subscription/useSubscriptionState.ts \
  src/screens/subscription/__tests__/useSubscriptionState.test.ts \
  src/screens/subscription/SubscriptionScreen.tsx
git commit -m "feat(subscriptions): show 'Lifetime access' indicator on subscription screen"
```

---

## Task 6: Manual store + RevenueCat configuration and end-to-end sandbox test

No code. This task gates the feature working in a real build. Do it after Tasks 1–5 are merged into a build.

- [ ] **Step 1: Create non-consumable products in App Store Connect**

Create two **Non-Consumable** in-app purchases (NOT auto-renewing subscriptions):
- `the.nineteenth.social.lifetime` — price tier nearest **$119.99 AUD**
- `the.nineteenth.premium.lifetime` — price tier nearest **$249.99 AUD**

- [ ] **Step 2: Create one-time products in Google Play Console**

Under In-app products (one-time, INAPP — not Subscriptions), create the same two IDs at the equivalent AUD prices.

- [ ] **Step 3: Configure RevenueCat**

- Add both products to RevenueCat.
- Attach `the.nineteenth.social.lifetime` → `social_access` entitlement; `the.nineteenth.premium.lifetime` → `premium_access` entitlement.
- Add both products as packages in the current Offering so `getOfferings()` returns them with live store prices.

- [ ] **Step 4: Sandbox purchase test (iOS, then Android)**

In a TestFlight / internal build (NOT Expo Go — purchases are disabled there):
1. Open the paywall, select a tier, tap **Lifetime**, confirm the price shows and there is no trial copy.
2. Complete the sandbox purchase.
3. Verify the app shows the upgraded tier and the Subscription screen shows the **"Lifetime access"** chip.
4. In Supabase, confirm `user_subscriptions` for that user has `status='active'`, `expires_at=NULL`, correct `tier` and `product_id`.

- [ ] **Step 5: Restore test**

Delete and reinstall the app, sign in, open the paywall, tap **Restore Purchases**. Expected: the lifetime tier is restored.

- [ ] **Step 6: Regression check on existing subscriptions**

Purchase (sandbox) a monthly or yearly sub and confirm it still shows the trial badge, "Start Free Trial" button, and renewal copy — i.e. the lifetime branch did not break the subscription path.

---

## Task 7: Full verification sweep

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass (including the two new test files).

- [ ] **Step 2: Type-check and lint the whole project**

Run: `pnpm type-check && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Final review**

Confirm every spec section maps to a completed task:
- Pricing → Task 1 (fallbacks) + Task 6 (store).
- No DB migration → confirmed (none in this plan).
- Product constants → Task 1.
- Webhook `NON_RENEWING_PURCHASE` + refund → Task 2.
- Sync function verify → Task 3.
- Paywall UI → Task 4.
- Subscription screen display → Task 5.
- Restore → Task 6 Step 5.
- Store/RevenueCat config → Task 6.
```

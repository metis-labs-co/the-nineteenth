# Lifetime Subscriptions — Design Spec

**Date:** 2026-06-01
**Author:** Sam (with Claude)
**Status:** Draft — pending review

## Goal

Offer a one-time **lifetime purchase** for both the **Social** and **Premium** tiers, alongside the existing monthly/yearly auto-renewing subscriptions. A lifetime purchase grants the tier's features permanently with no recurring billing.

## Pricing (decided)

| Tier | Annual (existing) | Lifetime (new) | Multiple |
|---|---|---|---|
| Social | $39.99 AUD | **$119.99 AUD** | 3.0× |
| Premium | $84.99 AUD | **$249.99 AUD** | 2.9× |

Rationale: ~3× the annual price sets a clean "pay for 3 years, own it forever" breakeven, keeps yearly as the default choice, and both land on standard App Store price tiers. Lifetime buyers self-select as the most loyal users, so pricing near enthusiast lifetime-value protects against under-charging the customers who would otherwise renew for years.

After Apple's commission (30%, or 15% under the Small Business Program), net is roughly $84 / $175 per sale.

**Open business question (not blocking implementation):** whether lifetime is a permanent offering or a limited launch promotion. This affects store/marketing config only, not the code. Default assumption: permanent offering for both tiers.

## Key insight — the data model already supports this

A lifetime entitlement is simply a `user_subscriptions` row with `status = 'active'` and `expires_at = NULL`. The server-side `get_user_subscription_tier()` function already treats `NULL` expiry as "never expires." **No database migration is required.**

The store-level difference is the product *type*:

| Existing subs | Lifetime |
|---|---|
| Auto-renewing subscription | **Non-consumable** one-time purchase |
| RevenueCat fires `INITIAL_PURCHASE` / `RENEWAL` / `EXPIRATION` | Fires **`NON_RENEWING_PURCHASE`** once; never expires |
| Apple commission drops to 15% after 1 year | Stays at 30% (15% only via Small Business Program) |

## Architecture & scope

The work spans store config (manual), RevenueCat config (manual), two edge functions, product constants, and the paywall/subscription UI. The DB is untouched.

### 1. Store configuration (manual, no code)

Create two **non-consumable** in-app purchases (NOT auto-renewing subscriptions):
- `the.nineteenth.social.lifetime` — $119.99 AUD
- `the.nineteenth.premium.lifetime` — $249.99 AUD

In both App Store Connect and Google Play Console (Google: a one-time product / INAPP, not a subscription).

### 2. RevenueCat configuration (manual, no code)

- Add both products to RevenueCat.
- Attach `the.nineteenth.social.lifetime` → `social_access` entitlement; `the.nineteenth.premium.lifetime` → `premium_access` entitlement. RevenueCat grants non-subscription entitlements as lifetime (no expiry) automatically.
- Add both products as packages in the current Offering (or a dedicated lifetime package) so `getOfferings()` surfaces them in the app with live store prices.

### 3. Product constants — `src/constants/products.ts`

Add the two product IDs to `IOS_PRODUCT_IDS`, `ANDROID_PRODUCT_IDS`, and `PRODUCT_IDS`:
- `SOCIAL_LIFETIME: \`${BUNDLE_ID}.social.lifetime\``
- `PREMIUM_LIFETIME: \`${BUNDLE_ID}.premium.lifetime\``

Then:
- Add both to `PRODUCT_ID_TO_TIER` (`social` / `premium`).
- Add both to `TIER_TO_PRODUCT_IDS` arrays.
- Extend `BillingPeriod` to `'monthly' | 'yearly' | 'lifetime'` and update `getBillingPeriod()` to return `'lifetime'` for IDs ending in `.lifetime`.
- Add `DEFAULT_PRICING_AUD` entries for both lifetime products (fallback display prices `$119.99` / `$249.99`, no `savings`/`isPromotional`).

### 4. Webhook — `supabase/functions/revenuecat-webhook/index.ts`

**Primary fix.** `NON_RENEWING_PURCHASE` is currently a no-op acknowledgment (lines ~358–366). Implement a `handleNonRenewingPurchase` handler that upserts:
- `tier` = `mapProductToTier(event.product_id)`
- `status` = `'active'`
- `expires_at` = `NULL` (lifetime — never expires)
- `external_id` = `event.original_transaction_id`
- `product_id` = `event.product_id`
- trial fields = `null`

Wire it into the `switch` so `NON_RENEWING_PURCHASE` calls it (remove it from the shared "acknowledged" fall-through group; keep `SUBSCRIBER_ALIAS` / `TRANSFER` there).

Add explicit entries to the webhook's local `PRODUCT_ID_TO_TIER` map for the two lifetime IDs (the `includes('premium')`/`includes('social')` fallback would catch them, but explicit is clearer and safer).

**Refund handling (important edge case).** Apple/Google refunds of a non-consumable arrive as a `CANCELLATION` event. The current `handleCancellation` keeps the tier and sets `expires_at` from `expiration_at_ms` — which is `null` for a lifetime product, leaving the user with permanent access after a refund. Fix: when the cancelled product is a lifetime product (ID ends in `.lifetime`, or `expiration_at_ms` is null with a non-renewing period), downgrade to `tier='free'`, `status='expired'`. Verify the exact event shape against RevenueCat's refund payload during implementation.

### 5. Sync edge function — `supabase/functions/sync-subscription-from-revenuecat/index.ts`

**Likely no change needed — verify only.** The function resolves the highest active entitlement from `subscriber.entitlements`. A lifetime entitlement returns `expires_date: null`, which the code treats as `Infinity > now` = active and writes `expires_at = null` (lines ~185–192). The cancellation-hint lookup against `subscriptions[productId]` simply finds nothing for a non-subscription (it would live under `non_subscriptions`), so `status` stays `'active'`. Confirm this behaviour with a sandbox lifetime purchase; no code change expected.

### 6. Paywall UI — `src/components/subscription/Paywall.tsx`

Largest UI change. The component currently hardcodes a Monthly/Yearly toggle and subscription-only copy.

- Add **Lifetime** as a third billing-period option (extend the local `BillingPeriod` type and the toggle row).
- Extend `selectedProduct` resolution (lines ~117–140) to map `(tier, 'lifetime')` → the `*_LIFETIME` product IDs.
- When `lifetime` is selected, conditionally change the subscription-specific UI:
  - Hide the "7-day free trial" badge.
  - Button label: **"Buy Lifetime"** instead of "Start Free Trial".
  - Price subtext: "one-time payment" instead of "per month/year".
  - Replace the auto-renewal legal/disclosure paragraph with one-time purchase language (non-consumable, no renewal, restore on reinstall).
- The existing purchase flow (`subscriptionService.purchaseProduct(id)` → invalidate query → `onPurchaseSuccess`) works unchanged for non-consumables.

### 7. Subscription management UI — `src/screens/subscription/SubscriptionScreen.tsx`

Handle display of a lifetime subscription: show "Lifetime access" with no renews-on / expires-on date (a lifetime row has `expires_at = NULL`). Read the file during implementation to find the exact date-rendering branch to guard.

### 8. Restore purchases

Already implemented in the Paywall and required by Apple for non-consumables. No change, but it must be tested for the lifetime case (reinstall → restore grants the lifetime entitlement again).

## Out of scope

- Enterprise lifetime (only Social and Premium requested).
- Any database schema change (none needed).
- Migrating the webhook's stale local `SubscriptionTier` type (`'free' | 'social' | 'premium' | 'super_admin'`, missing `enterprise`/`developer`) — pre-existing and unrelated; note but don't fix here unless it blocks the lifetime mapping (it doesn't, since lifetime is social/premium).

## Testing strategy

- **Sandbox purchase (iOS + Android):** buy each lifetime product → verify `user_subscriptions` row has correct tier, `status='active'`, `expires_at=NULL`, and the app reflects the tier.
- **Webhook:** confirm `NON_RENEWING_PURCHASE` writes the row; confirm a refund/`CANCELLATION` on a lifetime product downgrades to free.
- **Eager sync:** confirm the post-purchase `sync-subscription-from-revenuecat` call resolves the lifetime tier without a code change.
- **Restore:** delete + reinstall app → Restore Purchases → lifetime tier returns.
- **Paywall UI:** lifetime option shows correct price, no trial badge, one-time-purchase copy and button.
- **Existing subs unaffected:** monthly/yearly purchase, renewal, and expiry still behave as before.

## Deployment notes

- Edge functions deploy with the existing commands (`supabase functions deploy revenuecat-webhook` / `sync-subscription-from-revenuecat`). Mind the dev (`uoqofjwtdgdzhpwfzklo`) vs prod (`bvnxfhuvocxyilhlenka`) project split — deploy to the correct ref and watch for body drift.
- Store products must be **Approved** in App Store Connect / Play Console before they appear in production offerings.
- No migration to apply.

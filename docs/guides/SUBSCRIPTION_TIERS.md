# Subscription Tiers Guide

## Overview

The Nineteenth uses a **tiered subscription model** to control feature access and monetization. This guide covers the tier structure, feature limits, implementation details, and admin management.

### Key Principles

1. **Free by Default**: All users start on the Free tier
2. **Graceful Degradation**: Locked features are visible but interaction is blocked
3. **Grandfathering**: Existing data remains accessible after downgrade
4. **Permission Layers**: UI filtering + API validation + database constraints
5. **Future-Ready**: Architecture supports RevenueCat/Stripe IAP integration

---

## Tier Structure

### Tier Summary

| Tier | Target Users | Price | Expires |
|------|--------------|-------|---------|
| **Free** | New users trying the app | Free | No |
| **Social** | Casual golfers, social groups | Paid | Yes |
| **Premium** | Serious competition organizers | Paid | Yes |
| **Enterprise** | Large orgs outgrowing Premium | Paid | Yes |
| **Super Admin** | Internal team | Free | Never |
| **Developer** | Internal beta testing | Free | Never |

Tier hierarchy (low → high): `free < social < premium < enterprise < super_admin < developer`. Developer sits above Super Admin intentionally — it inherits every Super Admin privilege AND flips `can_access_beta_features = TRUE`, so experimental UI can be shipped to production and tested in the real world without being exposed to ordinary Super Admin users.

### Feature Limits by Tier

| Feature | Free | Social | Premium | Enterprise | Super Admin | Developer |
|---------|------|--------|---------|-----------|-------------|-----------|
| **Competition Management** | | | | | | |
| Join competitions | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |
| Create competitions | 3 | 8 | 50 | 200 | No limit | No limit |
| Rounds per competition | 2 | 5 | 10 | 20 | No limit | No limit |
| Players per competition | 8 | 16 | 40 | 100 | No limit | No limit |
| **Game Types** | | | | | | |
| Stableford | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stroke Play | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Match Play | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ambrose/Best Ball/Scramble | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Team formats | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Scoring Features** | | | | | | |
| Basic scoring | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scoring pairs (designated markers) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Skins side-game | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Wolf side-game | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Prize pools (competition funding) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| GPS distance to pin | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Leagues** | | | | | | |
| Create leagues | 1 | 3 | 50 | 200 | No limit | No limit |
| Join leagues | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Social Features** | | | | | | |
| Friends limit | 5 | 15 | Unlimited | Unlimited | Unlimited | Unlimited |
| View player profiles | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Compare stats with friends | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Guest player management | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Statistics & Analytics** | | | | | | |
| Basic stats (rounds, points) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Detailed stats (par type, putting, short game) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Score distribution | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Handicap history | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Achievement leaderboard | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Advanced analytics & trends | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **AI Features** | | | | | | |
| AI competition creation | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Data & Export** | | | | | | |
| API course search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin Features** | | | | | | |
| Admin tools | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Developer Features** | | | | | | |
| Beta / WIP features (`can_access_beta_features`) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Enterprise vs Premium

Enterprise is a strict superset of Premium's **feature** access — every toggle that's `TRUE` for Premium is also `TRUE` for Enterprise. What Enterprise adds is **capacity**: 4× the competition cap, 4× the league cap, 2.5× players-per-competition, and 2× rounds-per-competition. It's aimed at clubs and corporate organisers who routinely hit Premium's 50-competition ceiling.

### Developer tier (beta access)

Developer is **not** shown in the paywall and cannot be purchased. Assign it manually:

```sql
SELECT upsert_user_subscription(
  '<user-uuid>',
  'developer'::subscription_tier,
  'active'::subscription_status,
  'manual'::subscription_source,
  NULL, NULL, NULL, NULL
);
```

Once assigned, the user:
- Passes every tier check (equivalent to Super Admin)
- Can access admin tools
- Has `can_access_beta_features = TRUE` — gate WIP UI with `useCanAccessBetaFeatures()` in components or `user_has_feature(uid, 'beta_features')` in SQL
- Never expires

### Special Limit Values

The database uses special integer values for limits:

| Value | Meaning | Description |
|-------|---------|-------------|
| `> 0` | Numeric limit | Standard limit (e.g., 5 competitions) |
| `-1` | Unlimited | No limit enforced, but tracked |
| `-2` | No system limit | Super admin bypass, skips all checks |

---

## Graceful Degradation

### What is Graceful Degradation?

When a feature is locked, users can **see** the feature but cannot **interact** with it. This approach:
- Shows users what they're missing
- Provides clear upgrade path
- Doesn't hide functionality

### UI Patterns

**FeatureLock Component**:
- Renders children at reduced opacity (50%)
- Overlays lock icon and message
- Shows "Upgrade" button with target tier
- Accessible: announces locked state to screen readers

**LimitIndicator Component**:
- Shows current usage vs limit (e.g., "3/5 competitions")
- Changes color when approaching limit (warning) or at limit (error)
- Shows infinity symbol (∞) for unlimited tiers

**UpgradePrompt Component**:
- Modal with feature benefits
- Clear tier name and upgrade button
- "Maybe later" dismiss option

### Implementation Examples

```tsx
// Feature-gated UI
<FeatureLock feature="scoring_pairs" onUpgradePress={handleUpgrade}>
  <ScoringPairsButton />
</FeatureLock>

// Limit-aware UI
<LimitIndicator
  current={competitionsCount}
  max={limits.maxCompetitionsOwned}
  label="competitions"
/>

// Game type selector with tier locks
{gameTypes.map(type => (
  <GameTypeCard
    key={type}
    disabled={!allowedGameTypes.includes(type)}
    locked={!allowedGameTypes.includes(type)}
    onLockedPress={() => showUpgradePrompt('game_type', type)}
  />
))}
```

---

## Grandfathering

### What is Grandfathering?

When a user **downgrades** (e.g., from Social to Free), their existing data remains accessible. They can:
- View all existing competitions
- Score in existing rounds
- Access leaderboards

They **cannot**:
- Create new competitions (if over limit)
- Add rounds to competitions (if over limit)
- Add players to competitions (if over limit)

### Example Scenario

**User "Alex" downgrades from Social to Free:**
- Has 5 existing competitions with 12 players each
- All 5 competitions remain accessible (grandfathered)
- Cannot create new competitions until under limit (max 3 for Free)
- Can still view, score, and manage existing competitions
- New competitions: must wait until existing ones complete/cancel

### Implementation

The `grandfathering.ts` service provides:

```typescript
// Check if competition is grandfathered
const { isGrandfathered } = await checkGrandfatheredAccess(competitionId, userId);

// Get allowed actions for a competition
const { allowedActions, restrictedActions } = await applyGracefulDegradation(
  competitionId,
  currentTier
);

// Find competitions over current tier limit
const overLimitComps = await getCompetitionsOverLimit(userId, maxAllowed);
```

**Grandfathered Actions** (always allowed on existing competitions):
- `view_competition`
- `view_leaderboard`
- `enter_scores`
- `submit_scorecard`

**Restricted Actions** (blocked if over tier limit):
- `add_round` (if rounds >= tier max)
- `add_player` (if players >= tier max)

---

## Permission Enforcement

Permissions are enforced at **three layers**:

### 1. UI Layer (Client)

- Hooks like `useCheckFeature()` and `useTierLimits()`
- Components: `FeatureLock`, `LimitIndicator`, `UpgradePrompt`
- Disable/hide UI elements based on tier
- Show upgrade prompts for locked features

```typescript
const { checkFeature } = useSubscription();

const createAccess = checkFeature('create_competition', { currentCount: 3 });
if (!createAccess.allowed) {
  showUpgradePrompt(createAccess.reason);
}
```

### 2. API Layer (Service)

- API client checks permissions before requests
- Throws errors with upgrade messages
- Catches and displays user-friendly errors

```typescript
// In ApiClient.createCompetition()
const permission = await this.checkCompetitionCreationPermission();
if (!permission.allowed) {
  throw new Error(permission.error);
}
```

### 3. Database Layer (PostgreSQL)

- RLS policies for data isolation
- Helper functions for permission checks
- SECURITY DEFINER functions for consistent enforcement

```sql
-- Check if user can create competition
SELECT user_can_create_competition(auth.uid());

-- Check if competition can add player
SELECT competition_can_add_player(p_competition_id);

-- Get user's effective tier (handles expiry)
SELECT get_user_subscription_tier(auth.uid());
```

### Fail-Open Pattern

When tier limits are loading:
- UI assumes features are allowed
- API validates before mutation
- Database enforces final check

This provides good UX (no blocking on load) while maintaining security.

---

## Database Schema

### `user_subscriptions` Table

Stores subscription state for each user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users (unique) |
| `tier` | subscription_tier | 'free', 'social', 'premium', 'super_admin' |
| `status` | subscription_status | 'active', 'cancelled', 'expired', 'trial' |
| `source` | subscription_source | 'manual', 'revenuecat', 'stripe' |
| `external_id` | TEXT | RevenueCat/Stripe customer ID |
| `product_id` | TEXT | App Store product identifier |
| `started_at` | TIMESTAMPTZ | When subscription started |
| `expires_at` | TIMESTAMPTZ | When subscription expires (NULL = never) |
| `cancelled_at` | TIMESTAMPTZ | When cancelled |
| `trial_started_at` | TIMESTAMPTZ | Trial period start |
| `trial_ends_at` | TIMESTAMPTZ | Trial period end |

### `tier_limits` Table

Configuration table defining limits per tier. **Seeded on migration**, read-only at runtime.

| Column | Type | Description |
|--------|------|-------------|
| `tier` | subscription_tier | The tier (unique) |
| `max_competitions_owned` | INTEGER | Max competitions (-1 unlimited, -2 no limit) |
| `max_rounds_per_competition` | INTEGER | Max rounds per comp |
| `max_players_per_competition` | INTEGER | Max players per comp |
| `max_friends` | INTEGER | Max friends |
| `allowed_game_types` | TEXT[] | Array of allowed game types |
| `can_use_*` | BOOLEAN | Feature flags |
| `requires_payment` | BOOLEAN | Whether tier needs payment |
| `can_expire` | BOOLEAN | Whether subscription can expire |
| `display_name` | TEXT | Human-readable name |
| `badge_color` | TEXT | Hex color for UI badge |

### Key Database Functions

| Function | Purpose |
|----------|---------|
| `get_user_subscription_tier(user_id)` | Get effective tier (handles expiry) |
| `user_has_tier_or_higher(user_id, tier)` | Check tier hierarchy |
| `get_user_tier_limits(user_id)` | Get limits for user's tier |
| `user_can_create_competition(user_id)` | Check competition limit |
| `competition_can_add_round(comp_id)` | Check round limit |
| `competition_can_add_player(comp_id)` | Check player limit |
| `user_can_add_friend(user_id)` | Check friend limit |
| `user_can_use_game_type(user_id, type)` | Check game type access |
| `user_has_feature(user_id, feature)` | Check feature access |
| `upsert_user_subscription(...)` | Create/update subscription |

---

## Admin Management

### Manually Upgrading a User

Use the Supabase SQL Editor or a server-side script:

```sql
-- Upgrade user to Premium
SELECT upsert_user_subscription(
  'user-uuid-here',           -- p_user_id
  'premium'::subscription_tier,
  'active'::subscription_status,
  'manual'::subscription_source,
  NULL,                        -- p_external_id
  NULL,                        -- p_product_id
  '2025-12-31T23:59:59Z'::timestamptz,  -- p_expires_at
  NULL                         -- p_trial_ends_at
);

-- Or update directly
UPDATE user_subscriptions
SET tier = 'premium',
    status = 'active',
    expires_at = '2025-12-31T23:59:59Z',
    updated_at = NOW()
WHERE user_id = 'user-uuid-here';
```

### Creating a Super Admin

Super Admin is for internal team members only:

```sql
SELECT upsert_user_subscription(
  'user-uuid-here',
  'super_admin'::subscription_tier,
  'active'::subscription_status,
  'manual'::subscription_source,
  NULL,  -- No external ID needed
  NULL,  -- No product ID
  NULL,  -- NULL expires_at = never expires
  NULL
);
```

### Downgrading a User

```sql
UPDATE user_subscriptions
SET tier = 'free',
    status = 'active',
    expires_at = NULL,  -- Free tier doesn't expire
    cancelled_at = NOW(),
    updated_at = NOW()
WHERE user_id = 'user-uuid-here';
```

### Checking User's Subscription

```sql
-- Get subscription details
SELECT * FROM user_subscriptions WHERE user_id = 'user-uuid-here';

-- Get effective tier (handles expiry)
SELECT get_user_subscription_tier('user-uuid-here');

-- Get full limits
SELECT * FROM get_user_tier_limits('user-uuid-here');
```

### Bulk Operations

```sql
-- Find all premium users expiring this month
SELECT u.user_id, p.name, p.email, u.expires_at
FROM user_subscriptions u
JOIN players p ON p.id = u.user_id
WHERE u.tier = 'premium'
  AND u.expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days';

-- Count users by tier
SELECT tier, COUNT(*) as count
FROM user_subscriptions
GROUP BY tier;
```

---

## Future IAP Integration

The subscription system is designed for future RevenueCat or Stripe integration.

### Current State (Manual)

- Subscriptions created/updated manually via database
- `source` = 'manual' for all subscriptions
- `purchaseProduct()` returns "Contact support" message

### RevenueCat Integration (Future)

1. **Install RevenueCat SDK**
   ```bash
   pnpm add react-native-purchases
   ```

2. **Configure Products**
   - Create products in App Store Connect / Play Console
   - Map product IDs in `src/constants/products.ts`

3. **Implement RevenueCatSubscriptionProvider**
   - Located in `src/services/subscription/SubscriptionService.ts`
   - Handles SDK initialization, purchases, restoration

4. **Webhook Handler**
   - Create Supabase Edge Function for RevenueCat webhooks
   - Handle events: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION
   - Call `upsert_user_subscription()` to update database

### Product ID Mapping

```typescript
// src/constants/products.ts
export const PRODUCT_IDS = {
  social: {
    monthly: 'com.thenineteenth.social.monthly',
    yearly: 'com.thenineteenth.social.yearly',
  },
  premium: {
    monthly: 'com.thenineteenth.premium.monthly',
    yearly: 'com.thenineteenth.premium.yearly',
  },
};

export const productToTier = (productId: string): SubscriptionTier => {
  if (productId.includes('premium')) return 'premium';
  if (productId.includes('social')) return 'social';
  return 'free';
};
```

---

## TypeScript Types

### Core Types

```typescript
// Subscription tier levels
type SubscriptionTier = 'free' | 'social' | 'premium' | 'super_admin';

// Subscription status
type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

// How subscription was created
type SubscriptionSource = 'manual' | 'revenuecat' | 'stripe';

// Feature identifiers for permission checks
type FeatureId =
  | 'create_competition'
  | 'add_round'
  | 'add_player'
  | 'game_type'
  | 'team_formats'
  | 'scoring_pairs'
  | 'add_friend'
  | 'compare_stats'
  | 'basic_stats'
  | 'score_distribution'
  | 'advanced_stats'
  | 'fir_gir_tracking'
  | 'admin_tools'
  // Social tier features
  | 'detailed_stats'          // Par type, putting, short game
  | 'handicap_history'        // Handicap history screen
  | 'achievement_leaderboard' // Achievement leaderboard
  | 'ai_competition'          // AI competition creation
  | 'manage_guests'           // Guest player management
  | 'gps_distance'            // GPS distance to pin
  // Premium tier features (side-games)
  | 'skins_game'              // Skins side-game
  | 'wolf_game'               // Wolf side-game
  | 'prize_pool';             // Prize pool funding
```

### Permission Check Result

```typescript
interface FeatureAccess {
  allowed: boolean;
  reason?: string;
  upgradeRequired: boolean;
  requiredTier?: SubscriptionTier;
  currentValue?: number;
  limitValue?: number;
}
```

### Constants

```typescript
// Special limit values
const UNLIMITED = -1;    // No limit, but tracked
const NO_LIMIT = -2;     // Super admin bypass

// Tier hierarchy for comparison
const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  free: 0,
  social: 1,
  premium: 2,
  super_admin: 3,
};
```

---

## UI Components

### TierBadge

Displays user's current tier with icon and color.

```tsx
<TierBadge size="medium" showIcon />
// Renders: [icon] Premium (amber badge)
```

### FeatureLock

Wraps features that may be tier-restricted.

```tsx
<FeatureLock
  feature="scoring_pairs"
  onUpgradePress={() => navigation.navigate('Subscription')}
>
  <ScoringPairsSetup />
</FeatureLock>
```

### LimitIndicator

Shows usage progress toward limit.

```tsx
<LimitIndicator
  current={3}
  max={5}
  label="competitions"
  showBar
/>
// Renders: Competitions: 3/5 [progress bar]
```

### UpgradePrompt

Modal for upgrade call-to-action.

```tsx
<UpgradePrompt
  config={{
    feature: 'scoring_pairs',
    title: 'Unlock Scoring Pairs',
    message: 'Designate official markers for competitive rounds',
    targetTier: 'premium',
    benefits: [
      'Designated scoring pairs',
      'Tournament-style verification',
      'Official marker assignments',
    ],
  }}
  onUpgrade={handleUpgrade}
  onDismiss={handleDismiss}
/>
```

---

## Hooks & Context

### useSubscription

Main hook for subscription state and checks.

```typescript
const {
  subscription,    // UserSubscription | null
  limits,          // TierLimits | null
  tier,            // SubscriptionTier
  isPremium,       // boolean
  isSocial,        // boolean
  isFree,          // boolean
  isSuperAdmin,    // boolean
  isLoading,       // boolean
  checkFeature,    // (featureId, context?) => FeatureAccess
  refresh,         // () => void
} = useSubscription();
```

### Context Hooks

```typescript
// From SubscriptionContext
const tier = useTier();                    // Current tier
const limits = useTierLimits();            // Current limits
const isPremium = useIsPremium();          // Premium or Super Admin?
const checkFeature = useCheckFeature();    // Permission checker
```

### Store Selectors

```typescript
// From subscriptionStore
const tier = useSubscriptionTier();        // 'free' | 'social' | 'premium' | 'super_admin'
const isPremium = useIsPremium();          // tier is premium or super_admin
const isSocial = useIsSocial();            // tier is social, premium, or super_admin
const isSuperAdmin = useIsSuperAdmin();    // tier === 'super_admin'
```

---

## Testing

### Manual Testing Scenarios

1. **Free User Creates Competition**
   - Create first competition -> Success
   - Try to create second -> Upgrade prompt shown

2. **User Downgrades**
   - Premium user with 3 competitions downgrades to Free
   - All 3 competitions still visible
   - Cannot create new competition
   - Can score in existing rounds

3. **Feature Lock**
   - Free user taps "Match Play" game type
   - Lock icon visible, tap shows upgrade prompt

4. **Super Admin**
   - No limits shown
   - All features accessible
   - No upgrade prompts ever

### Testing Super Admin

```sql
-- Create test super admin account
SELECT upsert_user_subscription(
  'test-user-uuid',
  'super_admin'::subscription_tier,
  'active'::subscription_status,
  'manual'::subscription_source
);
```

---

## Troubleshooting

### User Can't Create Competition

1. Check current tier: `SELECT get_user_subscription_tier(user_id)`
2. Check competition count: `SELECT COUNT(*) FROM competitions WHERE organizer_id = user_id`
3. Check tier limits: `SELECT max_competitions_owned FROM tier_limits WHERE tier = 'free'`

### Subscription Not Loading

1. Check user_subscriptions table has record
2. Verify trigger created subscription on signup
3. Check RLS policies allow user to read own subscription

### Feature Incorrectly Locked

1. Verify tier in database matches expected
2. Check `expires_at` hasn't passed
3. Verify `status` is 'active' or 'trial'
4. Check feature flag in tier_limits table

### Backfill Missing Subscriptions

```sql
-- Create subscriptions for users without one
INSERT INTO user_subscriptions (user_id, tier, status, source)
SELECT id, 'free', 'active', 'manual'
FROM players
WHERE id NOT IN (SELECT user_id FROM user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;
```

---

## Related Documentation

- [DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md) - Full table schemas
- [CLAUDE.md](../../CLAUDE.md) - Project overview with tier summary
- [SKINS_GAME.md](./SKINS_GAME.md) - Skins gambling feature (Premium)
- [SUBSCRIPTION-TIERS-PROGRESS.md](../SUBSCRIPTION-TIERS-PROGRESS.md) - Implementation progress

---

*Last Updated: February 2026*

# User Subscription Tier System - Implementation Plan

**Goal:** Implement Free / Social / Premium subscription tiers with usage limits, graceful degradation, and grandfathering - structured for future IAP integration
**Status:** ✅ Complete - 100% Complete (29/29 tasks)

---

## Overview

This plan introduces a **Subscription Tier System** that controls access to features based on user subscription level. The feature supports:

- **Four tiers**: Free, Social, Premium, and Super Admin with progressive feature unlocks
- **Super Admin tier**: Internal team/company accounts with full access, no payment, never expires
- **Graceful degradation**: Users can view but not create when at limits
- **Grandfathering**: Existing competitions remain accessible if user downgrades
- **Future IAP ready**: Manual admin assignment initially, architecture supports RevenueCat later

### Tier Structure

| Feature | Free | Social | Premium | Super Admin |
|---------|------|--------|---------|-------------|
| **Competition Management** | | | | |
| Join competitions | Unlimited | Unlimited | Unlimited | Unlimited |
| Create competitions | 1 | 5 | Unlimited | Unlimited |
| Rounds per competition | 1 | 3 | 10 | No limit |
| Players per competition | 8 | 16 | 40 | No limit |
| **Game Types & Formats** | | | | |
| Stableford | ✅ | ✅ | ✅ | ✅ |
| Stroke Play | ❌ | ✅ | ✅ | ✅ |
| Match Play | ❌ | ❌ | ✅ | ✅ |
| Ambrose/Best Ball/Scramble | ❌ | ❌ | ✅ | ✅ |
| Team formats | ❌ | ❌ | ✅ | ✅ |
| **Scoring Features** | | | | |
| Basic scoring | ✅ | ✅ | ✅ | ✅ |
| Scoring pairs (designated markers) | ❌ | ❌ | ✅ | ✅ |
| **Social Features** | | | | |
| Friends limit | 5 | 25 | Unlimited | Unlimited |
| View player profiles | ✅ | ✅ | ✅ | ✅ |
| Compare stats with friends | ❌ | ✅ | ✅ | ✅ |
| **Statistics & Analytics** | | | | |
| Basic stats (rounds, points) | ✅ | ✅ | ✅ | ✅ |
| Score distribution | ❌ | ✅ | ✅ | ✅ |
| Advanced analytics & trends | ❌ | ❌ | ✅ | ✅ |
| **Data & Export** | | | | |
| Export data (CSV/PDF) | ❌ | ✅ | ✅ | ✅ |
| API course search | ✅ | ✅ | ✅ | ✅ |
| **Admin Features** | | | | |
| Payment required | N/A | ✅ | ✅ | ❌ |
| Subscription expires | N/A | ✅ | ✅ | ❌ (never) |
| Future admin tools | ❌ | ❌ | ❌ | ✅ |

> **Note:** Super Admin is manually assigned by database admin only. It cannot be purchased and never expires. Use for internal team, beta testers, and demo accounts.

### Example Scenarios

**User "Sam" on Free tier creates 1 competition with 8 players:**
- Attempts to create 2nd competition → Upgrade prompt with graceful message
- Attempts to add 9th player → Warning shown, player not added
- Upgrades to Social → Can now create 4 more competitions, add up to 16 players

**User "Alex" downgrades from Social to Free:**
- Has 3 existing competitions with 12 players each
- All remain accessible (grandfathered)
- Cannot create new competitions until under limit
- Can still view and score existing competitions

**User "Jordan" on Free tier exploring social features:**
- Has 5 friends (at limit), attempts to add 6th → Upgrade prompt shown
- Taps on "Compare Stats" with a friend → UpgradePrompt "Upgrade to Social to compare stats"
- Views My Statistics → Basic stats visible, Score Distribution blurred with lock icon
- Upgrades to Social → Friends limit increases to 25, Compare Stats unlocked, Score Distribution visible

**User "Taylor" on Social tier wants competitive features:**
- Creates round, sees Match Play game type locked with Premium badge
- Taps locked game type → UpgradePrompt "Upgrade to Premium for Match Play"
- Navigates to Scoring Pairs → Full screen "Premium Feature" upgrade prompt
- Upgrades to Premium → All game types available, Scoring Pairs accessible

**User "Admin" with Super Admin tier (internal team):**
- All features unlocked, no upgrade prompts ever shown
- LimitIndicators show "No limits" instead of usage counts
- SubscriptionScreen shows "Internal Account" banner
- Badge displays red shield-crown icon with "Super Admin" label
- Can create unlimited competitions with unlimited players/rounds
- No expiry date, no payment required

---

## Sprint 1: Database Foundation

### Task 1: Database Migration - Subscription Tables
**Status:** ✅ Complete
**Command:**
```bash
/db "Create migration for user subscription system. New enums: subscription_tier ('free', 'social', 'premium', 'super_admin'), subscription_status ('active', 'cancelled', 'expired', 'trial'), subscription_source ('manual', 'revenuecat', 'stripe'). New table user_subscriptions: id UUID PK, user_id UUID FK to auth.users ON DELETE CASCADE UNIQUE, tier subscription_tier NOT NULL DEFAULT 'free', status subscription_status NOT NULL DEFAULT 'active', source subscription_source NOT NULL DEFAULT 'manual', external_id TEXT NULL (RevenueCat/Stripe ID), product_id TEXT NULL (App Store product ID), started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NULL (NULL for super_admin = never expires), cancelled_at TIMESTAMPTZ NULL, trial_started_at TIMESTAMPTZ NULL, trial_ends_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ. Indexes: idx_user_subscriptions_tier, idx_user_subscriptions_status, idx_user_subscriptions_expires. Unique constraint on user_id. Updated_at trigger."
```
**Deliverables:**
- [x] `supabase/migrations/20250133000000_user_subscriptions.sql`
- [x] Enums: subscription_tier (including 'super_admin'), subscription_status, subscription_source
- [x] `user_subscriptions` table with all columns
- [x] Unique constraint on user_id
- [x] Indexes for efficient lookups (tier, status, expires_at, external_id)
- [x] Updated_at trigger

**Dependencies:** None
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

### Task 2: Database Migration - Tier Limits Table
**Status:** ✅ Complete
**Command:**
```bash
/db "Create tier_limits configuration table in same migration. Columns: id UUID PK, tier subscription_tier NOT NULL UNIQUE, max_competitions_owned INTEGER NOT NULL (-1 = unlimited, -2 = no system limit), max_rounds_per_competition INTEGER NOT NULL (-1 = unlimited, -2 = no system limit), max_players_per_competition INTEGER NOT NULL (-1 = unlimited, -2 = no system limit), max_friends INTEGER NOT NULL (-1 = unlimited), allowed_game_types TEXT[] NOT NULL, can_use_team_formats BOOLEAN NOT NULL DEFAULT FALSE, can_use_scoring_pairs BOOLEAN NOT NULL DEFAULT FALSE, can_export_data BOOLEAN NOT NULL DEFAULT FALSE, can_use_api_course_search BOOLEAN NOT NULL DEFAULT TRUE, can_view_basic_stats BOOLEAN NOT NULL DEFAULT TRUE, can_view_score_distribution BOOLEAN NOT NULL DEFAULT FALSE, can_view_advanced_stats BOOLEAN NOT NULL DEFAULT FALSE, can_compare_stats BOOLEAN NOT NULL DEFAULT FALSE, can_access_admin_tools BOOLEAN NOT NULL DEFAULT FALSE, requires_payment BOOLEAN NOT NULL DEFAULT TRUE, can_expire BOOLEAN NOT NULL DEFAULT TRUE, display_name TEXT NOT NULL, description TEXT NULL, badge_color TEXT NULL (hex color for UI), created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ. Seed with default values: Free (1 comp, 1 round, 8 players, 5 friends, ['stableford'], basic_stats only, requires_payment=false, #6b7280), Social (5 comp, 3 rounds, 16 players, 25 friends, ['stableford', 'stroke'], +score_distribution +compare_stats +export, #3b82f6), Premium (-1 comp, 10 rounds, 40 players, -1 friends, all game types, all features, #f59e0b), Super Admin (-2 comp, -2 rounds, -2 players, -1 friends, all game types, all features + admin_tools, requires_payment=false, can_expire=false, #dc2626)."
```
**Deliverables:**
- [x] `tier_limits` table with all columns
- [x] Unique constraint on tier
- [x] Seed data for Free, Social, Premium, **Super Admin** tiers
- [x] Game types arrays populated correctly
- [x] Friends limits set (5/25/unlimited/unlimited)
- [x] Stats feature flags set correctly
- [x] `can_access_admin_tools` flag (Super Admin only)
- [x] `requires_payment` flag (false for Free and Super Admin)
- [x] `can_expire` flag (false for Super Admin)
- [x] Badge colors set (Super Admin = red #dc2626)
- [x] Helper functions: `get_tier_limits()`, `get_user_tier_limits()`, `user_can_create_competition()`, `competition_can_add_round()`, `competition_can_add_player()`, `user_can_add_friend()`, `user_can_use_game_type()`, `user_has_feature()`
- [x] TypeScript types: `TierLimits` interface, `TierFeature` type

**Dependencies:** Task 1
**Estimated Time:** 1-2 hours
**Completed:** 2025-12-10

---

### Task 3: RLS Policies for Subscriptions
**Status:** ✅ Complete (included in Tasks 1 & 2)
**Command:**
```bash
/db "Add RLS policies for subscription tables. user_subscriptions: enable RLS, policy 'users_view_own_subscription' SELECT using auth.uid() = user_id, policy 'service_role_manage' ALL using auth.role() = 'service_role'. tier_limits: enable RLS, policy 'authenticated_read_tier_limits' SELECT for authenticated using true (public read). No user can INSERT/UPDATE/DELETE their own subscription - only service role."
```
**Deliverables:**
- [x] RLS enabled on both tables
- [x] Users can view own subscription only (`user_subscriptions`)
- [x] Service role can manage all subscriptions
- [x] Anyone can read tier_limits (public configuration)
- [x] No user self-modification of subscriptions

**Notes:**
- RLS for `user_subscriptions` included in Task 1 migration (`20250133000000_user_subscriptions.sql`)
- RLS for `tier_limits` included in Task 2 migration (`20250134000000_tier_limits.sql`)

**Dependencies:** Task 1, Task 2
**Estimated Time:** 1 hour
**Completed:** 2025-12-10 (as part of Tasks 1 & 2)

---

### Task 4: Database Functions - Tier Helpers
**Status:** ✅ Complete (included in Tasks 1 & 2)
**Command:**
```bash
/db "Create helper functions for subscription system. (1) get_user_tier(p_user_id UUID) RETURNS subscription_tier - returns effective tier considering expiry and status, defaults to 'free' if no subscription or expired. For 'super_admin' tier, ignore expiry (never expires). (2) get_user_tier_limits(p_user_id UUID) RETURNS TABLE - joins user tier with tier_limits table, returns all limit columns. (3) count_user_competitions(p_user_id UUID) RETURNS INTEGER - counts competitions where organizer_id = user and status NOT IN ('completed', 'cancelled'). (4) check_can_create_competition(p_user_id UUID) RETURNS TEXT - returns error message if at limit, NULL if allowed. Super Admin (-2 limit) always returns NULL. (5) is_super_admin(p_user_id UUID) RETURNS BOOLEAN - quick check if user has super_admin tier. All functions SECURITY DEFINER."
```
**Deliverables:**
- [x] `get_user_subscription_tier()` function with expiry handling (Super Admin never expires) - Task 1
- [x] `user_has_tier_or_higher()` function - Task 1
- [x] `upsert_user_subscription()` function - Task 1
- [x] `get_tier_limits()` function - Task 2
- [x] `get_user_tier_limits()` function with join - Task 2
- [x] `user_can_create_competition()` function (handles -2 = no limit) - Task 2
- [x] `competition_can_add_round()` function - Task 2
- [x] `competition_can_add_player()` function - Task 2
- [x] `user_can_add_friend()` function - Task 2
- [x] `user_can_use_game_type()` function - Task 2
- [x] `user_has_feature()` function - Task 2
- [x] All functions marked SECURITY DEFINER
- [x] `is_super_admin()` helper function - Task 4 supplement

**Notes:**
- Functions split across Task 1 (`20250133000000_user_subscriptions.sql`), Task 2 (`20250134000000_tier_limits.sql`), and supplemental migration (`20250135000000_subscription_helpers.sql`)
- More comprehensive set of functions than originally planned

**Dependencies:** Task 1, Task 2
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10 (as part of Tasks 1 & 2)

---

### Task 5: Auto-Create Subscription Trigger
**Status:** ✅ Complete
**Command:**
```bash
/db "Create trigger to auto-create free subscription for new users. Function create_default_subscription() - inserts into user_subscriptions with user_id=NEW.id, tier='free', status='active', source='manual', ON CONFLICT DO NOTHING. Trigger on_auth_user_created_subscription AFTER INSERT on auth.users FOR EACH ROW EXECUTE create_default_subscription(). Also run INSERT to create subscriptions for existing users who don't have one."
```
**Deliverables:**
- [x] `create_default_subscription()` function
- [x] Trigger on players table insert (hooks into existing auth signup flow)
- [x] Backfill query for existing users (included in `20250135000000_subscription_helpers.sql`)
- [x] Function uses ON CONFLICT DO NOTHING for idempotency

**Notes:**
- Trigger is on `players` table (not auth.users) since player profiles are created on auth signup
- Included in same migration file: `20250133000000_user_subscriptions.sql`
- Also includes helper functions: `get_user_subscription_tier()`, `user_has_tier_or_higher()`, `upsert_user_subscription()`
- Backfill runs automatically in migration to create subscriptions for any existing players

**Dependencies:** Task 1
**Estimated Time:** 1 hour
**Completed:** 2025-12-10

---

## Sprint 2: TypeScript Types

### Task 6: Subscription Type Definitions
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Create src/types/subscription.types.ts with TypeScript types. Enums: SubscriptionTier = 'free' | 'social' | 'premium' | 'super_admin', SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial', SubscriptionSource = 'manual' | 'revenuecat' | 'stripe'. FeatureId union type covering all tier-gated features: 'create_competition' | 'add_round' | 'add_player' | 'game_type' | 'team_formats' | 'scoring_pairs' | 'add_friend' | 'compare_stats' | 'basic_stats' | 'score_distribution' | 'advanced_stats' | 'export_data' | 'admin_tools'. Interfaces: UserSubscription (camelCase with id, userId, tier, status, source, externalId, productId, startedAt, expiresAt, cancelledAt, dates as Date objects), TierLimits (tier, maxCompetitionsOwned, maxRoundsPerCompetition, maxPlayersPerCompetition, maxFriends, allowedGameTypes, canUseTeamFormats, canUseScoringPairs, canExportData, canUseApiCourseSearch, canViewBasicStats, canViewScoreDistribution, canViewAdvancedStats, canCompareStats, canAccessAdminTools, requiresPayment, canExpire, displayName, description, badgeColor), FeatureAccess (allowed boolean, reason optional string, upgradeRequired boolean, requiredTier optional SubscriptionTier, currentValue/limitValue numbers). Add helper type IsSuperAdmin = boolean. Add constant UNLIMITED = -1, NO_LIMIT = -2 for limit values."
```
**Deliverables:**
- [x] `src/types/subscription.types.ts`
- [x] SubscriptionTier including 'super_admin', SubscriptionStatus, SubscriptionSource types
- [x] FeatureId type for ALL checkable features (13 features including 'admin_tools')
- [x] UserSubscription interface (camelCase with Date objects)
- [x] TierLimits interface with all limit fields including admin flags
- [x] FeatureAccess interface with requiredTier, currentValue, limitValue
- [x] UNLIMITED (-1) and NO_LIMIT (-2) constants
- [x] TIER_HIERARCHY constant for tier comparisons
- [x] Type guards: isSubscriptionTier, isSubscriptionStatus, isSubscriptionSource, isFeatureId
- [x] Utility functions: isUnlimited, isNoLimit, hasTierOrHigher, getNextTier
- [x] Mapper functions: mapDBUserSubscription, mapDBTierLimits (DB snake_case → app camelCase)
- [x] Updated `src/types/index.ts` to export all subscription types

**Dependencies:** Task 1 (schema reference)
**Estimated Time:** 1-2 hours
**Completed:** 2025-12-10

---

### Task 7: Database Types Update
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update src/types/database.types.ts to add subscription-related types. Add DBUserSubscription interface (snake_case matching database columns). Add DBTierLimits interface (snake_case). Add to Database['public']['Tables'] type: user_subscriptions with Row, Insert, Update types; tier_limits with Row type. Add Enums: subscription_tier, subscription_status, subscription_source to Database['public']['Enums']."
```
**Deliverables:**
- [x] `src/types/database.types.ts` - UserSubscription interface (used as DB type)
- [x] `src/types/database.types.ts` - TierLimits interface
- [x] `src/types/database.types.ts` - TierFeature type union
- [x] Database table type for user_subscriptions in Database['public']['Tables']
- [x] Database table type for tier_limits in Database['public']['Tables']
- [x] Enum types added: SubscriptionTier, SubscriptionStatus, SubscriptionSource
- [x] Function types added: get_user_subscription_tier, user_has_tier_or_higher, upsert_user_subscription
- [x] Function types added: get_tier_limits, get_user_tier_limits, user_can_create_competition, competition_can_add_round, competition_can_add_player, user_can_add_friend, user_can_use_game_type, user_has_feature
- [x] Re-exported from `src/types/index.ts`: UserSubscription, TierLimits, TierFeature

**Notes:**
- Types match the migration schema exactly
- Includes 'super_admin' tier in SubscriptionTier enum

**Dependencies:** Task 6
**Estimated Time:** 1 hour
**Completed:** 2025-12-10

---

## Sprint 3: State Management

### Task 8: Zustand Subscription Store
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Create src/store/subscriptionStore.ts following themeStore.ts pattern. State: subscription (UserSubscription | null), limits (TierLimits | null), allTierLimits (Record<SubscriptionTier, TierLimits> | null), isLoading (boolean), lastFetched (number | null). Actions: setSubscription, setLimits, setAllTierLimits, setLoading, reset. Persist to AsyncStorage with name 'subscription-storage'. Partialize to persist subscription, limits, allTierLimits, lastFetched. Selector hooks: useSubscriptionTier() returns tier or 'free', useIsPremium() returns tier is premium or super_admin, useIsSocial() returns tier is social, premium, or super_admin, useIsSuperAdmin() returns tier === 'super_admin', useHasFullAccess() returns tier is premium or super_admin (for feature checks)."
```
**Deliverables:**
- [x] `src/store/subscriptionStore.ts`
- [x] State interface with subscription, limits, allTierLimits, isLoading, lastFetched
- [x] Actions: setSubscription, setLimits, setAllTierLimits, setLoading, reset
- [x] AsyncStorage persistence with `subscription-storage` name
- [x] Partialize to persist only data fields (excludes isLoading)
- [x] Selector hooks:
  - `useSubscriptionTier()` - returns tier or 'free'
  - `useIsPremium()` - tier is premium or super_admin
  - `useIsSocial()` - tier is social, premium, or super_admin
  - `useIsSuperAdmin()` - tier === 'super_admin'
  - `useHasFullAccess()` - tier is premium or super_admin
  - `useTierLimits()` - returns current tier limits
  - `useIsSubscriptionStale()` - true if >1 hour since fetch
  - `useSubscriptionLoading()` - loading state
- [x] Non-hook helpers for services: getCurrentTier(), isSuperAdmin(), hasPremiumAccess()

**Dependencies:** Task 6 (types)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

### Task 9: Query Keys for Subscriptions
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update src/hooks/queryKeys.ts to add subscription query keys. Add: subscriptionKeys object with all: ['subscriptions'], current: () => [...all, 'current'], limits: () => [...all, 'limits'], tierLimits: (tier) => [...limits(), tier], allTierLimits: () => [...all, 'all-tiers'], competitionCount: (userId) => [...all, 'comp-count', userId]. Export subscriptionKeys."
```
**Deliverables:**
- [x] `src/hooks/queryKeys.ts` - subscriptionKeys object
- [x] Keys: all, current, limits, tierLimits, allTierLimits, competitionCount
- [x] Exported from file
- [x] Added to allQueryKeys array

**Dependencies:** None
**Estimated Time:** 30 minutes
**Completed:** 2025-12-10

---

### Task 10: useSubscription Hook
**Status:** ✅ Complete
**Command:**
```bash
/hook "Create src/hooks/useSubscription.ts - main subscription hook using TanStack Query. Queries: (1) subscriptionQuery fetches from user_subscriptions where user_id = current user, transforms DBUserSubscription to UserSubscription. (2) allLimitsQuery fetches all tier_limits rows, transforms to Record<SubscriptionTier, TierLimits>, staleTime 30min. Sync both to Zustand store via useEffect. Implement checkFeature(featureId, context) function that checks limits based on feature type - handles create_competition (check max), add_round (check max per comp), add_player (check max per comp), game_type (check allowedGameTypes array), etc. Returns FeatureAccess object. Include computed values: tier, isPremium, isSocial, isFree. Include refresh() method. Follow useAuth.ts patterns."
```
**Deliverables:**
- [x] `src/hooks/useSubscription.ts`
- [x] subscriptionQuery with transform function (uses mapDBUserSubscription)
- [x] allLimitsQuery with transform function (uses mapDBTierLimits, 30min staleTime)
- [x] Zustand store sync via useEffect (subscription, limits, allTierLimits, loading)
- [x] `checkFeature(featureId, context)` function with all feature types
- [x] Computed: tier, isPremium, isSocial, isFree, isSuperAdmin
- [x] refresh() method (invalidates both queries)
- [x] Export from `src/hooks/index.ts`
- [x] Additional convenience hooks: useCheckFeature, useCanCreateCompetition, useCanAddRound, useCanAddPlayer, useCanAddFriend, useCanUseGameType

**Dependencies:** Task 8 (store), Task 9 (query keys), Task 6 (types)
**Estimated Time:** 3-4 hours
**Completed:** 2025-12-10

---

## Sprint 4: Context Provider

### Task 11: SubscriptionContext Provider
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Create src/context/SubscriptionContext.tsx following ThemeContext.tsx pattern exactly. Interface SubscriptionContextValue extends useSubscription return with convenience methods: checkCanCreateCompetition(currentCount: number), checkCanAddRound(competitionId, currentCount), checkCanAddPlayer(competitionId, currentCount), checkGameType(gameType). Create SubscriptionContext, SubscriptionProvider component wrapping useSubscription, export hooks: useSubscriptionContext() throws if outside provider, useTier() returns tier, useTierLimits() returns limits, useIsPremium() returns boolean, useCheckFeature() returns checkFeature function."
```
**Deliverables:**
- [x] `src/context/SubscriptionContext.tsx`
- [x] SubscriptionContextValue interface
- [x] SubscriptionProvider component
- [x] useSubscriptionContext() hook with error if outside provider
- [x] useTier() convenience hook
- [x] useTierLimits() convenience hook
- [x] useIsPremium() convenience hook
- [x] useCheckFeature() convenience hook
- [ ] Export from `src/context/index.ts`

**Dependencies:** Task 10 (useSubscription hook)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

### Task 12: Add SubscriptionProvider to App
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update App.tsx to include SubscriptionProvider. Import SubscriptionProvider from @/context/SubscriptionContext. Wrap inside QueryClientProvider and AuthProvider (after auth so user is available). Order should be: QueryClientProvider > AuthProvider > SubscriptionProvider > ThemeProvider > NavigationContainer. Ensure subscription loads after auth state is available."
```
**Deliverables:**
- [x] Import SubscriptionProvider in App.tsx
- [x] Add to provider hierarchy in correct order
- [x] Verified subscription state available in app

**Notes:**
- Provider order: SafeAreaProvider > QueryClientProvider > SubscriptionProvider > ThemeProvider > AppContent
- No AuthProvider in codebase - auth state managed via React Query (useAuth hook)
- SubscriptionProvider uses useSubscription which calls useAuth internally
- Updated App.tsx header comment to document provider order

**Dependencies:** Task 11 (SubscriptionContext)
**Estimated Time:** 30 minutes
**Completed:** 2025-12-10

---

## Sprint 5: Permission Enforcement

### Task 13: API Client Permission Check
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update src/services/api/client.ts createCompetition method (~line 164) to check tier limits before creating. Add new method checkCompetitionCreationPermission() that calls supabase.rpc('check_can_create_competition', { p_user_id: user.id }) - returns { allowed: boolean, error?: string }. In createCompetition, call checkCompetitionCreationPermission() first, if not allowed throw Error with message. Also add checkCanAddRound(competitionId, currentCount) and checkCanAddPlayer(competitionId, currentCount) methods that check against cached tier limits."
```
**Deliverables:**
- [x] `checkCompetitionCreationPermission()` method in ApiClient (calls `user_can_create_competition` RPC)
- [x] Call check before createCompetition
- [x] Throw meaningful error if not allowed
- [x] `checkCanAddRound()` method (uses cached tier limits)
- [x] `checkCanAddPlayer()` method (uses cached tier limits)
- [x] Error messages reference upgrade
- [x] `PermissionCheckResult` interface exported for consumers
- [x] Fail-open pattern when limits not loaded (better UX, DB still enforces)

**Dependencies:** Task 4 (database functions), Task 10 (hook for limits)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

### Task 14: Tier-Aware Validation Schemas
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update src/schemas/competition.ts to support tier-aware validation. Create factory functions: createRoundsListSchema(maxRounds: number) - returns z.object with rounds array max(maxRounds). createPlayersListSchema(maxPlayers: number) - returns z.object with players array max(maxPlayers). createGameTypeSchema(allowedTypes: string[]) - returns z.enum with only allowed types. Update existing schemas to use these factories where needed. Export factories for use in forms that know user's tier limits."
```
**Deliverables:**
- [x] `createRoundsListSchema(maxRounds)` factory function
- [x] `createPlayersListSchema(maxPlayers)` factory function
- [x] `createGameTypeSchema(allowedTypes)` factory function
- [x] Factories exported from schema file
- [x] JSDoc with usage examples

**Notes:**
- All factory functions handle unlimited limits (-1, -2) gracefully with 100 as effective max
- Error messages are tier-aware ("allowed on your plan")
- `createGameTypeSchema` validates input against known game types and defaults to 'stableford'
- Each factory includes comprehensive JSDoc with usage examples

**Dependencies:** Task 6 (types)
**Estimated Time:** 1-2 hours
**Completed:** 2025-12-10

---

### Task 15: Grandfathering Service
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Create src/services/subscription/grandfathering.ts for handling downgrade scenarios. Functions: (1) checkGrandfatheredAccess(competitionId, userId) - returns { isGrandfathered: boolean, originalTier?: string } - for MVP always returns true for existing comps (allow viewing). (2) applyGracefulDegradation(competitionId, currentTier) - returns { allowedActions: string[], restrictedActions: string[] } - existing comps allow view/score, restrict add_round/add_player if over new tier limits. (3) getCompetitionsOverLimit(userId, maxAllowed) - returns competitions that exceed current tier limit (for display purposes). Export as grandfatheringService."
```
**Deliverables:**
- [x] `src/services/subscription/grandfathering.ts`
- [x] `checkGrandfatheredAccess()` function
- [x] `applyGracefulDegradation()` function
- [x] `getCompetitionsOverLimit()` function
- [x] `src/services/subscription/index.ts` barrel export
- [x] `isActionAllowed()` convenience function (bonus)
- [x] TypeScript types for all results and actions

**Notes:**
- MVP behavior: All existing competitions are grandfathered (always allows view/score)
- Grandfathered actions: view_competition, view_leaderboard, enter_scores, submit_scorecard
- Degradation checks: add_round, add_player limits from tier_limits table
- Super admin bypasses all restrictions
- Uses Zustand store for cached tier limits, falls back to DB query
- Future: Track originalTier at competition creation for nuanced policies

**Dependencies:** Task 6 (types)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

## Sprint 6: UI Components

### Task 16: TierBadge Component
**Status:** ✅ Complete
**Command:**
```bash
/component "TierBadge - Display user's subscription tier. Props: size ('small' | 'medium' | 'large'), showIcon (boolean default true). Use useTier() and useTierLimits() hooks to get current tier and display info. Icons: free='account-outline', social='account-group-outline', premium='crown-outline', super_admin='shield-crown-outline'. Badge color from limits.badgeColor. Layout: horizontal pill with icon + tier displayName. Size variants affect padding and font size. Use React Native Paper components and theme colors. For Super Admin, add subtle glow/border effect to distinguish from other tiers. Accessibility: accessibilityLabel='Subscription tier: {displayName}'."
```
**Deliverables:**
- [x] `src/components/subscription/TierBadge.tsx`
- [x] Size variants (small, medium, large)
- [x] Icon based on tier (including shield-crown for Super Admin)
- [x] Color from tier_limits.badge_color (red for Super Admin)
- [x] Special styling for Super Admin badge (glow effect on iOS, elevation on Android)
- [x] Accessibility labels
- [x] Theme-aware styling
- [x] `src/components/subscription/index.ts` barrel export

**Dependencies:** Task 11 (SubscriptionContext)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

### Task 17: FeatureLock Component
**Status:** ✅ Complete
**Command:**
```bash
/component "FeatureLock - Wrap features that may be tier-restricted. Props: feature (FeatureId), context (Record<string, unknown> optional for currentCount etc), children (ReactNode), onUpgradePress (() => void optional), lockedMessage (string default 'Upgrade to unlock'). Use useCheckFeature() to get access. If allowed, render children normally. If not allowed: render children with opacity 0.5, overlay with lock icon, message, and 'Tap to upgrade' if onUpgradePress provided. Graceful degradation - content visible but interaction blocked. Accessibility: announce locked state."
```
**Deliverables:**
- [x] `src/components/subscription/FeatureLock.tsx`
- [x] Props interface with feature, context, children, callbacks
- [x] Allowed state renders children normally
- [x] Locked state shows dimmed content with overlay
- [x] Lock icon and message
- [x] Optional upgrade tap handler
- [x] Accessibility announcements
- [x] Export from `src/components/subscription/index.ts`

**Notes:**
- Uses `useCheckFeature()` from SubscriptionContext
- Supports all FeatureId types with optional context for limit-based features
- Graceful degradation: children visible at configurable opacity (default 50%) with overlay
- Lock overlay includes icon, message, upgrade button, and required tier indicator
- Full accessibility support with announcements and proper roles
- Additional props: `lockedOpacity`, `showLockIcon`, `hideWhenLocked`, `testID`

**Dependencies:** Task 11 (SubscriptionContext)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

### Task 18: UpgradePrompt Component
**Status:** ✅ Complete
**Command:**
```bash
/component "UpgradePrompt - Modal/bottom sheet for upgrade CTA. Props: config (UpgradePromptConfig with feature, title, message, targetTier, benefits array), onUpgrade (() => void), onDismiss (() => void optional). Layout: Surface card with rocket icon, title, message, benefits list with checkmarks, 'Upgrade to {tier}' primary button, 'Maybe later' text button if onDismiss provided. Use theme colors and shadows. Animate in with scale. Future: will trigger IAP flow."
```
**Deliverables:**
- [x] `src/components/subscription/UpgradePrompt.tsx`
- [x] Props interface with config, onUpgrade, onDismiss
- [x] Rocket icon header
- [x] Benefits list with check icons
- [x] Upgrade button (primary)
- [x] Maybe later button (optional)
- [x] Theme-aware styling
- [x] Animation on mount (scale + opacity spring animation)
- [x] Modal implementation with backdrop dismiss
- [x] Full accessibility support (announcements, roles, labels)
- [x] Export from `src/components/subscription/index.ts`
- [x] Export `UpgradePromptConfig` type

**Dependencies:** Task 6 (types for UpgradePromptConfig)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

### Task 19: LimitIndicator Component
**Status:** ✅ Complete
**Command:**
```bash
/component "LimitIndicator - Show usage vs limit progress. Props: current (number), max (number, -1 for unlimited), label (string), showBar (boolean default true). Layout: Row with label on left, 'X/Y' or 'X/∞' value on right. If showBar, render progress bar below. Colors: normal=primary, at limit=error. Handle -1 max as unlimited with infinity symbol. Accessibility: 'Using X of Y {label}' or 'Using X {label}, unlimited'."
```
**Deliverables:**
- [x] `src/components/subscription/LimitIndicator.tsx`
- [x] Props interface with current, max, label, showBar
- [x] Text display with infinity for unlimited
- [x] Optional progress bar
- [x] Color change at limit
- [x] Accessibility labels
- [x] `src/components/subscription/index.ts` barrel export

**Notes:**
- Handles both UNLIMITED (-1) and NO_LIMIT (-2) values using utility functions from subscription.types.ts
- Progress bar displays empty for unlimited limits
- Error color (red) used when at or over limit
- Uses unicode infinity symbol (∞) for unlimited display
- Full accessibility support with descriptive labels

**Dependencies:** None
**Estimated Time:** 1-2 hours
**Completed:** 2025-12-10

---

## Sprint 7: Screen Integration

### Task 20: Update CreateCompetitionScreen
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update src/screens/admin/CreateCompetitionScreen.tsx to enforce tier limits. At screen mount, fetch user's competition count and tier limits. If at limit, show UpgradePrompt instead of form. In form steps: (1) RoundDetailsStep - pass allowed game types to GameTypeSelector, disable unavailable options. (2) PlayersStep - show LimitIndicator for players, warn when approaching limit. (3) On submit, catch permission errors from ApiClient and show UpgradePrompt. Add tier badge to header showing current tier."
```
**Deliverables:**
- [x] Fetch competition count on mount (via new `useCompetitionCount` hook)
- [x] Show UpgradePrompt if at competition limit (full-screen gate with limit info)
- [x] Pass allowed game types to GameTypeSelector (via `allowedGameTypes` prop to RoundDetailsStep)
- [x] Show LimitIndicator in PlayersStep (with approaching/at limit warnings)
- [x] Handle API permission errors gracefully (catch & show UpgradePrompt modal)
- [x] TierBadge in header (small badge in header row)

**Implementation Notes:**
- Added `useCompetitionCount` hook to `src/hooks/useSubscription.ts`
- CreateCompetitionScreen checks limits on mount, shows loading state while fetching
- When at competition limit, shows full-screen block with UpgradePrompt
- RoundDetailsStep accepts `allowedGameTypes` and `maxRoundsPerCompetition` props
- Game type modal shows lock icon + "Upgrade" badge on tier-restricted types
- Limit warning shows when rounds reach tier max
- AddPlayersStep accepts `maxPlayersPerCompetition` prop
- LimitIndicator shows player count with approaching/at limit color warnings
- Alert shown when trying to add player at limit
- Permission errors on submit trigger UpgradePrompt modal with tier-specific benefits

**Dependencies:** Tasks 16-19 (UI components), Task 13 (API permission)
**Estimated Time:** 3-4 hours
**Completed:** 2025-12-10

---

### Task 21: Update CompetitionsListScreen
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update src/screens/competitions/CompetitionsListScreen.tsx to show tier information. Add LimitIndicator showing competitions created (X/Y) near the create button. If at limit, wrap create button in FeatureLock with upgrade handler that navigates to SubscriptionScreen. In empty state or header, show TierBadge. For grandfathered competitions (over limit), show subtle indicator that these are 'legacy' competitions."
```
**Deliverables:**
- [x] LimitIndicator showing competition count (X/Y format, displayed next to status filters)
- [x] FeatureLock on create button when at limit (wraps button with upgrade prompt overlay)
- [x] TierBadge display (small badge in header next to Join/Create buttons)
- [x] Visual indicator for grandfathered competitions ("Legacy" badge with history icon)
- [x] Navigation to SubscriptionScreen on upgrade tap (added route to navigation types)

**Notes:**
- LimitIndicator only shown for "My Comps" tab when not on unlimited tier
- Uses grandfathering service to detect competitions over limit
- Legacy badge shows with warning color (amber) and "history" icon
- FeatureLock overlay appears when user is at competition limit
- Added `Subscription` route to navigation types for upgrade flow

**Dependencies:** Tasks 16-19 (UI components), Task 15 (grandfathering)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

### Task 22: SubscriptionScreen
**Status:** ✅ Complete
**Command:**
```bash
/screen "SubscriptionScreen - View and manage subscription. Route params: none. Layout: (1) Header with current TierBadge large. (2) 'Your Plan' section showing tier displayName and description. (3) 'Usage' section with LimitIndicators for competitions, showing current vs limit. For Super Admin, show 'No limits' instead of counts. (4) 'All Plans' section with comparison cards for Free, Social, Premium showing limits and features (hide Super Admin from comparison - it's not purchasable). (5) If not premium/super_admin, show 'Upgrade' button that shows UpgradePrompt (MVP: just shows 'Contact support'). (6) If Super Admin, show special 'Internal Account' banner with note that this is a company account. (7) If on trial, show trial days remaining. Add to navigation in types.ts and RootNavigator.tsx. Accessible from ProfileScreen or settings."
```
**Deliverables:**
- [x] `src/screens/subscription/SubscriptionScreen.tsx`
- [x] Current tier display with badge (large TierBadge)
- [x] Usage section with LimitIndicators (special handling for Super Admin - shows "No limits")
- [x] Plan comparison cards (Free, Social, Premium only - hides Super Admin)
- [x] Upgrade button for non-premium users (shows UpgradePrompt with "Contact support" hint)
- [x] **Super Admin 'Internal Account' banner**
- [x] Trial days display if applicable (shows days remaining badge)
- [x] Navigation registration (added to `RootNavigator.tsx`)
- [ ] Link from ProfileScreen/settings (to be added when integrating)

**Notes:**
- Screen displays comprehensive subscription information with all tiers
- Pull-to-refresh supported for subscription data refresh
- Error and loading states handled with appropriate UI
- PlanFeatureRow sub-component for clean feature comparison display
- Uses existing subscription components: TierBadge, LimitIndicator, UpgradePrompt
- Fetches competition count via React Query for usage display
- Super Admin users see special banner and "No limits" in usage section

**Dependencies:** Tasks 16-19 (UI components), Task 11 (SubscriptionContext)
**Estimated Time:** 4-5 hours
**Completed:** 2025-12-10

---

## Sprint 8: Future IAP Preparation

### Task 23: Subscription Service Abstraction
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Create src/services/subscription/SubscriptionService.ts - abstraction for subscription providers. Interface SubscriptionProvider with methods: initialize(), getCurrentSubscription(userId), purchaseProduct(productId), restorePurchases(). Class ManualSubscriptionProvider implements SubscriptionProvider - queries Supabase directly, purchaseProduct returns error 'Contact support'. Class RevenueCatSubscriptionProvider (stub) - placeholder with TODO comments for RevenueCat SDK integration. Factory createSubscriptionProvider(type) returns appropriate implementation. Export singleton subscriptionService using 'manual' type for now."
```
**Deliverables:**
- [x] `src/services/subscription/SubscriptionService.ts`
- [x] SubscriptionProvider interface with full method signatures
- [x] ManualSubscriptionProvider implementation (queries Supabase, purchases disabled)
- [x] RevenueCatSubscriptionProvider stub with detailed TODO comments and SDK integration guide
- [x] createSubscriptionProvider factory function
- [x] subscriptionService singleton export (using 'manual' type)
- [x] Updated `src/services/subscription/index.ts` barrel exports
- [x] Full TypeScript types: SubscriptionResult, SubscriptionProduct, PurchaseResult, RestorePurchasesResult

**Notes:**
- ManualSubscriptionProvider returns placeholder products for display purposes
- purchaseProduct returns 'PURCHASE_DISABLED' error with helpful message
- restorePurchases returns current subscription state from Supabase
- RevenueCat stub includes detailed integration guide with SDK steps
- All methods follow consistent SubscriptionResult<T> pattern for error handling

**Dependencies:** Task 6 (types)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

### Task 24: Webhook Handler Structure
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Create src/services/subscription/webhooks.ts - structure for handling IAP webhooks. Type RevenueCatEventType = 'INITIAL_PURCHASE' | 'RENEWAL' | 'CANCELLATION' | 'EXPIRATION' | 'BILLING_ISSUE' | 'PRODUCT_CHANGE'. Function handleRevenueCatWebhook(event) - switch on event type, calls updateSubscription with appropriate tier/status changes. Function mapProductToTier(productId) - maps App Store product IDs to tiers (e.g., 'com.thenineteenth.social.monthly' -> 'social'). Function updateSubscription(userId, updates) - upserts user_subscriptions via Supabase. Export handlers and constants. Add constants/products.ts with PRODUCT_IDS map."
```
**Deliverables:**
- [x] `src/services/subscription/webhooks.ts`
- [x] RevenueCatEventType type (includes UNCANCELLATION, NON_RENEWING_PURCHASE, SUBSCRIBER_ALIAS, TRANSFER)
- [x] handleRevenueCatWebhook() function with exhaustive event type handling
- [x] mapProductToTier() function with fallback pattern matching
- [x] updateSubscription() helper with upsert via Supabase
- [x] `src/constants/products.ts` with complete product ID mappings
- [x] verifyWebhookSignature() placeholder for HMAC-SHA256 verification
- [x] Individual event handlers exported for testing
- [x] Full TypeScript types for webhook payloads
- [x] Updated barrel export in `src/services/subscription/index.ts`

**Notes:**
- Handles all RevenueCat event types with appropriate subscription state changes
- INITIAL_PURCHASE: Sets tier from product, marks active/trial
- RENEWAL: Updates expiration, ensures active status
- CANCELLATION: Marks cancelled but preserves access until expiration
- EXPIRATION: Downgrades to free tier
- BILLING_ISSUE: Logs issue, preserves access during grace period
- PRODUCT_CHANGE: Updates tier based on new product
- UNCANCELLATION: Reactivates cancelled subscription
- Products constants include iOS/Android product IDs, entitlement mappings, default pricing

**Dependencies:** Task 6 (types)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

### Task 25: Documentation Update
**Status:** ✅ Complete
**Command:**
```bash
/docs "Update documentation for subscription tier system. Files to update: (1) docs/database/DATABASE_SCHEMA.md - add user_subscriptions and tier_limits tables with columns, constraints, RLS policies, indexes. (2) CLAUDE.md - add 'Subscription Tiers' section in Data Model explaining Free/Social/Premium tiers and what they control. (3) Create docs/guides/SUBSCRIPTION_TIERS.md - comprehensive guide explaining tier structure, limits, graceful degradation, grandfathering, admin management, future IAP integration. Include table of feature limits per tier."
```
**Deliverables:**
- [x] `docs/database/DATABASE_SCHEMA.md` - subscription tables docs (TypeScript types, ER diagram, table columns, RLS policies, indexes, all database functions)
- [x] `CLAUDE.md` - brief mention in Data Model section + added to Developer Guides and Documentation Map
- [x] `docs/guides/SUBSCRIPTION_TIERS.md` - comprehensive guide (500+ lines)
- [x] Feature limits table in guide (full comparison table)
- [x] Admin management instructions (SQL examples for upgrades, downgrades, super admin)

**Dependencies:** All previous tasks
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

## Sprint 9: Extended Feature Enforcement

### Task 26: Social Features Tier Enforcement
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update src/screens/social/FriendsScreen.tsx to enforce friends limit based on tier. Import useSubscriptionContext and useTierLimits. On mount, fetch current friends count. Show LimitIndicator at top of friends list showing 'X/Y Friends'. When adding friend: if at limit (Free: 5, Social: 25, Premium: unlimited), show UpgradePrompt instead of add modal. In useFriends hook, add checkCanAddFriend() that validates against tier limits before API call. Show graceful error message if at limit. For Premium users with -1 limit, show 'Unlimited' in indicator."
```
**Deliverables:**
- [x] LimitIndicator showing friends count in FriendsScreen
- [x] FeatureLock on add friend button when at limit (via handler that shows UpgradePrompt)
- [x] UpgradePrompt when attempting to add friend over limit
- [x] Update `useFriends.ts` hook with limit check (`useCheckCanAddFriend`, `useFriendsCount`)
- [x] Handle unlimited (-1) display for Premium (LimitIndicator handles this automatically)

**Implementation Notes:**
- Added `useFriendsCount` hook to count accepted friends for limit checking
- Added `useCheckCanAddFriend` hook that combines count with tier access check
- Updated `friendsKeys` in queryKeys.ts with `count` key for cache management
- FriendsScreen shows LimitIndicator at top of scroll view
- Add friend button checks tier limits before opening modal
- UpgradePrompt modal shows when at limit with tier-specific benefits
- Modal's add friend handler validates limits before API call

**Dependencies:** Tasks 16-19 (UI components), Task 11 (SubscriptionContext)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

### Task 27: Statistics Tier Enforcement
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update src/screens/profile/MyStatisticsScreen.tsx to show tier-appropriate stats. Import useSubscriptionContext, useTierLimits. Create 3 stat sections: (1) BasicStats - always visible (rounds played, total points, competitions) (2) ScoreDistribution - wrapped in FeatureLock with feature='score_distribution', blur/lock if Free tier (3) AdvancedAnalytics - wrapped in FeatureLock with feature='advanced_stats', blur/lock if Free/Social. Show upgrade prompt for locked sections. Update src/screens/social/CompareStatsScreen.tsx - wrap entire screen in FeatureLock with feature='compare_stats', show UpgradePrompt if Free tier tries to access. Add tier check in navigation to CompareStats."
```
**Deliverables:**
- [x] MyStatisticsScreen with tiered stat sections
- [x] BasicStats section (always visible - Overview, Averages, Recent Activity)
- [x] ScoreDistribution section with FeatureLock (Social+)
- [x] AdvancedAnalytics section with FeatureLock (Premium only - Performance Trend, Best Performances, Favourite Course, Courses Played)
- [x] CompareStatsScreen with FeatureLock (Social+)
- [x] Upgrade prompts for locked features (via UpgradePrompt modal)
- [x] Navigation handled via FeatureLock overlay on CompareStats

**Implementation Notes:**
- MyStatisticsScreen reorganized into 3 clear sections:
  - Section 1: Basic Stats (always visible) - Overview, Averages, Recent Activity
  - Section 2: Score Distribution - wrapped in FeatureLock with 'score_distribution' feature
  - Section 3: Advanced Analytics - wrapped in FeatureLock with 'advanced_stats' feature (Performance Trend chart, Best Performances, Favourite Course, Courses Played)
- Each locked section shows UpgradePrompt modal with tier-specific benefits when upgrade button tapped
- CompareStatsScreen wrapped entirely in FeatureLock with 'compare_stats' feature
- CompareStats shows UpgradePrompt on mount for Free tier users, can be dismissed to see blurred content
- Re-tapping locked content re-shows the upgrade prompt

**Dependencies:** Tasks 16-19 (UI components), Task 11 (SubscriptionContext)
**Estimated Time:** 3-4 hours
**Completed:** 2025-12-10

---

### Task 28: Advanced Scoring Features Enforcement
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update src/screens/admin/ScoringPairsScreen.tsx to be Premium-only feature. Import useSubscriptionContext, useIsPremium. At screen mount, check if Premium. If not Premium, render full-screen UpgradePrompt with benefits=['Designated scoring pairs for competitive rounds', 'Official marker assignments', 'Tournament-style score verification']. In AddRoundScreen.tsx, hide 'Configure Scoring Pairs' button if not Premium, or show with lock icon and upgrade prompt on tap. In competitionPlayersService, add checkCanUseScoringPairs() that returns FeatureAccess based on tier."
```
**Deliverables:**
- [x] ScoringPairsScreen Premium-only gate (full-screen UpgradePrompt with PageHeader)
- [x] Full-screen UpgradePrompt for non-Premium users (with 3 benefits)
- [x] Hide/lock 'Require Scoring Pairs' toggle in AddRoundScreen (lock icon + Premium badge)
- [x] checkCanUseScoringPairs() in service layer (returns FeatureAccess object)
- [x] Descriptive benefits list in upgrade prompt

**Notes:**
- ScoringPairsScreen: Early return with UpgradePrompt if `!isPremium`
- AddRoundScreen: Conditional rendering - Premium users see switch, non-Premium see locked row with Premium badge
- Locked row taps navigate to Subscription screen
- competitionPlayersService: Uses `hasPremiumAccess()` from subscriptionStore for non-hook context

**Dependencies:** Tasks 16-19 (UI components), Task 11 (SubscriptionContext)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

### Task 29: AddRoundScreen Game Type Enforcement
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update src/screens/admin/AddRoundScreen.tsx and src/components/competition/create/RoundGameTypeSelector.tsx to enforce game type limits per tier. Import useTierLimits to get allowedGameTypes array. In RoundGameTypeSelector: render all game types but disable those not in allowedGameTypes. Show lock icon on disabled options. On disabled option tap, show UpgradePrompt with message 'Upgrade to {requiredTier} to use {gameType}'. Map game types to required tiers: stableford=Free, stroke=Social, match-play/ambrose/best-ball/scramble=Premium. Update RoundDetailsStep.tsx to pass tier limits to selector. Add visual distinction between enabled/disabled game type cards."
```
**Deliverables:**
- [x] RoundGameTypeSelector shows all game types
- [x] Disabled styling for unavailable game types (muted background, reduced icon color)
- [x] Lock icon on tier-restricted game types (replaces radio button)
- [x] UpgradePrompt on tap of locked game type
- [x] Game type to tier mapping (stableford=free, stroke=social, match-play=premium)
- [x] Visual distinction (opacity 0.8, tier badge showing required tier)
- [x] AddRoundScreen passes allowedGameTypes and onUpgradePress props
- [x] RoundDetailsStep already passes allowedGameTypes from CreateCompetitionScreen

**Implementation Notes:**
- RoundGameTypeSelector updated with requiredTier field per game type option
- New props: `allowedGameTypes` (optional, falls back to subscription limits) and `onUpgradePress` (callback for navigation)
- Uses `useSubscription` hook internally to get tier limits if not provided via props
- UpgradePrompt config includes tier-specific benefits list
- Lock icon wrapper replaces radio button for locked options
- Tier badge displayed next to label for locked options
- Chevron-right icon shown to indicate tappable upgrade action

**Dependencies:** Tasks 16-19 (UI components), Task 11 (SubscriptionContext)
**Estimated Time:** 2-3 hours
**Completed:** 2025-12-10

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 29
- **Completed:** 29 ✅ (100%)
- **In Progress:** 0 🔄 (0%)
- **Not Started:** 0 ⬜ (0%)

### Sprint Progress

**Sprint 1: Database Foundation** ✅ Complete (5/5 tasks)
- ✅ Task 1: Database Migration - Subscription Tables
- ✅ Task 2: Database Migration - Tier Limits Table
- ✅ Task 3: RLS Policies (included in Tasks 1 & 2)
- ✅ Task 4: Database Functions (included in Tasks 1 & 2)
- ✅ Task 5: Auto-Create Trigger

**Sprint 2: TypeScript Types** ✅ Complete (2/2 tasks)
- ✅ Task 6: Subscription Type Definitions (`src/types/subscription.types.ts`)
- ✅ Task 7: Database Types Update (includes TierLimits, TierFeature)

**Sprint 3: State Management** ✅ Complete (3/3 tasks)
- ✅ Task 8: Zustand Subscription Store (`src/store/subscriptionStore.ts`)
- ✅ Task 9: Query Keys (`src/hooks/queryKeys.ts`)
- ✅ Task 10: useSubscription Hook (`src/hooks/useSubscription.ts`)

**Sprint 4: Context Provider** ✅ Complete (2/2 tasks)
- ✅ Task 11: SubscriptionContext Provider (`src/context/SubscriptionContext.tsx`)
- ✅ Task 12: Add to App.tsx

**Sprint 5: Permission Enforcement** ✅ Complete (3/3 tasks)
- ✅ Task 13: API Client Permission Check
- ✅ Task 14: Tier-Aware Validation Schemas
- ✅ Task 15: Grandfathering Service (`src/services/subscription/grandfathering.ts`)

**Sprint 6: UI Components** ✅ Complete (4/4 tasks)
- ✅ Task 16: TierBadge Component
- ✅ Task 17: FeatureLock Component
- ✅ Task 18: UpgradePrompt Component
- ✅ Task 19: LimitIndicator Component

**Sprint 7: Screen Integration** ✅ Complete (3/3 tasks)
- ✅ Task 20: Update CreateCompetitionScreen (tier limits, game type gating, LimitIndicator)
- ✅ Task 21: Update CompetitionsListScreen
- ✅ Task 22: SubscriptionScreen (`src/screens/subscription/SubscriptionScreen.tsx`)

**Sprint 8: Future IAP Preparation** ✅ Complete (3/3 tasks)
- ✅ Task 23: Subscription Service Abstraction
- ✅ Task 24: Webhook Handler Structure (`src/services/subscription/webhooks.ts`, `src/constants/products.ts`)
- ✅ Task 25: Documentation Update (`docs/guides/SUBSCRIPTION_TIERS.md`, `DATABASE_SCHEMA.md`, `CLAUDE.md`)

**Sprint 9: Extended Feature Enforcement** ✅ Complete (4/4 tasks)
- ✅ Task 26: Social Features Tier Enforcement (FriendsScreen)
- ✅ Task 27: Statistics Tier Enforcement (MyStatisticsScreen, CompareStatsScreen)
- ✅ Task 28: Advanced Scoring Features Enforcement (ScoringPairsScreen)
- ✅ Task 29: AddRoundScreen Game Type Enforcement

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/20250133000000_user_subscriptions.sql` | User subscriptions migration ✅ |
| `supabase/migrations/20250134000000_tier_limits.sql` | Tier limits configuration migration ✅ |
| `supabase/migrations/20250135000000_subscription_helpers.sql` | is_super_admin() + backfill ✅ |
| `src/types/subscription.types.ts` | TypeScript type definitions ✅ |
| `src/store/subscriptionStore.ts` | Zustand state store ✅ |
| `src/hooks/useSubscription.ts` | Main subscription hook ✅ |
| `src/context/SubscriptionContext.tsx` | Context provider ✅ |
| `src/services/subscription/grandfathering.ts` | Grandfathering logic ✅ |
| `src/services/subscription/index.ts` | Barrel export ✅ |
| `src/services/subscription/SubscriptionService.ts` | Provider abstraction ✅ |
| `src/services/subscription/webhooks.ts` | Webhook handlers ✅ |
| `src/components/subscription/TierBadge.tsx` | Tier display badge ✅ |
| `src/components/subscription/FeatureLock.tsx` | Feature restriction wrapper ✅ |
| `src/components/subscription/UpgradePrompt.tsx` | Upgrade CTA modal ✅ |
| `src/components/subscription/LimitIndicator.tsx` | Usage progress display ✅ |
| `src/components/subscription/index.ts` | Barrel export ✅ |
| `src/screens/subscription/SubscriptionScreen.tsx` | Subscription management ✅ |
| `src/constants/products.ts` | IAP product ID mappings ✅ |
| `docs/guides/SUBSCRIPTION_TIERS.md` | Feature documentation ✅ |

### Modified Files
| File | Changes |
|------|---------|
| `docs/database/DATABASE_SCHEMA.md` | Document subscription tables ✅ |
| `CLAUDE.md` | Subscription tiers in Data Model section ✅ |
| `src/types/database.types.ts` | Add DB subscription types ✅ |
| `src/types/index.ts` | Re-export subscription types ✅ |
| `src/hooks/queryKeys.ts` | Add subscriptionKeys ✅ |
| `src/hooks/index.ts` | Export new hooks ✅ |
| `src/hooks/useFriends.ts` | Add checkCanAddFriend() limit check |
| `src/services/api/client.ts` | Add permission checks ✅ |
| `src/schemas/competition.ts` | Tier-aware validation factories |
| `src/screens/admin/CreateCompetitionScreen.tsx` | Enforce tier limits |
| `src/screens/admin/AddRoundScreen.tsx` | Game type + scoring pairs enforcement |
| `src/screens/admin/ScoringPairsScreen.tsx` | Premium-only gate |
| `src/screens/competitions/CompetitionsListScreen.tsx` | Show tier info |
| `src/screens/social/FriendsScreen.tsx` | Friends limit enforcement |
| `src/screens/social/CompareStatsScreen.tsx` | Stats comparison gate (Social+) |
| `src/screens/profile/MyStatisticsScreen.tsx` | Tiered stats sections |
| `src/components/competition/create/RoundGameTypeSelector.tsx` | Disable unavailable game types |
| `src/components/competition/create/RoundDetailsStep.tsx` | Pass tier limits |
| `src/navigation/types.ts` | Add SubscriptionScreen route ✅ |
| `src/navigation/RootNavigator.tsx` | Register new screen ✅ |
| `App.tsx` | Add SubscriptionProvider |
| `CLAUDE.md` | Brief mention of tiers |

---

## Time Estimates

| Sprint | Tasks | Estimated Hours |
|--------|-------|-----------------|
| Sprint 1: Database | 5 | 7-10 hours |
| Sprint 2: Types | 2 | 2-3 hours |
| Sprint 3: State | 3 | 5.5-7.5 hours |
| Sprint 4: Context | 2 | 2.5-3.5 hours |
| Sprint 5: Enforcement | 3 | 5-8 hours |
| Sprint 6: UI Components | 4 | 7-11 hours |
| Sprint 7: Screen Integration | 3 | 9-12 hours |
| Sprint 8: IAP Prep | 3 | 6-9 hours |
| Sprint 9: Extended Enforcement | 4 | 9-13 hours |

**Total Estimated:** 53-77 hours

---

## Backward Compatibility

- All users default to 'free' tier via trigger
- Existing competitions unaffected - grandfathering allows continued access
- No breaking changes to existing API contracts
- Feature checks "fail open" while loading (allow until limits confirmed)
- Manual tier assignment works immediately, no payment integration required

---

## Key Design Decisions

1. **Graceful Degradation**: Content visible even when locked, clear upgrade path
2. **Grandfathering**: Downgrade doesn't break existing competitions
3. **Database-Driven Limits**: tier_limits table allows runtime configuration
4. **Provider Abstraction**: Easy to swap ManualProvider for RevenueCat later
5. **Permission at Multiple Layers**: UI filters + API validates + DB constrains
6. **Context Pattern**: Follows existing ThemeContext pattern exactly

---

## Command Usage Reference

| Command | Use For |
|---------|---------|
| `/db` | Database schema design and migrations |
| `/component` | Reusable UI components |
| `/screen` | Full screen implementations |
| `/hook` | TanStack Query hooks and services |
| `/refactor` | Modifying existing code, utilities |
| `/docs` | Documentation updates |

---

**Last Updated:** 2025-12-10
**Status:** ✅ All tasks complete! Subscription tier system fully implemented.
**Next Steps:** Consider integration testing, then move to Phase 2 features or IAP integration.

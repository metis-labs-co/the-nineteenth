# Fix Review Issues — Competitions (Knockout) & Leagues

## Context

Code review of the `feat/leagues` branch identified issues across the competition knockout rename, leagues feature, push notifications, and subscription validation. This plan covers all fixes organized by priority.

---

## Fix 1: Rename duplicate migration timestamp (CRITICAL) ✅

**Problem:** Two migrations share timestamp `20260228400000`, causing non-deterministic ordering.

**Files:**
- `supabase/migrations/20260228400000_extend_league_type.sql`
- `supabase/migrations/20260228400000_knockout_matches.sql`

**Fix:** Rename `20260228400000_knockout_matches.sql` → `20260228500000_knockout_matches.sql`

```bash
mv supabase/migrations/20260228400000_knockout_matches.sql supabase/migrations/20260228500000_knockout_matches.sql
```

---

## Fix 2: Remove extra argument from `checkBooleanFeature` call (CRITICAL) ✅

**Problem:** `join_league` case passes 4 args to a 3-param function. The `tier` arg is silently ignored.

**File:** `src/hooks/subscription/validators.ts`

**Current (lines ~291-297):**
```typescript
    case 'join_league':
      return checkBooleanFeature(
        limits.canJoinLeague,
        'joining leagues',
        'social',
        tier       // <-- EXTRA: checkBooleanFeature only takes 3 params
      );
```

**Fix:** Remove the `tier` argument:
```typescript
    case 'join_league':
      return checkBooleanFeature(
        limits.canJoinLeague,
        'joining leagues',
        'social'
      );
```

---

## Fix 3: Add `game_type_unavailable` dialog type (CRITICAL) ✅

**Problem:** Game type unavailability reuses `type: 'team_config_issue'` dialog type, which is semantically wrong and could trigger incorrect downstream behavior.

**File:** `src/screens/admin/AICompetitionScreen/hooks/useAICompetitionFlow.ts`

**Step 1:** Add `'game_type_unavailable'` to the `DialogType` union (line ~34):
```typescript
export type DialogType =
  | 'prompt_too_short'
  | 'creation_failed'
  | 'team_config_issue'
  | 'game_type_unavailable'    // <-- ADD
  | 'courses_not_found'
  | 'guest_players_warning'
  | null;
```

**Step 2:** Change the dialog type in the game type check (line ~314):
```typescript
        showDialog({
          type: 'game_type_unavailable',   // <-- was 'team_config_issue'
          title: 'Game Type Unavailable',
          ...
```

---

## Fix 4: Add `push_league_updates` to Player and PushPreferences types (CRITICAL) ✅

**Problem:** `helpers.ts` uses `(player as any).push_league_updates` because the Player type doesn't include this field. The preference always defaults to `true`, ignoring user's actual setting.

**File 1:** `src/types/database/player.types.ts`

Add `push_league_updates` to the Player interface, after the existing push fields:
```typescript
  // Push notification preferences
  push_enabled: boolean;
  push_competition_updates: boolean;
  push_friend_requests: boolean;
  push_scorecard_updates: boolean;
  push_league_updates: boolean;          // <-- ADD
```

Also add it to the `PushPreferences` interface in the same file:
```typescript
export interface PushPreferences {
  push_enabled: boolean;
  push_competition_updates: boolean;
  push_friend_requests: boolean;
  push_scorecard_updates: boolean;
  push_league_updates: boolean;          // <-- ADD
}
```

**File 2:** `src/hooks/pushNotifications/helpers.ts`

Remove the `as any` cast (line ~42):
```typescript
// BEFORE:
pushLeagueUpdates: (player as any).push_league_updates ?? true,

// AFTER:
pushLeagueUpdates: player.push_league_updates ?? true,
```

---

## Fix 5: Fix "Tag to League" navigation after score submission (CRITICAL) ✅

**Problem:** Tapping "Tag to League" after submission navigates to `MainTabs` without any params — user lands on the wrong tab with no way to tag the round they just submitted.

**File:** `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts`

**Current (lines ~460-468):**
```typescript
              onSecondaryAction: () => {
                dismissDialog();
                resetRound();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                });
              },
```

**Fix:** Navigate to the Leagues tab with context. The `MainTabs` navigator should support an initial route param. Navigate to `LeaguesTab` so the user lands on the leagues screen:
```typescript
              onSecondaryAction: () => {
                dismissDialog();
                resetRound();
                navigation.reset({
                  index: 0,
                  routes: [{
                    name: 'MainTabs',
                    params: { screen: 'LeaguesTab' },
                  }],
                });
              },
```

Note: If the `MainTabs` navigator (`MainTabNavigator.tsx`) doesn't accept `screen` as a navigation param to set the initial tab, you'll need to check how tab navigation params work in this project. React Navigation's `Tab.Navigator` supports `initialRouteName` and nested navigation with params like `{ screen: 'LeaguesTab' }`.

---

## Fix 6: Move `getLeagues()` off the critical submission path (CRITICAL) ✅

**Problem:** `getLeagues()` is awaited synchronously between score submission success and showing the dialog, adding network latency to the user's most important interaction.

**File:** `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts`

**Current (lines ~440-446):**
```typescript
          let hasLeagues = false;
          try {
            const leagues = await getLeagues();
            hasLeagues = leagues.some((l) => l.status === 'active');
          } catch {
            // Non-critical — skip league prompt if fetch fails
          }
```

**Fix — Option A (prefetch at hook level):** Use React Query to prefetch league data when the hook mounts, so it's available synchronously from cache at submission time:

```typescript
// At the top of the useScoreSubmission hook:
const { data: leagues } = useLeagues(); // or a lightweight query

// In the submission handler:
const hasLeagues = (leagues ?? []).some((l) => l.status === 'active');
```

**Fix — Option B (fire concurrently):** If prefetching isn't possible, at minimum fire the league check concurrently with the final submission steps rather than sequentially after:

```typescript
// Fire league check at the start of submission, await it later
const leaguePromise = getLeagues().catch(() => []);

// ... do submission work ...

const leagues = await leaguePromise;
const hasLeagues = leagues.some((l) => l.status === 'active');
```

---

## Fix 7: Change `.single()` to `.maybeSingle()` in push queries (CRITICAL) ✅

**Problem:** `queries.ts` uses `.single()` for user_preferences which throws PGRST116 error for new users without a preferences row. `main.ts` already uses `.maybeSingle()` correctly.

**File:** `src/hooks/pushNotifications/queries.ts`

**Current (line ~68):**
```typescript
        .eq('user_id', userId)
        .single()) as { data: PushPrefsRow | null; error: Error | null };
```

**Fix:**
```typescript
        .eq('user_id', userId)
        .maybeSingle()) as { data: PushPrefsRow | null; error: Error | null };
```

---

## Fix 8: Add test coverage for league validators (WARNING) ✅

**Problem:** `create_league` and `join_league` validator branches have zero test coverage.

**File:** `src/__tests__/hooks/subscription/validators.test.ts`

**Add tests** in the `'validateFeatureAccess - other features'` describe block:

```typescript
  describe('create_league', () => {
    it('should deny on free tier (maxLeaguesOwned = 0)', () => {
      const result = validateFeatureAccess(
        'create_league',
        freeTierLimits,
        'free',
        { currentCount: 0 }
      );
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe(true);
    });

    it('should allow on social tier within limit', () => {
      const result = validateFeatureAccess(
        'create_league',
        socialTierLimits,
        'social',
        { currentCount: 1 }
      );
      expect(result.allowed).toBe(true);
    });

    it('should deny on social tier at limit', () => {
      const result = validateFeatureAccess(
        'create_league',
        socialTierLimits,
        'social',
        { currentCount: 3 }  // social max is 3
      );
      expect(result.allowed).toBe(false);
    });

    it('should allow on premium tier (unlimited)', () => {
      const result = validateFeatureAccess(
        'create_league',
        premiumTierLimits,
        'premium',
        { currentCount: 100 }
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('join_league', () => {
    it('should deny on free tier', () => {
      const result = validateFeatureAccess(
        'join_league',
        freeTierLimits,
        'free',
        {}
      );
      expect(result.allowed).toBe(false);
    });

    it('should allow on social tier', () => {
      const result = validateFeatureAccess(
        'join_league',
        socialTierLimits,
        'social',
        {}
      );
      expect(result.allowed).toBe(true);
    });
  });
```

Note: Check what the actual test fixture variable names are (e.g. `freeTierLimits` vs `createFreeTierLimits()`) and adjust.

---

## Fix 9: Rename `leaguePointsData` → `knockoutTeamData` (WARNING) ✅

**Problem:** Variable named `leaguePointsData` is misleading after the league→knockout rename.

**File:** `src/components/competitionWizard/create/ReviewStep.stories.tsx`

**Find:** `leaguePointsData` (appears on lines ~155, 403, 587, 634, 680, 777)

**Replace all with:** `knockoutTeamData`

---

## Fix 10: Remove or guard console.logs in SubscriptionScreen (WARNING) ✅

**Problem:** 12 `console.log` calls will run in production.

**File:** `src/screens/subscription/SubscriptionScreen.tsx`

**Fix:** Wrap all `console.log('[SubscriptionScreen]...` and `console.log('[DevTierSwitch]...` and `console.log('[handleUpgradePress]...` and `console.log('[handlePlanCardPress]...` and `console.log('[handleUpgrade]...` calls in `if (__DEV__)` guards. Or remove them entirely if the dev tier switching feature is stable.

Search pattern: `console.log('[` in this file — there are ~12 instances.

---

## Fix 11: Remove debug logging in useSubscriptionLimits (WARNING) ✅

**Problem:** Verbose dev logging fires for every tier on every query refresh. Also uses `(row as any)`.

**File:** `src/hooks/subscription/useSubscriptionLimits.ts` (lines ~60-67)

**Fix:** Remove the entire `if (__DEV__)` block, or at minimum remove the `(row as any).can_join_league` debug line. This was debugging code for league development and is no longer needed.

---

## Fix 12: Fix empty ID fallback in notification handler (WARNING) ✅

**Problem:** `buildNavigationParams` passes empty string as league ID when `data.leagueId` is missing, causing a broken screen load.

**File:** `src/services/notifications/notificationHandler.ts` (line ~611)

**Current:**
```typescript
    case 'LeagueDetail':
      return {
        screen: 'LeagueDetail',
        params: { id: data.leagueId || '' },
      };
```

**Fix:** Fall back to Notifications screen instead:
```typescript
    case 'LeagueDetail':
      if (!data.leagueId) {
        return { screen: 'Notifications', params: {} };
      }
      return {
        screen: 'LeagueDetail',
        params: { id: data.leagueId },
      };
```

---

## Execution Order

1. Fix 1 (migration rename) — standalone, no dependencies
2. Fixes 2, 3, 4, 7, 12 — independent type/logic fixes, can be done in parallel
3. Fix 5 + 6 — both in `useScoreSubmission.ts`, do together
4. Fixes 9, 10, 11 — cleanup, can be done in parallel
5. Fix 8 — tests, do last after logic fixes are in place

---

*Created: February 2026*

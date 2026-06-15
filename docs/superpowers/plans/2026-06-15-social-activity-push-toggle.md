# Social Activity Push Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Social Activity" push-notification preference that gates `round_liked` / `round_commented` / `round_also_commented` pushes, mirroring the existing `push_league_updates` toggle end to end.

**Architecture:** One new DB migration (column + `should_send_push` branch + the two preference RPCs), then add the required `pushSocialActivity` field through every layer that constructs/consumes `PushPreferences` (type, defaults, three mappers, update-input), one new toggle row in the live settings screen, and test-fixture updates. Default ON; gates push only (in-app rows still created).

**Tech Stack:** Supabase/Postgres (plpgsql), TypeScript, React Native, TanStack Query, Jest.

**Spec:** `docs/superpowers/specs/2026-06-15-social-activity-push-toggle-design.md`

---

## File Structure

- **Create:** `supabase/migrations/20260615020000_social_activity_push_preference.sql` — column + `should_send_push` + `get_user_push_preferences` + `update_push_preferences`.
- **Modify:** `src/types/push.types.ts` — `PushPreferences` + `DEFAULT_PUSH_PREFERENCES`.
- **Modify:** `src/hooks/pushNotifications/types.ts` — `UpdatePushPreferencesInput`.
- **Modify:** `src/hooks/pushNotifications/main.ts` — `PushPrefsRow`, 2 SELECT strings, 2 return maps, default-fallback, update guard.
- **Modify:** `src/hooks/pushNotifications/queries.ts` — `PushPrefsRow`, SELECT string, return map.
- **Modify:** `src/hooks/pushNotifications/helpers.ts` — `extractPreferencesFromPlayer` return (unused legacy mapper; keep it compiling).
- **Modify:** `src/screens/profile/NotificationSettingsScreen.tsx` — handler + `MenuItemRow`.
- **Modify:** `src/__tests__/hooks/usePushNotifications.test.tsx` and `src/__tests__/utils/testFixtures.ts` — fixtures.

**Deliberately NOT touched** (verified during planning):
- `src/types/supabase.ts` — `user_preferences` is queried via `(supabase as any)` and already does not track `push_round_reminders`; the `get/update_push_preferences` RPC types aren't called from client code. Editing it is out of scope and would be inconsistent with the existing (intentionally unsynced) state.
- `src/components/settings/PushNotificationSettings.tsx` — storybook/test-only, not rendered by any live screen.
- `getEnabledNotificationTypes`/`shouldSendNotification` in `push.types.ts` — dead exports (no live callers); leaving the activity types out keeps them consistent with `round_liked`/`round_commented`, which are already absent.

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260615020000_social_activity_push_preference.sql`

The SQL below reproduces the **latest** `should_send_push()` (from `20260612000000_scheduled_rounds.sql`) and the latest `get_user_push_preferences()` / `update_push_preferences()` (from `20260422000000_tee_time_reminders.sql`), each with the social-activity addition.

- [ ] **Step 1: Pre-check for a timestamp collision**

A parallel session commits to this repo. Before writing, run:

```bash
ls supabase/migrations/ | grep '^20260615'
```

If `20260615020000_*` already exists, use `20260615030000` instead (and in every path below). Otherwise proceed with `20260615020000`.

- [ ] **Step 2: Write the migration file**

```sql
-- =====================================================
-- Social Activity push preference
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Adds push_social_activity to user_preferences and routes the activity-feed
-- notification types (round_liked / round_commented / round_also_commented)
-- through it in should_send_push(). Previously these fell through to ELSE TRUE
-- (master push_enabled only). Default TRUE → opt-out, behaviour unchanged until
-- a user turns it off. Also threads the column through the two preference RPCs
-- to keep them complete (the client uses direct table access, not these RPCs).
-- =====================================================

-- -----------------------------------------------------
-- 1. COLUMN
-- -----------------------------------------------------
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS push_social_activity BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN user_preferences.push_social_activity IS
  'Toggle for social activity push notifications (likes & comments on rounds)';

-- -----------------------------------------------------
-- 2. should_send_push() — add social activity branch
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION should_send_push(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_push_enabled BOOLEAN;
  v_category_enabled BOOLEAN;
BEGIN
  SELECT
    up.push_enabled,
    CASE
      -- Competition & round-related notifications
      WHEN p_notification_type IN (
        'competition_player_added',
        'competition_player_joined',
        'new_round_created',
        'competition_status_changed',
        'round_completed',
        'social_round_invitation',
        'social_round_response'
      ) THEN up.push_competition_updates

      -- Friend-related notifications
      WHEN p_notification_type IN (
        'friend_request_received',
        'friend_request_accepted'
      ) THEN up.push_friend_requests

      -- Scorecard-related notifications
      WHEN p_notification_type IN (
        'scorecard_submitted'
      ) THEN up.push_scorecard_updates

      -- League-related notifications
      WHEN p_notification_type IN (
        'league_player_joined',
        'league_player_left',
        'league_player_removed',
        'league_round_tagged',
        'league_leaderboard_changed'
      ) THEN up.push_league_updates

      -- Partnership-related notifications (also league category)
      WHEN p_notification_type IN (
        'partnership_created',
        'partnership_round_tagged'
      ) THEN up.push_league_updates

      -- Side-game & prize pool notifications
      WHEN p_notification_type IN (
        'skins_game_completed',
        'skins_game_cancelled',
        'wolf_game_completed',
        'wolf_game_cancelled',
        'prize_pool_settled'
      ) THEN up.push_side_game_updates

      -- Tee-time reminder
      WHEN p_notification_type = 'tee_time_reminder'
        THEN up.push_round_reminders

      -- Social activity (likes & comments on rounds)
      WHEN p_notification_type IN (
        'round_liked',
        'round_commented',
        'round_also_commented'
      ) THEN up.push_social_activity

      -- Default to enabled for unknown types
      ELSE TRUE
    END
  INTO v_push_enabled, v_category_enabled
  FROM user_preferences up
  WHERE up.user_id = p_user_id;

  IF v_push_enabled IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_push_enabled AND v_category_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- 3. get_user_push_preferences() — add column
-- -----------------------------------------------------
DROP FUNCTION IF EXISTS get_user_push_preferences(UUID);

CREATE OR REPLACE FUNCTION get_user_push_preferences(p_user_id UUID)
RETURNS TABLE (
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN,
  push_league_updates BOOLEAN,
  push_side_game_updates BOOLEAN,
  push_round_reminders BOOLEAN,
  push_social_activity BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates,
    up.push_league_updates,
    up.push_side_game_updates,
    up.push_round_reminders,
    up.push_social_activity
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- 4. update_push_preferences() — add param + column
-- -----------------------------------------------------
DROP FUNCTION IF EXISTS update_push_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS update_push_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION update_push_preferences(
  p_user_id UUID,
  p_push_enabled BOOLEAN DEFAULT NULL,
  p_push_competition_updates BOOLEAN DEFAULT NULL,
  p_push_friend_requests BOOLEAN DEFAULT NULL,
  p_push_scorecard_updates BOOLEAN DEFAULT NULL,
  p_push_league_updates BOOLEAN DEFAULT NULL,
  p_push_side_game_updates BOOLEAN DEFAULT NULL,
  p_push_round_reminders BOOLEAN DEFAULT NULL,
  p_push_social_activity BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  push_enabled BOOLEAN,
  push_competition_updates BOOLEAN,
  push_friend_requests BOOLEAN,
  push_scorecard_updates BOOLEAN,
  push_league_updates BOOLEAN,
  push_side_game_updates BOOLEAN,
  push_round_reminders BOOLEAN,
  push_social_activity BOOLEAN
) AS $$
BEGIN
  UPDATE user_preferences
  SET
    push_enabled = COALESCE(p_push_enabled, user_preferences.push_enabled),
    push_competition_updates = COALESCE(p_push_competition_updates, user_preferences.push_competition_updates),
    push_friend_requests = COALESCE(p_push_friend_requests, user_preferences.push_friend_requests),
    push_scorecard_updates = COALESCE(p_push_scorecard_updates, user_preferences.push_scorecard_updates),
    push_league_updates = COALESCE(p_push_league_updates, user_preferences.push_league_updates),
    push_side_game_updates = COALESCE(p_push_side_game_updates, user_preferences.push_side_game_updates),
    push_round_reminders = COALESCE(p_push_round_reminders, user_preferences.push_round_reminders),
    push_social_activity = COALESCE(p_push_social_activity, user_preferences.push_social_activity),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    up.push_enabled,
    up.push_competition_updates,
    up.push_friend_requests,
    up.push_scorecard_updates,
    up.push_league_updates,
    up.push_side_game_updates,
    up.push_round_reminders,
    up.push_social_activity
  FROM user_preferences up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Note the migration drops BOTH the 7-arg and 8-arg `update_push_preferences` signatures before recreating, so it is re-runnable and supersedes the prior 7-arg version cleanly.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260615020000_social_activity_push_preference.sql
git commit -m "feat(notifications): add push_social_activity preference + should_send_push branch"
```

---

## Task 2: Client type + all mappers (must land together)

These changes add a **required** `pushSocialActivity` field to `PushPreferences`, so every object that constructs a `PushPreferences` must be updated in the same commit or `pnpm type-check` breaks. Do all edits, then type-check once, then commit.

**Files:**
- Modify: `src/types/push.types.ts`
- Modify: `src/hooks/pushNotifications/types.ts`
- Modify: `src/hooks/pushNotifications/main.ts`
- Modify: `src/hooks/pushNotifications/queries.ts`
- Modify: `src/hooks/pushNotifications/helpers.ts`

- [ ] **Step 1: `push.types.ts` — interface field**

In the `PushPreferences` interface, after the `pushRoundReminders: boolean;` line (with its doc comment), add:

```ts
  /** Notifications about social activity (likes & comments on your rounds) */
  pushSocialActivity: boolean;
```

- [ ] **Step 2: `push.types.ts` — default**

In `DEFAULT_PUSH_PREFERENCES`, after `pushRoundReminders: true,` add:

```ts
  pushSocialActivity: true,
```

- [ ] **Step 3: `hooks/pushNotifications/types.ts` — update input**

In `UpdatePushPreferencesInput`, after `pushRoundReminders?: boolean;` add:

```ts
  pushSocialActivity?: boolean;
```

- [ ] **Step 4: `main.ts` — row type**

In the `PushPrefsRow` type (`type PushPrefsRow = { ... }`), after `push_round_reminders: boolean;` add:

```ts
  push_social_activity: boolean;
```

- [ ] **Step 5: `main.ts` — SELECT strings (two places)**

Both SELECT strings currently read:

```ts
          'push_enabled, push_competition_updates, push_friend_requests, push_scorecard_updates, push_league_updates, push_side_game_updates, push_round_reminders'
```

Replace BOTH occurrences with (append `, push_social_activity`):

```ts
          'push_enabled, push_competition_updates, push_friend_requests, push_scorecard_updates, push_league_updates, push_side_game_updates, push_round_reminders, push_social_activity'
```

- [ ] **Step 6: `main.ts` — return mappings (two places) + default fallback**

There are two `return { ... }` blocks that map the row; each has a line `pushRoundReminders: data.push_round_reminders,`. After each, add:

```ts
        pushSocialActivity: data.push_social_activity,
```

There is also a default-fallback object whose last field is `pushRoundReminders: true,` (used when no row exists). After it add:

```ts
        pushSocialActivity: true,
```

- [ ] **Step 7: `main.ts` — update mutation guard**

After the block:

```ts
      if (input.pushRoundReminders !== undefined) {
        updateData.push_round_reminders = input.pushRoundReminders;
      }
```

add:

```ts
      if (input.pushSocialActivity !== undefined) {
        updateData.push_social_activity = input.pushSocialActivity;
      }
```

- [ ] **Step 8: `queries.ts` — row type, SELECT, mapping**

Mirror main.ts in queries.ts:
- In its `PushPrefsRow`, after `push_round_reminders: boolean;` add `  push_social_activity: boolean;`.
- In its SELECT string, append `, push_social_activity` (same as Step 5).
- After `pushRoundReminders: data.push_round_reminders,` in its return block, add `        pushSocialActivity: data.push_social_activity,`.

- [ ] **Step 9: `helpers.ts` — keep unused legacy mapper compiling**

`extractPreferencesFromPlayer` builds a `PushPreferences` and is explicitly unused (it reads legacy `players` columns, which do not include social activity). After its `pushRoundReminders: player.push_round_reminders ?? true,` line add:

```ts
    // Not stored on the legacy players record; this mapper is unused. Default on.
    pushSocialActivity: true,
```

- [ ] **Step 10: Type-check**

Run: `pnpm type-check`
Expected: only the known pre-existing baseline error `src/screens/rounds/ViewRoundScreen/useViewRoundScreen.ts(250,36)` — and NOTHING else. Any error mentioning `pushSocialActivity`, `PushPreferences`, or the files above means a construction site was missed; fix before committing.

- [ ] **Step 11: Commit**

```bash
git add src/types/push.types.ts src/hooks/pushNotifications/types.ts src/hooks/pushNotifications/main.ts src/hooks/pushNotifications/queries.ts src/hooks/pushNotifications/helpers.ts
git commit -m "feat(notifications): thread pushSocialActivity through prefs type and mappers"
```

---

## Task 3: Settings UI toggle

**Files:**
- Modify: `src/screens/profile/NotificationSettingsScreen.tsx`

- [ ] **Step 1: Add the handler**

After the `handleRoundRemindersChange` definition:

```ts
  const handleRoundRemindersChange = useCallback(
    (enabled: boolean) => {
      updatePreferences({ pushRoundReminders: enabled });
    },
    [updatePreferences]
  );
```

add:

```ts
  const handleSocialActivityChange = useCallback(
    (enabled: boolean) => {
      updatePreferences({ pushSocialActivity: enabled });
    },
    [updatePreferences]
  );
```

- [ ] **Step 2: Add the toggle row**

Immediately after the "Tee Time Reminders" `MenuItemRow` (the one with `testID="setting-round-reminders"` ending in `/>`), and before the closing `</View>` of the settings group, add:

```tsx
                <MenuItemRow
                  icon="account-heart-outline"
                  title="Social Activity"
                  subtitle="Likes and comments on your rounds"
                  showChevron={false}
                  disabled={isUpdatingPreferences}
                  rightContent={
                    <ToggleSwitch
                      value={preferences?.pushSocialActivity ?? true}
                      onValueChange={handleSocialActivityChange}
                      disabled={isUpdatingPreferences}
                    />
                  }
                  onPress={() => !isUpdatingPreferences && handleSocialActivityChange(!(preferences?.pushSocialActivity ?? true))}
                  testID="setting-social-activity"
                />
```

- [ ] **Step 3: Type-check + lint**

Run: `pnpm type-check && pnpm lint`
Expected: only the known baseline type error; lint clean.

- [ ] **Step 4: Commit**

```bash
git add src/screens/profile/NotificationSettingsScreen.tsx
git commit -m "feat(notifications): add Social Activity toggle to notification settings"
```

---

## Task 4: Test fixtures + verification

**Files:**
- Modify: `src/__tests__/hooks/usePushNotifications.test.tsx`
- Modify: `src/__tests__/utils/testFixtures.ts`

- [ ] **Step 1: Update the hook test mock**

In `usePushNotifications.test.tsx`, the `mockPreferences` object lists snake_case columns including `push_league_updates: true,`. Add `push_social_activity: true,` to that object (next to the other `push_*` fields).

- [ ] **Step 2: Update the shared fixture**

In `testFixtures.ts`, the `user_preferences` fixture lists `push_league_updates: true,`. Add `push_social_activity: true,` alongside it.

- [ ] **Step 3: Run the push-notifications test**

Run: `pnpm test src/__tests__/hooks/usePushNotifications.test.tsx`
Expected: PASS (same pass/fail set as before — adding the field must not break existing assertions). If the suite was already failing pre-change on `main`, compare against that baseline rather than expecting green.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/hooks/usePushNotifications.test.tsx src/__tests__/utils/testFixtures.ts
git commit -m "test(notifications): add push_social_activity to push preference fixtures"
```

---

## Final verification

- [ ] `pnpm type-check` — only the pre-existing `useViewRoundScreen.ts:250` baseline error.
- [ ] `pnpm lint` — clean on all touched files.
- [ ] `pnpm test src/__tests__/hooks/usePushNotifications.test.tsx` — no new failures vs baseline.
- [ ] **DB (manual, staging — not runnable here):** apply the migration, then:
  ```sql
  -- expect TRUE (global on, category default on)
  SELECT should_send_push('<user>', 'round_commented');
  UPDATE user_preferences SET push_social_activity = FALSE WHERE user_id = '<user>';
  -- expect FALSE now
  SELECT should_send_push('<user>', 'round_commented');
  -- other categories unaffected:
  SELECT should_send_push('<user>', 'friend_request_received'); -- still TRUE
  ```
- [ ] **Manual app check:** open Notification Settings, toggle "Social Activity" off, confirm it persists across a reload.

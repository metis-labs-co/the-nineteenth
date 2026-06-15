# Design: "Social Activity" push notification toggle

**Date:** 2026-06-15
**Status:** Approved, ready for planning

## Problem

Likes and comments on rounds (`round_liked`, `round_commented`,
`round_also_commented`) currently send push notifications that respect only the
master `push_enabled` toggle — there is no per-category control. Every other
notification category (competition, friends, scorecard, league, side-game,
tee-time) has a dedicated toggle in Settings. This adds the missing one.

## Decisions (settled during brainstorming)

- **Label:** "Social Activity", subtitle "Likes and comments on your rounds",
  icon `account-heart-outline`.
- **Default:** ON (`TRUE`), like every other category.
- **Scope:** gates **push only**. In-app notification rows are still created in
  the `notifications` table regardless — identical to all existing toggles.
- This is a pure mirror of the existing `push_league_updates` toggle, end to end.

## Architecture — the toggle mirrors `push_league_updates` at every layer

### 1. Database (one new migration)

The new migration must reproduce the **latest** definitions and re-create them
with one addition each. The latest `should_send_push()`, `get_user_push_preferences()`,
and `update_push_preferences()` live in `supabase/migrations/20260612000000_scheduled_rounds.sql`
(the plan must diff against that file, not older copies, before editing).

1. **Column:**
   ```sql
   ALTER TABLE user_preferences
     ADD COLUMN IF NOT EXISTS push_social_activity BOOLEAN NOT NULL DEFAULT TRUE;
   COMMENT ON COLUMN user_preferences.push_social_activity IS
     'Toggle for social activity push notifications (likes & comments on rounds)';
   ```
   Existing rows get `TRUE` via the default; the signup trigger
   (`create_user_preferences`, inserts only `user_id`) needs no change.

2. **`should_send_push()` — `CREATE OR REPLACE`** from the latest version, adding
   one CASE branch (these three types currently fall through to `ELSE TRUE`):
   ```sql
   WHEN p_notification_type IN (
     'round_liked', 'round_commented', 'round_also_commented'
   ) THEN up.push_social_activity
   ```

3. **`get_user_push_preferences()` and `update_push_preferences()` — DROP + RECREATE**
   from their latest definitions, adding the `push_social_activity` column to the
   returned `TABLE(...)` and the `p_push_social_activity BOOLEAN DEFAULT NULL`
   param + `COALESCE` assignment, following the exact pattern used for
   `push_round_reminders`. These RPCs are not called by the client (the client
   uses direct table access), but are updated to keep the column fully wired and
   consistent with the established pattern.

### 2. Client data layer

- **`src/types/push.types.ts`:** add `pushSocialActivity: boolean` to the
  `PushPreferences` interface and to `DEFAULT_PUSH_PREFERENCES` (`true`). Add it
  to `UpdatePushPreferencesInput` if that type enumerates fields.
- **Mapper files** — all three carry a `PushPrefsRow` type, a SELECT column
  string, and a snake→camel return mapping; each needs `push_social_activity`
  added in every spot:
  - `src/hooks/pushNotifications/main.ts`
  - `src/hooks/pushNotifications/queries.ts`
  - `src/hooks/pushNotifications/helpers.ts`
  The update-mutation also needs the field guard
  (`if (input.pushSocialActivity !== undefined) updateData.push_social_activity = input.pushSocialActivity;`).
- **`src/hooks/pushNotifications/types.ts`:** add the field if a row/prefs type is defined there.
- **`src/types/supabase.ts`:** add `push_social_activity` to the generated
  `user_preferences` Row/Insert/Update types (and any `get/update_push_preferences`
  Args/Returns) so direct-table access type-checks.

### 3. Settings UI

Add one `MenuItemRow` to `src/screens/profile/NotificationSettingsScreen.tsx` in
the "Notification Types" group (after the Tee Time Reminders row), plus a
`handleSocialActivityChange` handler mirroring `handleLeagueUpdatesChange`:

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
  onPress={() =>
    !isUpdatingPreferences &&
    handleSocialActivityChange(!(preferences?.pushSocialActivity ?? true))
  }
  testID="setting-social-activity"
/>
```

`src/components/settings/PushNotificationSettings.tsx` is storybook/test-only
(not rendered by any live screen), so it is **out of scope**. The plan may
optionally add the row there for storybook consistency, but the feature does not
depend on it.

### 4. Tests

- `src/__tests__/hooks/usePushNotifications.test.tsx`: add `push_social_activity`
  to the mock preferences row and assert the new field maps and updates.
- `src/__tests__/utils/testFixtures.ts`: add `push_social_activity` to any
  `user_preferences` fixture so existing tests keep compiling.

## Out of scope

- Changing how in-app notifications are stored or displayed (push gating only).
- The dead `PushNotificationSettings.tsx` component (optional consistency only).

## Verification

1. Apply the migration to staging.
2. `SELECT should_send_push('<user>', 'round_commented');` returns the global
   value when `push_social_activity = TRUE`, and `FALSE` after
   `UPDATE user_preferences SET push_social_activity = FALSE WHERE user_id = '<user>'`.
3. `pnpm type-check` and `pnpm lint` clean (modulo the known pre-existing
   `useViewRoundScreen.ts:250` baseline error).
4. `pnpm test src/__tests__/hooks/usePushNotifications.test.tsx`.
5. Manual: toggle "Social Activity" off in Settings, confirm it persists and the
   row reflects it.

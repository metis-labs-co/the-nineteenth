# Side Game & Prize Pool Notifications

## Context

The app has a mature push notification system covering competitions, rounds, scorecards, friends, leagues, and partnerships. However, three Premium-tier features — **skins games**, **wolf games**, and **prize pools** — have zero notification integration. These features involve real money, making notifications especially important so players know about results and payouts without needing to open the app.

This spec adds game-level notifications (no per-hole noise) for all three features under a single new user preference toggle: "Side Games & Payouts".

## Notification Types

Five new types following the existing `snake_case_noun_verb` naming convention:

| Type | Trigger Event | Recipients |
|------|---------------|------------|
| `skins_game_completed` | `skins_games.status` → `'completed'` | All `participant_ids` except triggerer |
| `skins_game_cancelled` | `skins_games.status` → `'cancelled'` | All `participant_ids` except triggerer |
| `wolf_game_completed` | `wolf_games.status` → `'completed'` | All `participant_ids` except triggerer |
| `wolf_game_cancelled` | `wolf_games.status` → `'cancelled'` | All `participant_ids` except triggerer |
| `prize_pool_settled` | `competition_prize_pools.status` → `'settled'` | All accepted `competition_players` |

## Push Messages

Messages are personalized per-recipient using payout data.

### Skins

**Completed (with pot):**
> Title: "Skins Game Complete"
> Body: "Skins game completed for Round 3 of Summer Cup. You won 2 holes (+$45.00)"

**Completed (payout data unavailable):**
> Title: "Skins Game Complete"
> Body: "Skins game completed for Round 3 of Summer Cup"

Note: Skins games always have a pot (`pot_value > 0` CHECK constraint), so financial details should always be included when payout data is available. This fallback only applies if payout rows haven't been written yet at trigger time.

**Cancelled:**
> Title: "Skins Game Cancelled"
> Body: "Skins game for Round 3 of Summer Cup has been cancelled"

### Wolf

**Completed (with pot):**
> Title: "Wolf Game Complete"
> Body: "Wolf game completed for Round 3 of Summer Cup. You finished with 8 pts (+$32.00)"

**Completed (no pot / pot_enabled=false):**
> Title: "Wolf Game Complete"
> Body: "Wolf game completed for Round 3 of Summer Cup. You finished with 8 pts"

**Cancelled:**
> Title: "Wolf Game Cancelled"
> Body: "Wolf game for Round 3 of Summer Cup has been cancelled"

### Prize Pool

**Settled (player placed):**
> Title: "Prize Pool Settled"
> Body: "Prize pool settled for Summer Cup. You placed 2nd and won $150.00"

**Settled (player did not place):**
> Title: "Prize Pool Settled"
> Body: "Prize pool for Summer Cup has been settled. Check the results!"

### Standalone Rounds (no competition)

When `rounds.competition_id IS NULL`, use course name instead:
> "Skins game completed at Royal Melbourne. You won 2 holes (+$45.00)"

## User Preferences

### New Column

Add `push_side_game_updates BOOLEAN NOT NULL DEFAULT TRUE` to the `user_preferences` table (where all push preference columns live since migration `20251229000000_user_preferences.sql`).

### Category Mapping

All 5 new types map to `push_side_game_updates` in `should_send_push()`.

### Settings UI

New toggle in PushNotificationSettings after "League Updates":
- **Label**: "Side Games & Payouts"
- **Description**: "Skins, Wolf, and prize pool results"

## Database Migration

Single file: `supabase/migrations/20260329000000_side_game_notification_triggers.sql`

Following the pattern from `20260318000000_partnership_notification_triggers.sql`.

**Important**: The `should_send_push()` function must be rebuilt from the latest version in `20260327000000_fix_standalone_round_visibility_and_notifications.sql` (which added `social_round_invitation` to the competition category and split partnerships into their own clause), not from the partnership migration's version. Otherwise we'd regress those fixes.

### Section 1: Update notifications type CHECK constraint

Drop and recreate `notifications_type_check` with all existing 16 types plus 5 new types.

### Section 2: Add preference column

```sql
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS
  push_side_game_updates BOOLEAN NOT NULL DEFAULT TRUE;
```

Also update `get_user_push_preferences()` and `update_push_preferences()` helper functions to include the new column (drop and recreate, following the pattern in `20260301000000_league_notification_triggers.sql` where `push_league_updates` was added).

### Section 3: Update should_send_push()

Add new WHEN clause:

```sql
WHEN p_notification_type IN (
  'skins_game_completed',
  'skins_game_cancelled',
  'wolf_game_completed',
  'wolf_game_cancelled',
  'prize_pool_settled'
) THEN up.push_side_game_updates
```

### Section 4: Trigger — notify_skins_game_status_changed()

- **Trigger**: `AFTER UPDATE ON skins_games FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('completed', 'cancelled'))`
- **Logic**:
  1. Determine type: `skins_game_completed` or `skins_game_cancelled`
  2. Join `rounds r ON r.id = NEW.round_id` → `competitions c ON c.id = r.competition_id` for context
  3. Loop `unnest(NEW.participant_ids)` as recipients
  4. Skip `auth.uid()` (the triggerer); if `auth.uid()` is NULL, notify everyone
  5. For completed: look up `skins_payouts` for each recipient to get `holes_won`, `net_result`
  6. Format currency using `NEW.currency` and `to_char(amount, 'FM999999990.00')`
  7. Skins always have a pot (pot_value > 0 constraint), so always include financial details when payout data is available. Fall back to generic message if payout row not found.
  8. Call `create_notification()` with `p_competition_id`, `p_round_id`
  9. Call `send_push_notification()` with personalized body

**JSONB payload**:
```sql
jsonb_build_object(
  'competition_name', v_competition_name,
  'round_number', v_round_number,
  'round_id', NEW.round_id::TEXT,
  'competition_id', v_competition_id::TEXT,
  'skins_game_id', NEW.id::TEXT,
  'holes_won', v_holes_won,
  'net_result', v_net_result,
  'currency', NEW.currency,
  'course_name', v_course_name
)
```

### Section 5: Trigger — notify_wolf_game_status_changed()

Identical structure to skins trigger with these differences:
- Fires on `wolf_games` table
- Looks up `wolf_payouts` for `total_points` and `net_result`
- Checks `NEW.pot_enabled` instead of `pot_value` for financial detail inclusion
- Message references "pts" instead of "holes"

### Section 6: Trigger — notify_prize_pool_settled()

- **Trigger**: `AFTER UPDATE ON competition_prize_pools FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM 'settled' AND NEW.status = 'settled')`
- **Logic**:
  1. Get `competition_name` from `competitions c WHERE c.id = NEW.competition_id`
  2. Loop `competition_players cp WHERE cp.competition_id = NEW.competition_id AND cp.status = 'accepted'`
  3. For each player, look up `prize_pool_placements WHERE pool_id = NEW.id AND player_id = cp.player_id`
  4. If placement exists: personalized message with ordinal position and payout_amount
  5. If no placement: generic "has been settled" message
  6. Call `create_notification()` with `p_competition_id = NEW.competition_id`
  7. Call `send_push_notification()`

**Ordinal helper** (inline in trigger):
```sql
v_position_text := v_position::TEXT ||
  CASE
    WHEN v_position % 100 IN (11, 12, 13) THEN 'th'
    WHEN v_position % 10 = 1 THEN 'st'
    WHEN v_position % 10 = 2 THEN 'nd'
    WHEN v_position % 10 = 3 THEN 'rd'
    ELSE 'th'
  END;
```

## Edge Cases

| Case | Handling |
|------|----------|
| **Standalone round (no competition)** | Use course name from `courses` table via `rounds.course_id` join. Omit competition context. |
| **No pot (wolf: pot_enabled=false)** | Omit financial details from wolf message body. Skins always have a pot (pot_value > 0 constraint). |
| **Team skins** | Still loop `participant_ids` for individual notifications. Payout lookup falls back to team_id when player_id is null in `skins_payouts` |
| **auth.uid() is NULL** | Notify all participants (service-role or system-triggered completion) |
| **Payout data not yet written** | Fall back to generic message without financial details |
| **Race conditions** | None — skins/wolf status updates are single-row atomic; prize pool settlement is single-transaction |
| **Prize pool with unassigned placements** | Players without a placement get the generic message |
| **Currency formatting** | Use `to_char(amount, 'FM999999990.00')` with currency symbol from the game/pool row |

## Edge Function Changes

**Note**: `config.ts` and `index.ts` have pre-existing gaps — league types (`league_player_joined`, etc.), partnership types, and `round_completed` are missing from the Edge Function's `NotificationType`, `NOTIFICATION_TEMPLATES`, `getCategoryId()`, and channel/category maps. These should be backfilled alongside adding the 5 new side-game types.

### config.ts

Add to `NotificationType` union:
```
'skins_game_completed' | 'skins_game_cancelled' | 'wolf_game_completed' | 'wolf_game_cancelled' | 'prize_pool_settled'
```

Add 5 entries to `NOTIFICATION_TEMPLATES`:
- `skins_game_completed`: title "Skins Game Complete", body "Skins game completed for {round_name} of {competition_name}"
- `skins_game_cancelled`: title "Skins Game Cancelled", body "Skins game for {round_name} of {competition_name} has been cancelled"
- `wolf_game_completed`: title "Wolf Game Complete", body "Wolf game completed for {round_name} of {competition_name}"
- `wolf_game_cancelled`: title "Wolf Game Cancelled", body "Wolf game for {round_name} of {competition_name} has been cancelled"
- `prize_pool_settled`: title "Prize Pool Settled", body "Prize pool for {competition_name} has been settled"

Add to `getCategoryId()`: all 5 → `'SIDE_GAME'`

### index.ts

Add to Android channel map: all 5 → `'side-game-updates'`
Add to iOS category map: all 5 → `'SIDE_GAME'`

## Client-Side Changes

### 1. TypeScript Enum — `src/types/database/enums.ts`

Add to `NotificationType`:
```typescript
| 'skins_game_completed'
| 'skins_game_cancelled'
| 'wolf_game_completed'
| 'wolf_game_cancelled'
| 'prize_pool_settled'
```

### 2. NotificationItem — `src/components/notifications/NotificationItem.tsx`

Add to `notificationConfig`:

| Type | Icon | Title | Message |
|------|------|-------|---------|
| `skins_game_completed` | `cards-playing-outline` | "Skins Game Complete" | "Skins game completed for Round N of X. You won N holes (+$X.XX)" |
| `skins_game_cancelled` | `cards-playing-outline` | "Skins Game Cancelled" | "Skins game for Round N of X has been cancelled" |
| `wolf_game_completed` | `paw` | "Wolf Game Complete" | "Wolf game completed for Round N of X. You finished with N pts (+$X.XX)" |
| `wolf_game_cancelled` | `paw` | "Wolf Game Cancelled" | "Wolf game for Round N of X has been cancelled" |
| `prize_pool_settled` | `trophy` | "Prize Pool Settled" | "Prize pool settled for X. You placed Nth and won $X.XX" |

getMessage functions use conditional logic: show financial details only when `net_result` is present in data; show placement only when `position` is present.

### 3. NotificationToast — `src/components/notifications/NotificationToast.tsx`

Same 5 config entries as NotificationItem.

### 4. Notification Handler — `src/services/notifications/notificationHandler.ts`

**NOTIFICATION_SCREEN_MAP**:
- `skins_game_completed` → `'ViewRound'`
- `skins_game_cancelled` → `'ViewRound'`
- `wolf_game_completed` → `'ViewRound'`
- `wolf_game_cancelled` → `'ViewRound'`
- `prize_pool_settled` → `'CompetitionDetail'`

Deep link data includes `roundId` + `competitionId` for skins/wolf (existing ViewRound handling works), and `competitionId` for prize pool (existing CompetitionDetail handling works).

**getCategoryForNotificationType()**: all 5 → `NotificationCategories.SIDE_GAME`

**isOnRelevantScreen()**: No changes — existing ViewRound and CompetitionDetail cases handle it.

### 5. Push Service — `src/services/notifications/pushService.ts`

- Add `SIDE_GAME: 'SIDE_GAME'` to `NotificationCategories`
- Register SIDE_GAME iOS category with `VIEW` action
- Add `side-game-updates` Android notification channel (DEFAULT importance)

### 6. Push Types — `src/types/push.types.ts`

- Add `pushSideGameUpdates: boolean` to `PushPreferences`
- Add `pushSideGameUpdates: true` to `DEFAULT_PUSH_PREFERENCES`
- Add mapping in `getEnabledNotificationTypes()` and `shouldSendNotification()`

### 7. Push Hooks — `src/hooks/pushNotifications/`

- `queries.ts`: add `push_side_game_updates` to select and PushPrefsRow
- `main.ts`: add to select, mapping, and mutation
- `helpers.ts`: add to `extractPreferencesFromPlayer()`

### 8. Settings UI — `src/components/settings/PushNotificationSettings.tsx`

New SettingRow after "League Updates":
- Label: "Side Games & Payouts"
- Description: "Skins, Wolf, and prize pool results"
- Toggle bound to `pushSideGameUpdates`

## Navigation Deep Links

| Notification Type | Target Screen | Params |
|-------------------|---------------|--------|
| `skins_game_completed` | `ViewRound` | `{ roundId, competitionId }` |
| `skins_game_cancelled` | `ViewRound` | `{ roundId, competitionId }` |
| `wolf_game_completed` | `ViewRound` | `{ roundId, competitionId }` |
| `wolf_game_cancelled` | `ViewRound` | `{ roundId, competitionId }` |
| `prize_pool_settled` | `CompetitionDetail` | `{ id: competitionId }` |

## Files to Modify

### Database
- `supabase/migrations/20260329000000_side_game_notification_triggers.sql` (NEW)

### Edge Function
- `supabase/functions/send-push-notification/config.ts`
- `supabase/functions/send-push-notification/index.ts`

### TypeScript Types
- `src/types/database/enums.ts`
- `src/types/push.types.ts`

### Services
- `src/services/notifications/pushService.ts`
- `src/services/notifications/notificationHandler.ts`

### Hooks
- `src/hooks/pushNotifications/queries.ts`
- `src/hooks/pushNotifications/main.ts`
- `src/hooks/pushNotifications/helpers.ts`

### Components
- `src/components/notifications/NotificationItem.tsx`
- `src/components/notifications/NotificationToast.tsx`
- `src/components/settings/PushNotificationSettings.tsx`

### Tests & Stories
- `src/components/notifications/NotificationItem.test.tsx`
- `src/components/notifications/NotificationToast.test.tsx`
- `src/components/notifications/NotificationItem.stories.tsx`
- `src/components/notifications/NotificationToast.stories.tsx`

## Verification

1. **Database**: Apply migration, verify triggers exist with `\df notify_skins*`, `\df notify_wolf*`, `\df notify_prize*`
2. **Type safety**: Run `pnpm type-check` — no errors from new types
3. **Unit tests**: Update and run `pnpm test` for NotificationItem and NotificationToast
4. **Integration**: Manually trigger a skins game completion in the dev database and verify:
   - In-app notification row created in `notifications` table
   - Push notification sent (check Edge Function logs)
   - Notification appears in notification list with correct icon/message
   - Toast appears when app is foregrounded
   - Tapping notification navigates to correct screen
5. **Preferences**: Toggle "Side Games & Payouts" off, trigger again — no push sent, in-app still created
6. **Team skins**: Complete a team skins game and verify individual participants all receive notifications with correct team payout data
7. **Standalone round**: Complete a skins/wolf game on a standalone round (no competition) and verify the message uses course name instead of competition name

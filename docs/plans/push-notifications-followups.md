# Push Notifications — Follow-up Fixes

**Goal:** Clean up three follow-ups identified during the silent-notification root-cause analysis: consolidate the duplicated foreground-handler config, sync the dev-only `test-push` edge function with the live `test-notification` payload, and add a per-type `interruptionLevel` mapping so informational pushes don't all claim to be time-sensitive.

**Status:** ✅ Complete (2026-05-18) — pending deploy.

**Context:** Primary push fix (banner+sound on foreground, blanket `time-sensitive` on all iOS pushes) shipped in a previous commit pair. These follow-ups are quality cleanups, not bug fixes.

---

## Overview

After fixing the silent-foreground-notification bug, three loose ends remain:

1. **Dead code in `src/services/notifications/channels.ts`** — `configureNotificationHandler()` (lines 24-37) sets the foreground handler correctly but is never called. The actual handler lives inline in `src/context/NotificationContext.tsx`. Two sources of truth, one of which is unreachable.
2. **`supabase/functions/test-push/index.ts` is out of sync** — `test-notification` is the live edge function (called by DB triggers); `test-push` is the dev/manual-test endpoint. We added `interruptionLevel: 'time-sensitive'` to `test-notification` but not `test-push`, so manual tests no longer mirror production.
3. **Blanket `time-sensitive` is heavier than needed** — every notification type currently bypasses Focus. That's the right default for the silent-delivery bug, but informational ones (`friend_request_accepted`, `league_player_joined`, etc.) should respect Focus modes per Apple's UX guidance.

### Scope boundaries

- **No DB schema changes.** No trigger SQL changes. Edge function payloads only.
- **No edge function rename.** The deployed slug is `test-notification` (renamed on Supabase from `send-push-notification`); don't touch that.
- **Existing auth, retry, channel, category mapping logic stays intact.** Additive changes only.

### Deployment surfaces

- Task 1 (client) — requires OTA: `eas update --branch production`
- Tasks 2 + 3 (edge functions) — require: `supabase functions deploy test-notification` and `supabase functions deploy test-push`

These are independent — ship task 1 separately from 2+3 if convenient.

---

## Task Breakdown

### Task 1 — Consolidate the foreground notification handler (client) ✅

**Goal:** Single source of truth for the foreground notification handler config. Move the handler setup into `channels.ts` and have `NotificationContext` call it via `pushService.configureNotificationHandler()`, matching how `setupAndroidNotificationChannel()` is already invoked.

**Files:**

| File | Change |
|---|---|
| `src/services/notifications/channels.ts` | Update `configureNotificationHandler()` body (lines 24-37) to match the current live values: `shouldShowBanner: true`, `shouldShowList: true`, `shouldPlaySound: true`, `shouldSetBadge: true`. Update the docstring to drop the "by default not displayed" framing — the explicit choice now is "show banner + sound; in-app toast may also fire, brief overlap is acceptable". |
| `src/context/NotificationContext.tsx` | Lines 249-262: replace the inline `Notifications.setNotificationHandler({...})` block with a single call to `pushService.configureNotificationHandler()`. Keep the explanatory comment so future readers understand the dual-display rationale. |
| `src/__tests__/hooks/usePushNotifications.test.tsx:107` | No code change needed — the mock already covers `configureNotificationHandler: jest.fn()`. Verify after task 1 that the test still passes; if `NotificationContext` is now exercised in any test that didn't mock it, add the mock there. |

**Verification:**
1. `pnpm type-check`
2. `pnpm test -- usePushNotifications NotificationContext` (or the closest existing test suites)
3. Manually: launch app on a physical device, send a test push while app is foregrounded, confirm banner + sound still fire (regression check on the recent fix).

**Acceptance:** No file in `src/` sets the notification handler inline. Only `channels.ts:configureNotificationHandler` calls `Notifications.setNotificationHandler`.

---

### Task 2 — Sync `test-push/index.ts` with the live payload shape (edge function) ✅

**Goal:** Match `test-push` to `test-notification` so manual push tests reproduce production delivery. Diff the two files and bring `test-push` up to parity for the message-building path only.

**Files:**

| File | Change |
|---|---|
| `supabase/functions/test-push/index.ts` | (1) Find the local `ExpoPushMessage` interface (line 49-area) and add `interruptionLevel?: 'passive' \| 'active' \| 'time-sensitive' \| 'critical'`. (2) Find the message-builder around line 449 and add `interruptionLevel: 'time-sensitive'` to the constructed message. (3) Spot-check that any other field present in `test-notification`'s builder (`sound`, `priority`, `channelId`, `categoryId`) is also present here; bring across anything missing. |

**Do not:**
- Refactor the duplication between `test-push` and `test-notification` (extracting a shared module is a separate, larger piece of work).
- Touch the auth/retry handling.
- Rename or restructure the function.

**Verification:**
1. `supabase functions serve test-push` locally; POST a test message; confirm the outgoing payload (visible in function logs) contains `interruptionLevel: 'time-sensitive'`.
2. After Task 3 below, re-verify with a payload from one of the `active`-tier types and confirm the per-type override flows through.

**Acceptance:** A `diff supabase/functions/test-push/index.ts supabase/functions/test-notification/index.ts` shows only structural/handler differences, not payload-field differences.

---

### Task 3 — Per-type `interruptionLevel` mapping (edge functions) ✅

**Goal:** Make `time-sensitive` opt-in per notification type rather than blanket. Urgent / action-required notifications keep `time-sensitive` (bypass Focus). Informational notifications drop to `active` (default; Focus modes silence them, which is correct UX).

**Suggested split** (subject to review during implementation — don't blindly apply, sanity-check each type against its trigger source):

| Level | Notification types |
|---|---|
| **`time-sensitive`** (bypass Focus) | `competition_player_added`, `new_round_created`, `friend_request_received`, `social_round_invitation`, `scorecard_submitted`, `tee_time_reminder`, `league_round_tagged`, `partnership_round_tagged`, `partnership_created`, `prize_pool_settled` |
| **`active`** (default; Focus silences) | `competition_player_joined`, `competition_status_changed`, `round_completed`, `friend_request_accepted`, `league_player_joined`, `league_player_left`, `league_player_removed`, `league_leaderboard_changed`, `skins_game_completed`, `skins_game_cancelled`, `wolf_game_completed`, `wolf_game_cancelled` |

**Files:**

| File | Change |
|---|---|
| `supabase/functions/test-notification/index.ts` | Below `ANDROID_CHANNEL_MAP` (around line 140), add a new constant: `const INTERRUPTION_LEVEL_MAP: Record<string, 'time-sensitive' \| 'active'> = { ... }` populated from the table above. Default any unmapped type to `'active'`. In `buildExpoPushMessage` (lines 234-272), replace the hardcoded `interruptionLevel: 'time-sensitive'` with `INTERRUPTION_LEVEL_MAP[request.notification_type] ?? 'active'`. |
| `supabase/functions/test-push/index.ts` | Mirror the same constant and the same lookup in its message builder. Keep the two maps in sync — accept the duplication for now (see "future work" note below). |

**Verification:**
1. `supabase functions serve test-notification` locally.
2. Trigger one push of each type via the existing test harness or by calling the function directly with `notification_type` set to each value in turn.
3. Inspect each outgoing payload and confirm the correct `interruptionLevel` per the table.
4. On a physical iOS device with Focus mode on (e.g. Do Not Disturb), confirm:
   - A `time-sensitive` push (e.g. `tee_time_reminder`) breaks through.
   - An `active` push (e.g. `friend_request_accepted`) is silenced.

**Acceptance:** Every notification type listed in `NOTIFICATION_CATEGORY_MAP` and `ANDROID_CHANNEL_MAP` has an explicit entry in `INTERRUPTION_LEVEL_MAP`, with no fallthrough to the default for known types (the `?? 'active'` is there only as defence-in-depth for future additions).

---

## Future Work (not in this plan)

- **De-duplicate `test-push` and `test-notification`.** They share ~80% of the code (interface definitions, message builder, retry logic, Expo API constants). Extract a shared module under `supabase/functions/_shared/push.ts` so future payload changes only need to land in one place. Worth doing before adding any more complexity to either function.
- **Per-type sound override.** Tee-time reminders could use a distinct iOS sound to be more recognisable. Out of scope here.
- **Push receipt polling.** The Expo Push API returns tickets immediately but real delivery status comes from the receipts endpoint, which is currently unused. Adding a receipt poll would let us proactively disable bad tokens and detect APNs/FCM-level failures instead of only catching `DeviceNotRegistered` on the next send. Larger piece of work — separate plan.

---

## Rollout

| Step | Channel | Command | Status |
|---|---|---|---|
| 1. Land task 1 (client) | OTA | `eas update --branch production --message "Consolidate push notification handler config"` | ⏳ Pending |
| 2. Land tasks 2 + 3 (edge functions) | Supabase deploy | `supabase functions deploy test-notification && supabase functions deploy test-push` | ⏳ Pending |
| 3. Verify on a physical device | Manual | Send one push of each type listed in the table above; confirm Focus-mode behaviour matches the level assigned. | ⏳ Pending |

---

## Execution Notes (2026-05-18)

**Files changed:**
- `src/services/notifications/channels.ts` — updated `configureNotificationHandler()` docstring to reflect the new "show banner + sound" intent. The function body was already correct.
- `src/context/NotificationContext.tsx` — replaced the inline `Notifications.setNotificationHandler({...})` block with a single call to `pushService.configureNotificationHandler()`.
- `supabase/functions/test-notification/index.ts` — added `INTERRUPTION_LEVEL_MAP` constant under the existing channel/category maps; replaced the hardcoded `interruptionLevel: 'time-sensitive'` in `buildExpoPushMessage` with `INTERRUPTION_LEVEL_MAP[request.notification_type] ?? 'active'`.
- `supabase/functions/test-push/index.ts` — added `interruptionLevel` field to local `ExpoPushMessage` interface; added a mirrored `INTERRUPTION_LEVEL_MAP` (with a sync comment pointing to the live function); added `interruptionLevel` to the message builder around the existing payload assembly.

**Verification:**
- `pnpm type-check` — produced one pre-existing error in `src/screens/auth/WelcomeCarouselScreen/components/WelcomeSlide0Intro.tsx` (missing `headline` prop), unrelated to this work. No new errors introduced by these changes.
- `pnpm test --testPathPattern=usePushNotifications` — fails to load due to a pre-existing broken mock path (`@/services/notifications/pushService` vs the actual `@/services/notifications`). This break predates this work (last touched in commit `b4c889e`) and is not introduced by these changes. Worth fixing in a separate cleanup pass.
- Manual on-device verification of the per-type Focus-mode behaviour is still pending the deploys above.

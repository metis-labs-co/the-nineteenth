# Push Notifications Guide

## Overview

The Nineteenth uses a hybrid notification system that delivers alerts both in-app (via Supabase Realtime) and as push notifications (via Expo Push API). Push notifications reach users when the app is in the background or closed.

### Notification Types

#### Competition & Round

| Type | Trigger | Recipients | Push Message |
|------|---------|------------|--------------|
| `competition_player_added` | Admin adds player | Added player | "You've been added to {competition}" |
| `competition_player_joined` | Player joins via code | Organizer | "{player} joined {competition}" |
| `new_round_created` | New round added | All players (except organizer) | "Round {n} added to {competition}" |
| `competition_status_changed` | Status update | All players | "{competition} is now {status}" |
| `scorecard_submitted` | Player submits scorecard | Organizer | "{player} submitted their scorecard" |
| `round_completed` | All scorecards submitted | All competition players | "All scorecards submitted for Round {n} of {competition}" |

#### Social

| Type | Trigger | Recipients | Push Message |
|------|---------|------------|--------------|
| `friend_request_received` | Friend request sent | Addressee | "{player} sent you a friend request" |
| `friend_request_accepted` | Friend request accepted | Requester | "{player} accepted your friend request" |
| `social_round_invitation` | Social round invite | Invited player | "{player} invited you to play" |

#### League

| Type | Trigger | Recipients | Push Message |
|------|---------|------------|--------------|
| `league_player_joined` | Player joins via invite code | League creator | "{player} joined {league}" |
| `league_player_left` | Player voluntarily leaves | League creator | "{player} left {league}" |
| `league_player_removed` | Admin removes player | Removed player | "You were removed from {league}" |
| `league_round_tagged` | Player tags a round | All other league members | "{player} tagged a round to {league} ({diff})" |
| `league_leaderboard_changed` | Rank shifts after tagging | Only players whose rank changed | "You moved up/down to #{rank} in {league}" |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Logs In                                             │
│    └─ AuthContext detects sign-in                           │
│       └─ Calls usePushNotifications().registerToken()       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Request Permission (iOS/Android)                         │
│    └─ expo-notifications.requestPermissionsAsync()          │
│       └─ Get Expo Push Token                                │
│          └─ expo-notifications.getExpoPushTokenAsync()      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Store Token in Database                                  │
│    └─ Supabase.from('push_tokens').upsert()                 │
│       └─ Link token to user_id + device                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Event Occurs (e.g., Friend Request)                      │
│    └─ Database trigger creates notification row             │
│       └─ Trigger also invokes Edge Function via pg_net      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Edge Function Sends Push                                 │
│    └─ Fetch user's push tokens from push_tokens table       │
│    └─ Check user preferences (should_send_push RPC)         │
│    └─ Send via Expo Push API                                │
│       └─ POST https://exp.host/--/api/v2/push/send          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. User Receives Notification                               │
│    ├─ App Open: In-app toast (via Realtime - existing)      │
│    ├─ App Background: OS notification banner                │
│    └─ Tap: Deep link to relevant screen                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

### New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20250313000000_push_tokens.sql` | Push tokens table + RLS |
| `supabase/migrations/20250314000000_push_preferences.sql` | Push preferences columns |
| `supabase/migrations/20250315000000_notification_triggers_push.sql` | Updated triggers with push support |
| `supabase/migrations/20260301000000_league_notification_triggers.sql` | League + round_completed triggers |
| `src/types/push.types.ts` | TypeScript type definitions |
| `src/types/database/push-token.types.ts` | Database push token types |
| `src/services/notifications/pushService.ts` | Push token management + categories |
| `src/services/notifications/notificationHandler.ts` | Notification response handling + deep linking |
| `src/hooks/usePushNotifications.ts` | React hook for push |
| `supabase/functions/test-notification/index.ts` | Edge Function for sending |
| `supabase/functions/test-notification/config.ts` | Message templates |
| `src/components/settings/PushNotificationSettings.tsx` | Settings UI |
| `src/components/notifications/NotificationItem.tsx` | Notification display config |
| `src/utils/pushNotificationTest.ts` | Development testing utility |

### Modified Files

| File | Changes |
|------|---------|
| `package.json` | Added expo-notifications, expo-device, expo-constants |
| `app.json` | Added expo-notifications plugin config |
| `src/hooks/queryKeys.ts` | Added pushKeys |
| `src/hooks/index.ts` | Exported usePushNotifications |
| `src/context/NotificationContext.tsx` | Integrated push handlers |
| `src/context/AuthContext.tsx` | Register token on sign in |
| `src/hooks/useAuth.ts` | Unregister token on logout |
| `src/screens/profile/SettingsScreen.tsx` | Added push settings |

---

## Setup

### 1. Dependencies (Already Installed)

```bash
pnpm add expo-notifications expo-device expo-constants
```

### 2. App Configuration (app.json)

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#2563eb"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "permissions": ["RECEIVE_BOOT_COMPLETED", "VIBRATE"]
    }
  }
}
```

### 3. Database Migrations

Apply the migrations in order:

```bash
# Local development
supabase db reset

# Or apply specific migrations
supabase migration up
```

### 4. Edge Function Deployment

```bash
# Deploy the push notification Edge Function
supabase functions deploy test-notification
```

### 5. Vault Secrets (REQUIRED — Local AND Production)

`send_push_notification()` reads two Supabase Vault secrets (`supabase_url`, `service_role_key`) to build the Edge Function URL + Authorization header for the `pg_net` call that dispatches each push. **These are NOT auto-populated by Supabase.** If they are missing, every trigger-driven push is silently dropped — the in-app notification row is still written, but no banner is sent and the failure is logged to `push_notification_errors`.

The `vault.create_secret()` signature is `(secret_value, name[, description])`. Run once per environment in the SQL Editor (or via `psql`):

```sql
-- Local development
SELECT vault.create_secret('http://localhost:54321', 'supabase_url');
SELECT vault.create_secret('<LOCAL_SERVICE_ROLE_KEY>', 'service_role_key');

-- Production (run against the hosted project)
SELECT vault.create_secret('https://<PROJECT_REF>.supabase.co', 'supabase_url');
SELECT vault.create_secret('<PRODUCTION_SERVICE_ROLE_KEY>', 'service_role_key');
```

Values are pulled from Supabase Dashboard → Settings → API. Do NOT commit them to the repo or to a migration — they live in Vault per-environment.

**Verifying setup:**

```sql
-- Should return two rows: supabase_url and service_role_key
SELECT name FROM vault.decrypted_secrets
WHERE name IN ('supabase_url', 'service_role_key');

-- Should be empty if triggers are working
SELECT created_at, notification_type, reason
FROM push_notification_errors
ORDER BY created_at DESC
LIMIT 20;
```

**Alternative (GUC settings):** If Vault is unavailable, set the same values as database-level GUCs. Requires a Postgres reconnect before the settings take effect:

```sql
ALTER DATABASE postgres SET app.settings.supabase_url     = 'https://<PROJECT_REF>.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = '<SERVICE_ROLE_KEY>';
```

---

## Testing on Real Devices

### Why Real Devices Are Required

Push notifications **do not work** on:
- iOS Simulator (no push token available)
- Expo Go app (limited push support)

You must use a **development build** on a physical device.

### Creating a Development Build

```bash
# Build for iOS device
eas build --platform ios --profile development

# Build for Android device
eas build --platform android --profile development

# Install on device and run
npx expo start --dev-client
```

### Testing the Flow

1. **Sign in** on a physical device
2. **Grant permission** when prompted for notifications
3. Verify token registration in database:
   ```sql
   SELECT * FROM push_tokens WHERE user_id = 'your-user-id';
   ```
4. **Trigger a notification** (e.g., send yourself a friend request from another account)
5. **Verify delivery** - notification should appear when app is backgrounded

### Using the Test Utility

The app includes a development-only test utility:

```typescript
import { pushTestUtils } from '@/utils/pushNotificationTest';

// Only available in __DEV__ mode
if (__DEV__ && pushTestUtils) {
  // Log current push state
  await pushTestUtils.logPushDebugInfo();

  // Simulate a local notification
  await pushTestUtils.simulateNotificationReceived('friend_request_received');

  // Clear registration for re-testing
  await pushTestUtils.clearLocalRegistration();
}
```

### Debug Logging

To view push notification debug information:

```typescript
import { pushTestUtils } from '@/utils/pushNotificationTest';

const debugInfo = await pushTestUtils?.logPushDebugInfo();
console.log(debugInfo);
// {
//   isPhysicalDevice: true,
//   permissionStatus: 'granted',
//   currentToken: 'ExponentPushToken[xxx]',
//   databaseTokens: [...],
//   preferences: { pushEnabled: true, ... }
// }
```

---

## Common Issues

### 1. "Push notifications only work on physical devices"

**Cause:** Running on iOS Simulator or not using a development build.

**Solution:**
- Use a physical iOS/Android device
- Build a development client: `eas build --profile development`
- Install and run with: `npx expo start --dev-client`

### 2. Permission Denied / Not Requested

**Cause:** User denied permission or permission not requested at right time.

**Solution:**
- Check permission status: `pushService.getPermissionStatus()`
- Link to device settings: `Linking.openSettings()`
- The Settings screen shows permission status and provides a link to device settings

### 3. Token Not Registered

**Cause:** Token registration failed silently or AsyncStorage has old state.

**Solution:**
```typescript
// Clear local registration state and re-register
import { pushTestUtils } from '@/utils/pushNotificationTest';
await pushTestUtils?.clearLocalRegistration();

// Then sign out and sign back in
```

### 4. Notifications Not Received When App is Backgrounded

**Cause:** Edge Function not configured or not receiving trigger.

**Debug steps:**
1. Check Edge Function logs: Supabase Dashboard → Edge Functions → Logs
2. Verify pg_net is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
3. Check if notification was created in database: `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;`

### 5. Edge Function Errors

**Common errors and solutions:**

| Error | Cause | Solution |
|-------|-------|----------|
| `DeviceNotRegistered` | Token is invalid/expired | Token is auto-disabled via `disable_push_token()` |
| `InvalidCredentials` | Missing/wrong project ID | Ensure `expo.extra.eas.projectId` is set in app.json |
| `MessageTooBig` | Payload > 4KB | Reduce data in notification payload |
| `TooManyRequests` | Rate limited | Expo allows 600 req/sec, batch notifications |

### 6. Duplicate Notifications

**Cause:** Both in-app and push notification showing.

**Solution:** The NotificationContext checks if the app is foregrounded and suppresses the OS banner, showing only the in-app toast. If you still see duplicates, check that `handleForegroundNotification` is properly suppressing.

---

## Edge Function Debugging

### Viewing Logs

```bash
# Via Supabase CLI
supabase functions logs test-notification

# Or in Supabase Dashboard
# Go to: Edge Functions → test-notification → Logs
```

### Testing Edge Function Locally

```bash
# Serve the function locally
supabase functions serve test-notification --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/test-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-id",
    "notification_type": "friend_request_received",
    "title": "Test Notification",
    "body": "This is a test",
    "data": {}
  }'
```

### Response Codes

| Status | Meaning |
|--------|---------|
| 200 | Success (may include partial failures in response body) |
| 400 | Invalid request (missing required fields) |
| 401 | Unauthorized (invalid/missing service role key) |
| 500 | Server error (check logs for details) |

### Response Body

```json
{
  "success": true,
  "sent": 2,
  "failed": 0,
  "skipped": 1,
  "errors": []
}
```

- `sent`: Number of push notifications successfully sent
- `failed`: Number that failed (see errors array)
- `skipped`: Number skipped (user preferences disabled, no tokens, etc.)

---

## User Preferences

Users can control push notifications via Settings screen:

### Preference Columns (on `user_preferences` table)

| Column | Default | Description |
|--------|---------|-------------|
| `push_enabled` | TRUE | Global toggle for all push notifications |
| `push_competition_updates` | TRUE | Competition-related notifications |
| `push_friend_requests` | TRUE | Friend request notifications |
| `push_scorecard_updates` | TRUE | Scorecard notifications |
| `push_league_updates` | TRUE | League-related notifications |

### Category Mapping

| Notification Type | Preference Column |
|-------------------|-------------------|
| `competition_player_added` | `push_competition_updates` |
| `competition_player_joined` | `push_competition_updates` |
| `new_round_created` | `push_competition_updates` |
| `competition_status_changed` | `push_competition_updates` |
| `round_completed` | `push_competition_updates` |
| `friend_request_received` | `push_friend_requests` |
| `friend_request_accepted` | `push_friend_requests` |
| `scorecard_submitted` | `push_scorecard_updates` |
| `league_player_joined` | `push_league_updates` |
| `league_player_left` | `push_league_updates` |
| `league_player_removed` | `push_league_updates` |
| `league_round_tagged` | `push_league_updates` |
| `league_leaderboard_changed` | `push_league_updates` |

### Checking Preferences

The Edge Function uses the `should_send_push()` database function:

```sql
SELECT should_send_push('user-uuid', 'friend_request_received');
-- Returns: TRUE if both push_enabled AND push_friend_requests are TRUE
```

---

## Multi-Device Support

### How It Works

- Each user can have multiple push tokens (phone + tablet)
- `push_tokens` table stores one row per (user_id, expo_token) pair
- When sending, all enabled tokens for the user receive the notification
- Token lifecycle handled automatically:
  - New token on app install/reinstall
  - Token disabled when Expo returns `DeviceNotRegistered`
  - Token re-enabled if user signs back in on same device

### Token Management

```typescript
// Register token (happens automatically on sign-in)
await pushService.registerPushToken(userId);

// Unregister on sign-out (disables token)
await pushService.unregisterPushToken(token);

// Completely remove token
await pushService.removePushToken(token);
```

---

## iOS-Specific Configuration

### Notification Categories and Actions

iOS supports actionable notifications. The app configures these categories:

```typescript
// In pushService.ts
const categories = [
  {
    identifier: 'COMPETITION',
    actions: [{ identifier: 'VIEW', title: 'View' }],
  },
  {
    identifier: 'FRIEND_REQUEST',
    actions: [
      { identifier: 'VIEW', title: 'View' },
      { identifier: 'ACCEPT', title: 'Accept', options: { foreground: true } },
    ],
  },
  {
    identifier: 'SCORECARD',
    actions: [{ identifier: 'VIEW', title: 'View' }],
  },
  {
    identifier: 'LEAGUE',
    actions: [{ identifier: 'VIEW', title: 'View' }],
  },
];
```

### Background Modes

Ensure `UIBackgroundModes` includes `remote-notification` in app.json:

```json
{
  "ios": {
    "infoPlist": {
      "UIBackgroundModes": ["remote-notification"]
    }
  }
}
```

---

## Android-Specific Configuration

### Notification Channels

Android 8+ requires notification channels. The app creates:

```typescript
// In pushService.ts
await Notifications.setNotificationChannelAsync('default', {
  name: 'Default',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#2563eb',
});
```

### Notification Icon

Android requires a specific notification icon format:
- 96x96 pixels
- White on transparent background
- Simple, recognizable shape

Place at: `assets/notification-icon.png`

---

## Security Considerations

### Token Security

- Push tokens are stored in `push_tokens` table with RLS enabled
- Users can only see/manage their own tokens
- Service role required to send notifications (Edge Functions)

### Edge Function Authentication

The Edge Function validates the service role:

```typescript
const isServiceRole = (req: Request): boolean => {
  const authHeader = req.headers.get('Authorization');
  return authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
};
```

### Preventing Spam

- Notifications are only triggered by database events (not user-callable)
- User preferences are checked before sending
- Invalid tokens are automatically disabled

---

## Monitoring and Analytics

### Tracking Delivery

The Edge Function response includes delivery stats:

```json
{
  "sent": 2,
  "failed": 1,
  "skipped": 0,
  "errors": [
    {
      "token": "ExponentPushToken[xxx]",
      "error": "DeviceNotRegistered"
    }
  ]
}
```

### Recommended Monitoring

1. **Edge Function Logs** - Check for errors in Supabase Dashboard
2. **Token Health** - Query disabled tokens periodically:
   ```sql
   SELECT COUNT(*) as disabled_count
   FROM push_tokens
   WHERE enabled = FALSE;
   ```
3. **Delivery Rate** - Track sent vs failed in your analytics

---

## Troubleshooting Checklist

When push notifications aren't working:

1. [ ] **Physical device?** - Not simulator/emulator
2. [ ] **Development build?** - Not Expo Go
3. [ ] **Permission granted?** - Check `pushService.getPermissionStatus()`
4. [ ] **Token registered?** - Check `push_tokens` table
5. [ ] **Edge Function deployed?** - `supabase functions list`
6. [ ] **Vault secrets set?** (local dev) - Check `vault.decrypted_secrets`
7. [ ] **User preferences enabled?** - Check `players.push_enabled`
8. [ ] **Trigger firing?** - Check if notification row created
9. [ ] **Edge Function logs?** - Check for errors in dashboard
10. [ ] **Token valid?** - Check `enabled` flag in `push_tokens`

---

## API Reference

### Push Service (`src/services/notifications/pushService.ts`)

```typescript
// Request push notification permissions
requestPermissions(): Promise<PermissionStatus>

// Get current permission status
getPermissionStatus(): Promise<PermissionStatus>

// Get Expo push token
getExpoPushToken(): Promise<string | undefined>

// Register token for current user
registerPushToken(userId: string): Promise<string | undefined>

// Disable token (on logout)
unregisterPushToken(token: string): Promise<boolean>

// Check if running on physical device
isPhysicalDevice(): boolean

// Get device info for token registration
getDeviceInfo(): { deviceId: string; deviceName: string; platform: string }
```

### Push Notifications Hook (`src/hooks/usePushNotifications.ts`)

```typescript
const {
  // Queries
  tokens,           // User's registered tokens
  preferences,      // Push notification preferences
  permissionStatus, // Current permission status
  isRegistered,     // Whether current device is registered

  // Mutations
  registerToken,    // Register current device
  updatePreferences, // Update notification preferences

  // Loading states
  isLoading,
  isRegistering,
} = usePushNotifications();
```

### Database Functions

```sql
-- Get user's enabled tokens
get_user_push_tokens(p_user_id UUID)
  RETURNS TABLE(expo_token TEXT, platform TEXT)

-- Register/update token
upsert_push_token(p_user_id, p_token, p_device_id, p_platform, p_device_name, p_app_version)
  RETURNS UUID

-- Disable token
disable_push_token(p_token TEXT)
  RETURNS BOOLEAN

-- Check if notification should be sent
should_send_push(p_user_id UUID, p_notification_type TEXT)
  RETURNS BOOLEAN

-- Update preferences
update_push_preferences(p_user_id, p_push_enabled, p_push_competition_updates, ..., p_push_league_updates)
  RETURNS TABLE(push_enabled BOOLEAN, ..., push_league_updates BOOLEAN)

-- Create notification (with optional league_id)
create_notification(p_user_id, p_type, p_data, p_competition_id, p_round_id, p_player_id, p_friendship_id, p_league_id)
  RETURNS UUID
```

---

## League Notifications

League notifications were added in `20260301000000_league_notification_triggers.sql`.

### Trigger Functions

| Function | Table | Event | Description |
|----------|-------|-------|-------------|
| `notify_league_player_joined()` | `league_players` | AFTER INSERT | Notifies league creator when a player joins (skips self-join) |
| `notify_league_player_status_changed()` | `league_players` | AFTER UPDATE (status) | Uses `removed_by` column to distinguish voluntary leave vs admin removal |
| `notify_league_round_tagged()` | `league_rounds` | AFTER INSERT | Notifies all league members + detects leaderboard rank changes |
| `notify_round_completed()` | `scorecards` | AFTER UPDATE (status → completed) | Fires when all scorecards for a round are submitted |

### Voluntary Leave vs Admin Removal

The `league_players.removed_by` column distinguishes the two cases:

- **Voluntary leave**: `removed_by = player_id` → sends `league_player_left` to league creator
- **Admin removal**: `removed_by != player_id` (or `removed_by = admin_id`) → sends `league_player_removed` to the removed player

The API layer sets `removed_by` accordingly:
- `leaveLeague()` sets `removed_by: currentUser.id` (self)
- `removePlayer()` sets `removed_by: currentUser.id` (admin)

### Leaderboard Change Detection

When a round is tagged (`notify_league_round_tagged`), the trigger:

1. Computes the "old" leaderboard by running the leaderboard CTE **excluding** the new `league_rounds.id`
2. Computes the "new" leaderboard via `get_league_leaderboard()` (includes the new round)
3. Compares ranks for each player
4. Only sends `league_leaderboard_changed` to players whose rank actually changed
5. Includes direction (`up` or `down`) and old/new rank in the data payload

This is efficient for typical league sizes (<20 players) and runs inline in the trigger.

### Round Completion Race Condition

When two scorecards complete simultaneously, both `notify_round_completed` triggers could fire. Mitigation:

- `rounds.completion_notified` (BOOLEAN DEFAULT FALSE) acts as an atomic guard
- The trigger uses `UPDATE rounds SET completion_notified = TRUE WHERE id = ? AND completion_notified = FALSE RETURNING id`
- Only the first trigger to succeed (gets a row back) sends the notifications
- The second trigger sees `completion_notified = TRUE` and exits silently

### Deep Linking

League notifications navigate to `LeagueDetail` screen:

| Notification Type | Target Screen | Params |
|-------------------|---------------|--------|
| `league_player_joined` | `LeagueDetail` | `{ id: leagueId }` |
| `league_player_left` | `LeagueDetail` | `{ id: leagueId }` |
| `league_player_removed` | `LeagueDetail` | `{ id: leagueId }` |
| `league_round_tagged` | `LeagueDetail` | `{ id: leagueId }` |
| `league_leaderboard_changed` | `LeagueDetail` | `{ id: leagueId }` |
| `round_completed` | `ViewRound` | `{ roundId, competitionId }` |

### Android Channel

League notifications use the `league-updates` Android notification channel (HIGH importance).

### Settings UI

The "League Updates" toggle appears in Push Notification Settings under "Notification Types", after "Scorecard Updates". It controls all 5 league notification types via the `push_league_updates` preference column.

---

## Related Documentation

- [DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md) - `push_tokens` table and functions
- [OFFLINE_ARCHITECTURE.md](./OFFLINE_ARCHITECTURE.md) - Offline-first architecture
- [Expo Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/)

---

*Last Updated: February 2026*

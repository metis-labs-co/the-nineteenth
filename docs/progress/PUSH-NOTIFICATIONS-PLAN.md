# Push Notifications - Implementation Plan

**Goal:** Add push notifications to complement the existing in-app notification system, enabling users to receive alerts when the app is in the background or closed.
**Status:** ✅ Complete - 96% (23/24 tasks, 1 skipped)

---

## Overview

This plan adds **push notifications** to The Nineteenth app. The app already has a robust in-app notification system with database triggers and Supabase Realtime subscriptions. Push notifications will extend this to reach users when they're not actively using the app.

### Current State (Already Implemented)

- **Database Schema**: `notifications` table with triggers for 8 notification types
- **Real-time Subscriptions**: Supabase Realtime delivers instant in-app updates
- **UI Components**: Toast notifications and notification list screens
- **State Management**: Zustand store + React Query for notification state
- **Navigation Integration**: Deep links to relevant screens on notification tap
- **Background Tasks**: `expo-background-fetch` and `expo-task-manager` installed

### What This Plan Adds

- **Push Token Management**: Store Expo push tokens per user/device
- **Permission Handling**: iOS/Android notification permission requests
- **Push Delivery**: Supabase Edge Function to send via Expo Push API
- **Hybrid Notifications**: In-app (Realtime) + Push work together seamlessly
- **User Preferences**: Toggle push notifications on/off

### Notification Types Supported

| Type | Trigger | Push Message |
|------|---------|--------------|
| `competition_player_added` | Admin adds player | "You've been added to {competition}" |
| `competition_player_joined` | Player joins via code | "{player} joined {competition}" |
| `new_round_created` | New round added | "New round added to {competition}" |
| `competition_status_changed` | Competition status update | "{competition} is now {status}" |
| `scorecard_submitted` | Player submits scorecard | "{player} submitted their scorecard" |
| `friend_request_received` | Friend request sent | "{player} sent you a friend request" |
| `friend_request_accepted` | Friend request accepted | "{player} accepted your friend request" |

### Architecture Overview

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

## Sprint 1: Package Setup & Configuration

### Task 1: Install Dependencies
**Status:** ✅ Complete
**Command:**
```bash
pnpm add expo-notifications expo-device expo-constants
```
**Deliverables:**
- [x] `expo-notifications` package installed
- [x] `expo-device` package installed (for device info)
- [x] `expo-constants` package installed (for project ID)
- [x] Verify packages in `package.json`

**Dependencies:** None

---

### Task 2: Update app.json Configuration
**Status:** ✅ Complete
**Deliverables:**
- [x] Add `expo-notifications` to plugins array
- [x] Configure notification icon for Android
- [x] Configure notification color
- [x] Add iOS background modes for remote notifications
- [x] Add Android permissions for notifications

**Configuration to add:**
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

**Dependencies:** Task 1

---

### Task 3: Create Notification Icon Assets
**Status:** ⏭️ Skipped (iOS only for first build)
**Deliverables:**
- [ ] Create `assets/notification-icon.png` (96x96, white on transparent for Android)
- [ ] Ensure icon follows Android notification icon guidelines (single color, simple shape)

**Note:** Skipped - Android notification icon not needed for iOS-only first build. Will revisit for Android release.

**Dependencies:** None

---

## Sprint 2: Database Schema

### Task 4: Create Push Tokens Migration
**Status:** ✅ Complete
**File:** `supabase/migrations/20250313000000_push_tokens.sql`
**Deliverables:**
- [x] `supabase/migrations/20250313000000_push_tokens.sql`
- [x] `push_tokens` table with all columns
- [x] Unique constraint on (user_id, expo_token)
- [x] Indexes for efficient lookups (idx_push_tokens_user, idx_push_tokens_enabled, idx_push_tokens_token)
- [x] Updated_at trigger
- [x] RLS policies (users manage own tokens, service role full access)
- [x] Helper functions (get_user_push_tokens, upsert_push_token, disable_push_token, get_users_with_push_enabled)

**Dependencies:** None

---

### Task 5: Add RLS Policies for Push Tokens
**Status:** ✅ Complete (included in Task 4)
**Note:** RLS policies were included in the main push_tokens migration.
**Deliverables:**
- [x] RLS enabled on push_tokens
- [x] Users can CRUD their own tokens only
- [x] Service role has full access (for Edge Functions)

**Dependencies:** Task 4

---

### Task 6: Create Push Token Helper Functions
**Status:** ✅ Complete (included in Task 4)
**Note:** Helper functions were included in the main push_tokens migration.
**Deliverables:**
- [x] `get_user_push_tokens()` function
- [x] `upsert_push_token()` function
- [x] `disable_push_token()` function
- [x] `get_users_with_push_enabled()` function
- [x] All functions marked SECURITY DEFINER

**Dependencies:** Task 4

---

### Task 7: Add Push Preferences to Players Table
**Status:** ✅ Complete
**File:** `supabase/migrations/20250314000000_push_preferences.sql`
**Deliverables:**
- [x] `push_enabled` column on players (global toggle)
- [x] `push_competition_updates` column
- [x] `push_friend_requests` column
- [x] `push_scorecard_updates` column
- [x] `get_user_push_preferences()` function
- [x] `should_send_push()` function (bonus - checks if notification should be sent based on type)
- [x] `update_push_preferences()` function (bonus - for updating preferences)
- [x] Partial index for users with push enabled
- [x] TypeScript types updated (`PushPreferences` interface in `player.types.ts`)

**Dependencies:** None

---

## Sprint 3: TypeScript Types

### Task 8: Create Push Notification Types
**Status:** ✅ Complete
**File:** `src/types/push.types.ts`
**Deliverables:**
- [x] `src/types/push.types.ts`
- [x] DBPushToken interface (snake_case database type)
- [x] PushToken interface (camelCase app type)
- [x] PushPreferences interface
- [x] PushNotificationData type
- [x] ExpoPushMessage type (matches Expo Push API format)
- [x] ExpoPushTicket and ExpoPushReceipt types
- [x] PushTokenInput type
- [x] `mapDBPushToken()` mapper function
- [x] `mapPushTokenToDB()` reverse mapper function
- [x] `isValidExpoPushToken()` validation utility
- [x] `getEnabledNotificationTypes()` preference helper
- [x] `shouldSendNotification()` preference helper
- [x] `DEFAULT_PUSH_PREFERENCES` constant
- [x] Export from `src/types/index.ts`

**Dependencies:** Task 4 (schema reference)

---

### Task 9: Update Database Types
**Status:** ✅ Complete
**Files:**
- `src/types/database/push-token.types.ts` (new)
- `src/types/database/schema.ts` (updated)
- `src/types/database/index.ts` (updated)
**Deliverables:**
- [x] `PushToken` interface in `push-token.types.ts`
- [x] `push_tokens` table added to `Database['public']['Tables']` with Row, Insert, Update, Relationships
- [x] Push token functions added to schema: `get_user_push_tokens`, `upsert_push_token`, `disable_push_token`, `get_users_with_push_enabled`
- [x] `PushToken` type exported from `src/types/database/index.ts`
- [x] Players type already had push preferences (Task 7)

**Dependencies:** Task 8

---

## Sprint 4: Push Service Implementation

### Task 10: Create Push Service
**Status:** ✅ Complete
**File:** `src/services/notifications/pushService.ts`
**Deliverables:**
- [x] `src/services/notifications/pushService.ts`
- [x] `requestPermissions()` function - requests iOS/Android permissions
- [x] `getPermissionStatus()` function - checks current permission status
- [x] `getExpoPushToken()` function - gets Expo token with projectId
- [x] `registerPushToken(userId)` function - full registration flow with DB upsert
- [x] `unregisterPushToken(token)` function - disables token in database
- [x] `removePushToken(token)` function - completely removes token from database
- [x] `isPhysicalDevice()` function - checks if running on real device
- [x] `getDeviceInfo()` function - returns device ID, name, platform
- [x] `configureNotificationHandler()` function - sets up foreground behavior
- [x] `setupAndroidNotificationChannel()` function - creates Android channels
- [x] Notification listener helpers (addNotificationReceivedListener, addNotificationResponseListener)
- [x] Badge management functions (setBadgeCount, getBadgeCount, clearBadge)
- [x] Export from `src/services/notifications/index.ts`
- [x] Exported as `pushService` singleton

**Dependencies:** Task 8 (types), Task 6 (DB functions)

---

### Task 11: Create Push Notification Hook
**Status:** ✅ Complete
**File:** `src/hooks/usePushNotifications.ts`
**Deliverables:**
- [x] `src/hooks/usePushNotifications.ts`
- [x] pushTokensQuery - fetches user's enabled tokens from push_tokens table
- [x] pushPreferencesQuery - fetches user's push preferences from players table
- [x] registerTokenMutation - calls pushService.registerPushToken() with auto-registration
- [x] updatePreferencesMutation - updates push preferences with optimistic updates
- [x] Notification listeners setup - foreground and response listeners on mount
- [x] Auto-registration logic - registers when authenticated, on physical device, not previously registered
- [x] Export from `src/hooks/index.ts`
- [x] Convenience hooks: usePushPermissionStatus, usePushPreferences, useIsPushRegistered

**Dependencies:** Task 10 (pushService)

---

### Task 12: Add Push Query Keys
**Status:** ✅ Complete
**File:** `src/hooks/queryKeys.ts`
**Deliverables:**
- [x] `pushKeys` object in queryKeys.ts
- [x] Keys: all, tokens, preferences, permissionStatus
- [x] Export pushKeys
- [x] Added to `allQueryKeys` array

**Dependencies:** None

---

## Sprint 5: Notification Handlers & Deep Linking

### Task 13: Create Notification Response Handler
**Status:** ✅ Complete
**File:** `src/services/notifications/notificationHandler.ts`
**Deliverables:**
- [x] `src/services/notifications/notificationHandler.ts`
- [x] `handleNotificationResponse()` function - extracts data, navigates based on type
- [x] `handleForegroundNotification()` function - decides toast display with screen relevance check
- [x] Navigation type mapping (NOTIFICATION_SCREEN_MAP)
- [x] Screen relevance check (isOnRelevantScreen)
- [x] Helper utilities: getScreenForNotificationType, buildNavigationParams
- [x] Exported from `src/services/notifications/index.ts`

**Dependencies:** Task 8 (types)

---

### Task 14: Update NotificationContext for Push
**Status:** ✅ Complete
**File:** `src/context/NotificationContext.tsx`
**Deliverables:**
- [x] Push notification listeners in NotificationContext (foreground and response listeners)
- [x] Auto-registration on auth (via usePushNotifications hook - already handles this)
- [x] Notification tap handling with navigation (handleNotificationResponse, navigateToNotificationTarget)
- [x] Foreground notification coordination (suppress OS banner, use in-app toast system)
- [x] Context value extended with push status (pushEnabled, pushPermissionStatus, requestPushPermission, isPushRegistered)
- [x] Proper cleanup on unmount (subscription.remove())

**Dependencies:** Task 11 (usePushNotifications hook)

---

### Task 15: Configure Notification Categories (iOS)
**Status:** ✅ Complete
**Files:**
- `src/services/notifications/pushService.ts`
- `src/services/notifications/notificationHandler.ts`
- `src/services/notifications/index.ts`

**Deliverables:**
- [x] `configureNotificationCategories()` function added to pushService
- [x] COMPETITION category with 'View' action
- [x] FRIEND_REQUEST category with 'View' and 'Accept' actions
- [x] SCORECARD category with 'View' action
- [x] `NotificationCategories` and `NotificationActions` constants exported
- [x] `handleNotificationActionResponse()` function added to notificationHandler
- [x] `getCategoryForNotificationType()` helper function added
- [x] `ActionResponseResult` interface for action handling
- [x] All new exports added to index.ts

**Dependencies:** Task 10 (pushService)

---

## Sprint 6: Supabase Edge Function

### Task 16: Create Edge Function for Push Sending
**Status:** ✅ Complete
**File:** `supabase/functions/send-push-notification/index.ts`
**Deliverables:**
- [x] `supabase/functions/send-push-notification/index.ts`
- [x] Request validation (validateRequest function with type checking)
- [x] Service role authentication (isServiceRole function)
- [x] Token fetching from database (via get_user_push_tokens RPC)
- [x] Preference checking (via should_send_push RPC)
- [x] Expo Push API integration (buildExpoPushMessage, sendPushNotifications)
- [x] Invalid token handling (DeviceNotRegistered detection, disable_push_token RPC)
- [x] Retry logic (MAX_RETRIES=3 with exponential backoff)
- [x] Response handling (sent/failed/skipped counts, error collection)
- [x] CORS headers for mobile app
- [x] Notification category mapping (iOS actions)
- [x] Android channel mapping

**Dependencies:** Task 6 (DB functions), Task 7 (preferences)

---

### Task 17: Create Edge Function Config
**Status:** ✅ Complete
**File:** `supabase/functions/send-push-notification/config.ts`
**Deliverables:**
- [x] `supabase/functions/send-push-notification/config.ts`
- [x] EXPO_PUSH_API_URL constant
- [x] EXPO_PUSH_RECEIPTS_URL constant (bonus)
- [x] EXPO_PUSH_BATCH_SIZE constant (bonus)
- [x] DEFAULT_TTL_SECONDS constant (bonus)
- [x] NOTIFICATION_TEMPLATES with all 8 types
- [x] `buildPushMessage()` function with template interpolation
- [x] `getCategoryId()` helper function (bonus)
- [x] `getNotificationSound()` helper function (bonus)
- [x] `getNotificationPriority()` helper function (bonus)
- [x] `isValidExpoPushToken()` validation function (bonus)

**Dependencies:** None

---

### Task 18: Update Database Triggers to Call Edge Function
**Status:** ✅ Complete
**File:** `supabase/migrations/20250315000000_notification_triggers_push.sql`
**Deliverables:**
- [x] Update `notify_friend_request()` trigger
- [x] Update `notify_friend_request_accepted()` trigger
- [x] Update `notify_competition_player_added()` trigger
- [x] Update `notify_competition_player_joined()` trigger
- [x] Update `notify_new_round_created()` trigger
- [x] Update `notify_scorecard_submitted()` trigger
- [x] Update `notify_competition_status_changed()` trigger
- [x] Error handling in triggers (RAISE WARNING, never blocks)
- [x] pg_net extension enabled (`CREATE EXTENSION IF NOT EXISTS pg_net`)
- [x] `send_push_notification()` helper function created
- [x] Vault secrets integration for local development

**Implementation Notes:**
- Each trigger now calls `send_push_notification()` after creating the in-app notification
- Uses `net.http_post()` from pg_net for async HTTP requests
- Errors are logged via `RAISE WARNING` but never block the transaction
- Push notification data includes all relevant IDs for deep linking
- Supports both Supabase hosted (auto-config) and local development (vault secrets)

**Dependencies:** Task 16 (Edge Function)

---

## Sprint 7: User Settings UI

### Task 19: Create Push Settings Component
**Status:** ✅ Complete
**File:** `src/components/settings/PushNotificationSettings.tsx`
**Deliverables:**
- [x] `src/components/settings/PushNotificationSettings.tsx`
- [x] Master push toggle
- [x] Category toggles (competition, friends, scorecards)
- [x] Permission status display
- [x] Link to device settings
- [x] Accessibility labels
- [x] Index file for settings components

**Dependencies:** Task 11 (usePushNotifications)

---

### Task 20: Add Push Settings to SettingsScreen
**Status:** ✅ Complete
**File:** `src/screens/profile/SettingsScreen.tsx`
**Deliverables:**
- [x] Import PushNotificationSettings in SettingsScreen
- [x] New 'Notifications' section between Distance Units and Scoring Entry
- [x] Consistent styling with other settings (section title, description, component)
- [x] Updated doc comment to mention push notification preferences

**Dependencies:** Task 19 (PushNotificationSettings)

---

## Sprint 8: Auth Integration

### Task 21: Register Token on Sign In
**Status:** ✅ Complete
**File:** `src/context/AuthContext.tsx`
**Deliverables:**
- [x] Push token registration after sign in (via attemptPushTokenRegistration helper)
- [x] Physical device check (pushService.isPhysicalDevice())
- [x] Permission check before registration (pushService.getPermissionStatus())
- [x] AsyncStorage for registration status (PUSH_TOKEN_REGISTERED_KEY)
- [x] Error handling (non-blocking - uses .catch() and console.warn)
- [x] Clears registration status on sign out (for re-registration on next login)
- [x] Invalidates push queries after successful registration

**Implementation Notes:**
- Added `attemptPushTokenRegistration()` helper function to handle all prerequisites
- Uses `pushService` directly instead of hook to avoid circular dependencies
- Registration is non-blocking - auth flow continues regardless of push success
- AsyncStorage key shared with usePushNotifications hook for consistency

**Dependencies:** Task 14 (NotificationContext updates)

---

### Task 22: Unregister Token on Sign Out
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update src/hooks/useAuth.ts logout() function to unregister push token before signing out. Call pushService.unregisterPushToken() with current device's token. This ensures the user doesn't receive notifications after logout. Handle errors gracefully - proceed with logout even if unregister fails."
```
**Deliverables:**
- [x] Unregister push token in logout flow
- [x] Error handling (non-blocking)
- [x] Clear local push state on logout

**Implementation Notes:**
- Updated `logoutMutation` in `src/hooks/useAuth.ts`
- Gets current device's Expo push token via `pushService.getExpoPushToken()`
- Calls `pushService.unregisterPushToken()` to disable the token in database
- All push token operations wrapped in try/catch - errors are logged but don't block logout
- Supabase signOut proceeds regardless of push token unregistration result

**Dependencies:** Task 10 (pushService)

---

## Sprint 9: Testing & Polish

### Task 23: Create Push Notification Test Utility
**Status:** ✅ Complete
**File:** `src/utils/pushNotificationTest.ts`
**Deliverables:**
- [x] `src/utils/pushNotificationTest.ts`
- [x] `sendTestNotification(userId, type)` function - calls Edge Function directly with test data
- [x] `simulateNotificationReceived(type, customData?)` function - triggers local notification with mock data
- [x] `logPushDebugInfo()` function - logs current token, permission status, preferences, database tokens
- [x] `clearLocalRegistration()` function (bonus) - clears AsyncStorage for re-testing registration
- [x] `cancelAllNotifications()` function (bonus) - clears all scheduled/displayed notifications
- [x] `pushTestUtils` DEV-only export object
- [x] Type exports: `TestResult`, `PushDebugInfo`, `NotificationData`
- [x] Mock notification data for all 8 notification types
- [x] Exported from `src/utils/index.ts`

**Implementation Notes:**
- All functions wrapped in `__DEV__` checks
- `pushTestUtils` is `undefined` in production builds
- `sendTestNotification` documents that Edge Function requires service role key
- `logPushDebugInfo` returns structured `PushDebugInfo` object and logs to console
- Mock data includes realistic titles, bodies, and navigation data for each notification type

**Dependencies:** Task 16 (Edge Function)

---

### Task 24: Update Documentation
**Status:** ✅ Complete
**Deliverables:**
- [x] `docs/database/DATABASE_SCHEMA.md` - push_tokens table docs
- [x] `CLAUDE.md` - push notifications mention
- [x] `docs/guides/PUSH_NOTIFICATIONS.md` - comprehensive guide

**Implementation Notes:**
- Added `push_tokens` table documentation to DATABASE_SCHEMA.md (columns, indexes, constraints, RLS policies)
- Added `PushToken` and `PushPreferences` TypeScript interfaces
- Added all push token database functions: `get_user_push_tokens`, `upsert_push_token`, `disable_push_token`, `get_users_with_push_enabled`, `get_user_push_preferences`, `should_send_push`, `update_push_preferences`, `send_push_notification`
- Updated CLAUDE.md with Push Notifications tech stack section and documentation links
- Created comprehensive docs/guides/PUSH_NOTIFICATIONS.md with architecture, setup, testing, common issues, Edge Function debugging, and API reference

**Dependencies:** All previous tasks

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 24
- **Completed:** 23 (96%)
- **Skipped:** 1 (4%)
- **In Progress:** 0 (0%)
- **Not Started:** 0 (0%)

### Sprint Progress

**Sprint 1: Package Setup & Configuration** ✅ Complete (3/3 tasks)
- ✅ Task 1: Install Dependencies
- ✅ Task 2: Update app.json Configuration
- ⏭️ Task 3: Create Notification Icon Assets (Skipped - iOS only)

**Sprint 2: Database Schema** ✅ Complete (4/4 tasks)
- ✅ Task 4: Create Push Tokens Migration
- ✅ Task 5: Add RLS Policies for Push Tokens (included in Task 4)
- ✅ Task 6: Create Push Token Helper Functions (included in Task 4)
- ✅ Task 7: Add Push Preferences to Players Table

**Sprint 3: TypeScript Types** ✅ Complete (2/2 tasks)
- ✅ Task 8: Create Push Notification Types
- ✅ Task 9: Update Database Types

**Sprint 4: Push Service Implementation** ✅ Complete (3/3 tasks)
- ✅ Task 10: Create Push Service
- ✅ Task 11: Create Push Notification Hook
- ✅ Task 12: Add Push Query Keys

**Sprint 5: Notification Handlers & Deep Linking** ✅ Complete (3/3 tasks)
- ✅ Task 13: Create Notification Response Handler
- ✅ Task 14: Update NotificationContext for Push
- ✅ Task 15: Configure Notification Categories (iOS)

**Sprint 6: Supabase Edge Function** ✅ Complete (3/3 tasks)
- ✅ Task 16: Create Edge Function for Push Sending
- ✅ Task 17: Create Edge Function Config
- ✅ Task 18: Update Database Triggers to Call Edge Function

**Sprint 7: User Settings UI** ✅ Complete (2/2 tasks)
- ✅ Task 19: Create Push Settings Component
- ✅ Task 20: Add Push Settings to SettingsScreen

**Sprint 8: Auth Integration** ✅ Complete (2/2 tasks)
- ✅ Task 21: Register Token on Sign In
- ✅ Task 22: Unregister Token on Sign Out

**Sprint 9: Testing & Polish** ✅ Complete (2/2 tasks)
- ✅ Task 23: Create Push Notification Test Utility
- ✅ Task 24: Update Documentation

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/20250313000000_push_tokens.sql` | Push tokens table + RLS |
| `supabase/migrations/20250314000000_push_preferences.sql` | Push preferences columns |
| `supabase/migrations/20250315000000_notification_triggers_push.sql` | Updated triggers with push support |
| `src/types/push.types.ts` | TypeScript type definitions |
| `src/services/notifications/pushService.ts` | Push token management |
| `src/services/notifications/notificationHandler.ts` | Notification response handling |
| `src/hooks/usePushNotifications.ts` | React hook for push |
| `supabase/functions/send-push-notification/index.ts` | Edge Function for sending |
| `supabase/functions/send-push-notification/config.ts` | Message templates |
| `src/components/settings/PushNotificationSettings.tsx` | Settings UI |
| `src/utils/pushNotificationTest.ts` | Development testing utility |
| `docs/guides/PUSH_NOTIFICATIONS.md` | Feature documentation |
| `assets/notification-icon.png` | Android notification icon |

### Modified Files
| File | Changes |
|------|---------|
| `package.json` | Add expo-notifications, expo-device |
| `app.json` | Add expo-notifications plugin config |
| `src/types/database.types.ts` | Add push_tokens table type |
| `src/types/index.ts` | Export push types |
| `src/hooks/queryKeys.ts` | Add pushKeys |
| `src/hooks/index.ts` | Export usePushNotifications |
| `src/context/NotificationContext.tsx` | Integrate push handlers |
| `src/context/AuthContext.tsx` | Register token on sign in |
| `src/hooks/useAuth.ts` | Unregister token on logout |
| `src/screens/settings/SettingsScreen.tsx` | Add push settings |
| `supabase/migrations/*_notifications.sql` | Update triggers to call Edge Function |
| `docs/database/DATABASE_SCHEMA.md` | Document push_tokens table |
| `CLAUDE.md` | Mention push notifications |

---

## Key Considerations

### Real Device Required
- Push notifications **do not work** on iOS Simulator
- Android emulator has limited push support
- Use EAS development build for testing, not Expo Go

### Permission Best Practices
- Don't request permission on first app launch
- Request at a contextually relevant moment (e.g., after creating first competition)
- Gracefully handle permission denied - app should still work
- Provide clear explanation of why notifications are useful

### Multi-Device Support
- Users may have multiple devices (phone + tablet)
- Store multiple tokens per user
- Send push to all registered devices
- Handle token cleanup when device is sold/reset

### Expo Push Token Lifecycle
- Tokens can expire or become invalid
- Handle `DeviceNotRegistered` errors from Expo Push API
- Mark invalid tokens as disabled in database
- Token may change on app reinstall

### Hybrid Notification Strategy
- In-app notifications via Supabase Realtime (immediate, when app open)
- Push notifications via Expo Push API (background/closed)
- Avoid duplicate notifications - check if app is foregrounded
- Toast shows for in-app, OS notification for background

### Edge Function Considerations
- Edge Function needs service role key for database access
- Handle rate limits from Expo Push API (600 requests/second)
- Batch multiple notifications when possible
- Log failures for debugging

---

## Testing Checklist

### Permission Flow
- [ ] First-time permission request UI
- [ ] Permission granted flow
- [ ] Permission denied flow
- [ ] Re-prompt after denial (via Settings link)
- [ ] Permission revoked in system settings

### Token Registration
- [ ] Token registered on sign in
- [ ] Token updated on app reinstall
- [ ] Token removed on sign out
- [ ] Multiple devices support

### Notification Delivery
- [ ] Receive notification when app foregrounded
- [ ] Receive notification when app backgrounded
- [ ] Receive notification when app killed
- [ ] Notification appears on lock screen
- [ ] Notification badge count

### Deep Linking
- [ ] Tap notification → opens correct screen
- [ ] Competition notification → CompetitionDetail
- [ ] Friend request notification → Friends screen
- [ ] Scorecard notification → ViewRound screen

### User Preferences
- [ ] Toggle push notifications on/off
- [ ] Toggle category preferences
- [ ] Preferences respected (no push when disabled)
- [ ] Settings persist across app restarts

### Edge Cases
- [ ] No network during registration (retry later)
- [ ] Invalid token handling
- [ ] User without push tokens
- [ ] Very long notification content

---

## Backward Compatibility

- Existing in-app notification system unchanged
- Users without push tokens continue to receive in-app notifications
- Push preferences default to enabled (opt-out model)
- No breaking changes to existing API contracts

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

**Last Updated:** 2025-12-25
**Status:** ✅ Complete - All sprints finished

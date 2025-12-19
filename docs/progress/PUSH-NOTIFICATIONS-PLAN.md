# Push Notifications - Implementation Plan

**Goal:** Add push notifications to complement the existing in-app notification system, enabling users to receive alerts when the app is in the background or closed.
**Status:** Not Started - 0% Complete (0/24 tasks)

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
**Status:** ⬜ Not Started
**Command:**
```bash
pnpm add expo-notifications expo-device expo-constants
```
**Deliverables:**
- [ ] `expo-notifications` package installed
- [ ] `expo-device` package installed (for device info)
- [ ] `expo-constants` package installed (for project ID)
- [ ] Verify packages in `package.json`

**Dependencies:** None

---

### Task 2: Update app.json Configuration
**Status:** ⬜ Not Started
**Deliverables:**
- [ ] Add `expo-notifications` to plugins array
- [ ] Configure notification icon for Android
- [ ] Configure notification color
- [ ] Add iOS background modes for remote notifications
- [ ] Add Android permissions for notifications

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
**Status:** ⬜ Not Started
**Deliverables:**
- [ ] Create `assets/notification-icon.png` (96x96, white on transparent for Android)
- [ ] Ensure icon follows Android notification icon guidelines (single color, simple shape)

**Dependencies:** None

---

## Sprint 2: Database Schema

### Task 4: Create Push Tokens Migration
**Status:** ⬜ Not Started
**Command:**
```bash
/db "Create migration for push_tokens table. Columns: id UUID PK DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE, expo_token TEXT NOT NULL, device_id TEXT (for multi-device), device_name TEXT, platform TEXT CHECK (platform IN ('ios', 'android')), app_version TEXT, enabled BOOLEAN NOT NULL DEFAULT TRUE, last_used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(). Constraints: UNIQUE(user_id, expo_token). Indexes: idx_push_tokens_user ON user_id, idx_push_tokens_enabled ON user_id WHERE enabled = TRUE, idx_push_tokens_token ON expo_token. Add updated_at trigger."
```
**Deliverables:**
- [ ] `supabase/migrations/YYYYMMDD_push_tokens.sql`
- [ ] `push_tokens` table with all columns
- [ ] Unique constraint on (user_id, expo_token)
- [ ] Indexes for efficient lookups
- [ ] Updated_at trigger

**Dependencies:** None

---

### Task 5: Add RLS Policies for Push Tokens
**Status:** ⬜ Not Started
**Command:**
```bash
/db "Add RLS policies for push_tokens table. Enable RLS. Policy 'users_manage_own_tokens' for ALL using auth.uid() = user_id. Policy 'service_role_full_access' for ALL using auth.role() = 'service_role'. Users can only see and manage their own push tokens."
```
**Deliverables:**
- [ ] RLS enabled on push_tokens
- [ ] Users can CRUD their own tokens only
- [ ] Service role has full access (for Edge Functions)

**Dependencies:** Task 4

---

### Task 6: Create Push Token Helper Functions
**Status:** ⬜ Not Started
**Command:**
```bash
/db "Create helper functions for push tokens. (1) get_user_push_tokens(p_user_id UUID) RETURNS TABLE (expo_token TEXT, platform TEXT) - returns all enabled tokens for user. (2) upsert_push_token(p_user_id UUID, p_token TEXT, p_device_id TEXT, p_platform TEXT, p_device_name TEXT, p_app_version TEXT) - inserts or updates token, updates last_used_at. (3) disable_push_token(p_token TEXT) - sets enabled=false for token (for handling expired/invalid tokens). (4) get_users_with_push_enabled(p_user_ids UUID[]) - returns user_ids that have at least one enabled push token. All functions SECURITY DEFINER."
```
**Deliverables:**
- [ ] `get_user_push_tokens()` function
- [ ] `upsert_push_token()` function
- [ ] `disable_push_token()` function
- [ ] `get_users_with_push_enabled()` function
- [ ] All functions marked SECURITY DEFINER

**Dependencies:** Task 4

---

### Task 7: Add Push Preferences to Players Table
**Status:** ⬜ Not Started
**Command:**
```bash
/db "Add push notification preferences to players table. New columns: push_enabled BOOLEAN NOT NULL DEFAULT TRUE (global toggle), push_competition_updates BOOLEAN NOT NULL DEFAULT TRUE, push_friend_requests BOOLEAN NOT NULL DEFAULT TRUE, push_scorecard_updates BOOLEAN NOT NULL DEFAULT TRUE. Add function get_user_push_preferences(p_user_id UUID) returns these columns."
```
**Deliverables:**
- [ ] `push_enabled` column on players
- [ ] `push_competition_updates` column
- [ ] `push_friend_requests` column
- [ ] `push_scorecard_updates` column
- [ ] `get_user_push_preferences()` function

**Dependencies:** None

---

## Sprint 3: TypeScript Types

### Task 8: Create Push Notification Types
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Create src/types/push.types.ts with TypeScript types. Interface PushToken with id, userId, expoToken, deviceId, deviceName, platform ('ios' | 'android'), appVersion, enabled, lastUsedAt, createdAt, updatedAt. Interface PushPreferences with pushEnabled, pushCompetitionUpdates, pushFriendRequests, pushScorecardUpdates. Type PushNotificationData with type (NotificationType), title, body, data (Record<string, unknown>), competitionId, roundId, playerId, friendshipId. Type ExpoPushMessage matching Expo's format. Add mapper functions mapDBPushToken for snake_case to camelCase conversion."
```
**Deliverables:**
- [ ] `src/types/push.types.ts`
- [ ] PushToken interface
- [ ] PushPreferences interface
- [ ] PushNotificationData type
- [ ] ExpoPushMessage type
- [ ] Mapper functions
- [ ] Export from `src/types/index.ts`

**Dependencies:** Task 4 (schema reference)

---

### Task 9: Update Database Types
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Update src/types/database.types.ts to add push_tokens table type. Add to Database['public']['Tables']: push_tokens with Row, Insert, Update types. Add push preference columns to players table type."
```
**Deliverables:**
- [ ] push_tokens table type in database.types.ts
- [ ] Row, Insert, Update variants
- [ ] Players type updated with push preferences

**Dependencies:** Task 8

---

## Sprint 4: Push Service Implementation

### Task 10: Create Push Service
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Create src/services/notifications/pushService.ts. Import from expo-notifications, expo-device, expo-constants. Functions: (1) requestPermissions() - requests iOS/Android notification permissions, returns PermissionStatus. (2) getExpoPushToken() - gets Expo push token using projectId from Constants, handles errors. (3) registerPushToken(userId) - calls requestPermissions, gets token, upserts to database via Supabase. (4) unregisterPushToken(token) - removes token from database. (5) isPhysicalDevice() - checks if running on real device (push doesn't work on simulator). (6) configureNotificationHandler() - sets up foreground notification behavior. Export as pushService singleton."
```
**Deliverables:**
- [ ] `src/services/notifications/pushService.ts`
- [ ] `requestPermissions()` function
- [ ] `getExpoPushToken()` function
- [ ] `registerPushToken()` function
- [ ] `unregisterPushToken()` function
- [ ] `isPhysicalDevice()` function
- [ ] `configureNotificationHandler()` function
- [ ] Export from `src/services/notifications/index.ts`

**Dependencies:** Task 8 (types), Task 6 (DB functions)

---

### Task 11: Create Push Notification Hook
**Status:** ⬜ Not Started
**Command:**
```bash
/hook "Create src/hooks/usePushNotifications.ts - main hook for push notification management. Uses TanStack Query. Queries: (1) pushTokensQuery - fetches user's push tokens from push_tokens table. (2) pushPreferencesQuery - fetches user's push preferences from players table. Mutations: (1) registerTokenMutation - calls pushService.registerPushToken(). (2) updatePreferencesMutation - updates push preferences in players table. Hook sets up notification listeners on mount: addNotificationReceivedListener for foreground, addNotificationResponseReceivedListener for taps. Returns: tokens, preferences, permissionStatus, registerToken(), updatePreferences(), isRegistered. Auto-registers token when user is authenticated and hasn't registered on this device."
```
**Deliverables:**
- [ ] `src/hooks/usePushNotifications.ts`
- [ ] pushTokensQuery
- [ ] pushPreferencesQuery
- [ ] registerTokenMutation
- [ ] updatePreferencesMutation
- [ ] Notification listeners setup
- [ ] Auto-registration logic
- [ ] Export from `src/hooks/index.ts`

**Dependencies:** Task 10 (pushService)

---

### Task 12: Add Push Query Keys
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Update src/hooks/queryKeys.ts to add push notification query keys. Add: pushKeys object with all: ['push'], tokens: (userId) => [...all, 'tokens', userId], preferences: (userId) => [...all, 'preferences', userId], permissionStatus: () => [...all, 'permission']. Export pushKeys."
```
**Deliverables:**
- [ ] `pushKeys` object in queryKeys.ts
- [ ] Keys: all, tokens, preferences, permissionStatus
- [ ] Export pushKeys

**Dependencies:** None

---

## Sprint 5: Notification Handlers & Deep Linking

### Task 13: Create Notification Response Handler
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Create src/services/notifications/notificationHandler.ts. Function handleNotificationResponse(response: NotificationResponse, navigation) - extracts notification data, navigates to appropriate screen based on notification type. Map notification types to screens: competition_* -> CompetitionDetail, friend_* -> Friends, scorecard_* -> ViewRound. Function handleForegroundNotification(notification: Notification) - decides whether to show in-app toast or suppress (if user is already on relevant screen). Export handlers."
```
**Deliverables:**
- [ ] `src/services/notifications/notificationHandler.ts`
- [ ] `handleNotificationResponse()` function
- [ ] `handleForegroundNotification()` function
- [ ] Navigation type mapping
- [ ] Screen relevance check

**Dependencies:** Task 8 (types)

---

### Task 14: Update NotificationContext for Push
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Update src/context/NotificationContext.tsx to integrate push notifications. Import usePushNotifications hook. In provider: (1) Initialize push notification listeners on mount. (2) Call registerToken() when user authenticates. (3) Handle notification responses (taps) with navigation. (4) Coordinate foreground notifications - show toast via existing system, don't show duplicate OS notification. Add to context value: pushEnabled, requestPushPermission(), pushPermissionStatus. Ensure cleanup of listeners on unmount."
```
**Deliverables:**
- [ ] Push notification listeners in NotificationContext
- [ ] Auto-registration on auth
- [ ] Notification tap handling with navigation
- [ ] Foreground notification coordination
- [ ] Context value extended with push status
- [ ] Proper cleanup on unmount

**Dependencies:** Task 11 (usePushNotifications hook)

---

### Task 15: Configure Notification Categories (iOS)
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Update src/services/notifications/pushService.ts to configure iOS notification categories. Add function configureNotificationCategories() that calls Notifications.setNotificationCategoryAsync() for each notification type. Categories: 'COMPETITION' with 'View' action, 'FRIEND_REQUEST' with 'View' and 'Accept' actions, 'SCORECARD' with 'View' action. Call this function during app initialization. Handle action responses in notification handler."
```
**Deliverables:**
- [ ] `configureNotificationCategories()` function
- [ ] COMPETITION category with actions
- [ ] FRIEND_REQUEST category with actions
- [ ] SCORECARD category with actions
- [ ] Action response handling

**Dependencies:** Task 10 (pushService)

---

## Sprint 6: Supabase Edge Function

### Task 16: Create Edge Function for Push Sending
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Create supabase/functions/send-push-notification/index.ts - Edge Function to send push notifications via Expo Push API. Accepts POST with { user_id, notification_type, title, body, data }. Steps: (1) Verify request (check auth header for service role). (2) Fetch user's enabled push tokens from push_tokens table. (3) Check user's push preferences (is this notification type enabled?). (4) Build Expo push messages array. (5) POST to https://exp.host/--/api/v2/push/send with messages. (6) Handle response - mark invalid tokens as disabled. (7) Return success/failure count. Include retry logic for transient failures."
```
**Deliverables:**
- [ ] `supabase/functions/send-push-notification/index.ts`
- [ ] Request validation
- [ ] Token fetching from database
- [ ] Preference checking
- [ ] Expo Push API integration
- [ ] Invalid token handling
- [ ] Retry logic
- [ ] Response handling

**Dependencies:** Task 6 (DB functions), Task 7 (preferences)

---

### Task 17: Create Edge Function Config
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Create supabase/functions/send-push-notification/config.ts with configuration. Export EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send'. Export notification message templates: NOTIFICATION_TEMPLATES Record<NotificationType, { title: string, body: string }> with placeholders like {player_name}, {competition_name}. Export function buildPushMessage(type, data) that fills in template placeholders from notification data."
```
**Deliverables:**
- [ ] `supabase/functions/send-push-notification/config.ts`
- [ ] EXPO_PUSH_API_URL constant
- [ ] NOTIFICATION_TEMPLATES with all 8 types
- [ ] `buildPushMessage()` function

**Dependencies:** None

---

### Task 18: Update Database Triggers to Call Edge Function
**Status:** ⬜ Not Started
**Command:**
```bash
/db "Update notification triggers to call the send-push-notification Edge Function. Modify notify_friend_request(), notify_competition_player_added(), etc. to call pg_net.http_post() to the Edge Function URL after inserting the notification row. Pass notification data as JSON body. Use SUPABASE_URL/functions/v1/send-push-notification as the URL. Add error handling - log failures but don't block the trigger."
```
**Deliverables:**
- [ ] Update `notify_friend_request()` trigger
- [ ] Update `notify_friend_request_accepted()` trigger
- [ ] Update `notify_competition_player_added()` trigger
- [ ] Update `notify_new_round_created()` trigger
- [ ] Update `notify_scorecard_submitted()` trigger
- [ ] Update `notify_competition_status_changed()` trigger
- [ ] Error handling in triggers
- [ ] pg_net extension enabled

**Dependencies:** Task 16 (Edge Function)

---

## Sprint 7: User Settings UI

### Task 19: Create Push Settings Component
**Status:** ⬜ Not Started
**Command:**
```bash
/component "PushNotificationSettings - Settings section for push notification preferences. Uses usePushNotifications hook. Layout: Card with header 'Push Notifications'. Rows: (1) Master toggle 'Enable Push Notifications' - controls push_enabled. (2) If enabled, show sub-toggles: 'Competition Updates', 'Friend Requests', 'Scorecard Updates'. (3) If permission not granted, show 'Enable in Settings' button that opens device settings. (4) Show current permission status text. Accessibility labels for all toggles."
```
**Deliverables:**
- [ ] `src/components/settings/PushNotificationSettings.tsx`
- [ ] Master push toggle
- [ ] Category toggles (competition, friends, scorecards)
- [ ] Permission status display
- [ ] Link to device settings
- [ ] Accessibility labels

**Dependencies:** Task 11 (usePushNotifications)

---

### Task 20: Add Push Settings to SettingsScreen
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Update src/screens/settings/SettingsScreen.tsx to include PushNotificationSettings component. Add a new section 'Notifications' between existing sections. Import PushNotificationSettings and render it. Ensure section fits with existing settings UI style."
```
**Deliverables:**
- [ ] Import PushNotificationSettings in SettingsScreen
- [ ] New 'Notifications' section
- [ ] Consistent styling with other settings

**Dependencies:** Task 19 (PushNotificationSettings)

---

## Sprint 8: Auth Integration

### Task 21: Register Token on Sign In
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Update src/context/AuthContext.tsx to register push token on successful sign in. After user is authenticated (in auth state change listener), call usePushNotifications().registerToken(). Only register if on physical device and user hasn't denied permissions. Store registration status in AsyncStorage to avoid re-prompting. Handle errors gracefully - don't block auth flow if push registration fails."
```
**Deliverables:**
- [ ] Push token registration after sign in
- [ ] Physical device check
- [ ] Permission check before registration
- [ ] AsyncStorage for registration status
- [ ] Error handling (non-blocking)

**Dependencies:** Task 14 (NotificationContext updates)

---

### Task 22: Unregister Token on Sign Out
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Update src/hooks/useAuth.ts logout() function to unregister push token before signing out. Call pushService.unregisterPushToken() with current device's token. This ensures the user doesn't receive notifications after logout. Handle errors gracefully - proceed with logout even if unregister fails."
```
**Deliverables:**
- [ ] Unregister push token in logout flow
- [ ] Error handling (non-blocking)
- [ ] Clear local push state on logout

**Dependencies:** Task 10 (pushService)

---

## Sprint 9: Testing & Polish

### Task 23: Create Push Notification Test Utility
**Status:** ⬜ Not Started
**Command:**
```bash
/refactor "Create src/utils/pushNotificationTest.ts - development utility for testing push notifications. Function sendTestNotification(userId, type) - calls Edge Function directly with test data. Function simulateNotificationReceived(type) - triggers notification listeners with mock data. Function logPushDebugInfo() - logs current token, permission status, preferences. Export for use in development builds only (wrap in __DEV__ check)."
```
**Deliverables:**
- [ ] `src/utils/pushNotificationTest.ts`
- [ ] `sendTestNotification()` function
- [ ] `simulateNotificationReceived()` function
- [ ] `logPushDebugInfo()` function
- [ ] DEV-only exports

**Dependencies:** Task 16 (Edge Function)

---

### Task 24: Update Documentation
**Status:** ⬜ Not Started
**Command:**
```bash
/docs "Update documentation for push notifications. (1) Add push_tokens table to docs/database/DATABASE_SCHEMA.md with columns, constraints, RLS policies, functions. (2) Update CLAUDE.md to mention push notifications in the offline/sync section. (3) Create docs/guides/PUSH_NOTIFICATIONS.md - comprehensive guide explaining architecture, setup, testing, troubleshooting. Include: how to test on real devices, common issues (simulator, permission denied), Edge Function debugging."
```
**Deliverables:**
- [ ] `docs/database/DATABASE_SCHEMA.md` - push_tokens table docs
- [ ] `CLAUDE.md` - push notifications mention
- [ ] `docs/guides/PUSH_NOTIFICATIONS.md` - comprehensive guide

**Dependencies:** All previous tasks

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 24
- **Completed:** 0 (0%)
- **In Progress:** 0 (0%)
- **Not Started:** 24 (100%)

### Sprint Progress

**Sprint 1: Package Setup & Configuration** ⬜ Not Started (0/3 tasks)
- ⬜ Task 1: Install Dependencies
- ⬜ Task 2: Update app.json Configuration
- ⬜ Task 3: Create Notification Icon Assets

**Sprint 2: Database Schema** ⬜ Not Started (0/4 tasks)
- ⬜ Task 4: Create Push Tokens Migration
- ⬜ Task 5: Add RLS Policies for Push Tokens
- ⬜ Task 6: Create Push Token Helper Functions
- ⬜ Task 7: Add Push Preferences to Players Table

**Sprint 3: TypeScript Types** ⬜ Not Started (0/2 tasks)
- ⬜ Task 8: Create Push Notification Types
- ⬜ Task 9: Update Database Types

**Sprint 4: Push Service Implementation** ⬜ Not Started (0/3 tasks)
- ⬜ Task 10: Create Push Service
- ⬜ Task 11: Create Push Notification Hook
- ⬜ Task 12: Add Push Query Keys

**Sprint 5: Notification Handlers & Deep Linking** ⬜ Not Started (0/3 tasks)
- ⬜ Task 13: Create Notification Response Handler
- ⬜ Task 14: Update NotificationContext for Push
- ⬜ Task 15: Configure Notification Categories (iOS)

**Sprint 6: Supabase Edge Function** ⬜ Not Started (0/3 tasks)
- ⬜ Task 16: Create Edge Function for Push Sending
- ⬜ Task 17: Create Edge Function Config
- ⬜ Task 18: Update Database Triggers to Call Edge Function

**Sprint 7: User Settings UI** ⬜ Not Started (0/2 tasks)
- ⬜ Task 19: Create Push Settings Component
- ⬜ Task 20: Add Push Settings to SettingsScreen

**Sprint 8: Auth Integration** ⬜ Not Started (0/2 tasks)
- ⬜ Task 21: Register Token on Sign In
- ⬜ Task 22: Unregister Token on Sign Out

**Sprint 9: Testing & Polish** ⬜ Not Started (0/2 tasks)
- ⬜ Task 23: Create Push Notification Test Utility
- ⬜ Task 24: Update Documentation

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/YYYYMMDD_push_tokens.sql` | Push tokens table + RLS |
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

**Last Updated:** 2025-12-15
**Status:** Planning Complete - Ready for Implementation

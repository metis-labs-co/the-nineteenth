# Real-Time In-App Notifications - Implementation Plan

**Goal:** Add real-time in-app notifications using Supabase Realtime, so users are instantly notified when added to competitions, rounds are created, scorecards are submitted, or friend requests are sent/accepted
**Status:** ✅ Complete - 100% (15/15 tasks)

---

## Overview

This plan introduces a **Real-Time Notification System** that uses Supabase Realtime to deliver instant in-app notifications. The system supports:

- **Database triggers** auto-create notifications on events (no client-side trigger code needed)
- **Supabase Realtime** broadcasts to subscribed clients instantly
- **Badge counter** shows unread count in navigation
- **Notification center** lists all notifications with read/unread state

### Notification Types

| Type | Trigger Event | Recipient | Navigation Target |
|------|---------------|-----------|-------------------|
| `competition_player_added` | Admin adds player to competition | Added player | CompetitionDetail |
| `competition_player_joined` | Player joins via invite code | Organizer | CompetitionDetail |
| `new_round_created` | New round added to competition | All competition players | CompetitionDetail |
| `competition_status_changed` | Competition status updates | All competition players | CompetitionDetail |
| `scorecard_submitted` | Scorecard marked complete | Organizer | CompetitionDetail |
| `friend_request_received` | Friend request sent | Addressee | Friends |
| `friend_request_accepted` | Friend request accepted | Original requester | Friends |

### Example Scenario

**User A creates competition "Weekend Open" and adds User B, C, D:**
1. Database trigger fires on `competition_players` INSERT
2. Notification records created for users B, C, D
3. Supabase Realtime broadcasts to online users
4. Users B, C, D see badge update and can tap to view notification
5. Tapping notification navigates to competition detail

---

## Sprint 1: Database Foundation

### Task 1: Database Migration - Notifications Table
**Status:** ✅ Complete
**Migration File:** `supabase/migrations/20250125000000_notifications.sql`
**Deliverables:**
- [x] `supabase/migrations/20250125000000_notifications.sql`
- [x] `notifications` table with all columns and constraints
- [x] Foreign key relationships to players, competitions, rounds, friendships
- [x] Indexes for efficient queries (idx_notifications_user, idx_notifications_user_unread, idx_notifications_created)
- [x] RLS policies (users manage own notifications)
- [x] Realtime enabled on table
- [x] Bonus: `get_unread_notification_count()` and `mark_all_notifications_read()` helper functions

**Dependencies:** None

---

### Task 2: Database Helper Function - create_notification
**Status:** ✅ Complete
**Location:** `supabase/migrations/20250125000000_notifications.sql` (lines 144-178)
**Deliverables:**
- [x] `create_notification()` function in migration
- [x] SECURITY DEFINER attribute for RLS bypass
- [x] Returns created notification UUID
- [x] Handles NULL optional parameters

**Dependencies:** Task 1 (notifications table)

---

### Task 3: Database Trigger - Competition Player Added
**Status:** ✅ Complete
**Location:** `supabase/migrations/20250125000000_notifications.sql` (lines 257-298)
**Deliverables:**
- [x] `notify_competition_player_added()` trigger function
- [x] `trigger_notify_competition_player_added` trigger (AFTER INSERT on competition_players)
- [x] Notification created for added player (not organizer)
- [x] JSONB data includes competition_name, added_by_name

**Dependencies:** Task 2 (create_notification function)

---

### Task 4: Database Trigger - Player Joined Competition
**Status:** ✅ Complete
**Migration File:** `supabase/migrations/20250127000000_notify_competition_player_joined.sql`
**Deliverables:**
- [x] `notify_competition_player_joined()` trigger function
- [x] `on_competition_player_joined` trigger (AFTER INSERT on competition_players)
- [x] Organizer notified when player joins
- [x] JSONB data includes competition_name, player_name

**Dependencies:** Task 2 (create_notification function)

---

### Task 5: Database Trigger - New Round Created
**Status:** ✅ Complete
**Migration Files:**
- Original: `supabase/migrations/20250125000000_notifications.sql`
- Updated: `supabase/migrations/20250128000000_fix_new_round_notification_trigger.sql`
**Deliverables:**
- [x] `notify_new_round_created()` trigger function
- [x] `on_round_created` trigger (AFTER INSERT on rounds)
- [x] All competition players notified (except organizer)
- [x] JSONB data includes competition_name, round_number, course_name (venue name), date
- [x] Handles NULL course_id gracefully
- [x] Uses venue name for better display

**Dependencies:** Task 2 (create_notification function)

---

### Task 6: Database Trigger - Competition Status Changed
**Status:** ✅ Complete
**Migration File:** `supabase/migrations/20250130000000_notify_competition_status_changed.sql`
**Deliverables:**
- [x] `notify_competition_status_changed()` trigger function
- [x] `on_competition_status_changed` trigger (AFTER UPDATE on competitions WHEN status changes)
- [x] All accepted players notified on status change
- [x] JSONB data includes competition_name, old_status, new_status
- [x] Uses `IS DISTINCT FROM` for NULL-safe comparison

**Dependencies:** Task 2 (create_notification function)

---

### Task 7: Database Trigger - Scorecard Submitted
**Status:** ✅ Complete
**Migration File:** `supabase/migrations/20250129000000_notify_scorecard_submitted.sql`
**Deliverables:**
- [x] `notify_scorecard_submitted()` trigger function
- [x] `on_scorecard_submitted` trigger (AFTER UPDATE on scorecards WHEN status changes to 'completed')
- [x] Organizer notified on scorecard submission
- [x] JSONB data includes competition_name, player_name, round_number
- [x] Handles standalone rounds gracefully (no notification)

**Dependencies:** Task 2 (create_notification function)

---

### Task 8: Database Trigger - Friend Request & Accepted
**Status:** ✅ Complete
**Location:** `supabase/migrations/20250125000000_notifications.sql` (lines 184-254)
**Deliverables:**
- [x] `notify_friend_request()` trigger function
- [x] `trigger_notify_friend_request` trigger (AFTER INSERT on friendships)
- [x] `notify_friend_request_accepted()` trigger function
- [x] `trigger_notify_friend_request_accepted` trigger (AFTER UPDATE on friendships)
- [x] JSONB data includes requester_name or accepter_name

**Dependencies:** Task 2 (create_notification function)

---

## Sprint 2: TypeScript Foundation

### Task 9: TypeScript Types - Notifications
**Status:** ✅ Complete
**Location:** `src/types/database.types.ts` (lines 1016-1089)
**Deliverables:**
- [x] `src/types/database.types.ts` - NotificationType union (7 notification types)
- [x] `src/types/database.types.ts` - NotificationData interface (all optional fields)
- [x] `src/types/database.types.ts` - Notification interface (all required fields)
- [x] `src/types/database.types.ts` - Database table definition (notifications in Tables)
- [x] `src/types/index.ts` - Export Notification, NotificationData, NotificationWithRelations types

**Dependencies:** Task 1 (database schema)

---

### Task 10: Query Keys and Store
**Status:** ✅ Complete
**Deliverables:**
- [x] `src/hooks/queryKeys.ts` - notificationKeys object with all, list, unreadCount
- [x] `src/hooks/queryKeys.ts` - Added to allQueryKeys array
- [x] `src/store/notificationStore.ts` - Zustand store with state (unreadCount, recentNotifications, isSubscribed) and actions (setUnreadCount, incrementUnreadCount, decrementUnreadCount, addRecentNotification, clearRecentNotifications, setIsSubscribed)

**Dependencies:** Task 9 (types)

---

## Sprint 3: Hooks and Provider

### Task 11: Notification Hooks
**Status:** ✅ Complete
**Location:** `src/hooks/useNotifications.ts`
**Deliverables:**
- [x] `src/hooks/useNotifications.ts`
- [x] `useNotifications()` - fetch list query (50 most recent, ordered by created_at desc, staleTime 30s)
- [x] `useUnreadNotificationCount()` - count query with store sync via setUnreadCount
- [x] `useMarkNotificationRead()` - mark single read mutation with store decrement
- [x] `useMarkAllNotificationsRead()` - mark all read mutation with store reset to 0
- [x] `useDeleteNotification()` - delete mutation with store update if was unread
- [x] `useNotificationSubscription()` - realtime subscription hook with postgres_changes INSERT listener
- [x] Export from `src/hooks/index.ts` (hooks and notificationKeys)

**Dependencies:** Task 10 (query keys, store)

---

### Task 12: Notification Provider
**Status:** ✅ Complete
**Location:** `src/context/NotificationContext.tsx`
**Deliverables:**
- [x] `src/context/NotificationContext.tsx`
- [x] `NotificationProvider` component
- [x] `useNotificationContext()` hook
- [x] Realtime subscription on mount (via useNotificationSubscription)
- [x] Initial count fetch (via useUnreadNotificationCount)
- [x] Context value with unreadCount and isSubscribed from store

**Dependencies:** Task 11 (hooks)

---

## Sprint 4: UI Components

### Task 13: NotificationBell Component
**Status:** ✅ Complete
**Location:** `src/components/common/NotificationBell.tsx`
**Deliverables:**
- [x] `src/components/common/NotificationBell.tsx`
- [x] Bell icon with theme colors (useThemeColors hook)
- [x] Badge with unread count (positioned absolute top-right)
- [x] 99+ cap for large counts
- [x] Accessibility label ('Notifications, X unread')
- [x] onPress handler with Pressable
- [x] 44x44 touch target with borderRadius
- [x] Dark mode support via theme context

**Dependencies:** Task 10 (store)

---

### Task 14: NotificationItem and NotificationsScreen
**Status:** ✅ Complete
**Locations:**
- `src/components/notifications/NotificationItem.tsx`
- `src/screens/notifications/NotificationsScreen.tsx`
- `src/components/notifications/index.ts`
- `src/screens/notifications/index.ts`
**Deliverables:**
- [x] `src/components/notifications/NotificationItem.tsx`
- [x] Icon, title, message, timestamp display (config object maps notification.type to icon/title/message)
- [x] Unread indicator styling (dot + background color difference)
- [x] `src/screens/notifications/NotificationsScreen.tsx`
- [x] FlatList with pull-to-refresh (RefreshControl)
- [x] Mark all read action (shown only when unread exists)
- [x] Navigation on tap (competition_id → CompetitionDetail, friendship_id → Friends)
- [x] Loading and empty states (ActivityIndicator, EmptyState component)
- [x] `src/components/notifications/index.ts` barrel export
- [x] `src/screens/notifications/index.ts` barrel export
- [x] Navigation types updated (`Notifications` route in RootStackParamList)
- [x] RootNavigator updated (NotificationsScreen registered)

**Dependencies:** Task 11 (hooks), Task 12 (provider)

---

## Sprint 5: Integration

### Task 15: App Integration
**Status:** ✅ Complete
**Deliverables:**
- [x] `src/navigation/types.ts` - Notifications route added (completed in Task 14)
- [x] `src/navigation/RootNavigator.tsx` - NotificationsScreen registered (completed in Task 14)
- [x] `App.tsx` - NotificationProvider wrapper (wraps RootNavigator inside PaperProvider)
- [x] NotificationBell added to ProfileScreen header (via PageHeader rightContent)
- [x] Navigation to Notifications screen working (onPress navigates to 'Notifications')

**Implementation Details:**
- NotificationProvider placed inside AppContent, wrapping RootNavigator
- NotificationBell added to ProfileScreen's PageHeader using rightContent prop
- Bell shows unread count badge and navigates to NotificationsScreen on press

**Dependencies:** Task 12 (provider), Task 13 (bell), Task 14 (screen)

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 15
- **Completed:** 15 ✅ (100%)
- **In Progress:** 0 🔄 (0%)
- **Not Started:** 0 ⬜ (0%)

### Sprint Progress

**Sprint 1: Database Foundation** ✅ Complete (8/8)
- ✅ Task 1: Database Migration - Notifications Table
- ✅ Task 2: Database Helper Function - create_notification
- ✅ Task 3: Database Trigger - Competition Player Added
- ✅ Task 4: Database Trigger - Player Joined Competition
- ✅ Task 5: Database Trigger - New Round Created
- ✅ Task 6: Database Trigger - Competition Status Changed
- ✅ Task 7: Database Trigger - Scorecard Submitted
- ✅ Task 8: Database Trigger - Friend Request & Accepted

**Sprint 2: TypeScript Foundation** ✅ Complete (2/2)
- ✅ Task 9: TypeScript Types - Notifications
- ✅ Task 10: Query Keys and Store

**Sprint 3: Hooks and Provider** ✅ Complete (2/2)
- ✅ Task 11: Notification Hooks
- ✅ Task 12: Notification Provider

**Sprint 4: UI Components** ✅ Complete (2/2)
- ✅ Task 13: NotificationBell Component
- ✅ Task 14: NotificationItem and NotificationsScreen

**Sprint 5: Integration** ✅ Complete (1/1)
- ✅ Task 15: App Integration

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/XXXXXXXX_notifications.sql` | Database schema, triggers, RLS |
| `src/store/notificationStore.ts` | Zustand store for badge state |
| `src/hooks/useNotifications.ts` | All notification hooks |
| `src/context/NotificationContext.tsx` | Provider component |
| `src/components/common/NotificationBell.tsx` | Bell icon with badge |
| `src/components/notifications/NotificationItem.tsx` | Notification card |
| `src/components/notifications/index.ts` | Barrel export |
| `src/screens/notifications/NotificationsScreen.tsx` | Notification list screen |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/database.types.ts` | Add Notification types |
| `src/types/index.ts` | Export notification types |
| `src/hooks/queryKeys.ts` | Add notificationKeys |
| `src/hooks/index.ts` | Export new hooks |
| `src/navigation/types.ts` | Add Notifications route |
| `src/navigation/RootNavigator.tsx` | Register NotificationsScreen |
| `App.tsx` | Add NotificationProvider |

---

## Key Design Decisions

1. **Database triggers over client-side**: Notifications created server-side via PostgreSQL triggers ensures reliability even if client crashes mid-operation. No changes needed to existing mutation code.

2. **Supabase Realtime over polling**: Uses existing 30s heartbeat configuration for battery efficiency. Event-driven is more responsive than polling.

3. **Zustand for badge state**: Lightweight state management for unread count that persists across navigation. React Query handles the notification list data.

4. **JSONB data field**: Flexible schema allows different notification types to store relevant data without schema changes.

5. **SECURITY DEFINER functions**: Allows triggers to create notifications for other users while RLS prevents users from creating notifications directly.

---

## Backward Compatibility

- No changes to existing mutation code required
- Existing functionality unaffected
- Notifications are additive feature
- If realtime connection fails, users can still pull-to-refresh

---

## Testing Checklist

- [ ] Notification created when player added to competition
- [ ] Notification created when player joins via invite code
- [ ] Notification created when new round added
- [ ] Notification created when competition status changes
- [ ] Notification created when scorecard submitted
- [ ] Notification created when friend request sent
- [ ] Notification created when friend request accepted
- [ ] Realtime subscription receives new notifications
- [ ] Unread badge updates correctly
- [ ] Mark as read works (single and all)
- [ ] Navigation from notification works
- [ ] Offline → online syncs notifications

---

## Command Usage Reference

| Command | Use For |
|---------|---------|
| `/db` | Database schema, migrations, triggers |
| `/component` | Reusable UI components |
| `/screen` | Full screen implementations |
| `/hook` | TanStack Query hooks and services |
| `/refactor` | Modifying existing code, utilities |

---

**Last Updated:** 2025-12-09
**Status:** ✅ **IMPLEMENTATION COMPLETE**

All 15 tasks across 5 sprints have been completed. The real-time in-app notification system is fully implemented with:
- Database triggers auto-creating notifications on 7 event types
- Supabase Realtime subscription for instant delivery
- NotificationBell with unread badge on Profile screen
- NotificationsScreen with full notification management
- Mark as read (single and all) functionality
- Navigation to relevant screens on notification tap

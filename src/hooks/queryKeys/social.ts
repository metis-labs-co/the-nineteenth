/**
 * Social Query Keys
 *
 * Friends, Notifications, Push Notifications & Placeholder Players
 */

// =====================================================
// FRIENDS
// =====================================================

export const friendsKeys = {
  all: ['friends'] as const,
  lists: () => [...friendsKeys.all, 'list'] as const,
  list: (userId?: string, variant?: 'count') => [...friendsKeys.lists(), userId, variant] as const,
  listWithPendingSent: (userId?: string) =>
    [...friendsKeys.lists(), 'with-pending-sent', userId] as const,
  count: (userId?: string) => [...friendsKeys.all, 'count', userId] as const,
  requests: () => [...friendsKeys.all, 'requests'] as const,
  pendingRequests: () => [...friendsKeys.requests(), 'pending'] as const,
  sentRequests: () => [...friendsKeys.requests(), 'sent'] as const,
  search: (query: string) => [...friendsKeys.all, 'search', query] as const,
  detail: (friendId: string) => [...friendsKeys.all, 'detail', friendId] as const,
} as const;

// =====================================================
// NOTIFICATIONS
// =====================================================

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
} as const;

// =====================================================
// PUSH NOTIFICATIONS
// =====================================================

export const pushKeys = {
  all: ['push'] as const,
  tokens: (userId: string) => [...pushKeys.all, 'tokens', userId] as const,
  preferences: (userId: string) => [...pushKeys.all, 'preferences', userId] as const,
  permissionStatus: () => [...pushKeys.all, 'permission'] as const,
} as const;

// =====================================================
// PLACEHOLDER PLAYERS
// =====================================================

export const placeholderPlayersKeys = {
  all: ['placeholderPlayers'] as const,
  lists: () => [...placeholderPlayersKeys.all, 'list'] as const,
  list: (userId: string) => [...placeholderPlayersKeys.lists(), userId] as const,
  details: () => [...placeholderPlayersKeys.all, 'detail'] as const,
  detail: (id: string) => [...placeholderPlayersKeys.details(), id] as const,
} as const;

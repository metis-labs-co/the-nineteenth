/**
 * Activity Feed Query Keys
 *
 * Friends' completed-round activity feed: likes, comments, photos.
 */

export const activityKeys = {
  all: ['activity'] as const,
  feed: () => [...activityKeys.all, 'feed'] as const,
  round: (roundId: string) => [...activityKeys.all, 'round', roundId] as const,
  comments: (roundId: string) => [...activityKeys.round(roundId), 'comments'] as const,
  photos: (roundId: string) => [...activityKeys.round(roundId), 'photos'] as const,
} as const;

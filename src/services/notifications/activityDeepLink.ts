/**
 * Notification types whose deep link should open the round's activity-detail
 * screen (RoundActivity — likes + comments) rather than the round screen.
 */
const ACTIVITY_DETAIL_NOTIFICATION_TYPES = new Set<string>([
  'round_liked',
  'round_commented',
  'round_also_commented',
  'comment_liked',
]);

export function isActivityDetailNotificationType(type?: string | null): boolean {
  return !!type && ACTIVITY_DETAIL_NOTIFICATION_TYPES.has(type);
}

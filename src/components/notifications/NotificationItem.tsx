/**
 * NotificationItem - Displays a single notification in a list
 *
 * Renders different notification types with appropriate icons, titles, and messages.
 * Supports read/unread states with visual differentiation.
 *
 * @example
 * ```tsx
 * <NotificationItem
 *   notification={notification}
 *   onPress={(notification) => handleNotificationPress(notification)}
 * />
 * ```
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import type { Notification, NotificationType } from '@/types/database.types';

/**
 * Configuration for each notification type
 */
interface NotificationConfig {
  icon: string;
  getTitle: (data: Notification['data']) => string;
  getMessage: (data: Notification['data']) => string;
}

/**
 * Maps notification types to their icon, title, and message formatters
 */
const notificationConfig: Record<NotificationType, NotificationConfig> = {
  competition_player_added: {
    icon: 'trophy-outline',
    getTitle: (_data) => 'Added to Competition',
    getMessage: (data) =>
      data.added_by_name
        ? `${data.added_by_name} added you to ${data.competition_name || 'a competition'}`
        : `You were added to ${data.competition_name || 'a competition'}`,
  },
  competition_player_joined: {
    icon: 'account-plus',
    getTitle: (_data) => 'New Player Joined',
    getMessage: (data) =>
      `${data.player_name || 'Someone'} joined ${data.competition_name || 'your competition'}`,
  },
  new_round_created: {
    icon: 'golf',
    getTitle: (_data) => 'New Round Created',
    getMessage: (data) => {
      const parts: string[] = [];
      if (data.course_name) parts.push(data.course_name);
      if (data.date) parts.push(data.date);
      return parts.length > 0
        ? `Round ${data.round_number || ''} at ${parts.join(' on ')}`
        : `A new round has been created`;
    },
  },
  competition_status_changed: {
    icon: 'flag-checkered',
    getTitle: (_data) => 'Competition Updated',
    getMessage: (data) =>
      data.new_status
        ? `${data.competition_name || 'Competition'} is now ${data.new_status.replace('-', ' ')}`
        : `${data.competition_name || 'Competition'} status changed`,
  },
  scorecard_submitted: {
    icon: 'clipboard-check-outline',
    getTitle: (_data) => 'Scorecard Submitted',
    getMessage: (data) =>
      `${data.player_name || 'A player'} submitted their scorecard${data.date ? ` for ${data.date}` : ''}`,
  },
  friend_request_received: {
    icon: 'account-plus-outline',
    getTitle: (_data) => 'Friend Request',
    getMessage: (data) =>
      `${data.requester_name || 'Someone'} sent you a friend request`,
  },
  friend_request_accepted: {
    icon: 'account-check',
    getTitle: (_data) => 'Friend Request Accepted',
    getMessage: (data) =>
      `${data.accepter_name || 'Your friend request was'} accepted your friend request`,
  },
  social_round_invitation: {
    icon: 'golf-tee',
    getTitle: (_data) => 'Round Invitation',
    getMessage: (data) =>
      `${data.inviter_name || 'Someone'} invited you to play${data.venue_name ? ` at ${data.venue_name}` : ''}`,
  },
};

/**
 * Get configuration for a notification type with fallback for unknown types
 */
function getNotificationConfig(type: NotificationType): NotificationConfig {
  return (
    notificationConfig[type] || {
      icon: 'bell-outline',
      getTitle: () => 'Notification',
      getMessage: () => 'You have a new notification',
    }
  );
}

export interface NotificationItemProps {
  /**
   * The notification to display
   */
  notification: Notification;
  /**
   * Callback when the notification is pressed
   */
  onPress: (notification: Notification) => void;
  /**
   * Test ID for testing
   */
  testID?: string;
}

export const NotificationItem = React.memo(function NotificationItem({
  notification,
  onPress,
  testID,
}: NotificationItemProps) {
  const colors = useThemeColors();
  const config = getNotificationConfig(notification.type);

  const title = config.getTitle(notification.data);
  const message = config.getMessage(notification.data);
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  const isUnread = !notification.is_read;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isUnread ? colors.primaryBackground : colors.surface,
        },
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${message}. ${timeAgo}`}
      accessibilityHint={isUnread ? 'Unread notification. Tap to view' : 'Tap to view'}
      testID={testID}
    >
      {/* Icon Container */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isUnread ? colors.primary : colors.gray200,
          },
        ]}
      >
        <Icon
          source={config.icon}
          size={20}
          color={isUnread ? colors.textInverse : colors.textSecondary}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              { color: colors.textPrimary },
              isUnread && styles.titleUnread,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {/* Unread indicator dot */}
          {isUnread && (
            <View
              style={[styles.unreadDot, { backgroundColor: colors.primary }]}
              accessibilityLabel="Unread"
            />
          )}
        </View>
        <Text
          style={[styles.message, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {message}
        </Text>
        <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
          {timeAgo}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.smallBold,
    flex: 1,
  },
  titleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  message: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  timestamp: {
    ...typography.caption,
  },
});

export default NotificationItem;

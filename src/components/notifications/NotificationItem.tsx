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

function formatCurrency(amount: number, currency?: string): string {
  const symbols: Record<string, string> = { AUD: '$', USD: '$', GBP: '£', EUR: '€', NZD: '$' };
  const symbol = symbols[String(currency ?? '').toUpperCase()] || '$';
  return `${symbol}${Math.abs(amount).toFixed(2)}`;
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
  league_player_joined: {
    icon: 'account-group-outline',
    getTitle: (_data) => 'Player Joined League',
    getMessage: (data) =>
      `${data.player_name || 'Someone'} joined ${data.league_name || 'your league'}`,
  },
  league_player_left: {
    icon: 'account-remove-outline',
    getTitle: (_data) => 'Player Left League',
    getMessage: (data) =>
      `${data.player_name || 'Someone'} left ${data.league_name || 'your league'}`,
  },
  league_player_removed: {
    icon: 'account-off-outline',
    getTitle: (_data) => 'Removed from League',
    getMessage: (data) =>
      `You were removed from ${data.league_name || 'a league'}`,
  },
  league_round_tagged: {
    icon: 'tag-plus-outline',
    getTitle: (_data) => 'Round Tagged',
    getMessage: (data) =>
      `${data.player_name || 'Someone'} tagged a round to ${data.league_name || 'a league'}${data.handicap_differential ? ` (${data.handicap_differential})` : ''}`,
  },
  partnership_created: {
    icon: 'handshake',
    getTitle: (_data) => 'Partnership Created',
    getMessage: (data) =>
      `${data.partner_name || 'Someone'} created a partnership in ${data.league_name || 'a league'}`,
  },
  partnership_round_tagged: {
    icon: 'handshake',
    getTitle: (_data) => 'Partnership Round Tagged',
    getMessage: (data) =>
      `${data.player_name || 'Someone'} tagged a round for your partnership in ${data.league_name || 'a league'}`,
  },
  league_leaderboard_changed: {
    icon: 'podium',
    getTitle: (_data) => 'Ranking Changed',
    getMessage: (data) => {
      const direction = data.direction === 'up' ? 'up' : 'down';
      return `You moved ${direction} to #${data.new_rank || '?'} in ${data.league_name || 'a league'}`;
    },
  },
  round_completed: {
    icon: 'check-circle-outline',
    getTitle: (_data) => 'Round Complete',
    getMessage: (data) =>
      `All scorecards submitted for Round ${data.round_number || ''} of ${data.competition_name || 'a competition'}`,
  },
  skins_game_completed: {
    icon: 'cards-playing-outline',
    getTitle: (_data) => 'Skins Game Complete',
    getMessage: (data) => {
      const base = data.competition_name
        ? `Skins game completed for Round ${data.round_number || ''} of ${data.competition_name}`
        : `Skins game completed at ${data.course_name || 'the course'}`;
      if (data.holes_won != null && data.net_result != null) {
        const sign = Number(data.net_result) >= 0 ? '+' : '-';
        return `${base}. You won ${data.holes_won} holes (${sign}${formatCurrency(Number(data.net_result), data.currency as string)})`;
      }
      return base;
    },
  },
  skins_game_cancelled: {
    icon: 'cards-playing-outline',
    getTitle: (_data) => 'Skins Game Cancelled',
    getMessage: (data) => {
      const context = data.competition_name
        ? `for Round ${data.round_number || ''} of ${data.competition_name}`
        : `at ${data.course_name || 'the course'}`;
      return `Skins game ${context} has been cancelled`;
    },
  },
  wolf_game_completed: {
    icon: 'paw',
    getTitle: (_data) => 'Wolf Game Complete',
    getMessage: (data) => {
      const base = data.competition_name
        ? `Wolf game completed for Round ${data.round_number || ''} of ${data.competition_name}`
        : `Wolf game completed at ${data.course_name || 'the course'}`;
      if (data.total_points != null && data.net_result != null) {
        const sign = Number(data.net_result) >= 0 ? '+' : '-';
        return `${base}. You finished with ${data.total_points} pts (${sign}${formatCurrency(Number(data.net_result), data.currency as string)})`;
      }
      return base;
    },
  },
  wolf_game_cancelled: {
    icon: 'paw',
    getTitle: (_data) => 'Wolf Game Cancelled',
    getMessage: (data) => {
      const context = data.competition_name
        ? `for Round ${data.round_number || ''} of ${data.competition_name}`
        : `at ${data.course_name || 'the course'}`;
      return `Wolf game ${context} has been cancelled`;
    },
  },
  prize_pool_settled: {
    icon: 'trophy',
    getTitle: (_data) => 'Prize Pool Settled',
    getMessage: (data) => {
      if (data.position != null && data.payout_amount != null) {
        const pos = Number(data.position);
        const suffix =
          pos % 100 >= 11 && pos % 100 <= 13
            ? 'th'
            : pos % 10 === 1
              ? 'st'
              : pos % 10 === 2
                ? 'nd'
                : pos % 10 === 3
                  ? 'rd'
                  : 'th';
        return `Prize pool settled for ${data.competition_name || 'a competition'}. You placed ${pos}${suffix} and won ${formatCurrency(Number(data.payout_amount), data.currency as string)}`;
      }
      return `Prize pool for ${data.competition_name || 'a competition'} has been settled. Check the results!`;
    },
  },
  tee_time_reminder: {
    icon: 'clock-outline',
    getTitle: (_data) => 'Tee time in 30 min',
    getMessage: (data) => {
      const time = data.tee_time_local || data.teeTimeLocal;
      const course = data.course_name || data.courseName;
      const competition = data.competition_name || data.competitionName;
      const parts: string[] = [];
      if (competition) parts.push(String(competition));
      if (course) parts.push(String(course));
      const prefix = parts.length > 0 ? parts.join(' at ') : 'Your round';
      return time ? `${prefix} · ${time}` : prefix;
    },
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

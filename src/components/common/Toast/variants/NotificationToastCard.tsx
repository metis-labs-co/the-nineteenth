/**
 * NotificationToastCard - Card content for real-time notification toasts
 *
 * Displays icon, title, and message for Supabase Realtime notifications.
 * This is the presentational card only — animation and positioning are
 * handled by UnifiedToastDisplay.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { Notification, NotificationType } from '@/types/database.types';

// ============================================================================
// NOTIFICATION CONFIG
// ============================================================================

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

const notificationConfig: Record<NotificationType, NotificationConfig> = {
  competition_player_added: {
    icon: 'trophy-outline',
    getTitle: () => 'Added to Competition',
    getMessage: (data) =>
      data.added_by_name
        ? `${data.added_by_name} added you to ${data.competition_name || 'a competition'}`
        : `You were added to ${data.competition_name || 'a competition'}`,
  },
  competition_player_joined: {
    icon: 'account-plus',
    getTitle: () => 'New Player Joined',
    getMessage: (data) =>
      `${data.player_name || 'Someone'} joined ${data.competition_name || 'your competition'}`,
  },
  new_round_created: {
    icon: 'golf',
    getTitle: () => 'New Round Created',
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
    getTitle: () => 'Competition Updated',
    getMessage: (data) =>
      data.new_status
        ? `${data.competition_name || 'Competition'} is now ${data.new_status.replace('-', ' ')}`
        : `${data.competition_name || 'Competition'} status changed`,
  },
  scorecard_submitted: {
    icon: 'clipboard-check-outline',
    getTitle: () => 'Scorecard Submitted',
    getMessage: (data) =>
      `${data.player_name || 'A player'} submitted their scorecard${data.date ? ` for ${data.date}` : ''}`,
  },
  friend_request_received: {
    icon: 'account-plus-outline',
    getTitle: () => 'Friend Request',
    getMessage: (data) =>
      `${data.requester_name || 'Someone'} sent you a friend request`,
  },
  friend_request_accepted: {
    icon: 'account-check',
    getTitle: () => 'Friend Request Accepted',
    getMessage: (data) =>
      `${data.accepter_name || 'Your friend request was'} accepted your friend request`,
  },
  social_round_invitation: {
    icon: 'golf-tee',
    getTitle: () => 'Round Invitation',
    getMessage: (data) =>
      `${data.inviter_name || 'Someone'} invited you to play${data.venue_name ? ` at ${data.venue_name}` : ''}`,
  },
  league_player_joined: {
    icon: 'account-group',
    getTitle: () => 'Player Joined League',
    getMessage: (data) =>
      `${data.player_name || 'Someone'} joined ${data.league_name || 'your league'}`,
  },
  league_player_left: {
    icon: 'account-minus',
    getTitle: () => 'Player Left League',
    getMessage: (data) =>
      `${data.player_name || 'A player'} left ${data.league_name || 'your league'}`,
  },
  league_player_removed: {
    icon: 'account-remove',
    getTitle: () => 'Player Removed',
    getMessage: (data) =>
      `${data.player_name || 'A player'} was removed from ${data.league_name || 'your league'}`,
  },
  league_round_tagged: {
    icon: 'tag-plus',
    getTitle: () => 'Round Tagged to League',
    getMessage: (data) =>
      `A round was tagged to ${data.league_name || 'your league'}`,
  },
  partnership_created: {
    icon: 'handshake',
    getTitle: () => 'Partnership Created',
    getMessage: (data) =>
      `${data.partner_name || 'Someone'} created a partnership in ${data.league_name || 'your league'}`,
  },
  partnership_round_tagged: {
    icon: 'handshake',
    getTitle: () => 'Partnership Round Tagged',
    getMessage: (data) =>
      `A round was tagged for your partnership in ${data.league_name || 'your league'}`,
  },
  league_leaderboard_changed: {
    icon: 'chart-bar',
    getTitle: () => 'Leaderboard Updated',
    getMessage: (data) =>
      `The leaderboard for ${data.league_name || 'your league'} has been updated`,
  },
  round_completed: {
    icon: 'flag-checkered',
    getTitle: () => 'Round Completed',
    getMessage: (data) =>
      `Round${data.round_number ? ` ${data.round_number}` : ''} has been completed${data.course_name ? ` at ${data.course_name}` : ''}`,
  },
  skins_game_completed: {
    icon: 'cards-playing-outline',
    getTitle: () => 'Skins Game Complete',
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
    getTitle: () => 'Skins Game Cancelled',
    getMessage: (data) => {
      const context = data.competition_name
        ? `for Round ${data.round_number || ''} of ${data.competition_name}`
        : `at ${data.course_name || 'the course'}`;
      return `Skins game ${context} has been cancelled`;
    },
  },
  wolf_game_completed: {
    icon: 'paw',
    getTitle: () => 'Wolf Game Complete',
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
    getTitle: () => 'Wolf Game Cancelled',
    getMessage: (data) => {
      const context = data.competition_name
        ? `for Round ${data.round_number || ''} of ${data.competition_name}`
        : `at ${data.course_name || 'the course'}`;
      return `Wolf game ${context} has been cancelled`;
    },
  },
  prize_pool_settled: {
    icon: 'trophy',
    getTitle: () => 'Prize Pool Settled',
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
    getTitle: () => 'Tee time in 30 min',
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

function getNotificationConfig(type: NotificationType): NotificationConfig {
  return (
    notificationConfig[type] || {
      icon: 'bell-outline',
      getTitle: () => 'Notification',
      getMessage: () => 'You have a new notification',
    }
  );
}

// Also export for use in NotificationItem if needed
export { notificationConfig, getNotificationConfig };

// ============================================================================
// COMPONENT
// ============================================================================

interface NotificationToastCardProps {
  notification: Notification;
  onPress?: () => void;
}

export const NotificationToastCard = React.memo(function NotificationToastCard({
  notification,
  onPress,
}: NotificationToastCardProps) {
  const colors = useThemeColors();
  const config = getNotificationConfig(notification.type);

  const title = config.getTitle(notification.data);
  const message = config.getMessage(notification.data);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        shadows.lg,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${message}. Tap to view.`}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.primary },
        ]}
      >
        <Icon source={config.icon} size={20} color={colors.textInverse} />
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={[styles.message, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {message}
        </Text>
      </View>

      <Icon source="chevron-right" size={20} color={colors.gray400} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 72,
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
    marginRight: spacing.sm,
  },
  title: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.small,
  },
});

/**
 * NotificationsScreen - View and manage notifications
 *
 * Displays the user's notifications with:
 * - List of notifications with read/unread status
 * - Mark all as read action
 * - Pull-to-refresh
 * - Navigation to relevant screens based on notification type
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { Divider } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import type { Notification } from '@/types/database.types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  // Data fetching
  const {
    data: notifications,
    isLoading,
    refetch,
    isRefetching,
  } = useNotifications();

  // Mutations
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Check if there are any unread notifications
  const hasUnread = notifications?.some((n) => !n.is_read) ?? false;

  /**
   * Handle notification press - marks as read and navigates
   */
  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      // Mark as read if unread
      if (!notification.is_read) {
        markRead.mutate(notification.id);
      }

      // Navigate based on notification data
      // Invitation/response types go to the scheduled-round detail screen.
      if (
        (notification.type === 'social_round_invitation' ||
          notification.type === 'social_round_response') &&
        notification.round_id
      ) {
        navigation.navigate('ScheduledRound', { roundId: notification.round_id });
      } else if (notification.round_id) {
        // round_id first: round-specific notifications should land on the round
        navigation.navigate('ViewRound', {
          roundId: notification.round_id,
          competitionId: notification.competition_id ?? undefined,
        });
      } else if (notification.competition_id) {
        navigation.navigate('CompetitionDetail', {
          id: notification.competition_id,
        });
      } else if (notification.league_id) {
        navigation.navigate('LeagueDetail', {
          id: notification.league_id,
        });
      } else if (notification.friendship_id) {
        navigation.navigate('Friends', { fromProfile: true });
      }
    },
    [navigation, markRead]
  );

  /**
   * Handle mark all as read
   */
  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  /**
   * Render a single notification item
   */
  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationItem
        notification={item}
        onPress={handleNotificationPress}
        testID={`notification-${item.id}`}
      />
    ),
    [handleNotificationPress]
  );

  /**
   * Render item separator
   */
  const renderSeparator = useCallback(
    () => <Divider style={{ backgroundColor: colors.border }} />,
    [colors.border]
  );

  /**
   * Extract key for FlatList
   */
  const keyExtractor = useCallback((item: Notification) => item.id, []);

  // Build header right action (Mark All Read button)
  const headerRightActions = hasUnread
    ? [
        {
          icon: 'check-all',
          onPress: handleMarkAllRead,
          accessibilityLabel: 'Mark all notifications as read',
        },
      ]
    : [];

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Notifications"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" />
        </View>
      </View>
    );
  }

  // Empty state
  const isEmpty = !notifications || notifications.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader
        title="Notifications"
        showBack
        onBack={() => navigation.goBack()}
        rightActions={headerRightActions}
      />

      {isEmpty ? (
        <EmptyState
          title="No notifications yet"
          message="You'll see notifications here when there's activity in your competitions or friend requests"
          icon="bell-outline"
        />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.textPrimary]}
              tintColor={colors.textPrimary}
            />
          }
          showsVerticalScrollIndicator={false}
          accessibilityRole="list"
          accessibilityLabel="Notifications list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
});

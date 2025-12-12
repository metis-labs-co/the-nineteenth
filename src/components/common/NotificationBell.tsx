/**
 * NotificationBell - Bell icon with unread notification badge
 *
 * Displays a bell icon that shows the number of unread notifications.
 * Used in navigation headers to provide quick access to notifications.
 *
 * @example
 * ```tsx
 * <NotificationBell
 *   onPress={() => navigation.navigate('Notifications')}
 *   size={24}
 * />
 * ```
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useNotificationStore } from '@/store/notificationStore';

interface NotificationBellProps {
  /**
   * Callback when the bell is pressed
   */
  onPress: () => void;
  /**
   * Size of the bell icon
   * @default 24
   */
  size?: number;
}

export const NotificationBell = React.memo(function NotificationBell({
  onPress,
  size = 24,
}: NotificationBellProps) {
  const colors = useThemeColors();
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  // Format count for display (99+ if over 99)
  const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);

  // Build accessibility label
  const accessibilityLabel =
    unreadCount === 0
      ? 'Notifications, none unread'
      : unreadCount === 1
        ? 'Notifications, 1 unread'
        : `Notifications, ${unreadCount} unread`;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens the notifications screen"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon source="bell-outline" size={size} color={colors.textPrimary} />
      {unreadCount > 0 && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.error,
              borderColor: colors.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color: colors.textInverse,
              },
            ]}
            numberOfLines={1}
          >
            {displayCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    textAlign: 'center',
  },
});

export default NotificationBell;

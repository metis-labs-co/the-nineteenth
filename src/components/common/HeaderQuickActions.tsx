/**
 * HeaderQuickActions — the weather / rounds / notifications icon cluster
 * shown on the right side of every main-tab PageHeader (except Profile).
 *
 * Self-contained: fetches the unread notification count and navigates to
 * the root-stack AllRounds / Notifications screens itself, so screens can
 * drop it into PageHeader's `rightContent` as a one-liner.
 *
 * @example
 * ```tsx
 * <PageHeader title="Compete" rightContent={<HeaderQuickActions />} />
 *
 * // Screen-specific extra actions can be passed as children and render
 * // before the trio (for small inline info actions, prefer PageHeader's
 * // `infoAction` prop instead):
 * <PageHeader
 *   title="Courses"
 *   rightContent={
 *     <HeaderQuickActions>
 *       <HeaderIconButton icon="plus" onPress={onAdd} accessibilityLabel="Add course" />
 *     </HeaderQuickActions>
 *   }
 * />
 * ```
 */

import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { useUnreadNotificationCount } from '@/hooks/notifications';
import { HeaderWeatherChip } from '@/components/weather';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface HeaderIconButtonProps {
  /** Icon name (Material Design Icons via react-native-paper) */
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
  /** Unread-style count badge; hidden when 0/undefined */
  badgeCount?: number;
}

/**
 * HeaderIconButton — 44x44 pill icon button matching the PageHeader action
 * style. Exported so screens can pass extra actions into HeaderQuickActions.
 */
export function HeaderIconButton({
  icon,
  onPress,
  accessibilityLabel,
  badgeCount = 0,
}: HeaderIconButtonProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
    >
      <View>
        <Icon source={icon} size={22} color={colors.primary} />
        {badgeCount > 0 ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.error, borderColor: colors.surface },
            ]}
          >
            <Text
              style={[styles.badgeText, { color: colors.textOnColored }]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

interface HeaderQuickActionsProps {
  /** Optional screen-specific action(s) rendered before the trio */
  children?: React.ReactNode;
  /**
   * Hide the rounds (golf) button — e.g. on the rounds list screen itself,
   * where it would navigate to the screen the user is already on.
   * @default true
   */
  showRounds?: boolean;
}

export function HeaderQuickActions({
  children,
  showRounds = true,
}: HeaderQuickActionsProps) {
  const navigation = useNavigation<Nav>();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  const handleRoundsPress = useCallback(() => {
    navigation.navigate('AllRounds');
  }, [navigation]);

  const handleNotificationsPress = useCallback(() => {
    navigation.navigate('Notifications');
  }, [navigation]);

  return (
    <View style={styles.row}>
      {children}
      {/* Always render the chip — it's a "my location" ambient indicator.
          The chip self-hides when there is no snapshot yet. */}
      <HeaderWeatherChip />
      {showRounds ? (
        <HeaderIconButton
          icon="golf"
          onPress={handleRoundsPress}
          accessibilityLabel="View all rounds"
        />
      ) : null}
      <HeaderIconButton
        icon="bell-outline"
        onPress={handleNotificationsPress}
        accessibilityLabel={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        badgeCount={unreadCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
});

export default HeaderQuickActions;

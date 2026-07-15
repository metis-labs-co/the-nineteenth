/**
 * MenuItemRow - A consistent navigation and settings row pattern
 *
 * Replaces custom menu item implementations in ProfileScreen (MenuItem) and
 * NotificationSettingsScreen (SettingRow). Provides a standardized row for
 * menu navigation, settings toggles, and destructive actions.
 *
 * @example
 * ```tsx
 * // Navigation item
 * <MenuItemRow
 *   title="My Statistics"
 *   subtitle="View your performance"
 *   icon="chart-line"
 *   onPress={() => navigation.navigate('MyStatistics')}
 * />
 *
 * // With switch
 * <MenuItemRow
 *   title="Push Notifications"
 *   icon="bell"
 *   showChevron={false}
 *   rightContent={<Switch value={enabled} onValueChange={setEnabled} />}
 *   onPress={() => setEnabled(!enabled)}
 * />
 *
 * // Destructive action
 * <MenuItemRow
 *   title="Log Out"
 *   icon="logout"
 *   destructive
 *   showChevron={false}
 *   onPress={handleLogout}
 * />
 * ```
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

export interface MenuItemRowProps {
  /** Main label text (required) */
  title: string;
  /** Optional secondary text below title */
  subtitle?: string;
  /** Material Community Icons name (required) */
  icon: string;
  /** Press callback (required) */
  onPress: () => void;
  /** Custom right content (badges, switches, text) */
  rightContent?: React.ReactNode;
  /** Show chevron-right icon (default: true) */
  showChevron?: boolean;
  /** Red styling for destructive actions (default: false) */
  destructive?: boolean;
  /** Disable interaction (default: false) */
  disabled?: boolean;
  /** Show a hairline divider under the row (grouped list-cards; default: false) */
  divider?: boolean;
  /** For testing */
  testID?: string;
}

export const MenuItemRow = React.memo(function MenuItemRow({
  title,
  subtitle,
  icon,
  onPress,
  rightContent,
  showChevron = true,
  destructive = false,
  disabled = false,
  divider = false,
  testID,
}: MenuItemRowProps) {
  const colors = useThemeColors();

  // Determine icon and text colors based on state
  const iconColor = destructive ? colors.error : colors.primary;
  const iconBackground = destructive ? colors.errorBackground : colors.primaryBackground;
  const titleColor = destructive ? colors.error : colors.textPrimary;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        divider && [styles.divider, { borderBottomColor: colors.borderLight }],
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={title + (subtitle ? `, ${subtitle}` : '')}
      accessibilityHint={destructive ? 'Tap to perform action' : 'Tap to navigate'}
      testID={testID}
    >
      {/* Left: Icon square (34px, tinted) */}
      <View style={[styles.iconContainer, { backgroundColor: iconBackground }]}>
        <Icon source={icon} size={18} color={iconColor} />
      </View>

      {/* Center: Text container */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right: Either rightContent OR chevron (not both) */}
      {rightContent ? (
        <View style={styles.rightContent}>{rightContent}</View>
      ) : showChevron ? (
        <Icon source="chevron-right" size={18} color={colors.textTertiary} />
      ) : null}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  rightContent: {
    marginLeft: spacing.sm,
  },
});

export default MenuItemRow;

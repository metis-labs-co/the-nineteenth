/**
 * BottomNavigation - Footer navigation component for main app screens
 *
 * Provides navigation between Home, Competitions, and Profile tabs
 * with proper safe area handling and accessibility support.
 *
 * @example
 * <BottomNavigation
 *   activeTab="home"
 *   onTabPress={(tab) => navigation.navigate(tab.route)}
 * />
 */

import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, Platform, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconHome, IconTrophy, IconUser, IconTournament, IconMap } from '@tabler/icons-react-native';
import { spacing, typography, shadows, layout } from '@/constants/theme';
import { useThemeColors, type ColorPalette } from '@/context/ThemeContext';

/**
 * Navigation tab configuration
 */
export interface NavigationTab {
  /** Unique identifier for the tab */
  key: 'home' | 'competitions' | 'courses' | 'leagues' | 'profile';
  /** Display label */
  label: string;
  /** Route name for navigation */
  route: string;
  /** Accessibility label for screen readers */
  accessibilityLabel: string;
}

/**
 * Props for BottomNavigation component
 */
interface BottomNavigationProps {
  /**
   * Currently active tab key. Omit (or pass undefined) when rendered on
   * a screen that isn't itself a tab — no item will be highlighted.
   */
  activeTab?: NavigationTab['key'];
  /**
   * Callback when a tab is pressed
   */
  onTabPress?: (tab: NavigationTab) => void;
  /**
   * Optional badge counts for tabs
   */
  badges?: Partial<Record<NavigationTab['key'], number | string>>;
}

/**
 * Default navigation tabs configuration
 */
const NAVIGATION_TABS: NavigationTab[] = [
  {
    key: 'home',
    label: 'Home',
    route: 'HomeTab',
    accessibilityLabel: 'Navigate to home screen',
  },
  {
    key: 'competitions',
    label: 'Comps',
    route: 'CompetitionsTab',
    accessibilityLabel: 'Navigate to competitions list',
  },
  {
    key: 'courses',
    label: 'Courses',
    route: 'CoursesTab',
    accessibilityLabel: 'Navigate to courses list',
  },
  {
    key: 'leagues',
    label: 'Leagues',
    route: 'LeaguesTab',
    accessibilityLabel: 'Navigate to leagues',
  },
  {
    key: 'profile',
    label: 'Profile',
    route: 'ProfileTab',
    accessibilityLabel: 'Navigate to your profile',
  },
];

/**
 * Get the icon component for a tab
 */
const getTabIcon = (
  key: NavigationTab['key'],
  isActive: boolean,
  colors: ColorPalette
): React.ReactNode => {
  const iconColor = isActive ? colors.primary : colors.gray500;
  const iconSize = 24;

  switch (key) {
    case 'home':
      return <IconHome size={iconSize} color={iconColor} />;
    case 'competitions':
      return <IconTrophy size={iconSize} color={iconColor} />;
    case 'courses':
      return <IconMap size={iconSize} color={iconColor} />;
    case 'leagues':
      return <IconTournament size={iconSize} color={iconColor} />;
    case 'profile':
      return <IconUser size={iconSize} color={iconColor} />;
    default:
      return null;
  }
};

/**
 * Badge component for showing notification counts
 */
const Badge = React.memo(function Badge({
  count,
  colors,
}: {
  count: number | string;
  colors: ColorPalette;
}) {
  const displayCount = typeof count === 'number' && count > 99 ? '99+' : count;

  return (
    <View style={[styles.badge, { backgroundColor: colors.error }]}>
      <Text style={[styles.badgeText, { color: colors.white }]}>{displayCount}</Text>
    </View>
  );
});

/**
 * Individual tab item component
 */
const TabItem = React.memo(function TabItem({
  tab,
  isActive,
  badge,
  onPress,
  colors,
}: {
  tab: NavigationTab;
  isActive: boolean;
  badge?: number | string;
  onPress: () => void;
  colors: ColorPalette;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabItem}
      activeOpacity={0.7}
      accessibilityLabel={tab.accessibilityLabel}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.iconContainer}>
        {getTabIcon(tab.key, isActive, colors)}
        {badge !== undefined && badge !== 0 && <Badge count={badge} colors={colors} />}
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: colors.gray500 },
          isActive && { color: colors.primary, fontWeight: '600' },
        ]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
});

/**
 * BottomNavigation component
 *
 * A footer navigation bar with Home, Competitions, and Profile tabs.
 * Handles safe area insets for devices with home indicators (iPhone X+, Android gesture nav).
 */
export const BottomNavigation = React.memo(function BottomNavigation({
  activeTab,
  onTabPress,
  badges,
}: BottomNavigationProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const handleTabPress = useCallback(
    (tab: NavigationTab) => {
      onTabPress?.(tab);
    },
    [onTabPress]
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          backgroundColor: colors.surface,
          borderTopColor: colors.gray200,
        },
      ]}
      accessibilityRole="tablist"
    >
      {NAVIGATION_TABS.map((tab) => (
        <TabItem
          key={tab.key}
          tab={tab}
          isActive={activeTab === tab.key}
          badge={badges?.[tab.key]}
          onPress={() => handleTabPress(tab)}
          colors={colors}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    ...Platform.select({
      ios: {
        ...shadows.lg,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.tabBarHeight - spacing.sm,
    paddingVertical: spacing.xs,
  },
  tabItemPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  tabLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default BottomNavigation;

/**
 * MainTabNavigator - Bottom tab navigation for main app screens
 *
 * Uses React Navigation's bottom tabs with a custom tab bar component
 * for Home, Compete, Activity, Courses, and Profile screens.
 */

import React, { useCallback, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import HomeScreen from '@/screens/home/HomeScreen';
import { CompeteScreen } from '@/screens/compete';
import { ActivityScreen } from '@/screens/activity';
import CourseListScreen from '@/screens/courses/CourseListScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';

import { BottomNavigation } from '@/components/layout';
import type { NavigationTab } from '@/components/layout';
import type { TabParamList } from './types';
import { useNotificationContext } from '@/context/NotificationContext';

const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Map route names to tab keys
 */
const routeToTabKey: Record<string, NavigationTab['key']> = {
  HomeTab: 'home',
  CompeteTab: 'compete',
  ActivityTab: 'activity',
  CoursesTab: 'courses',
  ProfileTab: 'profile',
};

/**
 * Custom tab bar component using our BottomNavigation
 */
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const currentRoute = state.routes[state.index];
  const activeTab = routeToTabKey[currentRoute.name] || 'home';
  const { unreadCount } = useNotificationContext();

  const handleTabPress = useCallback(
    (tab: NavigationTab) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: tab.route,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate(tab.route);
      }
    },
    [navigation]
  );

  // Memoize badges to prevent unnecessary re-renders
  const badges = useMemo(
    () => (unreadCount > 0 ? { profile: unreadCount } : undefined),
    [unreadCount]
  );

  return (
    <BottomNavigation
      activeTab={activeTab}
      onTabPress={handleTabPress}
      badges={badges}
    />
  );
}

/**
 * MainTabNavigator component
 *
 * Provides bottom tab navigation between Home, Compete, Activity, Courses, and Profile.
 */
export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Lazy load screens for better performance
        lazy: true,
      }}
      initialRouteName="HomeTab"
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen
        name="CompeteTab"
        component={CompeteScreen}
        options={{
          title: 'Compete',
        }}
      />
      <Tab.Screen
        name="ActivityTab"
        component={ActivityScreen}
        options={{
          title: 'Activity',
        }}
      />
      <Tab.Screen
        name="CoursesTab"
        component={CourseListScreen}
        options={{
          title: 'Courses',
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

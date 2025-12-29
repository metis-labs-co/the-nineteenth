/**
 * ProfileScreen - User profile and settings
 *
 * Shows user information, statistics, and app settings.
 * Accessible via the Profile tab in bottom navigation.
 */

import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { LoadingSpinner, PlayerAvatar } from '@/components/common';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useHomeVenue } from '@/hooks/useHomeVenue';
import { PageHeader } from '@/components/common/PageHeader';
import { NotificationBell } from '@/components/common/NotificationBell';
import { APP_NAME, APP_VERSION } from '@/constants/app';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  showChevron?: boolean;
  destructive?: boolean;
}

const MenuItem = React.memo(function MenuItem({
  icon,
  label,
  onPress,
  showChevron = true,
  destructive = false,
}: MenuItemProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        { borderBottomColor: colors.gray100 },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.menuItemLeft}>
        <Icon
          source={icon}
          size={20}
          color={destructive ? colors.error : colors.gray600}
        />
        <Text
          style={[styles.menuItemLabel, { color: colors.textPrimary }, destructive && { color: colors.error }]}
        >
          {label}
        </Text>
      </View>
      {showChevron && (
        <Icon source="chevron-right" size={20} color={colors.gray400} />
      )}
    </TouchableOpacity>
  );
});

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { player, user, logout, isLoading } = useAuth();
  const colors = useThemeColors();
  const { data: homeVenue } = useHomeVenue();

  // Get display values from player profile or fall back to user data
  const displayName = player?.name || user?.user_metadata?.name || 'Guest User';
  const displayEmail = player?.email || user?.email || 'guest@example.com';
  const displayHandicap = player?.handicap;

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  // Navigate to notifications screen
  const handleNotificationsPress = () => {
    navigation.navigate('Notifications');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Profile"
          rightContent={<NotificationBell onPress={handleNotificationsPress} />}
        />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Profile"
        rightContent={<NotificationBell onPress={handleNotificationsPress} />}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* User Info Card */}
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: colors.surface }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('EditProfile')}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          accessibilityHint="Tap to edit your profile"
        >
          <PlayerAvatar
            photoUrl={player?.photo_url}
            name={displayName}
            size={64}
          />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{displayName}</Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{displayEmail}</Text>
            {displayHandicap !== null && displayHandicap !== undefined && (
              <Text style={[styles.userHandicap, { color: colors.primary }]}>
                Handicap: {displayHandicap}
              </Text>
            )}
          </View>
          <Icon source="chevron-right" size={20} color={colors.gray400} />
        </TouchableOpacity>

        {/* Home Venue Section */}
        <TouchableOpacity
          style={[styles.homeVenueCard, { backgroundColor: colors.surface }]}
          activeOpacity={homeVenue ? 0.7 : 1}
          onPress={homeVenue ? () => navigation.navigate('Venue', { venueId: homeVenue.id }) : undefined}
          accessibilityRole={homeVenue ? 'button' : 'none'}
          accessibilityLabel={homeVenue ? `View home venue: ${homeVenue.name}` : 'No home venue set'}
        >
          <View
            style={[
              styles.homeVenueIcon,
              { backgroundColor: homeVenue ? colors.primaryLighter : colors.gray100 },
            ]}
          >
            <Icon
              source={homeVenue ? 'home' : 'home-outline'}
              size={20}
              color={homeVenue ? colors.primary : colors.gray400}
            />
          </View>
          <View style={styles.homeVenueInfo}>
            <Text style={[styles.homeVenueLabel, { color: colors.textSecondary }]}>
              Home Venue
            </Text>
            {homeVenue ? (
              <>
                <Text style={[styles.homeVenueName, { color: colors.textPrimary }]}>
                  {homeVenue.name}
                </Text>
                {homeVenue.courses && homeVenue.courses.length > 0 && (
                  <Text style={[styles.homeVenueCourses, { color: colors.textSecondary }]}>
                    {homeVenue.courses.length} course{homeVenue.courses.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </>
            ) : (
              <Text style={[styles.homeVenueName, { color: colors.textTertiary }]}>
                Not set
              </Text>
            )}
          </View>
          {homeVenue && <Icon source="chevron-right" size={20} color={colors.gray400} />}
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.surface }]}>
            <MenuItem
              icon="account-edit"
              label="Edit Profile"
              onPress={() => {
                navigation.navigate('EditProfile');
              }}
            />
            <MenuItem
              icon="chart-bar"
              label="My Statistics"
              onPress={() => {
                navigation.navigate('MyStatistics');
              }}
            />
            <MenuItem
              icon="account-group"
              label="Friends"
              onPress={() => {
                navigation.navigate('Friends', { fromProfile: true });
              }}
            />
            <MenuItem
              icon="star-circle"
              label="My Subscription"
              onPress={() => {
                navigation.navigate('Subscription');
              }}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>App</Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.surface }]}>
            <MenuItem
              icon="cog"
              label="Settings"
              onPress={() => {
                navigation.navigate('Settings');
              }}
            />
            <MenuItem
              icon="bell-outline"
              label="Push Notifications"
              onPress={() => {
                navigation.navigate('NotificationSettings');
              }}
            />
            <MenuItem
              icon="help-circle"
              label="Help & Support"
              onPress={() => {
                navigation.navigate('HelpAndSupport');
              }}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <View style={[styles.menuGroup, { backgroundColor: colors.surface }]}>
            <MenuItem
              icon="logout"
              label="Sign Out"
              onPress={handleSignOut}
              showChevron={false}
              destructive
            />
          </View>
        </View>

        {/* Version Info */}
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          {APP_NAME} v{APP_VERSION}
        </Text>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  avatar: {
  },
  userInfo: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  userName: {
    ...typography.h4,
  },
  userEmail: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  userHandicap: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  homeVenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
  },
  homeVenueIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeVenueInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  homeVenueLabel: {
    ...typography.caption,
  },
  homeVenueName: {
    ...typography.bodyBold,
    marginTop: 2,
  },
  homeVenueCourses: {
    ...typography.small,
    marginTop: 2,
  },
  menuSection: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  menuGroup: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuItemLabel: {
    ...typography.body,
  },
  versionText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});

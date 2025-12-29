/**
 * ProfileScreen - User profile and settings
 *
 * Shows user information, statistics, and app settings.
 * Accessible via the Profile tab in bottom navigation.
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import { LoadingSpinner, PlayerAvatar, SearchBar, GolfBallLoader } from '@/components/common';
import { Text, Icon, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useHomeVenue, useSetHomeVenue, useClearHomeVenue } from '@/hooks/useHomeVenue';
import { usePlaceholderPlayers } from '@/hooks/usePlaceholderPlayers';
import {
  useVenuesWithCourses,
  useSearchVenues,
  type CourseWithFavoriteStatus,
  type VenueCourseDisplayItem,
} from '@/hooks/useVenues';
import { VenueCard } from '@/components/courses/VenueCard';
import { PageHeader } from '@/components/common/PageHeader';
import { NotificationBell } from '@/components/common/NotificationBell';
import { APP_NAME, APP_VERSION } from '@/constants/app';
import type { Venue } from '@/types/database.types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  badge?: number;
}

const MenuItem = React.memo(function MenuItem({
  icon,
  label,
  onPress,
  showChevron = true,
  destructive = false,
  badge,
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
        {badge !== undefined && badge > 0 && (
          <View style={[styles.menuItemBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.menuItemBadgeText, { color: colors.white }]}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
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
  const insets = useSafeAreaInsets();
  const { data: homeVenue } = useHomeVenue();
  const { data: placeholderPlayers } = usePlaceholderPlayers();

  // Home venue modal state
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Home venue hooks
  const setHomeVenue = useSetHomeVenue();
  const clearHomeVenue = useClearHomeVenue();
  const { data: allVenues = [], isLoading: isLoadingVenues } = useVenuesWithCourses();
  const { data: searchResults = [], isLoading: isSearching } = useSearchVenues(searchQuery);

  // Get display items for venue list
  const displayItems: VenueCourseDisplayItem[] = (
    searchQuery.length >= 2 ? searchResults : allVenues
  ).map((venue) => ({
    type: venue.is_multi_course ? 'multi-course-venue' : 'single-course',
    venue: {
      id: venue.id,
      source: venue.source,
      api_id: venue.api_id,
      name: venue.name,
      state: venue.state,
      city: venue.city,
      address: venue.address,
      phone: venue.phone,
      email: venue.email,
      website: venue.website,
      location: venue.location,
      total_holes: venue.total_holes,
      last_synced: venue.last_synced,
      created_at: venue.created_at,
      updated_at: venue.updated_at,
    },
    courses: venue.courses,
    is_home: venue.is_home,
  }));

  // Handle opening modal
  const handleOpenVenueModal = useCallback(() => {
    setShowVenueModal(true);
  }, []);

  // Handle closing modal
  const handleCloseVenueModal = useCallback(() => {
    setShowVenueModal(false);
    setSearchQuery('');
  }, []);

  // Handle selecting a venue (from course selection)
  const handleCourseSelect = useCallback(async (course: CourseWithFavoriteStatus, venue: Venue) => {
    try {
      await setHomeVenue.mutateAsync(venue.id);
      handleCloseVenueModal();
    } catch (error) {
      console.error('[ProfileScreen] Error setting home venue:', error);
    }
  }, [setHomeVenue, handleCloseVenueModal]);

  // Handle venue press for multi-course venues
  const handleVenuePress = useCallback(async (venue: Venue) => {
    try {
      await setHomeVenue.mutateAsync(venue.id);
      handleCloseVenueModal();
    } catch (error) {
      console.error('[ProfileScreen] Error setting home venue:', error);
    }
  }, [setHomeVenue, handleCloseVenueModal]);

  // Handle clearing home venue
  const handleClearHomeVenue = useCallback(async () => {
    try {
      await clearHomeVenue.mutateAsync();
      handleCloseVenueModal();
    } catch (error) {
      console.error('[ProfileScreen] Error clearing home venue:', error);
    }
  }, [clearHomeVenue, handleCloseVenueModal]);

  // Render venue item for FlatList
  const renderVenueItem = useCallback(
    ({ item }: { item: VenueCourseDisplayItem }) => (
      <VenueCard
        item={item}
        onCourseSelect={handleCourseSelect}
        onVenuePress={handleVenuePress}
        showFavoriteButton={false}
        selectionMode
      />
    ),
    [handleCourseSelect, handleVenuePress]
  );

  const isProcessing = setHomeVenue.isPending || clearHomeVenue.isPending;

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
          activeOpacity={0.7}
          onPress={handleOpenVenueModal}
          accessibilityRole="button"
          accessibilityLabel={homeVenue ? `Change home venue: ${homeVenue.name}` : 'Set home venue'}
          accessibilityHint="Tap to change your home venue"
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
                Tap to set
              </Text>
            )}
          </View>
          <Icon source="pencil" size={18} color={colors.gray400} />
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
              icon="star-circle"
              label="My Subscription"
              onPress={() => {
                navigation.navigate('Subscription');
              }}
            />
            <MenuItem
              icon="account-multiple-outline"
              label="Manage Guest Players"
              onPress={() => {
                navigation.navigate('LinkPlaceholder');
              }}
              badge={placeholderPlayers?.length}
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

      {/* Home Venue Selection Modal */}
      <Modal visible={showVenueModal} animationType="slide" onRequestClose={handleCloseVenueModal}>
        <View
          style={[
            styles.modalContainer,
            { paddingTop: insets.top, backgroundColor: colors.background },
          ]}
        >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: colors.surface, borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {homeVenue ? 'Change Home Venue' : 'Set Home Venue'}
            </Text>
            <IconButton icon="close" onPress={handleCloseVenueModal} iconColor={colors.textPrimary} />
          </View>

          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search golf clubs..."
            accessibilityLabel="Search golf clubs"
            hideBorder
          />

          {/* Clear Home Venue Option (if one is set) */}
          {homeVenue && (
            <TouchableOpacity
              style={[styles.clearVenueButton, { borderBottomColor: colors.border }]}
              activeOpacity={0.7}
              onPress={handleClearHomeVenue}
              disabled={isProcessing}
            >
              {clearHomeVenue.isPending ? (
                <GolfBallLoader size="sm" />
              ) : (
                <>
                  <Icon source="home-remove" size={20} color={colors.error} />
                  <Text style={[styles.clearVenueText, { color: colors.error }]}>
                    Clear Home Venue
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Loading State */}
          {(isLoadingVenues || isSearching) && (
            <View style={styles.modalLoadingContainer}>
              <GolfBallLoader size="sm" />
              <Text style={[styles.modalLoadingText, { color: colors.textSecondary }]}>
                Loading venues...
              </Text>
            </View>
          )}

          {/* Venue List */}
          <FlatList
            data={displayItems}
            keyExtractor={(item) => item.venue.id}
            renderItem={renderVenueItem}
            contentContainerStyle={styles.venueList}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
            ListEmptyComponent={
              !isLoadingVenues && !isSearching ? (
                <View style={styles.emptyState}>
                  <Icon source="home-city" size={48} color={colors.gray400} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {searchQuery.length >= 2 ? 'No venues found' : 'No venues available'}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
                    {searchQuery.length >= 2
                      ? 'Try a different search term'
                      : 'Add venues from the Courses tab'}
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      </Modal>
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
  menuItemBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  menuItemBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  versionText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h4,
  },
  clearVenueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  clearVenueText: {
    ...typography.body,
  },
  modalLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  modalLoadingText: {
    ...typography.small,
  },
  venueList: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listSeparator: {
    height: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.small,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

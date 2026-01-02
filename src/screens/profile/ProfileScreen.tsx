/**
 * ProfileScreen - User profile and settings
 *
 * Shows user information, statistics, and app settings.
 * Accessible via the Profile tab in bottom navigation.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { LoadingSpinner } from '@/components/common';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import {
  useVenuesWithCourses,
  useSearchVenues,
  type CourseWithFavoriteStatus,
  type VenueCourseDisplayItem,
} from '@/hooks/useVenues';
import { PageHeader } from '@/components/common/PageHeader';
import { NotificationBell } from './components';
import { APP_NAME, APP_VERSION } from '@/constants/app';
import type { Venue } from '@/types/database.types';

// Local components and hooks
import { useProfileData } from './hooks';
import {
  ProfileHeader,
  HomeVenueSection,
  HomeVenueModal,
  ProfileMenuSection,
  ProfileCustomizeSheet,
} from './components';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();

  // Profile data hook
  const {
    isLoading,
    profile,
    homeVenue,
    setHomeVenue,
    clearHomeVenue,
    placeholderPlayers,
    achievementPoints,
    equipped,
    unlockedCosmetics,
    cosmeticDefinitions,
    handleEquipCosmetic,
    handleUnequipCosmetic,
    logout,
  } = useProfileData();

  // Modal states
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomizeSheet, setShowCustomizeSheet] = useState(false);

  // Venue data for modal
  const { data: allVenues = [], isLoading: isLoadingVenues } = useVenuesWithCourses();
  const { data: searchResults = [], isLoading: isSearching } = useSearchVenues(searchQuery);

  // Get display items for venue list
  const displayItems: VenueCourseDisplayItem[] = useMemo(() => {
    return (searchQuery.length >= 2 ? searchResults : allVenues).map((venue) => ({
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
  }, [searchQuery, searchResults, allVenues]);

  // Venue modal handlers
  const handleCloseVenueModal = useCallback(() => {
    setShowVenueModal(false);
    setSearchQuery('');
  }, []);

  const handleCourseSelect = useCallback(async (_course: CourseWithFavoriteStatus, venue: Venue) => {
    try {
      await setHomeVenue.mutateAsync(venue.id);
      handleCloseVenueModal();
    } catch (error) {
      console.error('[ProfileScreen] Error setting home venue:', error);
    }
  }, [setHomeVenue, handleCloseVenueModal]);

  const handleVenuePress = useCallback(async (venue: Venue) => {
    try {
      await setHomeVenue.mutateAsync(venue.id);
      handleCloseVenueModal();
    } catch (error) {
      console.error('[ProfileScreen] Error setting home venue:', error);
    }
  }, [setHomeVenue, handleCloseVenueModal]);

  const handleClearHomeVenue = useCallback(async () => {
    try {
      await clearHomeVenue.mutateAsync();
      handleCloseVenueModal();
    } catch (error) {
      console.error('[ProfileScreen] Error clearing home venue:', error);
    }
  }, [clearHomeVenue, handleCloseVenueModal]);

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }, [logout]);

  // Navigation handlers
  const handleNotificationsPress = useCallback(() => {
    navigation.navigate('Notifications');
  }, [navigation]);

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
        <ProfileHeader
          displayName={profile.displayName}
          displayEmail={profile.displayEmail}
          displayHandicap={profile.displayHandicap}
          photoUrl={profile.photoUrl}
          equippedFrame={equipped?.frame ?? null}
          equippedBadge={equipped?.badge ?? null}
          equippedTitle={equipped?.title ?? null}
          onEditPress={() => navigation.navigate('EditProfile')}
        />

        {/* Home Venue Section */}
        <HomeVenueSection
          homeVenue={homeVenue ?? null}
          onPress={() => setShowVenueModal(true)}
        />

        {/* Menu Sections */}
        <ProfileMenuSection
          achievementPoints={achievementPoints}
          placeholderPlayersCount={placeholderPlayers?.length ?? 0}
          onEditProfile={() => navigation.navigate('EditProfile')}
          onMyStatistics={() => navigation.navigate('MyStatistics')}
          onAchievements={() => navigation.navigate('Achievements')}
          onCustomizeProfile={() => setShowCustomizeSheet(true)}
          onSubscription={() => navigation.navigate('Subscription')}
          onGuestPlayers={() => navigation.navigate('LinkPlaceholder')}
          onSettings={() => navigation.navigate('Settings')}
          onNotifications={() => navigation.navigate('NotificationSettings')}
          onHelpAndSupport={() => navigation.navigate('HelpAndSupport')}
          onSignOut={handleSignOut}
        />

        {/* Version Info */}
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          {APP_NAME} v{APP_VERSION}
        </Text>
      </ScrollView>

      {/* Home Venue Selection Modal */}
      <HomeVenueModal
        visible={showVenueModal}
        onClose={handleCloseVenueModal}
        homeVenue={homeVenue ?? null}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        displayItems={displayItems}
        isLoading={isLoadingVenues || isSearching}
        isProcessing={setHomeVenue.isPending || clearHomeVenue.isPending}
        isClearingVenue={clearHomeVenue.isPending}
        onCourseSelect={handleCourseSelect}
        onVenuePress={handleVenuePress}
        onClearHomeVenue={handleClearHomeVenue}
      />

      {/* Customize Profile Bottom Sheet */}
      <ProfileCustomizeSheet
        visible={showCustomizeSheet}
        onClose={() => setShowCustomizeSheet(false)}
        cosmeticDefinitions={cosmeticDefinitions ?? []}
        unlockedCosmetics={(unlockedCosmetics ?? []).map((pc) => ({
          id: pc.id,
          player_id: pc.player_id,
          cosmetic_id: pc.cosmetic_id,
          unlocked_at: pc.unlocked_at,
        }))}
        equipped={equipped ?? null}
        achievementPoints={achievementPoints}
        onEquip={handleEquipCosmetic}
        onUnequip={handleUnequipCosmetic}
      />
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
  versionText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});

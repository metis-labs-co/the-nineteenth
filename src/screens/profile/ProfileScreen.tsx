/**
 * ProfileScreen - User profile and settings
 *
 * Shows user information, statistics, and app settings.
 * Accessible via the Profile tab in bottom navigation.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { LoadingSpinner } from '@/components/common';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import {
  useClubsWithCourses,
  useSearchClubs,
  toClubCourseDisplayItem,
  type CourseWithFavoriteStatus,
  type ClubCourseDisplayItem,
} from '@/hooks/useClubs';
import { PageHeader } from '@/components/common/PageHeader';
import { NotificationBell } from './components';
import { APP_NAME, APP_VERSION } from '@/constants/app';
import type { Club } from '@/types/database.types';
import { useSettingsStore } from '@/store/settingsStore';
import { biometricService } from '@/services/biometric';

// Local components and hooks
import { useProfileData } from './hooks';
import {
  ProfileHeader,
  HomeClubSection,
  HomeClubModal,
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
    homeVenue: homeClub,
    setHomeVenue: setHomeClub,
    clearHomeVenue: clearHomeClub,
    placeholderPlayers,
    achievementPoints,
    equipped,
    unlockedCosmetics,
    cosmeticDefinitions,
    handleEquipCosmetic,
    handleUnequipCosmetic,
    logout,
  } = useProfileData();

  // Country label for menu display
  const countryOverride = useSettingsStore((state) => state.countryOverride);
  const currentCountryLabel = countryOverride ?? 'Auto';

  // Biometric availability for security menu item
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  useEffect(() => {
    biometricService.checkAvailability().then((result) => setBiometricAvailable(result.isAvailable));
  }, []);

  // Modal states
  const [showClubModal, setShowClubModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomizeSheet, setShowCustomizeSheet] = useState(false);

  // Club data for modal
  const { data: allClubs = [], isLoading: isLoadingClubs } = useClubsWithCourses();
  const { data: searchResults = [], isLoading: isSearching } = useSearchClubs(searchQuery);

  // Get display items for club list
  const displayItems: ClubCourseDisplayItem[] = useMemo(() => {
    return (searchQuery.length >= 2 ? searchResults : allClubs).map(toClubCourseDisplayItem);
  }, [searchQuery, searchResults, allClubs]);

  // Club modal handlers
  const handleCloseClubModal = useCallback(() => {
    setShowClubModal(false);
    setSearchQuery('');
  }, []);

  const handleCourseSelect = useCallback(async (_course: CourseWithFavoriteStatus, club: Club) => {
    try {
      await setHomeClub.mutateAsync(club.id);
      handleCloseClubModal();
    } catch (error) {
      console.error('[ProfileScreen] Error setting home club:', error);
    }
  }, [setHomeClub, handleCloseClubModal]);

  const handleClubPress = useCallback(async (club: Club) => {
    try {
      await setHomeClub.mutateAsync(club.id);
      handleCloseClubModal();
    } catch (error) {
      console.error('[ProfileScreen] Error setting home club:', error);
    }
  }, [setHomeClub, handleCloseClubModal]);

  const handleClearHomeClub = useCallback(async () => {
    try {
      await clearHomeClub.mutateAsync();
      handleCloseClubModal();
    } catch (error) {
      console.error('[ProfileScreen] Error clearing home club:', error);
    }
  }, [clearHomeClub, handleCloseClubModal]);

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

        {/* Home Club Section */}
        <HomeClubSection
          homeClub={homeClub ?? null}
          onPress={() => setShowClubModal(true)}
        />

        {/* Menu Sections */}
        <ProfileMenuSection
          achievementPoints={achievementPoints}
          placeholderPlayersCount={placeholderPlayers?.length ?? 0}
          currentCountryLabel={currentCountryLabel}
          biometricAvailable={biometricAvailable}
          onEditProfile={() => navigation.navigate('EditProfile')}
          onFriends={() => navigation.navigate('Friends', { fromProfile: true })}
          onMyStatistics={() => navigation.navigate('MyStatistics')}
          onHandicapHistory={() => navigation.navigate('HandicapHistory')}
          onGameResults={() => navigation.navigate('GameResults')}
          onAchievements={() => navigation.navigate('Achievements')}
          onCustomizeProfile={() => setShowCustomizeSheet(true)}
          onSubscription={() => navigation.navigate('Subscription')}
          onGuestPlayers={() => navigation.navigate('LinkPlaceholder')}
          onPrivacyData={() => navigation.navigate('PrivacyData')}
          onAppearance={() => navigation.navigate('Appearance')}
          onGameSettings={() => navigation.navigate('GameSettings')}
          onSecurity={() => navigation.navigate('Security')}
          onDeveloper={() => navigation.navigate('Developer')}
          onCountryRegion={() => navigation.navigate('CountryRegion')}
          onNotifications={() => navigation.navigate('NotificationSettings')}
          onHelpAndSupport={() => navigation.navigate('HelpAndSupport')}
          onSignOut={handleSignOut}
        />

        {/* Version Info */}
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          {APP_NAME} v{APP_VERSION}
        </Text>
      </ScrollView>

      {/* Home Club Selection Modal */}
      <HomeClubModal
        visible={showClubModal}
        onClose={handleCloseClubModal}
        homeClub={homeClub ?? null}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        displayItems={displayItems}
        isLoading={isLoadingClubs || isSearching}
        isProcessing={setHomeClub.isPending || clearHomeClub.isPending}
        isClearingClub={clearHomeClub.isPending}
        onCourseSelect={handleCourseSelect}
        onClubPress={handleClubPress}
        onClearHomeClub={handleClearHomeClub}
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

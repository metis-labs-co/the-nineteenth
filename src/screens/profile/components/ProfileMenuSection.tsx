/**
 * ProfileMenuSection - Navigation menu items for profile screen
 *
 * Displays grouped menu items for account settings, app settings,
 * and logout action using the MenuItemRow component.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { MenuItemRow } from './MenuItemRow';
import { useThemeColors } from '@/context/ThemeContext';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { FeatureId } from '@/types/subscription.types';

interface ProfileMenuSectionProps {
  /** Achievement points for badge display */
  achievementPoints: number;
  /** Number of placeholder players for badge display */
  placeholderPlayersCount: number;
  /** Current country name for display (e.g. 'Australia' or 'Auto') */
  currentCountryLabel: string;
  /** Navigation callbacks */
  onEditProfile: () => void;
  onMyStatistics: () => void;
  onHandicapHistory: () => void;
  onAchievements: () => void;
  onCustomizeProfile: () => void;
  onSubscription: () => void;
  onGuestPlayers: () => void;
  onPrivacyData: () => void;
  onSettings: () => void;
  onCountryRegion: () => void;
  onNotifications: () => void;
  onHelpAndSupport: () => void;
  onGameResults: () => void;
  onFriends: () => void;
  onSignOut: () => void;
}

export const ProfileMenuSection = React.memo(function ProfileMenuSection({
  achievementPoints,
  placeholderPlayersCount,
  currentCountryLabel,
  onEditProfile,
  onMyStatistics,
  onHandicapHistory,
  onAchievements,
  onCustomizeProfile,
  onSubscription,
  onGameResults,
  onGuestPlayers,
  onPrivacyData,
  onSettings,
  onCountryRegion,
  onNotifications,
  onFriends,
  onHelpAndSupport,
  onSignOut,
}: ProfileMenuSectionProps) {
  const colors = useThemeColors();
  const checkFeature = useCheckFeature();

  // Check which features are locked for current tier
  const isHandicapHistoryLocked = !checkFeature('handicap_history').allowed;
  const isManageGuestsLocked = !checkFeature('manage_guests').allowed;
  const isDetailedStatsLocked = !checkFeature('detailed_stats').allowed;
  const isGameResultsLocked = !checkFeature('skins_game').allowed;

  // Lock badge component for gated menu items
  const renderLockBadge = (feature: FeatureId) => {
    const access = checkFeature(feature);
    if (access.allowed) return undefined;
    const tierLabel = access.requiredTier === 'premium' ? 'Premium' : 'Social';
    return (
      <View style={[styles.lockBadge, { backgroundColor: colors.primaryBackground }]}>
        <Icon source="lock-outline" size={12} color={colors.primary} />
        <Text style={[styles.lockBadgeText, { color: colors.primary }]}>
          {tierLabel}
        </Text>
      </View>
    );
  };

  return (
    <>
      {/* Account Section */}
      <View style={styles.menuSection}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Account
        </Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.surface }]}>
          <MenuItemRow
            icon="account-edit"
            title="Edit Profile"
            onPress={onEditProfile}
            testID="menu-edit-profile"
          />
          <MenuItemRow
            icon="account-group-outline"
            title="Friends"
            onPress={onFriends}
            testID="menu-friends"
          />
          <MenuItemRow
            icon="chart-bar"
            title="My Statistics"
            onPress={isDetailedStatsLocked ? onSubscription : onMyStatistics}
            rightContent={isDetailedStatsLocked ? renderLockBadge('detailed_stats') : undefined}
            testID="menu-statistics"
          />
          <MenuItemRow
            icon="chart-timeline-variant"
            title="Handicap History"
            onPress={isHandicapHistoryLocked ? onSubscription : onHandicapHistory}
            rightContent={isHandicapHistoryLocked ? renderLockBadge('handicap_history') : undefined}
            testID="menu-handicap-history"
          />
          <MenuItemRow
            icon="cash-multiple"
            title="Game Results"
            onPress={isGameResultsLocked ? onSubscription : onGameResults}
            rightContent={isGameResultsLocked ? renderLockBadge('skins_game') : undefined}
            testID="menu-game-results"
          />
          <MenuItemRow
            icon="trophy"
            title="Achievements"
            onPress={onAchievements}
            rightContent={
              achievementPoints > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.badgeText, { color: colors.white }]}>
                    {achievementPoints > 99 ? '99+' : achievementPoints}
                  </Text>
                </View>
              ) : undefined
            }
            testID="menu-achievements"
          />
          <MenuItemRow
            icon="palette"
            title="Customize Profile"
            onPress={onCustomizeProfile}
            testID="menu-customize"
          />
          <MenuItemRow
            icon="star-circle"
            title="My Subscription"
            onPress={onSubscription}
            testID="menu-subscription"
          />
          <MenuItemRow
            icon="account-multiple-outline"
            title="Manage Guest Players"
            onPress={isManageGuestsLocked ? onSubscription : onGuestPlayers}
            rightContent={
              isManageGuestsLocked
                ? renderLockBadge('manage_guests')
                : placeholderPlayersCount > 0 ? (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.badgeText, { color: colors.white }]}>
                        {placeholderPlayersCount > 99 ? '99+' : placeholderPlayersCount}
                      </Text>
                    </View>
                  ) : undefined
            }
            testID="menu-guest-players"
          />
          <MenuItemRow
            icon="shield-account"
            title="Privacy & Data"
            onPress={onPrivacyData}
            testID="menu-privacy-data"
          />
        </View>
      </View>

      {/* App Section */}
      <View style={styles.menuSection}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          App
        </Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.surface }]}>
          <MenuItemRow
            icon="cog"
            title="Settings"
            onPress={onSettings}
            testID="menu-settings"
          />
          <MenuItemRow
            icon="earth"
            title="Country / Region"
            onPress={onCountryRegion}
            rightContent={
              <Text style={[styles.countryLabel, { color: colors.textSecondary }]}>
                {currentCountryLabel}
              </Text>
            }
            testID="menu-country-region"
          />
          <MenuItemRow
            icon="bell-outline"
            title="Push Notifications"
            onPress={onNotifications}
            testID="menu-notifications"
          />
          <MenuItemRow
            icon="help-circle"
            title="Help & Support"
            onPress={onHelpAndSupport}
            testID="menu-help"
          />
        </View>
      </View>

      {/* Sign Out Section */}
      <View style={styles.menuSection}>
        <View style={[styles.menuGroup, { backgroundColor: colors.surface }]}>
          <MenuItemRow
            icon="logout"
            title="Sign Out"
            onPress={onSignOut}
            showChevron={false}
            destructive
            testID="menu-logout"
          />
        </View>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
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
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  lockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  countryLabel: {
    ...typography.small,
  },
});

export default ProfileMenuSection;

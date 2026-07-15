/**
 * ProfileHeader - User profile card with avatar and cosmetics
 *
 * Displays the user's avatar with cosmetic frame, name, badge, title,
 * email, and handicap. Tappable to edit profile.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon, Portal } from 'react-native-paper';
import { PlayerAvatar, InputtedHandicapInfoSheet } from '@/components/common';
import { ProfileFrame, ProfileBadge, ProfileTitle } from '@/components/cosmetics';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { formatHandicapIndex } from '@/utils/displayHelpers';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';

interface ProfileHeaderProps {
  /** Player's display name */
  displayName: string;
  /** Player's email address */
  displayEmail: string;
  /** Player's handicap (null if not set) */
  displayHandicap: number | null;
  /** URL to player's photo */
  photoUrl: string | null;
  /** Equipped cosmetic frame */
  equippedFrame: CosmeticDefinition | null;
  /** Equipped cosmetic badge */
  equippedBadge: CosmeticDefinition | null;
  /** Equipped cosmetic title */
  equippedTitle: CosmeticDefinition | null;
  /** Callback when edit profile is pressed */
  onEditPress: () => void;
}

export const ProfileHeader = React.memo(function ProfileHeader({
  displayName,
  displayEmail,
  displayHandicap,
  photoUrl,
  equippedFrame,
  equippedBadge,
  equippedTitle,
  onEditPress,
}: ProfileHeaderProps) {
  const colors = useThemeColors();
  const [showHandicapInfo, setShowHandicapInfo] = React.useState(false);

  return (
    <>
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      activeOpacity={0.7}
      onPress={onEditPress}
      accessibilityRole="button"
      accessibilityLabel="Edit profile"
      accessibilityHint="Tap to edit your profile"
    >
      <ProfileFrame frame={equippedFrame} size={72}>
        <PlayerAvatar
          photoUrl={photoUrl}
          name={displayName}
          size={64}
        />
      </ProfileFrame>

      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {displayName}
          </Text>
          <ProfileBadge badge={equippedBadge} size={16} />
        </View>
        <ProfileTitle title={equippedTitle} />
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {displayEmail}
        </Text>
        {displayHandicap !== null && (
          <View style={styles.handicapRow}>
            <Text style={[styles.userHandicap, { color: colors.primary }]}>
              Handicap: {formatHandicapIndex(displayHandicap)}
            </Text>
            <TouchableOpacity
              onPress={() => setShowHandicapInfo(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="About your inputted handicap"
              style={styles.infoButton}
            >
              <Icon source="information-outline" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Icon source="chevron-right" size={20} color={colors.gray400} />
    </TouchableOpacity>
    <Portal>
      <InputtedHandicapInfoSheet
        visible={showHandicapInfo}
        onClose={() => setShowHandicapInfo(false)}
      />
    </Portal>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  userInfo: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    ...typography.h4,
  },
  userEmail: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  handicapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  userHandicap: {
    ...typography.small,
  },
  infoButton: {
    padding: 2,
  },
});

export default ProfileHeader;

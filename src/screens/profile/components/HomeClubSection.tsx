/**
 * HomeClubSection - Home club display card
 *
 * Shows the user's home golf club with an option to change it.
 * Displays club name and course count when set.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface HomeClubSectionProps {
  /** The user's home club (null if not set) */
  homeClub: {
    id: string;
    name: string;
    courses?: { id: string }[];
  } | null;
  /** Callback when club card is pressed */
  onPress: () => void;
}

/**
 * @deprecated Use HomeClubSectionProps instead
 */
export type HomeVenueSectionProps = HomeClubSectionProps;

export const HomeClubSection = React.memo(function HomeClubSection({
  homeClub,
  onPress,
}: HomeClubSectionProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={homeClub ? `Change home club: ${homeClub.name}` : 'Set home club'}
      accessibilityHint="Tap to change your home club"
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: homeClub ? colors.primaryLighter : colors.gray100 },
        ]}
      >
        <Icon
          source={homeClub ? 'home' : 'home-outline'}
          size={20}
          color={homeClub ? colors.primary : colors.gray400}
        />
      </View>

      <View style={styles.clubInfo}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Home Club
        </Text>
        {homeClub ? (
          <>
            <Text style={[styles.clubName, { color: colors.textPrimary }]}>
              {homeClub.name}
            </Text>
            {homeClub.courses && homeClub.courses.length > 0 && (
              <Text style={[styles.coursesCount, { color: colors.textSecondary }]}>
                {homeClub.courses.length} course{homeClub.courses.length !== 1 ? 's' : ''}
              </Text>
            )}
          </>
        ) : (
          <Text style={[styles.clubName, { color: colors.textTertiary }]}>
            Tap to set
          </Text>
        )}
      </View>

      <Icon source="pencil" size={18} color={colors.gray400} />
    </TouchableOpacity>
  );
});

/**
 * @deprecated Use HomeClubSection instead
 */
export const HomeVenueSection = HomeClubSection;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  label: {
    ...typography.caption,
  },
  clubName: {
    ...typography.bodyBold,
    marginTop: 2,
  },
  coursesCount: {
    ...typography.small,
    marginTop: 2,
  },
});

export default HomeClubSection;

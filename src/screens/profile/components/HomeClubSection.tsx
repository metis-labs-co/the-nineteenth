/**
 * HomeClubSection - Home club display card
 *
 * Shows the user's home golf club with an option to change it.
 * Displays club name and course count when set.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { SectionLabel } from '@/components/common';
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
    <View style={styles.section}>
      <SectionLabel style={styles.sectionLabel}>Home Club</SectionLabel>
      <TouchableOpacity
        style={[
          styles.container,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        activeOpacity={0.7}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={homeClub ? `Change home club: ${homeClub.name}` : 'Set home club'}
        accessibilityHint="Tap to change your home club"
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: homeClub ? colors.primaryBackground : colors.surfaceVariant },
          ]}
        >
          <Icon
            source={homeClub ? 'home' : 'home-outline'}
            size={22}
            color={homeClub ? colors.primary : colors.textTertiary}
          />
        </View>

        <View style={styles.clubInfo}>
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

        <Icon source="pencil" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
});

/**
 * @deprecated Use HomeClubSection instead
 */
export const HomeVenueSection = HomeClubSection;

const styles = StyleSheet.create({
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionLabel: {
    marginHorizontal: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubInfo: {
    flex: 1,
    marginLeft: spacing.md + 1,
  },
  clubName: {
    ...typography.bodyBold,
    fontSize: 15,
    fontWeight: '700',
  },
  coursesCount: {
    ...typography.small,
    marginTop: 2,
  },
});

export default HomeClubSection;

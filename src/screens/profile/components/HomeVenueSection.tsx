/**
 * HomeVenueSection - Home venue display card
 *
 * Shows the user's home golf venue with an option to change it.
 * Displays venue name and course count when set.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface HomeVenueSectionProps {
  /** The user's home venue (null if not set) */
  homeVenue: {
    id: string;
    name: string;
    courses?: { id: string }[];
  } | null;
  /** Callback when venue card is pressed */
  onPress: () => void;
}

export const HomeVenueSection = React.memo(function HomeVenueSection({
  homeVenue,
  onPress,
}: HomeVenueSectionProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={homeVenue ? `Change home venue: ${homeVenue.name}` : 'Set home venue'}
      accessibilityHint="Tap to change your home venue"
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: homeVenue ? colors.primaryLighter : colors.gray100 },
        ]}
      >
        <Icon
          source={homeVenue ? 'home' : 'home-outline'}
          size={20}
          color={homeVenue ? colors.primary : colors.gray400}
        />
      </View>

      <View style={styles.venueInfo}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Home Venue
        </Text>
        {homeVenue ? (
          <>
            <Text style={[styles.venueName, { color: colors.textPrimary }]}>
              {homeVenue.name}
            </Text>
            {homeVenue.courses && homeVenue.courses.length > 0 && (
              <Text style={[styles.coursesCount, { color: colors.textSecondary }]}>
                {homeVenue.courses.length} course{homeVenue.courses.length !== 1 ? 's' : ''}
              </Text>
            )}
          </>
        ) : (
          <Text style={[styles.venueName, { color: colors.textTertiary }]}>
            Tap to set
          </Text>
        )}
      </View>

      <Icon source="pencil" size={18} color={colors.gray400} />
    </TouchableOpacity>
  );
});

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
  venueInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  label: {
    ...typography.caption,
  },
  venueName: {
    ...typography.bodyBold,
    marginTop: 2,
  },
  coursesCount: {
    ...typography.small,
    marginTop: 2,
  },
});

export default HomeVenueSection;

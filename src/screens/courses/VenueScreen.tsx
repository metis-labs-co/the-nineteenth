/**
 * VenueScreen - Display venue details and list of courses
 *
 * Shows:
 * - Venue information (name, location, contact details)
 * - List of courses at the venue
 * - Links to contact venue (phone, email, website)
 */

import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useVenueDetails } from '@/hooks/useVenueDetails';
import { useAddCourseFavorite, useRemoveCourseFavorite } from '@/hooks/useVenues';
import { CourseCard } from '@/components/courses/CourseCard';
import { PageHeader } from '@/components/common/PageHeader';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { Course } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

type Props = NativeStackScreenProps<RootStackParamList, 'Venue'>;

interface CourseWithFavorite extends Course {
  is_favorite: boolean;
}

// =====================================================
// CONTACT ITEM COMPONENT
// =====================================================

interface ContactItemProps {
  icon: string;
  label: string;
  value: string;
  onPress: () => void;
}

function ContactItem({ icon, label, value, onPress }: ContactItemProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      style={[styles.contactItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      android_ripple={{ color: colors.gray200 }}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={`Tap to ${label.toLowerCase()}`}
    >
      <View style={[styles.contactIconContainer, { backgroundColor: colors.primaryLighter }]}>
        <Icon source={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.contactTextContainer}>
        <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.contactValue, { color: colors.textPrimary }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Icon source="chevron-right" size={20} color={colors.gray400} />
    </Pressable>
  );
}

// =====================================================
// VENUE SCREEN COMPONENT
// =====================================================

export default function VenueScreen({ route, navigation }: Props) {
  const { venueId } = route.params;
  const colors = useThemeColors();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();

  const cardBackground = isDark ? colors.gray100 : colors.white;

  // Fetch venue details
  const {
    data: venue,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useVenueDetails(venueId);

  // Favorite mutations
  const addFavorite = useAddCourseFavorite();
  const removeFavorite = useRemoveCourseFavorite();
  const [togglingFavorite, setTogglingFavorite] = React.useState<string | null>(null);


  // Handle course press - navigate to CourseScreen
  const handleCoursePress = useCallback(
    (course: CourseWithFavorite) => {
      navigation.navigate('Course', { courseId: course.id, venueId });
    },
    [navigation, venueId]
  );

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(
    async (course: CourseWithFavorite) => {
      setTogglingFavorite(course.id);
      try {
        if (course.is_favorite) {
          await removeFavorite.mutateAsync(course.id);
        } else {
          await addFavorite.mutateAsync(course.id);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to update favorite status');
      } finally {
        setTogglingFavorite(null);
      }
    },
    [addFavorite, removeFavorite]
  );

  // Contact handlers
  const handlePhonePress = useCallback(() => {
    if (venue?.phone) {
      const phoneUrl = `tel:${venue.phone.replace(/\s/g, '')}`;
      Linking.canOpenURL(phoneUrl).then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Unable to call', `Cannot make phone calls on this device`);
        }
      });
    }
  }, [venue?.phone]);

  const handleEmailPress = useCallback(() => {
    if (venue?.email) {
      Linking.openURL(`mailto:${venue.email}`);
    }
  }, [venue?.email]);

  const handleWebsitePress = useCallback(() => {
    if (venue?.website) {
      let url = venue.website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      Linking.openURL(url);
    }
  }, [venue?.website]);

  const handleDirectionsPress = useCallback(() => {
    if (venue?.address) {
      const query = encodeURIComponent(`${venue.name}, ${venue.address}`);
      // Open in Maps app (works on both iOS and Android)
      Linking.openURL(`https://maps.google.com/?q=${query}`);
    } else if (venue?.location) {
      const [lng, lat] = venue.location.coordinates;
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    }
  }, [venue?.name, venue?.address, venue?.location]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading venue...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Icon source="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Unable to load venue
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error instanceof Error ? error.message : 'An error occurred'}
        </Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
        >
          <Text style={[styles.retryButtonText, { color: colors.white }]}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // Not found state
  if (!venue) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Icon source="golf" size={48} color={colors.gray400} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Venue not found
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          This venue may have been removed
        </Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.retryButtonText, { color: colors.white }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Build location string
  const locationParts = [venue.city, venue.state].filter(Boolean);
  const locationString = locationParts.join(', ');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        variant="centered"
        title={venue.name}
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
      {/* Venue Header Card */}
      <View style={[styles.headerCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
        {/* Venue Icon and Name */}
        <View style={styles.headerTop}>
          <View style={[styles.venueIconLarge, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="home-city" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.venueName, { color: colors.textPrimary }]}>
              {venue.name}
            </Text>
            {locationString && (
              <View style={styles.locationRow}>
                <Icon source="map-marker" size={16} color={colors.textSecondary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                  {locationString}
                </Text>
              </View>
            )}
            {venue.total_holes && (
              <View style={styles.holesRow}>
                <Icon source="flag" size={16} color={colors.primary} />
                <Text style={[styles.holesText, { color: colors.primary }]}>
                  {venue.total_holes} holes total
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Full Address (if different from location) */}
        {venue.address && (
          <Pressable
            style={[styles.addressContainer, { borderTopColor: colors.border }]}
            onPress={handleDirectionsPress}
            android_ripple={{ color: colors.gray200 }}
          >
            <Icon source="map-marker-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={2}>
              {venue.address}
            </Text>
            <Icon source="directions" size={20} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {/* Contact Information */}
      {(venue.phone || venue.email || venue.website) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Contact Information
          </Text>
          <View style={[styles.contactCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
            {venue.phone && (
              <ContactItem
                icon="phone"
                label="Phone"
                value={venue.phone}
                onPress={handlePhonePress}
              />
            )}
            {venue.email && (
              <ContactItem
                icon="email"
                label="Email"
                value={venue.email}
                onPress={handleEmailPress}
              />
            )}
            {venue.website && (
              <ContactItem
                icon="web"
                label="Website"
                value={venue.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                onPress={handleWebsitePress}
              />
            )}
          </View>
        </View>
      )}

      {/* Courses Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Courses
          </Text>
          <View style={[styles.courseCountBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.courseCountText, { color: colors.white }]}>
              {venue.courses.length}
            </Text>
          </View>
        </View>

        {venue.courses.length === 0 ? (
          <View style={[styles.emptyCoursesCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
            <Icon source="golf" size={32} color={colors.gray400} />
            <Text style={[styles.emptyCoursesText, { color: colors.textSecondary }]}>
              No courses have been added to this venue yet
            </Text>
          </View>
        ) : (
          <View style={styles.coursesList}>
            {venue.courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onPress={handleCoursePress}
                onToggleFavorite={handleToggleFavorite}
                isTogglingFavorite={togglingFavorite === course.id}
                showFavoriteButton
                showChevron
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.h4,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    ...typography.bodyBold,
  },

  // Header Card
  headerCard: {
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  venueIconLarge: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  venueName: {
    ...typography.h3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  locationText: {
    ...typography.body,
  },
  holesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  holesText: {
    ...typography.small,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  addressText: {
    ...typography.small,
    flex: 1,
  },

  // Section
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
  },
  courseCountBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  courseCountText: {
    ...typography.caption,
    fontWeight: '600',
  },

  // Contact Card
  contactCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  contactLabel: {
    ...typography.caption,
  },
  contactValue: {
    ...typography.body,
    marginTop: 2,
  },

  // Courses List
  coursesList: {
    gap: spacing.md,
  },
  emptyCoursesCard: {
    padding: spacing.xxl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyCoursesText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

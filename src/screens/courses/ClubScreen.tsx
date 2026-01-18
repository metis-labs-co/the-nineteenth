/**
 * ClubScreen - Display club details and list of courses
 *
 * Shows:
 * - Club information (name, location, contact details)
 * - List of courses at the club
 * - Links to contact club (phone, email, website)
 */

import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner, GolfBallLoader, ConfirmationDialog } from '@/components/common';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useClubDetails } from '@/hooks/useClubDetails';
import { useAddCourseFavorite, useRemoveCourseFavorite } from '@/hooks/useClubs';
import { useHomeClub, useSetHomeClub } from '@/hooks/useHomeClub';
import { CourseCard } from '@/components/courses/CourseCard';
import { PageHeader } from '@/components/common/PageHeader';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { Course } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

type Props = NativeStackScreenProps<RootStackParamList, 'Club'>;

interface CourseWithFavorite extends Course {
  is_favorite: boolean;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Format a date string for display
 */
function formatLastSynced(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
}

/**
 * Get source display info
 */
function getSourceInfo(source: string | undefined) {
  switch (source) {
    case 'api':
      return { label: 'GolfAPI.io', color: 'success' as const };
    case 'legacy':
      return { label: 'Legacy', color: 'warning' as const };
    default:
      return { label: 'Manual', color: 'default' as const };
  }
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
    <TouchableOpacity
      style={[styles.contactItem, { borderBottomColor: colors.border }]}
      activeOpacity={0.7}
      onPress={onPress}
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
    </TouchableOpacity>
  );
}

// =====================================================
// CLUB SCREEN COMPONENT
// =====================================================

export default function ClubScreen({ route, navigation }: Props) {
  const { clubId } = route.params;
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const cardBackground = colors.surface;

  // Fetch club details
  const {
    data: club,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useClubDetails(clubId);

  // Favorite mutations
  const addFavorite = useAddCourseFavorite();
  const removeFavorite = useRemoveCourseFavorite();
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

  // Home club state
  const { data: currentHomeClub } = useHomeClub();
  const setHomeClub = useSetHomeClub();
  const [showHomeConfirmDialog, setShowHomeConfirmDialog] = useState(false);
  const [isSettingHome, setIsSettingHome] = useState(false);

  // Check if this club is the home club
  const isHomeClub = club?.id === currentHomeClub?.id;

  // Handle set as home club
  const handleSetAsHome = useCallback(() => {
    if (!club || isHomeClub) return;

    // If there's a different home club, show confirmation
    if (currentHomeClub && currentHomeClub.id !== club.id) {
      setShowHomeConfirmDialog(true);
      return;
    }

    // Otherwise, set directly
    performSetAsHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- performSetAsHome is defined below but stable
  }, [club, currentHomeClub, isHomeClub]);

  const performSetAsHome = useCallback(async () => {
    if (!club) return;
    setIsSettingHome(true);
    try {
      await setHomeClub.mutateAsync(club.id);
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to set home club');
    } finally {
      setIsSettingHome(false);
      setShowHomeConfirmDialog(false);
    }
  }, [club, setHomeClub, refetch]);

  // Handle course press - navigate to CourseScreen
  const handleCoursePress = useCallback(
    (course: CourseWithFavorite) => {
      navigation.navigate('Course', { courseId: course.id, clubId });
    },
    [navigation, clubId]
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
    if (club?.phone) {
      const phoneUrl = `tel:${club.phone.replace(/\s/g, '')}`;
      Linking.canOpenURL(phoneUrl).then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Unable to call', `Cannot make phone calls on this device`);
        }
      });
    }
  }, [club?.phone]);

  const handleEmailPress = useCallback(() => {
    if (club?.email) {
      Linking.openURL(`mailto:${club.email}`);
    }
  }, [club?.email]);

  const handleWebsitePress = useCallback(() => {
    if (club?.website) {
      let url = club.website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      Linking.openURL(url);
    }
  }, [club?.website]);

  const handleDirectionsPress = useCallback(() => {
    if (club?.address) {
      const query = encodeURIComponent(`${club.name}, ${club.address}`);
      // Open in Maps app (works on both iOS and Android)
      Linking.openURL(`https://maps.google.com/?q=${query}`);
    } else if (club?.location) {
      const [lng, lat] = club.location.coordinates;
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    }
  }, [club?.name, club?.address, club?.location]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <LoadingSpinner size="lg" message="Loading club..." />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Icon source="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Unable to load club
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error instanceof Error ? error.message : 'An error occurred'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.7}
          onPress={() => refetch()}
        >
          <Text style={[styles.retryButtonText, { color: colors.white }]}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Not found state
  if (!club) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Icon source="golf" size={48} color={colors.gray400} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Club not found
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          This club may have been removed
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.retryButtonText, { color: colors.white }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Build location string
  const locationParts = [club.city, club.state].filter(Boolean);
  const locationString = locationParts.join(', ');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        variant="centered"
        title={club.name}
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
            tintColor={colors.textPrimary}
          />
        }
      >
      {/* Club Header Card */}
      <View style={[styles.headerCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
        {/* Club Icon and Name */}
        <View style={styles.headerTop}>
          <View style={[styles.clubIconLarge, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="home-city" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.clubName, { color: colors.textPrimary }]}>
              {club.name}
            </Text>
            {locationString && (
              <View style={styles.locationRow}>
                <Icon source="map-marker" size={16} color={colors.textSecondary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                  {locationString}
                </Text>
              </View>
            )}
            {club.total_holes && (
              <View style={styles.holesRow}>
                <Icon source="flag" size={16} color={colors.primary} />
                <Text style={[styles.holesText, { color: colors.primary }]}>
                  {club.total_holes} holes total
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Set as Home Club Button */}
        <TouchableOpacity
          style={[
            styles.homeClubButton,
            { borderTopColor: colors.border },
            isHomeClub && { backgroundColor: colors.primaryLighter },
          ]}
          activeOpacity={isHomeClub ? 1 : 0.7}
          onPress={handleSetAsHome}
          disabled={isSettingHome || isHomeClub}
          accessibilityRole="button"
          accessibilityLabel={isHomeClub ? 'This is your home club' : 'Set as home club'}
        >
          {isSettingHome ? (
            <GolfBallLoader size="sm" />
          ) : (
            <>
              <Icon
                source={isHomeClub ? 'home' : 'home-outline'}
                size={20}
                color={isHomeClub ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.homeClubButtonText,
                  { color: isHomeClub ? colors.primary : colors.textSecondary },
                  isHomeClub && styles.homeClubButtonTextActive,
                ]}
              >
                {isHomeClub ? 'Your Home Club' : 'Set as Home Club'}
              </Text>
              {isHomeClub && (
                <Icon source="check" size={18} color={colors.primary} />
              )}
            </>
          )}
        </TouchableOpacity>

        {/* Full Address (if different from location) */}
        {club.address && (
          <TouchableOpacity
            style={[styles.addressContainer, { borderTopColor: colors.border }]}
            activeOpacity={0.7}
            onPress={handleDirectionsPress}
          >
            <Icon source="map-marker-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={2}>
              {club.address}
            </Text>
            <Icon source="directions" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Data Source Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Data Source
        </Text>
        <View style={[styles.sourceCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
          <View style={styles.sourceRow}>
            <View style={styles.sourceInfo}>
              <Text style={[styles.sourceLabel, { color: colors.textSecondary }]}>Source</Text>
              <View style={styles.sourceValueRow}>
                <View
                  style={[
                    styles.sourceBadge,
                    {
                      backgroundColor:
                        club.source === 'api'
                          ? colors.successLight + '30'
                          : club.source === 'legacy'
                          ? colors.warningLight + '30'
                          : colors.gray200,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sourceBadgeText,
                      {
                        color:
                          club.source === 'api'
                            ? colors.success
                            : club.source === 'legacy'
                            ? colors.warning
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {getSourceInfo(club.source).label}
                  </Text>
                </View>
                {club.golfapi_club_id && (
                  <Text style={[styles.sourceId, { color: colors.textTertiary }]}>
                    #{club.golfapi_club_id}
                  </Text>
                )}
              </View>
            </View>
            {club.golfapi_updated_at && (
              <View style={styles.sourceInfo}>
                <Text style={[styles.sourceLabel, { color: colors.textSecondary }]}>Last Updated</Text>
                <Text style={[styles.sourceValue, { color: colors.textPrimary }]}>
                  {formatLastSynced(club.golfapi_updated_at)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Contact Information */}
      {(club.phone || club.email || club.website) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Contact Information
          </Text>
          <View style={[styles.contactCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
            {club.phone && (
              <ContactItem
                icon="phone"
                label="Phone"
                value={club.phone}
                onPress={handlePhonePress}
              />
            )}
            {club.email && (
              <ContactItem
                icon="email"
                label="Email"
                value={club.email}
                onPress={handleEmailPress}
              />
            )}
            {club.website && (
              <ContactItem
                icon="web"
                label="Website"
                value={club.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
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
              {club.courses.length}
            </Text>
          </View>
        </View>

        {club.courses.length === 0 ? (
          <View style={[styles.emptyCoursesCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
            <Icon source="golf" size={32} color={colors.gray400} />
            <Text style={[styles.emptyCoursesText, { color: colors.textSecondary }]}>
              No courses have been added to this club yet
            </Text>
          </View>
        ) : (
          <View style={styles.coursesList}>
            {club.courses.map((course) => (
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

      {/* Home Club Confirmation Dialog */}
      <ConfirmationDialog
        visible={showHomeConfirmDialog}
        title="Change Home Club?"
        message={`You already have "${currentHomeClub?.name}" set as your home club. Would you like to replace it with "${club?.name}"?`}
        confirmLabel="Replace"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={performSetAsHome}
        onCancel={() => setShowHomeConfirmDialog(false)}
        loading={isSettingHome}
        icon="home-switch"
      />
    </View>
  );
}

// Backwards compatibility alias
export { ClubScreen as VenueScreen };

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
  clubIconLarge: {
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
  clubName: {
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
  homeClubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  homeClubButtonText: {
    ...typography.body,
  },
  homeClubButtonTextActive: {
    fontWeight: '600',
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

  // Source Card
  sourceCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.sm,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  sourceValue: {
    ...typography.body,
  },
  sourceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sourceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sourceBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 11,
  },
  sourceId: {
    ...typography.caption,
    fontSize: 11,
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

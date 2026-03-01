/**
 * RoundDetailsTab - Details tab for ViewRoundScreen
 *
 * Displays round information including:
 * - Course header card with icon, name, venue link, and quick stats
 * - Round details (date, tee time, format, status)
 * - Players section
 * - Hole breakdown table with OUT/IN/TOTAL summaries
 *
 * Game configuration (Scoring Pairs, Skins, Wolf) has been moved to
 * the separate RoundGameSetupTab component.
 *
 * Styled to match CourseScreen design patterns.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows, skinsColor } from '@/constants/theme';
import { useSkinsGamesByRound } from '@/hooks/useSkins';
import { useWolfGameByRound } from '@/hooks/wolf';
import { WOLF_COLOR } from '@/components/wolf';
import { StatusBadge, type StatusVariant } from '@/components/common/StatusBadge';
import { Pill } from '@/components/common/Pill';
import { formatDateWithWeekday, formatTeeTime } from '@/utils/formatting';
import { useSettingsStore } from '@/store/settingsStore';
import type { RootStackParamList } from '@/navigation/types';

import { GAME_TYPE_LABELS } from './constants';
import { HoleTable, PlayersSection } from './components';
import type { RoundDetailsTabProps } from './types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const RoundDetailsTab = React.memo(function RoundDetailsTab({
  round,
  isOrganizer = false,
  onEditPress,
  onCourseSelectPress,
}: RoundDetailsTabProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);
  const useMetres = distanceUnit === 'metres';
  const holes = Array.isArray(round.course?.holes) ? round.course.holes : [];

  // Check if round has an active skins game
  const { data: skinsGames } = useSkinsGamesByRound(round.id);
  const hasSkins = skinsGames && skinsGames.length > 0;

  // Check if round has a Wolf game
  const { data: wolfGame } = useWolfGameByRound(round.id);
  const hasWolf = !!wolfGame;

  // Get selected tee from round, or fall back to course default/first available
  const { totalPar, selectedTeeName } = useMemo(() => {
    const rawHoles = round.course?.holes;
    const courseHoles = Array.isArray(rawHoles) ? rawHoles : [];

    // Priority: round.selected_tee > first course tee > first yardage key
    let teeName: string | null = null;
    if (round.selected_tee?.name) {
      teeName = round.selected_tee.name;
    } else if (round.course?.tees?.[0]?.name) {
      teeName = round.course.tees[0].name;
    } else if (courseHoles[0]?.yardages) {
      teeName = Object.keys(courseHoles[0].yardages)[0] || null;
    }

    const par = courseHoles.reduce((sum, hole) => sum + (hole.par || 0), 0);

    return { totalPar: par, selectedTeeName: teeName };
  }, [round.course?.holes, round.course?.tees, round.selected_tee]);

  // Location comes from the club
  const club = round.course?.club || round.course?.venue;
  const location = [club?.city, club?.state].filter(Boolean).join(', ');

  // Navigate to club
  const handleClubPress = () => {
    if (club?.id) {
      navigation.navigate('Club', { clubId: club.id });
    }
  };

  // Navigate to course
  const handleCoursePress = () => {
    if (round.course) {
      navigation.navigate('Course', { courseId: round.course.id });
    }
  };

  return (
    <View style={styles.container}>
      {/* Course Header Card */}
      <TouchableOpacity
        style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={handleCoursePress}
        disabled={!round.course}
        activeOpacity={0.7}
      >
        <View style={styles.headerTop}>
          <View style={[styles.courseIconLarge, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="golf" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.courseName, { color: colors.textPrimary }]}>
              {round.course?.name || 'Course TBD'}
            </Text>

            {/* Club Link */}
            {club && (
              <TouchableOpacity style={styles.clubLink} onPress={handleClubPress} activeOpacity={0.7}>
                <Icon source="map-marker" size={16} color={colors.primary} />
                <Text style={[styles.clubLinkText, { color: colors.primary }]}>
                  {location || club.name}
                </Text>
                <Icon source="chevron-right" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Chevron to indicate tappable (when course exists) */}
          {round.course && (
            <View style={styles.courseChevron}>
              <Icon source="chevron-right" size={24} color={colors.gray400} />
            </View>
          )}

          {/* Edit button to add course (when no course and organizer) */}
          {!round.course && isOrganizer && onCourseSelectPress && (
            <TouchableOpacity
              style={[styles.courseEditButton, { backgroundColor: colors.primaryLighter }]}
              onPress={onCourseSelectPress}
              activeOpacity={0.7}
              accessibilityLabel="Add course"
              accessibilityRole="button"
            >
              <Icon source="plus" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Stats */}
        <View style={[styles.quickStats, { borderTopColor: colors.border }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{holes.length || '-'}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Holes</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalPar || '-'}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Par</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {round.course?.slope_rating || '-'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Slope</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {round.course?.course_rating || '-'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>CR</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Round Details Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Round Details
          </Text>
          {isOrganizer && onEditPress && (
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.gray100 }]}
              onPress={onEditPress}
              accessibilityLabel="Edit round details"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Icon source="pencil" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Icon source="calendar" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {formatDateWithWeekday(round.date)}
              </Text>
            </View>
          </View>

          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Icon source="clock-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tee Time</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {formatTeeTime(round.tee_time)}
              </Text>
            </View>
          </View>

          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Icon source="trophy-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Format</Text>
              <View style={styles.formatPillContainer}>
                {hasSkins && (
                  <Icon source="dice-multiple" size={18} color={skinsColor} />
                )}
                {hasWolf && (
                  <Icon source="dog-side" size={18} color={WOLF_COLOR} />
                )}
                <Pill
                  label={GAME_TYPE_LABELS[round.game_type]}
                  variant="primary"
                  size="md"
                />
              </View>
            </View>
          </View>

          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Icon source="golf-tee" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tee</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {round.selected_tee?.name || 'Not set'}
              </Text>
            </View>
          </View>

          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Icon source="flag-checkered" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
              <StatusBadge status={round.status as StatusVariant} size="md" />
            </View>
          </View>
        </View>
      </View>

      {/* Players Section */}
      <PlayersSection
        roundId={round.id}
        cardBackground={colors.surface}
      />

      {/* Hole Breakdown Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Hole Breakdown
        </Text>

        {holes.length > 0 ? (
          <HoleTable holes={holes} selectedTee={selectedTeeName} useMetres={useMetres} />
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon source="flag" size={32} color={colors.gray400} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hole information available for this course
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },

  // Header Card
  headerCard: {
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
  courseIconLarge: {
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
  courseName: {
    ...typography.h3,
  },
  clubLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  clubLinkText: {
    ...typography.small,
  },
  courseChevron: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  courseEditButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
  },
  statLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
  },

  // Section
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Details Card
  detailsCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    marginLeft: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.body,
  },
  detailValue: {
    ...typography.bodyBold,
  },
  formatPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailDivider: {
    height: 1,
    marginHorizontal: spacing.md,
  },

  // Empty States
  emptyCard: {
    padding: spacing.xxl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default RoundDetailsTab;

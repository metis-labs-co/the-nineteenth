/**
 * DetailsTab - Competition details and courses
 *
 * Shows:
 * - Competition header card (name, dates, players, invite code)
 * - Competition settings (type, handicap system, team settings)
 * - Current standing card (for players)
 * - Courses section listing all unique courses used in rounds
 *
 * Organizers can tap on editable fields to modify them.
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Icon, Surface, Chip } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { IconCalendar, IconSettings } from '@tabler/icons-react-native';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { formatDateAustralian, formatPosition } from '@/utils/formatting';
import type { Competition, Course, CompetitionType, HandicapSystem, TeamMode } from '@/types/database.types';
import { CourseCard } from '@/components/courses/CourseCard';
import { StatusBadge, type StatusVariant } from '@/components/common/StatusBadge';
import { Pill } from '@/components/common/Pill';
import { type RoundWithCourse } from './types';

// =====================================================
// TYPES
// =====================================================

export interface DetailsTabProps {
  competition: Competition;
  rounds: RoundWithCourse[];
  playerCount: number;
  currentStanding: { position: number; points: number } | null;
  isOrganizer: boolean;
  onViewCourse?: (course: Course) => void;
  onEdit: () => void;
  onUpdateCompetition?: (updates: Partial<Competition>) => Promise<void>;
}

// =====================================================
// LABEL HELPERS
// =====================================================

const competitionTypeLabels: Record<CompetitionType, string> = {
  'league': 'League',
  'event': 'Event',
};

const competitionTypeDescriptions: Record<CompetitionType, string> = {
  'league': 'Ongoing competition with no fixed end date',
  'event': 'Fixed-term competition with an end date',
};

const handicapSystemLabels: Record<HandicapSystem, string> = {
  'honor': 'Honour System',
  'golf-australia': 'Golf Australia',
  'gross-only': 'Gross Only',
};

const teamModeLabels: Record<TeamMode, string> = {
  'none': 'Individual',
  'fixed': 'Fixed Teams',
  'per-round': 'Per-Round Teams',
};

// =====================================================
// CURRENT STANDING CARD COMPONENT
// =====================================================

interface CurrentStandingCardProps {
  standing: { position: number; points: number };
}

function CurrentStandingCard({ standing }: CurrentStandingCardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.standingCard, { backgroundColor: colors.primaryLighter }]}
      testID="current-standing-card"
    >
      <Text style={[styles.standingLabel, { color: colors.primaryDark }]}>Your Current Standing</Text>
      <View style={styles.standingRow}>
        <View style={styles.standingItem}>
          <Text style={[styles.standingPosition, { color: colors.primaryDark }]}>
            {formatPosition(standing.position)}
          </Text>
          <Text style={[styles.standingItemLabel, { color: colors.primaryDark }]}>Position</Text>
        </View>
        <View style={[styles.standingDivider, { backgroundColor: colors.primary }]} />
        <View style={styles.standingItem}>
          <Text style={[styles.standingPoints, { color: colors.primaryDark }]}>{standing.points}</Text>
          <Text style={[styles.standingItemLabel, { color: colors.primaryDark }]}>Points</Text>
        </View>
      </View>
    </View>
  );
}


// =====================================================
// EDITABLE DETAIL ROW COMPONENT
// =====================================================

interface EditableDetailRowProps {
  label: string;
  value: string;
  isEditable: boolean;
  onPress?: () => void;
  icon?: string;
  chip?: boolean;
  chipColor?: string;
}

function EditableDetailRow({
  label,
  value,
  isEditable,
  onPress,
  icon,
  chip = false,
  chipColor,
}: EditableDetailRowProps) {
  const colors = useThemeColors();

  const content = (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelContainer}>
        {icon && <Icon source={icon} size={18} color={colors.textSecondary} />}
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <View style={styles.detailValueContainer}>
        {chip ? (
          <Chip
            mode="flat"
            style={[styles.detailChip, { backgroundColor: chipColor || colors.primaryLighter }]}
            textStyle={[styles.detailChipText, { color: chipColor ? colors.white : colors.primaryDark }]}
          >
            {value}
          </Chip>
        ) : (
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{value}</Text>
        )}
        {isEditable && (
          <Icon source="chevron-right" size={20} color={colors.textSecondary} />
        )}
      </View>
    </View>
  );

  if (isEditable && onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.detailRowPressable,
          pressed && { backgroundColor: colors.gray50 },
        ]}
        accessibilityLabel={`Edit ${label}`}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.detailRowPressable}>{content}</View>;
}

// =====================================================
// COMPETITION SETTINGS SECTION COMPONENT
// =====================================================

interface CompetitionSettingsSectionProps {
  competition: Competition;
  isOrganizer: boolean;
  onEdit: () => void;
}

function CompetitionSettingsSection({
  competition,
  isOrganizer,
  onEdit,
}: CompetitionSettingsSectionProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  const cardBackground = isDark ? colors.gray100 : colors.white;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <IconSettings size={20} color={colors.textPrimary} />
          <Text style={[styles.sectionTitle, styles.noMargin, { color: colors.textPrimary }]}>Settings</Text>
        </View>
        {isOrganizer && (
          <Pressable
            style={[styles.sectionEditButton, { backgroundColor: colors.gray100 }]}
            onPress={onEdit}
            accessibilityLabel="Edit settings"
            accessibilityRole="button"
          >
            <Icon source="pencil" size={16} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <Surface style={[styles.settingsCard, { backgroundColor: cardBackground }]} elevation={1}>
        {/* Competition Type */}
        <View style={styles.detailRowPressable}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Icon source="tag-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
            </View>
            <View style={styles.detailValueContainer}>
              <Pill
                label={competitionTypeLabels[competition.competition_type] || 'Event'}
                variant="primary"
                size="md"
              />
            </View>
          </View>
        </View>

        {/* Handicap System */}
        <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
        <EditableDetailRow
          label="Handicap System"
          value={handicapSystemLabels[competition.handicap_system]}
          isEditable={false}
          icon="golf"
        />

        {/* Team Mode */}
        <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
        <EditableDetailRow
          label="Format"
          value={teamModeLabels[competition.team_mode]}
          isEditable={false}
          icon="account-group-outline"
        />

        {/* Team Size (only if teams enabled) */}
        {competition.team_mode !== 'none' && competition.team_size && (
          <>
            <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
            <EditableDetailRow
              label="Team Size"
              value={`${competition.team_size} players`}
              isEditable={false}
              icon="account-multiple-outline"
            />
          </>
        )}

        {/* Status */}
        <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
        <View style={styles.detailRowPressable}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Icon source="information-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
            </View>
            <View style={styles.detailValueContainer}>
              <StatusBadge status={competition.status as StatusVariant} />
            </View>
          </View>
        </View>
      </Surface>
    </View>
  );
}

// =====================================================
// COURSES SECTION COMPONENT
// =====================================================

interface CoursesSectionProps {
  courses: (Course & { venues?: { city: string | null; state: string | null } | null })[];
  onViewCourse?: (course: Course) => void;
}

function CoursesSection({ courses, onViewCourse }: CoursesSectionProps) {
  const colors = useThemeColors();

  if (courses.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Courses</Text>
        <View style={styles.emptyCoursesCard}>
          <Text style={[styles.emptyCoursesText, { color: colors.textSecondary }]}>
            No courses have been added to this competition yet.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Courses ({courses.length})
      </Text>
      <View style={styles.coursesContainer}>
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={{ ...course, is_favorite: false }}
            onPress={onViewCourse ? () => onViewCourse(course) : undefined}
            showFavoriteButton={false}
            showChevron={!!onViewCourse}
          />
        ))}
      </View>
    </View>
  );
}

// =====================================================
// DETAILS TAB COMPONENT
// =====================================================

export const DetailsTab = React.memo(function DetailsTab({
  competition,
  rounds,
  playerCount,
  currentStanding,
  isOrganizer,
  onViewCourse,
  onEdit,
  onUpdateCompetition,
}: DetailsTabProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  const cardBackground = isDark ? colors.gray100 : colors.white;

  // Extract unique courses from rounds (no duplicates)
  const uniqueCourses = useMemo(() => {
    const courseMap = new Map<string, Course & { venues?: { city: string | null; state: string | null } | null }>();

    for (const round of rounds) {
      if (round.course && !courseMap.has(round.course.id)) {
        courseMap.set(round.course.id, round.course);
      }
    }

    return Array.from(courseMap.values());
  }, [rounds]);

  return (
    <View>
      {/* Competition Header Card */}
      <View style={[styles.headerCard, { backgroundColor: cardBackground, borderColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={[styles.competitionIcon, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="trophy-outline" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.competitionName, { color: colors.textPrimary }]}>
              {competition.name}
            </Text>
            <View style={styles.dateRow}>
              <IconCalendar size={14} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatDateAustralian(competition.start_date)}
                {competition.end_date && ` - ${formatDateAustralian(competition.end_date)}`}
              </Text>
            </View>
            {/* Competition Type Badge */}
            <View style={styles.typeBadgeContainer}>
              <Pill
                label={competitionTypeLabels[competition.competition_type] || 'Event'}
                variant="primary"
                size="md"
              />
            </View>
          </View>

          {/* Edit Button (Organizer only) */}
          {isOrganizer && (
            <Pressable
              style={[styles.editButton, { backgroundColor: colors.gray100 }]}
              onPress={onEdit}
              accessibilityLabel="Edit competition"
              accessibilityRole="button"
            >
              <Icon source="pencil" size={20} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {/* Description */}
        {competition.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {competition.description}
          </Text>
        )}

        {/* Quick Stats */}
        <View style={[styles.quickStats, { borderTopColor: colors.border }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{rounds.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rounds</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{playerCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Players</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        </View>

        {/* Invite Code - Tappable to copy */}
        <Pressable
          style={({ pressed }) => [
            styles.inviteCodeBox,
            { backgroundColor: pressed ? colors.primary : colors.primaryLighter },
          ]}
          onPress={async () => {
            await Clipboard.setStringAsync(competition.invite_code);
            const Toast = require('react-native-toast-message').default;
            Toast.show({
              type: 'success',
              text1: 'Copied!',
              text2: 'Invite code copied to clipboard',
              visibilityTime: 2000,
              position: 'bottom',
            });
          }}
          accessibilityLabel={`Copy invite code ${competition.invite_code}`}
          accessibilityHint="Double tap to copy invite code to clipboard"
          accessibilityRole="button"
        >
          <View style={styles.inviteCodeRow}>
            <Text style={[styles.inviteCodeLabel, { color: colors.primaryDark }]}>INVITE CODE</Text>
            <View style={styles.inviteCodeValueRow}>
              <Text style={[styles.inviteCode, { color: colors.primaryDark }]}>
                {competition.invite_code}
              </Text>
              <Icon source="content-copy" size={18} color={colors.primaryDark} />
            </View>
          </View>
        </Pressable>
      </View>

      {/* Current Standing Card - shown for non-organizers who are players */}
      {currentStanding && !isOrganizer && (
        <CurrentStandingCard standing={currentStanding} />
      )}

      {/* Competition Settings Section */}
      <CompetitionSettingsSection
        competition={competition}
        isOrganizer={isOrganizer}
        onEdit={onEdit}
      />

      {/* Courses Section */}
      <CoursesSection courses={uniqueCourses} onViewCourse={onViewCourse} />
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  // Header Card
  headerCard: {
    marginBottom: spacing.lg,
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
  competitionIcon: {
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
  competitionName: {
    ...typography.h3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  dateText: {
    ...typography.small,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    ...typography.body,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
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
    ...typography.h4,
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

  // Invite Code
  inviteCodeBox: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCodeLabel: {
    ...typography.captionBold,
    letterSpacing: 0.5,
  },
  inviteCodeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inviteCode: {
    ...typography.h4,
    letterSpacing: 2,
  },

  // Section
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  noMargin: {
    marginBottom: 0,
  },

  // Standing Card
  standingCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  standingLabel: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  standingItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  standingDivider: {
    width: 1,
    height: 40,
    opacity: 0.3,
  },
  standingPosition: {
    ...typography.display,
  },
  standingPoints: {
    ...typography.display,
  },
  standingItemLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
    opacity: 0.8,
  },

  // Courses Section
  coursesContainer: {
    gap: spacing.md,
  },
  emptyCoursesCard: {
    padding: spacing.lg,
  },
  emptyCoursesText: {
    ...typography.body,
    textAlign: 'center',
  },

  // Type Badge
  typeBadgeContainer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionEditButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Settings Card
  settingsCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },

  // Detail Row
  detailRowPressable: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  detailLabel: {
    ...typography.body,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailValue: {
    ...typography.body,
    textAlign: 'right',
  },
  detailChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  detailChipText: {
    ...typography.small,
  },
  detailDivider: {
    height: 1,
    marginHorizontal: spacing.lg,
  },
});

export default DetailsTab;

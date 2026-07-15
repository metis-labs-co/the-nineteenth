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

import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows, skinsColor, wolfColor } from '@/constants/theme';
import { useSkinsGamesByRound } from '@/hooks/useSkins';
import { useWolfGameByRound } from '@/hooks/wolf';
import { useRoundPlayerTees } from '@/hooks/rounds';
import { useAuth } from '@/hooks/useAuth';
import { useCompetitionInfo } from '@/hooks/competitions';
import { StatusBadge, type StatusVariant } from '@/components/common/StatusBadge';
import { Pill } from '@/components/common/Pill';
import { getTeeColor } from '@/components/common/TeeSelector';
import { RoundCoverPhotoButton, RoundPhotoBanner } from '@/components/activity';
import { formatDateWithWeekday, formatTeeTime } from '@/utils/formatting';
import { useSettingsStore } from '@/store/settingsStore';
import type { RootStackParamList } from '@/navigation/types';

import {
  ROUND_PRESETS,
  inferPresetIdFromRound,
} from '@/constants/roundPresets';
import { PlayersSection } from './components';
import {
  EditDateTimeSheet,
  EditNineTypeSheet,
  EditTeeSheet,
  MatchupSheet,
  RoundRulesSheet,
} from './sheets';
import { RoundTypeSheet } from '@/components/rounds/RoundTypeSheet';
import type { RoundDetailsTabProps } from './types';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';

type OpenSheet =
  | 'date-time'
  | 'tee'
  | 'nine-type'
  | 'matchup'
  | 'round-type'
  | 'round-rules'
  | null;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const RoundDetailsTab = React.memo(function RoundDetailsTab({
  round,
  isOrganizer = false,
  canAddPhotos = false,
  onCourseSelectPress,
  onUpgradePress,
}: RoundDetailsTabProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);
  const useMetres = distanceUnit === 'metres';
  const holes = Array.isArray(round.course?.holes) ? round.course.holes : [];
  const { player } = useAuth();

  // Round details are editable only by the round/competition organiser
  // AND only while the round hasn't started. Once a round goes
  // in-progress (or is completed) the metadata is locked — changing
  // date, format, tee, etc. mid-round would invalidate scoring already
  // entered against the old values. `isOrganizer` already resolves to
  // true for standalone-round owners and for competition organisers
  // (see useViewRoundPermissions).
  const canEdit = isOrganizer && round.status === 'upcoming';

  // Hole count (`nine_type`) is the one field we deliberately allow
  // changing mid-round: switching full → front9 doesn't invalidate
  // scores already entered, and players sometimes decide to cut a round
  // short or extend it after they've started. Standalone rounds only —
  // for competition rounds, hole count is fixed by the competition.
  const isStandalone = round.competition_id === null;
  const canEditNineType =
    isOrganizer &&
    isStandalone &&
    (round.status === 'upcoming' || round.status === 'in-progress');

  // Per-field edit sheets - only one open at a time. Kept local to the tab
  // because no other component needs to observe this state.
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const handleCloseSheet = useCallback(() => setOpenSheet(null), []);
  const openDateTime = useCallback(() => {
    if (!canEdit) return;
    setOpenSheet('date-time');
  }, [canEdit]);
  const openTee = useCallback(() => {
    if (!canEdit) return;
    setOpenSheet('tee');
  }, [canEdit]);
  const openMatchup = useCallback(() => {
    if (!canEdit) return;
    setOpenSheet('matchup');
  }, [canEdit]);
  const openRoundType = useCallback(() => {
    if (!canEdit) return;
    setOpenSheet('round-type');
  }, [canEdit]);
  const openNineType = useCallback(() => {
    if (!canEditNineType) return;
    setOpenSheet('nine-type');
  }, [canEditNineType]);
  const openRoundRules = useCallback(() => {
    setOpenSheet('round-rules');
  }, []);

  // Competition flag that decides whether `rules_override` is honored at
  // finalization. Used by the preset sheet to surface an "override will
  // be ignored" note when the competition is in general-rules mode.
  const { data: competitionInfo } = useCompetitionInfo(round.competition_id);
  const perRoundRulesEnabled = competitionInfo?.per_round_rules_enabled ?? false;

  // Canonical round-shape slice for the preset catalog. The six fields
  // below fully determine which preset matches this round (see
  // `inferPresetIdFromRound`) and they're the ones `applyPresetToRound`
  // will overwrite.
  const roundShape = useMemo(
    () => ({
      game_type: round.game_type,
      is_team_round: round.is_team_round,
      team_format: round.team_format,
      round_format: round.round_format,
      sub_match_size: round.sub_match_size,
      rules_override: round.rules_override ?? null,
    }),
    [
      round.game_type,
      round.is_team_round,
      round.team_format,
      round.round_format,
      round.sub_match_size,
      round.rules_override,
    ]
  );

  const currentPresetId = useMemo(
    () => inferPresetIdFromRound(roundShape),
    [roundShape]
  );
  const currentPreset = currentPresetId ? ROUND_PRESETS[currentPresetId] : null;

  // Check if round has an active skins game
  const { data: skinsGames } = useSkinsGamesByRound(round.id);
  const hasSkins = skinsGames && skinsGames.length > 0;

  // Check if round has a Wolf game
  const { data: wolfGame } = useWolfGameByRound(round.id);
  const hasWolf = !!wolfGame;

  // Per-player tee overrides (round_players.selected_tee). Used to show
  // the CURRENT user's effective tee in the Tee row rather than the
  // round-level default — necessary because players in a group round
  // can play different tees, and edits made via the Edit Tees sheet only
  // touch round_players, not rounds.selected_tee.
  const { data: roundPlayerTees } = useRoundPlayerTees(round.id);

  // Teams for this round — drives the Matchup row visibility. We only
  // surface the picker when the competition has 3+ teams (2-team rounds
  // fall back to "first two" automatically, so there's nothing to choose).
  const { teams: roundTeams } = useRoundTeams(
    round.competition_id ?? undefined,
    round.is_team_round,
    round.id
  );
  const isTeamMatchPlayRound = round.is_team_round && round.game_type === 'match-play';
  const showMatchupRow = isTeamMatchPlayRound && roundTeams.length >= 3;
  const team1Name =
    roundTeams.find((t) => t.id === round.team1_id)?.name ?? roundTeams[0]?.name ?? 'Team A';
  const team2Name =
    roundTeams.find((t) => t.id === round.team2_id)?.name ?? roundTeams[1]?.name ?? 'Team B';

  // Effective tee for the current user on this round. Prefers a
  // per-player override (round_players.selected_tee) and falls back to
  // the round-level default (rounds.selected_tee). When neither exists
  // the display shows "Not set" (no fallback to the first course tee —
  // that preserves the pre-existing "Not set" behaviour).
  const effectiveTee = useMemo(() => {
    const currentUserOverride = player?.id ? roundPlayerTees?.get(player.id) : null;
    return currentUserOverride ?? round.selected_tee ?? null;
  }, [player?.id, roundPlayerTees, round.selected_tee]);

  // Get selected tee from round, or fall back to course default/first available
  const { totalPar, selectedTeeName } = useMemo(() => {
    const rawHoles = round.course?.holes;
    const courseHoles = Array.isArray(rawHoles) ? rawHoles : [];

    // Priority: effective tee (per-player override ∨ round default) >
    // first course tee > first yardage key
    let teeName: string | null = null;
    if (effectiveTee?.name) {
      teeName = effectiveTee.name;
    } else if (round.course?.tees?.[0]?.name) {
      teeName = round.course.tees[0].name;
    } else if (courseHoles[0]?.yardages) {
      teeName = Object.keys(courseHoles[0].yardages)[0] || null;
    }

    const par = courseHoles.reduce((sum, hole) => sum + (hole.par || 0), 0);

    return { totalPar: par, selectedTeeName: teeName };
  }, [round.course?.holes, round.course?.tees, effectiveTee]);

  // Location comes from the club
  const club = round.course?.club;
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

  // Navigate to the round's photo album
  const handlePhotosPress = () => {
    navigation.navigate('RoundPhotos', { roundId: round.id, canAdd: canAddPhotos });
  };

  return (
    <View style={styles.container}>
      {/* Course Header Card (round photos sit flush at the top as a cover) */}
      <TouchableOpacity
        style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={handleCoursePress}
        disabled={!round.course}
        activeOpacity={0.7}
      >
        <RoundPhotoBanner roundId={round.id} rounded={false} onPress={handlePhotosPress} />
        <View style={styles.headerTop}>
          <RoundCoverPhotoButton
            roundId={round.id}
            canAdd={canAddPhotos}
            size={44}
            backgroundColor={colors.primaryBackground}
          />
          <View style={styles.headerInfo}>
            <Text style={[styles.courseName, { color: colors.textPrimary }]}>
              {round.course?.name || 'Course TBD'}
            </Text>

            {/* Club Link — muted supporting line per redesign */}
            {club && (
              <TouchableOpacity style={styles.clubLink} onPress={handleClubPress} activeOpacity={0.7}>
                <Icon source="map-marker" size={14} color={colors.textSecondary} />
                <Text style={[styles.clubLinkText, { color: colors.textSecondary }]}>
                  {location || club.name}
                </Text>
                <Icon source="chevron-right" size={14} color={colors.textSecondary} />
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
        </View>

        <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <DetailRow
            icon="calendar"
            label="Date"
            onPress={canEdit ? openDateTime : undefined}
            accessibilityHint={canEdit ? 'Edit round date' : undefined}
          >
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {formatDateWithWeekday(round.date)}
            </Text>
          </DetailRow>

          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

          <DetailRow
            icon="clock-outline"
            label="Tee Time"
            onPress={canEdit ? openDateTime : undefined}
            accessibilityHint={canEdit ? 'Edit tee time' : undefined}
          >
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {formatTeeTime(round.tee_time)}
            </Text>
          </DetailRow>

          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

          {/* Holes Played — `nine_type` selector. Visible for standalone
              rounds; editable mid-round (full ↔ front9 ↔ back9) so users
              can extend or cut a round short without losing scores
              they've already entered. */}
          {isStandalone && (
            <>
              <DetailRow
                icon="flag"
                label="Holes"
                onPress={canEditNineType ? openNineType : undefined}
                accessibilityHint={
                  canEditNineType
                    ? 'Change number of holes'
                    : undefined
                }
              >
                <Pill
                  label={
                    round.nine_type === 'front9'
                      ? 'Front 9'
                      : round.nine_type === 'back9'
                        ? 'Back 9'
                        : 'Full 18'
                  }
                  variant="primary"
                  size="md"
                />
              </DetailRow>
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
            </>
          )}

          {/* Round Type — single preset picker that writes the full set
              of format fields (game_type, is_team_round, team_format,
              round_format, sub_match_size, rules_override) in one shot.
              Replaces the separate Format / Round Format / Scoring Rules
              rows so organisers can't produce invalid combinations. When
              the round's saved fields don't match any catalog preset
              (e.g. legacy rounds, hand-crafted combos) the pill reads
              "Custom" and the picker lets the organiser pick a canonical
              preset to convert it. */}
          <DetailRow
            icon={currentPreset?.icon ?? 'puzzle-outline'}
            label="Round Type"
            onPress={canEdit ? openRoundType : openRoundRules}
            accessibilityHint={
              canEdit ? 'Change round type' : 'View round rules'
            }
          >
            <View style={styles.formatPillContainer}>
              {hasSkins && (
                <Icon source="dice-multiple" size={18} color={skinsColor} />
              )}
              {hasWolf && (
                <Icon source="dog-side" size={18} color={wolfColor} />
              )}
              <Pill
                label={currentPreset?.shortTitle ?? 'Custom'}
                variant="primary"
                size="md"
              />
            </View>
          </DetailRow>

          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

          {(() => {
            const hasCourseTees = (round.course?.tees?.length ?? 0) > 0;
            const hasCR = effectiveTee?.courseRating != null;
            const hasSlope = effectiveTee?.slopeRating != null;
            return (
              <DetailRow
                icon="golf-tee"
                label="Tee"
                onPress={canEdit && hasCourseTees ? openTee : undefined}
                accessibilityHint={
                  canEdit && hasCourseTees ? 'Edit tee' : undefined
                }
              >
                <View style={styles.teeValue}>
                  <View style={styles.teeValueNameRow}>
                    {effectiveTee && (
                      <View
                        style={[
                          styles.teeColorDot,
                          {
                            backgroundColor: getTeeColor(
                              effectiveTee.color || '',
                              colors.gray400
                            ),
                            borderColor: colors.border,
                          },
                        ]}
                      />
                    )}
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {effectiveTee?.name || 'Not set'}
                    </Text>
                  </View>
                  {(hasCR || hasSlope) && (
                    <Text style={[styles.teeMeta, { color: colors.textSecondary }]}>
                      {[
                        hasCR ? `CR ${effectiveTee!.courseRating!.toFixed(1)}` : null,
                        hasSlope ? `SR ${effectiveTee!.slopeRating}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  )}
                </View>
              </DetailRow>
            );
          })()}

          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

          <DetailRow icon="flag-checkered" label="Status">
            <StatusBadge status={round.status as StatusVariant} size="md" />
          </DetailRow>

          {showMatchupRow && (
            <>
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
              <DetailRow
                icon="sword-cross"
                label="Matchup"
                onPress={canEdit ? openMatchup : undefined}
                accessibilityHint={canEdit ? 'Pick the two teams playing this round' : undefined}
              >
                <Text
                  style={[styles.detailValue, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {team1Name} vs {team2Name}
                </Text>
              </DetailRow>
            </>
          )}
        </View>
      </View>

      {/* Flat players list. Team rosters live on the dedicated Teams
          tab; group / sub-match breakdowns live on the Groups (or
          Sub-Matches, for split team rounds) tab. */}
      <PlayersSection
        roundId={round.id}
        cardBackground={colors.surface}
        currentUserId={player?.id}
      />


      {/* Per-field edit sheets */}
      <EditDateTimeSheet
        visible={openSheet === 'date-time'}
        onDismiss={handleCloseSheet}
        roundId={round.id}
        initialDate={round.date}
        initialTeeTime={round.tee_time}
      />
      <EditTeeSheet
        visible={openSheet === 'tee'}
        onDismiss={handleCloseSheet}
        roundId={round.id}
        tees={round.course?.tees ?? []}
        currentTee={round.selected_tee ?? null}
      />
      {isStandalone && (
        <EditNineTypeSheet
          visible={openSheet === 'nine-type'}
          onDismiss={handleCloseSheet}
          roundId={round.id}
          currentNineType={round.nine_type}
        />
      )}
      {showMatchupRow && (
        <MatchupSheet
          visible={openSheet === 'matchup'}
          onDismiss={handleCloseSheet}
          roundId={round.id}
          competitionId={round.competition_id ?? null}
          currentTeam1Id={round.team1_id ?? null}
          currentTeam2Id={round.team2_id ?? null}
        />
      )}
      {openSheet === 'round-type' && (
        <RoundTypeSheet
          visible
          onDismiss={handleCloseSheet}
          roundId={round.id}
          competitionId={round.competition_id ?? null}
          round={roundShape}
          perRoundRulesEnabled={perRoundRulesEnabled}
          roundTeeTime={round.tee_time}
        />
      )}
      {openSheet === 'round-rules' && (
        <RoundRulesSheet
          visible
          onDismiss={handleCloseSheet}
          preset={currentPreset}
        />
      )}
    </View>
  );
});

// ============================================================================
// DETAIL ROW
// ============================================================================

interface DetailRowProps {
  icon: string;
  /** Visible label. May contain `\n` to stack across two lines. */
  label: string;
  /**
   * Overrides the string exposed to screen readers / test queries.
   * Defaults to `label` with any `\n` normalised to a space so the a11y
   * surface stays flat even when the visible text is stacked.
   */
  accessibilityLabel?: string;
  onPress?: () => void;
  accessibilityHint?: string;
  children: React.ReactNode;
}

function DetailRow({
  icon,
  label,
  accessibilityLabel,
  onPress,
  accessibilityHint,
  children,
}: DetailRowProps) {
  const colors = useThemeColors();
  const isInteractive = !!onPress;
  const a11yLabel = accessibilityLabel ?? label.replace(/\n/g, ' ');

  const content = (
    <>
      <View style={[styles.detailIconContainer, { backgroundColor: colors.primaryBackground }]}>
        <Icon source={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.detailContent}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.detailRight}>
          {children}
          {isInteractive && (
            <Icon source="chevron-right" size={20} color={colors.gray400} />
          )}
        </View>
      </View>
    </>
  );

  if (!isInteractive) {
    return (
      <View style={styles.detailRow} accessibilityLabel={a11yLabel}>
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.detailRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },

  // Header Card
  headerCard: {
    borderRadius: borderRadius.xl,
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
    // Design: 15.5px / 800 course title
    fontSize: 15.5,
    fontWeight: '800',
    lineHeight: 20,
  },
  clubLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xxs,
  },
  clubLinkText: {
    fontSize: 12,
    lineHeight: 16,
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
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
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

  // Details Card
  detailsCard: {
    borderRadius: borderRadius.xl,
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
    // Design: 32px tinted icon square, radius 9
    width: 32,
    height: 32,
    borderRadius: 9,
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
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    // Design: 13.5px muted label
    fontSize: 13.5,
    lineHeight: 18,
  },
  detailValue: {
    // Design: 13.5px / 700 value
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  formatPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  teeValue: {
    alignItems: 'flex-end',
  },
  teeValueNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  teeColorDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  teeMeta: {
    ...typography.caption,
    marginTop: 2,
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

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
import { StatusBadge, type StatusVariant } from '@/components/common/StatusBadge';
import { Pill } from '@/components/common/Pill';
import { getTeeColor } from '@/components/common/TeeSelector';
import { formatDateWithWeekday, formatTeeTime } from '@/utils/formatting';
import { useSettingsStore } from '@/store/settingsStore';
import type { RootStackParamList } from '@/navigation/types';

import { GAME_TYPE_LABELS } from './constants';
import { PlayersSection } from './components';
import { EditDateTimeSheet, EditGameTypeSheet, EditTeeSheet, RoundFormatSheet, MatchupSheet } from './sheets';
import type { RoundDetailsTabProps } from './types';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';

type OpenSheet = 'date-time' | 'game-type' | 'tee' | 'round-format' | 'matchup' | null;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const RoundDetailsTab = React.memo(function RoundDetailsTab({
  round,
  isOrganizer = false,
  onCourseSelectPress,
  onUpgradePress,
}: RoundDetailsTabProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);
  const useMetres = distanceUnit === 'metres';
  const holes = Array.isArray(round.course?.holes) ? round.course.holes : [];
  const { player } = useAuth();

  // Round details are editable only by the round/competition organiser.
  // `isOrganizer` already resolves to true for standalone-round owners and
  // for competition organisers (see useViewRoundPermissions). We alias it
  // locally so the intent at each call site reads as "can edit" rather
  // than "is organiser" and so additional gates (e.g. round status) can
  // be layered here later without touching every row.
  const canEdit = isOrganizer;

  // Per-field edit sheets - only one open at a time. Kept local to the tab
  // because no other component needs to observe this state.
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const handleCloseSheet = useCallback(() => setOpenSheet(null), []);
  const openDateTime = useCallback(() => {
    if (!canEdit) return;
    setOpenSheet('date-time');
  }, [canEdit]);
  const openGameType = useCallback(() => {
    if (!canEdit) return;
    setOpenSheet('game-type');
  }, [canEdit]);
  const openTee = useCallback(() => {
    if (!canEdit) return;
    setOpenSheet('tee');
  }, [canEdit]);
  const openRoundFormat = useCallback(() => {
    if (!canEdit) return;
    setOpenSheet('round-format');
  }, [canEdit]);
  const openMatchup = useCallback(() => {
    if (!canEdit) return;
    setOpenSheet('matchup');
  }, [canEdit]);
  const handleUpgradePress = useCallback(() => onUpgradePress?.(), [onUpgradePress]);

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

  // Group/sub-match viewing lives on the dedicated Groups/Sub-Matches tab.
  // The Details tab only shows the flat player list so it stays focused
  // on round metadata.
  const roundFormat = round.round_format ?? 'combined';

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

          <DetailRow
            icon="trophy-outline"
            label="Format"
            onPress={canEdit ? openGameType : undefined}
            accessibilityHint={canEdit ? 'Edit game format' : undefined}
          >
            <View style={styles.formatPillContainer}>
              {hasSkins && (
                <Icon source="dice-multiple" size={18} color={skinsColor} />
              )}
              {hasWolf && (
                <Icon source="dog-side" size={18} color={wolfColor} />
              )}
              <Pill
                label={GAME_TYPE_LABELS[round.game_type]}
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

          {round.is_team_round && (
            <>
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
              <DetailRow
                icon="account-switch-outline"
                label="Round Format"
                onPress={canEdit ? openRoundFormat : undefined}
                accessibilityHint={canEdit ? 'Edit round format' : undefined}
              >
                <View style={styles.formatPillContainer}>
                  <Pill
                    label={roundFormat === 'split' ? `Split ${round.sub_match_size ?? ''}v${round.sub_match_size ?? ''}`.trim() : 'Combined'}
                    variant="primary"
                    size="md"
                  />
                </View>
              </DetailRow>
            </>
          )}

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
      />


      {/* Per-field edit sheets */}
      <EditDateTimeSheet
        visible={openSheet === 'date-time'}
        onDismiss={handleCloseSheet}
        roundId={round.id}
        initialDate={round.date}
        initialTeeTime={round.tee_time}
      />
      <EditGameTypeSheet
        visible={openSheet === 'game-type'}
        onDismiss={handleCloseSheet}
        roundId={round.id}
        currentGameType={round.game_type}
        currentIsTeamRound={round.is_team_round}
        currentTeamFormat={round.team_format}
        supportsTeams={
          round.competition
            ? round.competition.team_mode !== 'none'
            : round.is_team_round
        }
        onUpgradePress={handleUpgradePress}
      />
      <EditTeeSheet
        visible={openSheet === 'tee'}
        onDismiss={handleCloseSheet}
        roundId={round.id}
        tees={round.course?.tees ?? []}
        currentTee={round.selected_tee ?? null}
      />
      {round.is_team_round && (
        <RoundFormatSheet
          visible={openSheet === 'round-format'}
          onDismiss={handleCloseSheet}
          roundId={round.id}
          competitionId={round.competition_id ?? null}
          isTeamRound={round.is_team_round}
          currentFormat={roundFormat}
          currentSubMatchSize={round.sub_match_size ?? null}
          roundTeeTime={round.tee_time}
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
    </View>
  );
});

// ============================================================================
// DETAIL ROW
// ============================================================================

interface DetailRowProps {
  icon: string;
  label: string;
  onPress?: () => void;
  accessibilityHint?: string;
  children: React.ReactNode;
}

function DetailRow({ icon, label, onPress, accessibilityHint, children }: DetailRowProps) {
  const colors = useThemeColors();
  const isInteractive = !!onPress;

  const content = (
    <>
      <View style={styles.detailIconContainer}>
        <Icon source={icon} size={20} color={colors.primary} />
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
      <View style={styles.detailRow} accessibilityLabel={label}>
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
      accessibilityLabel={label}
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
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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

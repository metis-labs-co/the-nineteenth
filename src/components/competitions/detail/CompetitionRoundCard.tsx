/**
 * CompetitionRoundCard - Individual round card for competition detail view
 *
 * Displays round information including course, date, status, and game type.
 * Includes action buttons for viewing and scoring rounds.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { IconMapPin, IconCheck, IconAlertTriangle, IconDice, IconBolt } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows, skinsColor } from '@/constants/theme';
import { useIsDark, type ColorPalette } from '@/context/ThemeContext';
import { StatusBadge, Pill, DateTimeDisplay } from '@/components/common';
import type { StatusVariant } from '@/components/common';
import { type RoundWithCourse, GAME_TYPE_LABELS } from './types';
import type { SkinsConfig, GameType } from '@/types';
import { inferPresetIdFromRound, ROUND_PRESETS } from '@/constants/roundPresets';

/** Amber/gold color for skins indicator */
const SKINS_COLOR = skinsColor;

export interface CompetitionRoundCardProps {
  round: RoundWithCourse;
  roundNumber: number;
  isOrganizer: boolean;
  /** Number of players in the competition (used to validate scoring requirements) */
  playerCount: number;
  onScoreRound: (roundId: string, gameType: GameType, isTeamRound: boolean) => void;
  onViewRound: (roundId: string) => void;
  onQuickScore?: (roundId: string) => void;
  onManageScoringPairs?: (roundId: string) => void;
  /** Whether scoring pairs are configured for this round */
  hasScoringPairs?: boolean;
  /** Whether all players have completed scorecards for this round */
  allPlayersScored?: boolean;
  /** Whether this round has skins enabled (overrides round.has_skins) */
  hasSkins?: boolean;
  /** Skins configuration (overrides round.skins_config) */
  skinsConfig?: SkinsConfig | null;
  colors: ColorPalette;
}

/**
 * Maps round status to StatusBadge variant
 */
const getStatusVariant = (status: string): StatusVariant => {
  switch (status) {
    case 'in-progress':
      return 'in-progress';
    case 'completed':
      return 'completed';
    case 'upcoming':
    default:
      return 'upcoming';
  }
};

/**
 * Format skins pot value for display
 */
const formatSkinsPot = (config: SkinsConfig): string => {
  if (config.pot_type === 'per_hole') {
    return `$${config.pot_value}/hole`;
  }
  return `$${config.pot_value} total`;
};

export const CompetitionRoundCard = React.memo(function CompetitionRoundCard({
  round,
  roundNumber,
  isOrganizer,
  playerCount,
  onScoreRound,
  onViewRound,
  onQuickScore,
  onManageScoringPairs,
  hasScoringPairs,
  allPlayersScored,
  hasSkins: hasSkinsOverride,
  skinsConfig: skinsConfigOverride,
  colors,
}: CompetitionRoundCardProps) {
  const isDark = useIsDark();

  // Determine skins status (props override round data)
  const hasSkins = hasSkinsOverride ?? round.has_skins ?? false;
  const skinsConfig = skinsConfigOverride ?? round.skins_config ?? null;

  // Derive a descriptive format label from the round's full shape (e.g.
  // "1v1 Singles Match Play", "2v2 Pairs Better Ball"). Falls back to the
  // bare game-type label if the round doesn't match a canonical preset.
  const presetId = inferPresetIdFromRound({
    game_type: round.game_type,
    is_team_round: round.is_team_round,
    team_format: round.team_format,
    round_format: round.round_format,
    sub_match_size: round.sub_match_size,
    rules_override: round.rules_override ?? null,
  });
  const formatLabel =
    (presetId && ROUND_PRESETS[presetId]?.title) ??
    GAME_TYPE_LABELS[round.game_type];

  // Determine if scoring is disabled
  const hasCourse = !!round.course;
  const hasEnoughPlayers = playerCount >= 2;
  const isCompleted = round.status === 'completed';
  const isScoringDisabled = isCompleted || !hasCourse || !hasEnoughPlayers || !!allPlayersScored;

  // Build disabled reason for accessibility
  const getDisabledReason = (): string | undefined => {
    if (isCompleted) return 'Round is completed';
    if (allPlayersScored) return 'All players scored';
    if (!hasCourse) return 'Course not assigned';
    if (!hasEnoughPlayers) return 'Need at least 2 players';
    return undefined;
  };
  const cardContent = (
    <View style={styles.content}>
        {/* Top Row: Status Badge + Game Type Badge + Skins Badge + Round Pill */}
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <StatusBadge status={getStatusVariant(round.status)} />
            <StatusBadge
              status="custom"
              label={formatLabel}
              size="md"
              backgroundColor={colors.gray100}
            />
            {hasSkins && (
              <View
                style={[styles.skinsBadge, { backgroundColor: `${SKINS_COLOR}20` }]}
                accessibilityLabel={`Skins game enabled${skinsConfig ? `: ${formatSkinsPot(skinsConfig)}` : ''}`}
              >
                <IconDice size={14} color={SKINS_COLOR} />
                <Text style={[styles.skinsBadgeText, { color: SKINS_COLOR }]}>
                  Skins
                </Text>
              </View>
            )}
          </View>
          <Pill label={`Round ${roundNumber}`} size="md" />
        </View>

        {/* Course Name + Club Name */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {round.course?.name || 'Course TBD'}
          </Text>
          {round.course?.clubs?.name && (
            <Text
              style={[styles.clubName, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {` · ${round.course.clubs.name}`}
            </Text>
          )}
        </View>

        {/* Location */}
        {(round.course?.clubs?.city || round.course?.clubs?.state) && (
          <View style={styles.locationRow}>
            <IconMapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {[round.course?.clubs?.city, round.course?.clubs?.state].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}

        {/* Date and Time */}
        <View style={styles.detailsRow}>
          <DateTimeDisplay date={round.date} time={round.tee_time} size="md" />
        </View>

        {/* Skins Info */}
        {hasSkins && skinsConfig && (
          <View style={styles.skinsInfoRow}>
            <IconDice size={14} color={SKINS_COLOR} />
            <Text style={[styles.skinsInfoText, { color: SKINS_COLOR }]}>
              Skins: {formatSkinsPot(skinsConfig)} • {skinsConfig.scoring_type === 'gross' ? 'Gross' : 'Net'}
            </Text>
          </View>
        )}

        {/* Scoring Pairs Row - Organizer Only */}
        {isOrganizer && round.scoring_pairs_required && onManageScoringPairs && (
          <TouchableOpacity
            style={[styles.scoringPairsRow, { borderTopColor: colors.borderLight }]}
            onPress={() => onManageScoringPairs(round.id)}
            accessibilityLabel={`Manage scoring pairs for round ${roundNumber}`}
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <View style={styles.scoringPairsLabelRow}>
              <Icon source="account-switch" size={18} color={colors.textSecondary} />
              <Text style={[styles.scoringPairsLabel, { color: colors.textPrimary }]}>
                Scoring Pairs
              </Text>
            </View>
            <View style={styles.scoringPairsStatusRow}>
              {hasScoringPairs ? (
                <>
                  <IconCheck size={16} color={colors.success} />
                  <Text style={[styles.scoringPairsStatusText, { color: colors.success }]}>
                    Configured
                  </Text>
                </>
              ) : (
                <>
                  <IconAlertTriangle size={16} color={colors.warning} />
                  <Text style={[styles.scoringPairsStatusText, { color: colors.warning }]}>
                    Not configured
                  </Text>
                </>
              )}
              <Icon source="chevron-right" size={18} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        )}
    </View>
  );

  // Once a round is completed, scoring is no-op so the action row adds noise.
  // Make the whole card a single tap target to view the round details instead.
  if (isCompleted) {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => onViewRound(round.id)}
        accessibilityLabel={`View round ${roundNumber}`}
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {cardContent}

      {/* Divider */}
      <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            isDark
              ? [styles.viewButtonOutline, { borderColor: colors.primary }]
              : { backgroundColor: colors.primaryLighter },
          ]}
          onPress={() => onViewRound(round.id)}
          accessibilityLabel={`View round ${roundNumber}`}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text style={[styles.actionButtonLabel, { color: colors.primary }]}>View</Text>
        </TouchableOpacity>
        {onQuickScore && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.quickScoreButton,
              {
                borderColor: isScoringDisabled ? colors.gray300 : colors.primary,
              },
            ]}
            onPress={() => onQuickScore(round.id)}
            accessibilityLabel={`Quick score round ${roundNumber}${getDisabledReason() ? ` - ${getDisabledReason()}` : ''}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: isScoringDisabled }}
            activeOpacity={0.7}
            disabled={isScoringDisabled}
          >
            <IconBolt size={16} color={isScoringDisabled ? colors.gray400 : colors.primary} />
            <Text
              style={[
                styles.actionButtonLabel,
                { color: isScoringDisabled ? colors.gray400 : colors.primary },
              ]}
              numberOfLines={1}
            >
              Quick Score
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: isScoringDisabled ? colors.gray300 : colors.primary },
          ]}
          onPress={() => onScoreRound(round.id, round.game_type, round.is_team_round)}
          accessibilityLabel={`Score round ${roundNumber}${getDisabledReason() ? ` - ${getDisabledReason()}` : ''}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: isScoringDisabled }}
          activeOpacity={0.7}
          disabled={isScoringDisabled}
        >
          <Text style={[styles.actionButtonLabelPrimary, { color: colors.white }]}>Score</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'column',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.sm,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  skinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  skinsBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  clubName: {
    ...typography.body,
    flexShrink: 1,
    minWidth: 0,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  locationText: {
    ...typography.small,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skinsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  skinsInfoText: {
    ...typography.small,
    fontWeight: '500',
  },
  scoringPairsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  scoringPairsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoringPairsLabel: {
    ...typography.small,
  },
  scoringPairsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoringPairsStatusText: {
    ...typography.smallBold,
  },
  divider: {
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickScoreButton: {
    flexDirection: 'row',
    gap: spacing.xs,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  viewButtonOutline: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionButtonLabel: {
    ...typography.smallBold,
  },
  actionButtonLabelPrimary: {
    ...typography.smallBold,
  },
});

export default CompetitionRoundCard;

/**
 * CompetitionRoundCard - Individual round card for competition detail view
 *
 * Redesigned per the Competition Details redesign (design L171-188):
 * status pill + points badge + "Round N" chip top row, format-label title,
 * "course · date" meta line, restyled scoring-pairs row and action row.
 * All behaviour (handlers, disabled gating, drag wiggle) is unchanged.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { IconMapPin, IconBolt } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { ColorPalette } from '@/context/ThemeContext';
import { type RoundWithCourse, GAME_TYPE_LABELS } from './types';
import type { SkinsConfig, GameType } from '@/types';
import type { Round } from '@/types/database.types';
import { inferPresetIdFromRound, ROUND_PRESETS } from '@/constants/roundPresets';
import { formatDateDisplay, formatTime } from '@/utils/formatting';
import {
  RoundStatusPill,
  RoundPointsBadge,
  RoundNumberChip,
  SkinsIndicatorBadge,
  SkinsInfoRow,
  ScoringPairsRow,
} from './RoundCardBits';

/**
 * Descriptive format label for a round: the matched preset's title (e.g.
 * "1v1 Singles Match Play"), else the bare game-type label. Shared with
 * RoundsTab's summary strip.
 */
export function getRoundFormatLabel(round: Round): string {
  const presetId = inferPresetIdFromRound({
    game_type: round.game_type,
    is_team_round: round.is_team_round,
    team_format: round.team_format,
    round_format: round.round_format,
    sub_match_size: round.sub_match_size,
    rules_override: round.rules_override ?? null,
  });
  return (presetId && ROUND_PRESETS[presetId]?.title) || GAME_TYPE_LABELS[round.game_type];
}

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
  /**
   * Max competition points available in this round (from per-round rules).
   * Shows the "N pts" badge when > 0; omit/0 hides the badge.
   */
  roundPoints?: number;
  /**
   * True while this card is the actively-dragged item in the rounds list.
   * Triggers a wiggle animation, elevated shadow, and slight scale-up.
   * Drag activation itself lives on the parent row wrapper (RoundsTab's
   * DraggableRow), which owns the long-press + pan gesture composition.
   */
  isDragging?: boolean;
  colors: ColorPalette;
  /** Organiser can force-submit this (in-progress, non-split) round. */
  canForceSubmit?: boolean;
  /** Open the force-submit confirmation for this round. */
  onForceSubmit?: (roundId: string) => void;
}

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
  roundPoints,
  isDragging = false,
  colors,
  canForceSubmit,
  onForceSubmit,
}: CompetitionRoundCardProps) {
  // One-shot wiggle on drag start to acknowledge the long-press, then the
  // card settles into a stable elevated state (scale + drop shadow) for
  // the rest of the drag. Total wiggle duration ~420ms, ending back at 0
  // rotation so the card sits straight while the user moves it.
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const easing = Easing.inOut(Easing.quad);

  useEffect(() => {
    if (isDragging) {
      rotation.value = withSequence(
        withTiming(-1.6, { duration: 70, easing }),
        withTiming(1.6, { duration: 90, easing }),
        withTiming(-1.2, { duration: 90, easing }),
        withTiming(1.2, { duration: 90, easing }),
        withTiming(0, { duration: 80, easing })
      );
      scale.value = withTiming(1.05, { duration: 140 });
    } else {
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 140 });
      scale.value = withTiming(1, { duration: 140 });
    }
  }, [isDragging, rotation, scale, easing]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
  }));

  // Determine skins status (props override round data)
  const hasSkins = hasSkinsOverride ?? round.has_skins ?? false;
  const skinsConfig = skinsConfigOverride ?? round.skins_config ?? null;

  const formatLabel = getRoundFormatLabel(round);

  // "course · date" meta line (design L178): e.g. "Kingston Heath · Sat 19 Jul · 9:00 AM"
  const teeTime = formatTime(round.tee_time ?? null);
  const metaLine = [
    round.course?.name || 'Course TBD',
    formatDateDisplay(round.date, { weekday: 'short', day: 'numeric', month: 'short' }),
    teeTime,
  ]
    .filter(Boolean)
    .join(' · ');

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
      {/* Top Row: Status Pill + Points Badge + Skins Badge … Round N chip */}
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <RoundStatusPill status={round.status} colors={colors} />
          {!!roundPoints && roundPoints > 0 && (
            <RoundPointsBadge points={roundPoints} colors={colors} />
          )}
          {hasSkins && <SkinsIndicatorBadge config={skinsConfig} />}
        </View>
        <RoundNumberChip roundNumber={roundNumber} colors={colors} />
      </View>

      {/* Title: derived format label */}
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
        {formatLabel}
      </Text>

      {/* Meta line: pin icon + "course · date" */}
      <View style={styles.metaRow}>
        <IconMapPin size={14} color={colors.textTertiary} />
        <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
          {metaLine}
        </Text>
      </View>

      {/* Skins Info */}
      {hasSkins && skinsConfig && <SkinsInfoRow config={skinsConfig} />}

      {/* Scoring Pairs Row - Organizer Only */}
      {isOrganizer && round.scoring_pairs_required && onManageScoringPairs && (
        <ScoringPairsRow
          configured={!!hasScoringPairs}
          roundNumber={roundNumber}
          onPress={() => onManageScoringPairs(round.id)}
          colors={colors}
        />
      )}
    </View>
  );

  const cardContainerStyle = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
    isDragging && styles.cardDragging,
  ];

  // Once a round is completed, scoring is no-op so the action row adds noise.
  // Make the whole card a single tap target to view the round details instead.
  if (isCompleted) {
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={cardContainerStyle}
          onPress={() => onViewRound(round.id)}
          accessibilityLabel={`View round ${roundNumber}`}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          {cardContent}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Non-completed cards stay as a plain View — drag activation is handled
  // at the row wrapper level (RoundsTab's DraggableRow) via gesture-handler.
  // Keeping this a non-touchable View means short vertical scrolls pass
  // straight through to the parent ScrollView with no gesture-fight.
  return (
    <Animated.View style={animatedStyle}>
      <View style={cardContainerStyle}>
        {cardContent}

        {/* Divider */}
        <Divider style={[styles.divider, { backgroundColor: colors.borderLight }]} />

        {/* Action Buttons (design L182-186) */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primaryBackground }]}
            onPress={() => onViewRound(round.id)}
            accessibilityLabel={`View round ${roundNumber}`}
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonLabel, { color: colors.primaryDark }]}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: isScoringDisabled ? colors.surfaceVariant : colors.primary },
            ]}
            onPress={() => onScoreRound(round.id, round.game_type, round.is_team_round)}
            accessibilityLabel={`Score round ${roundNumber}${getDisabledReason() ? ` - ${getDisabledReason()}` : ''}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: isScoringDisabled }}
            activeOpacity={0.7}
            disabled={isScoringDisabled}
          >
            <Text
              style={[
                styles.actionButtonLabel,
                { color: isScoringDisabled ? colors.textTertiary : colors.white },
              ]}
            >
              Score
            </Text>
          </TouchableOpacity>
          {onQuickScore && (
            <TouchableOpacity
              style={[
                styles.quickScoreIconButton,
                { borderColor: isScoringDisabled ? colors.border : colors.primaryLighter },
              ]}
              onPress={() => onQuickScore(round.id)}
              accessibilityLabel={`Quick score round ${roundNumber}${getDisabledReason() ? ` - ${getDisabledReason()}` : ''}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: isScoringDisabled }}
              activeOpacity={0.7}
              disabled={isScoringDisabled}
            >
              <IconBolt size={18} color={isScoringDisabled ? colors.textTertiary : colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Organiser force-submit — finalize now, unfinished players → DNF. */}
        {canForceSubmit && onForceSubmit && (
          <TouchableOpacity
            style={[styles.forceSubmitButton, { borderColor: colors.border }]}
            onPress={() => onForceSubmit(round.id)}
            accessibilityRole="button"
            accessibilityLabel={`Submit round ${roundNumber} now`}
            activeOpacity={0.7}
          >
            <Icon source="flag-checkered" size={18} color={colors.primary} />
            <Text style={[styles.forceSubmitLabel, { color: colors.primary }]}>Submit Round Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'column',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.sm,
  },
  // Layered on top of the static `card` shadow when this card is the
  // actively-dragged item. The wiggle + scale come from the Animated.View
  // wrapper; this just gives the lifted card a more prominent drop shadow.
  cardDragging: {
    ...shadows.lg,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 3,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  title: {
    ...typography.bodyBold,
    fontWeight: '800',
    marginTop: spacing.sm + 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: 3,
  },
  metaText: {
    ...typography.caption,
    fontSize: 12.5,
    flexShrink: 1,
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
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickScoreIconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonLabel: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  forceSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    height: 44,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  forceSubmitLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default CompetitionRoundCard;

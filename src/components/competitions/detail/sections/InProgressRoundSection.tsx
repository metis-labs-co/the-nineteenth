import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  type ViewToken,
  type ListRenderItem,
} from 'react-native';
import { Text } from 'react-native-paper';
import {
  IconDice,
  IconDog,
  IconPlayerPlayFilled,
  IconTrophy,
} from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { CardContainer, Pill, PlayerAvatar } from '@/components/common';
import { getTeeSwatch } from '@/utils/teeColors';
import type { GameType } from '@/types/database.types';
import { inferPresetIdFromRound, ROUND_PRESETS } from '@/constants/roundPresets';
import { formatRelativeToPar } from '@/utils/formatting';
import { GAME_TYPE_LABELS, type RoundWithCourse } from '../types';

export interface InProgressRoundSectionProps {
  rounds: RoundWithCourse[];
  onScoreRound: (roundId: string, gameType: GameType, isTeamRound: boolean) => void;
  onViewRound: (roundId: string) => void;
  /**
   * Map of round.id -> 1-based display number, matching the pill shown on the
   * Rounds tab (positional, not round.round_number which can have gaps).
   */
  roundDisplayNumbers: Record<string, number>;
  /**
   * Enables swipe-to-delete on standalone rounds (competition rounds never
   * get the gesture). Omit to disable swiping entirely (e.g. CompetitionDetail).
   */
  onDeleteRound?: (round: RoundWithCourse) => void;
}

/** Horizontal padding the parent ScrollView applies (matches `scrollContent`). */
const PARENT_HORIZONTAL_PADDING = spacing.lg;
/** Gap between carousel cards. */
const CARD_GAP = spacing.sm;
/** How much of the next card peeks into view, signaling "swipe for more". */
const NEXT_CARD_PEEK = 32;

/** Coral "live round" indicator dot — fixed accent in both themes. */
const LIVE_DOT = '#e0795f';
/** Most companion avatars shown before collapsing into the "with N" count. */
const MAX_AVATARS = 3;

interface RoundCardProps {
  round: RoundWithCourse;
  number: number;
  width?: number;
  onScoreRound: InProgressRoundSectionProps['onScoreRound'];
  onViewRound: InProgressRoundSectionProps['onViewRound'];
  onDeleteRound?: InProgressRoundSectionProps['onDeleteRound'];
}

function RoundCard({
  round,
  number,
  width,
  onScoreRound,
  onViewRound,
  onDeleteRound,
}: RoundCardProps) {
  const colors = useThemeColors();

  const courseName = round.course?.name ?? 'Course TBD';
  const clubName = round.course?.clubs?.name;
  const competitionName = round.competition?.name;
  const isStandalone = !round.competition_id;
  const standaloneRoundName =
    isStandalone && round.name?.trim() ? round.name.trim() : null;
  const players = isStandalone ? (round.players ?? []) : [];
  const hasSkins = round.has_skins ?? false;
  const hasWolf = round.has_wolf ?? false;
  const selectedTee = round.selected_tee;

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

  // "Hole 7 · +2 · 21 pts" when scoring has started; otherwise fall back to
  // the round name / club so the line is never empty.
  const progress = round.user_progress;
  const progressParts: string[] = [];
  if (progress && progress.holesScored > 0) {
    progressParts.push(`Hole ${progress.currentHole}`);
    if (progress.toPar !== null) progressParts.push(formatRelativeToPar(progress.toPar));
    if (progress.points !== null) progressParts.push(`${progress.points} pts`);
  }
  const subtitle =
    progressParts.length > 0
      ? progressParts.join(' · ')
      : (standaloneRoundName ?? 'Ready to score');

  // Only standalone rounds can be deleted from the carousel — competition
  // rounds are managed by the competition organiser.
  const canDelete = !!onDeleteRound && isStandalone;

  return (
    <CardContainer
      onPress={() => onViewRound(round.id)}
      swipeable={canDelete}
      onDelete={canDelete ? () => onDeleteRound?.(round) : undefined}
      deleteAccessibilityName={courseName}
      accessibilityLabel={`View round ${number} — ${formatLabel}, in progress at ${courseName}${
        progressParts.length > 0 ? `, ${progressParts.join(', ')}` : ''
      }`}
      activeOpacity={0.85}
      elevated={false}
      style={[
        styles.card,
        { borderColor: colors.borderLight },
        width !== undefined && { width },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.liveDot} />
        <View style={styles.titleBlock}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {courseName}
          </Text>
          {clubName && (
            <Text
              style={[styles.clubName, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {clubName}
            </Text>
          )}
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.resumeButton, { backgroundColor: colors.primary }]}
          onPress={() =>
            onScoreRound(round.id, round.game_type, round.is_team_round)
          }
          accessibilityRole="button"
          accessibilityLabel={`Resume scoring round ${number} at ${courseName}`}
          activeOpacity={0.8}
        >
          <IconPlayerPlayFilled size={14} color={colors.textOnColored} />
          <Text style={[styles.resumeLabel, { color: colors.textOnColored }]}>
            Resume
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      <View style={styles.chipsRow}>
        {/* Badge defaults to alignSelf flex-start; recenter it in the chips row */}
        <Pill label={formatLabel} size="sm" style={styles.formatPill} />
        {selectedTee && (
          <View
            style={[
              styles.teeSwatch,
              {
                backgroundColor: getTeeSwatch(
                  selectedTee.color ?? selectedTee.name
                ),
                borderColor: colors.border,
              },
            ]}
            accessibilityLabel={`${selectedTee.name} tees`}
            testID="round-card-tee-swatch"
          />
        )}
        {competitionName && (
          <View style={styles.competitionLabel}>
            <IconTrophy size={14} color={colors.textSecondary} />
            <Text
              style={[styles.chipLabel, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {competitionName}
            </Text>
          </View>
        )}
        {hasSkins && (
          <View
            style={[styles.chip, styles.outlineChip, { borderColor: colors.border }]}
            accessibilityLabel="Skins game enabled"
          >
            <IconDice size={14} color={colors.textSecondary} />
            <Text style={[styles.chipLabel, { color: colors.textPrimary }]}>
              Skins
            </Text>
          </View>
        )}
        {hasWolf && (
          <View
            style={[styles.chip, styles.outlineChip, { borderColor: colors.border }]}
            accessibilityLabel="Wolf game enabled"
          >
            <IconDog size={14} color={colors.textSecondary} />
            <Text style={[styles.chipLabel, { color: colors.textPrimary }]}>
              Wolf
            </Text>
          </View>
        )}
        {players.length > 0 && (
          <View
            style={styles.playersGroup}
            accessibilityLabel={`Playing with ${players.length}: ${players
              .map((p) => p.name)
              .join(', ')}`}
          >
            <View style={styles.avatarStack}>
              {players.slice(0, MAX_AVATARS).map((player, index) => (
                <View
                  key={player.id}
                  style={[
                    styles.avatarRing,
                    { borderColor: colors.surface },
                    index > 0 && styles.avatarOverlap,
                  ]}
                >
                  <PlayerAvatar
                    photoUrl={player.photo_url ?? null}
                    name={player.name}
                    size={22}
                  />
                </View>
              ))}
            </View>
            <Text style={[styles.withLabel, { color: colors.textSecondary }]}>
              with {players.length}
            </Text>
          </View>
        )}
      </View>
    </CardContainer>
  );
}

export function InProgressRoundSection({
  rounds,
  onScoreRound,
  onViewRound,
  roundDisplayNumbers,
  onDeleteRound,
}: InProgressRoundSectionProps) {
  const colors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const cardWidth = useMemo(
    () => windowWidth - PARENT_HORIZONTAL_PADDING * 2 - NEXT_CARD_PEEK,
    [windowWidth]
  );
  const snapInterval = cardWidth + CARD_GAP;

  const renderItem = useCallback<ListRenderItem<RoundWithCourse>>(
    ({ item }) => (
      <RoundCard
        round={item}
        number={roundDisplayNumbers[item.id] ?? item.round_number ?? 0}
        width={cardWidth}
        onScoreRound={onScoreRound}
        onViewRound={onViewRound}
        onDeleteRound={onDeleteRound}
      />
    ),
    [cardWidth, onScoreRound, onViewRound, onDeleteRound, roundDisplayNumbers]
  );

  if (rounds.length === 0) return null;

  // Single round: render full-width, no carousel chrome.
  if (rounds.length === 1) {
    const round = rounds[0];
    return (
      <View style={styles.container}>
        <RoundCard
          round={round}
          number={roundDisplayNumbers[round.id] ?? round.round_number ?? 0}
          onScoreRound={onScoreRound}
          onViewRound={onViewRound}
          onDeleteRound={onDeleteRound}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rounds}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        snapToAlignment="start"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ItemSeparatorComponent={CardSeparator}
        getItemLayout={(_data, index) => ({
          length: snapInterval,
          offset: snapInterval * index,
          index,
        })}
      />

      <View
        style={styles.dotsRow}
        accessibilityLabel={`In-progress round ${activeIndex + 1} of ${rounds.length}`}
      >
        {rounds.map((round, index) => (
          <View
            key={round.id}
            style={[
              styles.dot,
              {
                backgroundColor:
                  index === activeIndex ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function CardSeparator() {
  return <View style={{ width: CARD_GAP }} />;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  // Radius, border, padding, and surface background come from CardContainer.
  card: {
    gap: spacing.md,
    // Fixed min height keeps cards aligned across the carousel regardless of
    // optional content (competition chip, avatars, etc.).
    minHeight: 136,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LIVE_DOT,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.h4,
  },
  clubName: {
    ...typography.small,
  },
  subtitle: {
    ...typography.small,
    fontWeight: '600',
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  resumeLabel: {
    ...typography.bodyBold,
  },
  divider: {
    height: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 32,
    paddingHorizontal: spacing.md - 2,
    borderRadius: borderRadius.full,
    flexShrink: 1,
  },
  formatPill: {
    alignSelf: 'center',
  },
  competitionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  teeSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  outlineChip: {
    borderWidth: 1,
  },
  chipLabel: {
    ...typography.smallBold,
    flexShrink: 1,
  },
  playersGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatarRing: {
    borderWidth: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  avatarOverlap: {
    marginLeft: -spacing.sm,
  },
  withLabel: {
    ...typography.smallBold,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default InProgressRoundSection;

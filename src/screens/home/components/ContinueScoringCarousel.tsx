/**
 * ContinueScoringCarousel — Home's "Continue scoring" section restyled per
 * the "The Nineteenth - Polished" design (HOME L108-128): surface card with
 * a tinted icon square, course name + "Thru N · X pts · format" line, a
 * "RESUME" action, and a progress bar at the holes-played fraction.
 *
 * Presentational restyle of the card only — the carousel/multi-round
 * handling (snap FlatList + dots, single round full-width) and the props
 * contract mirror InProgressRoundSection exactly. Data (user_progress,
 * personally-done filtering) comes untouched from useInProgressRounds.
 */

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
import { Text, Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { inferPresetIdFromRound, ROUND_PRESETS } from '@/constants/roundPresets';
import { getHoleCount } from '@/constants/scoring';
import { formatRelativeToPar } from '@/utils/formatting';
import type { GameType } from '@/types/database.types';
import {
  GAME_TYPE_LABELS,
  type RoundWithCourse,
} from '@/components/competitions/detail/types';

export interface ContinueScoringCarouselProps {
  rounds: RoundWithCourse[];
  onScoreRound: (roundId: string, gameType: GameType, isTeamRound: boolean) => void;
  onViewRound: (roundId: string) => void;
  /** Map of round.id -> 1-based display number (matches InProgressRoundSection). */
  roundDisplayNumbers: Record<string, number>;
}

/** Horizontal padding the parent applies (matches HomeScreen's body padding). */
const PARENT_HORIZONTAL_PADDING = spacing.lg;
/** Gap between carousel cards. */
const CARD_GAP = spacing.sm;
/** How much of the next card peeks into view, signaling "swipe for more". */
const NEXT_CARD_PEEK = 32;

/** Design gradient for the progress fill — fixed in both themes. */
const PROGRESS_GRADIENT = ['#8bc26e', '#5f9a3f'] as const;

interface RoundCardProps {
  round: RoundWithCourse;
  number: number;
  width?: number;
  onScoreRound: ContinueScoringCarouselProps['onScoreRound'];
  onViewRound: ContinueScoringCarouselProps['onViewRound'];
}

function RoundCard({
  round,
  number,
  width,
  onScoreRound,
  onViewRound,
}: RoundCardProps) {
  const colors = useThemeColors();

  const courseName = round.course?.name ?? 'Course TBD';
  const competitionName = round.competition?.name;
  const isStandalone = !round.competition_id;
  const standaloneRoundName =
    isStandalone && round.name?.trim() ? round.name.trim() : null;

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

  // "Thru 7 · +2 · 21 pts · Stableford" when scoring has started; otherwise
  // fall back to the round name / ready state so the line is never empty.
  const progress = round.user_progress;
  const progressParts: string[] = [];
  if (progress && progress.holesScored > 0) {
    progressParts.push(`Thru ${progress.holesScored}`);
    if (progress.toPar !== null) progressParts.push(formatRelativeToPar(progress.toPar));
    if (progress.points !== null) progressParts.push(`${progress.points} pts`);
  }
  const subtitle =
    progressParts.length > 0
      ? [...progressParts, formatLabel].join(' · ')
      : [standaloneRoundName ?? 'Ready to score', formatLabel].join(' · ');

  const totalHoles = getHoleCount(round.nine_type);
  const fraction =
    progress && progress.holesScored > 0
      ? Math.min(progress.holesScored / totalHoles, 1)
      : 0;

  return (
    <TouchableOpacity
      onPress={() => onViewRound(round.id)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`View round ${number} — ${formatLabel}, in progress at ${courseName}${
        progressParts.length > 0 ? `, ${progressParts.join(', ')}` : ''
      }`}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        width !== undefined && { width },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconSquare, { backgroundColor: colors.primaryBackground }]}>
          <Icon source="clock-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.titleBlock}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {courseName}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
          {competitionName ? (
            <Text
              style={[styles.competitionName, { color: colors.textTertiary }]}
              numberOfLines={1}
            >
              {competitionName}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.resumeButton}
          onPress={() =>
            onScoreRound(round.id, round.game_type, round.is_team_round)
          }
          accessibilityRole="button"
          accessibilityLabel={`Resume scoring round ${number} at ${courseName}`}
          activeOpacity={0.8}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.resumeLabel, { color: colors.primary }]}>
            Resume
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
        <LinearGradient
          colors={[...PROGRESS_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${fraction * 100}%` }]}
        />
      </View>
    </TouchableOpacity>
  );
}

export function ContinueScoringCarousel({
  rounds,
  onScoreRound,
  onViewRound,
  roundDisplayNumbers,
}: ContinueScoringCarouselProps) {
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
      />
    ),
    [cardWidth, onScoreRound, onViewRound, roundDisplayNumbers]
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
  card: {
    borderRadius: borderRadius.xl + 2,
    borderWidth: 1,
    padding: spacing.lg,
    // Fixed min height keeps cards aligned across the carousel regardless of
    // optional content (competition line, etc.).
    minHeight: 108,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconSquare: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  competitionName: {
    ...typography.caption,
    marginTop: 1,
  },
  resumeButton: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  resumeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    marginTop: spacing.md + 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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

export default ContinueScoringCarousel;

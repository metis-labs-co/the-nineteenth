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
import { IconBolt } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { Pill, StatusBadge } from '@/components/common';
import type { GameType } from '@/types/database.types';
import { inferPresetIdFromRound, ROUND_PRESETS } from '@/constants/roundPresets';
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
}

/** Horizontal padding the parent ScrollView applies (matches `scrollContent`). */
const PARENT_HORIZONTAL_PADDING = spacing.lg;
/** Gap between carousel cards. */
const CARD_GAP = spacing.sm;
/** How much of the next card peeks into view, signaling "swipe for more". */
const NEXT_CARD_PEEK = 32;

interface RoundCardProps {
  round: RoundWithCourse;
  number: number;
  width?: number;
  onScoreRound: InProgressRoundSectionProps['onScoreRound'];
  onViewRound: InProgressRoundSectionProps['onViewRound'];
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
  const clubName = round.course?.clubs?.name;

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

  return (
    <View
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
        width !== undefined && { width },
      ]}
    >
      <TouchableOpacity
        style={styles.body}
        onPress={() => onViewRound(round.id)}
        accessibilityRole="button"
        accessibilityLabel={`View round ${number} — ${formatLabel}, in progress at ${courseName}`}
        activeOpacity={0.7}
      >
        <View style={styles.topRow}>
          <StatusBadge status="in-progress" size="sm" />
          <Pill label={`Round ${number}`} size="sm" />
        </View>

        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {courseName}
          </Text>
          {clubName && (
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {` · ${clubName}`}
            </Text>
          )}
        </View>

        <View style={styles.formatRow}>
          <StatusBadge
            status="custom"
            label={formatLabel}
            size="sm"
            backgroundColor={colors.gray100}
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.scoreButton, { backgroundColor: colors.primary }]}
        onPress={() =>
          onScoreRound(round.id, round.game_type, round.is_team_round)
        }
        accessibilityRole="button"
        accessibilityLabel={`Score round ${number}`}
        activeOpacity={0.8}
      >
        <IconBolt size={16} color={colors.white} />
        <Text style={[styles.scoreButtonLabel, { color: colors.white }]}>
          Continue Scoring
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function InProgressRoundSection({
  rounds,
  onScoreRound,
  onViewRound,
  roundDisplayNumbers,
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
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  body: {
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  formatRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  subtitle: {
    ...typography.body,
    flexShrink: 1,
    minWidth: 0,
  },
  scoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 40,
  },
  scoreButtonLabel: {
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

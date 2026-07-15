/**
 * RoundsTab - List of all rounds in a competition
 *
 * Uses CompetitionRoundCard for individual round display. Organizers can
 * long-press a round and drag to reorder; non-organizers see a static list.
 *
 * Reordering is implemented inline with `react-native-gesture-handler`'s
 * Gesture API (LongPress + Pan composed with `Gesture.Simultaneous`) rather
 * than a list library. The 300ms long-press requirement means short
 * vertical swipes pass through to the parent ScrollView for normal scroll;
 * only a deliberate hold engages drag. During the drag the surrounding cards
 * animate to open a gap at the projected drop slot (driven by shared drag
 * state — see `DraggableRow`); on release the new order is computed from the
 * pan offset and persisted via `onReorder`.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type LayoutChangeEvent,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import type { ColorPalette } from '@/context/ThemeContext';
import type { RoundWithCourse } from './types';
import type { GameType } from '@/types';
import { CompetitionRoundCard, getRoundFormatLabel } from './CompetitionRoundCard';
import { getHoverIndex, computeReorderShift } from './reorderMath';
import { EmptyState, SwipeableRow } from '@/components/common';
import { useForceFinalizeRound } from '@/hooks/rounds';
import ForceSubmitRoundDialog from '@/components/rounds/ForceSubmitRoundDialog';
import { useToast } from '@/context/ToastContext';
import { summarizeCompetition } from '@/utils/competitionPoints/roundPointsSummary';

/** Long-press threshold before drag activates. Short enough to feel snappy,
 *  long enough that vertical scrolls pass through to the parent ScrollView. */
const LONG_PRESS_MS = 300;

export interface RoundsTabProps {
  rounds: RoundWithCourse[];
  isOrganizer: boolean;
  /** Competition ID, required for force-submit cache invalidation. */
  competitionId: string;
  /** Number of players in the competition (used to validate scoring requirements) */
  playerCount: number;
  onAddRound: () => void;
  onScoreRound: (roundId: string, gameType: GameType, isTeamRound: boolean) => void;
  onViewRound: (roundId: string) => void;
  onQuickScore?: (roundId: string) => void;
  onManageScoringPairs?: (roundId: string) => void;
  /** Called when the organizer triggers swipe-to-delete on a round */
  onDeleteRound?: (round: RoundWithCourse) => void;
  /**
   * Called when the organizer drops a dragged round into a new position.
   * Receives the full new ordering as an array of round IDs (index 0 first).
   */
  onReorder?: (roundIds: string[]) => void;
  /** Map of roundId to whether scoring pairs exist */
  scoringPairsStatus?: Record<string, boolean>;
  /** Map of roundId to whether all players have completed scorecards */
  allScoredStatus?: Record<string, boolean>;
  colors: ColorPalette;
}

/**
 * Single draggable row wrapper. Owns its own long-press + pan gestures and
 * its finger-follow `dragY`. While another row is being dragged, this row
 * reads the parent-owned `activeIndex` / `activeOffsetY` shared values to
 * compute where the dragged card is hovering and shifts by one slot to open
 * the gap; the actively-dragged row itself never shifts and floats on top.
 * The combined transform is `translateY = dragY + shift`.
 */
interface DraggableRowProps {
  index: number;
  totalCount: number;
  reorderEnabled: boolean;
  slotHeight: number;
  /** Parent-owned: index of the row being dragged, -1 when idle. */
  activeIndex: SharedValue<number>;
  /** Parent-owned: live pan translationY of the dragged row. */
  activeOffsetY: SharedValue<number>;
  onMove: (fromIndex: number, toIndex: number) => void;
  onLayout: (e: LayoutChangeEvent) => void;
  children: (isDragging: boolean) => React.ReactNode;
}

function DraggableRow({
  index,
  totalCount,
  reorderEnabled,
  slotHeight,
  activeIndex,
  activeOffsetY,
  onMove,
  onLayout,
  children,
}: DraggableRowProps) {
  // This row's own finger-follow translation (non-zero only while IT is the
  // dragged row). Siblings keep this at 0 and move via the shift term instead.
  const dragY = useSharedValue(0);
  const elevated = useSharedValue(0);
  // Mirrors the active flag so the child card (which runs its wiggle from a
  // prop) re-renders when this row's drag starts/ends.
  const [isActive, setIsActive] = useState(false);

  const finishDrag = useCallback(
    (translationY: number) => {
      if (slotHeight <= 0) return;
      const indexDelta = Math.round(translationY / slotHeight);
      const newIndex = Math.max(0, Math.min(totalCount - 1, index + indexDelta));
      if (newIndex !== index) {
        onMove(index, newIndex);
      }
    },
    [index, totalCount, slotHeight, onMove]
  );

  const longPress = Gesture.LongPress()
    .minDuration(LONG_PRESS_MS)
    .enabled(reorderEnabled)
    .onStart(() => {
      'worklet';
      elevated.value = 1;
      activeIndex.value = index;
      activeOffsetY.value = 0;
      runOnJS(setIsActive)(true);
    })
    .onFinalize(() => {
      'worklet';
      // If the pan never engaged (finger lifted right after the long-press),
      // release the elevated/active state and clear the shared drag flag.
      if (dragY.value === 0) {
        elevated.value = 0;
        activeIndex.value = -1;
        activeOffsetY.value = 0;
        runOnJS(setIsActive)(false);
      }
    });

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .enabled(reorderEnabled)
    .onUpdate((e) => {
      'worklet';
      dragY.value = e.translationY;
      activeOffsetY.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      runOnJS(finishDrag)(e.translationY);
      dragY.value = withTiming(0, { duration: 180 });
      elevated.value = 0;
      activeIndex.value = -1;
      activeOffsetY.value = 0;
      runOnJS(setIsActive)(false);
    })
    .onFinalize(() => {
      'worklet';
      // Safety net for cancelled gestures.
      dragY.value = withTiming(0, { duration: 180 });
      elevated.value = 0;
      activeIndex.value = -1;
      activeOffsetY.value = 0;
      runOnJS(setIsActive)(false);
    });

  const composed = Gesture.Simultaneous(longPress, pan);

  // Discrete shift direction for THIS row while another row is being dragged:
  // -1 = slide up to fill, +1 = slide down, 0 = stay put (idle, self, or out of
  // range). Recomputed on the UI thread whenever the drag position crosses a
  // slot boundary. Kept as a bare direction so the reaction below fires only on
  // real boundary crossings, not on every pan frame.
  const shiftDir = useDerivedValue(() => {
    const hover = getHoverIndex(
      activeIndex.value,
      activeOffsetY.value,
      slotHeight,
      totalCount
    );
    return computeReorderShift(index, activeIndex.value, hover);
  }, [index, totalCount, slotHeight]);

  // The row's animated gap offset, driven imperatively — the canonical
  // Reanimated pattern. Starting a `withTiming` inside `useAnimatedStyle`
  // instead re-issues it every frame, so the animation never settles and the
  // gap never visibly opens; here a single timing runs per boundary crossing.
  const shift = useSharedValue(0);
  useAnimatedReaction(
    () => shiftDir.value,
    (dir, prev) => {
      if (dir !== prev) {
        shift.value = withTiming(dir * slotHeight, { duration: 160 });
      }
    },
    [slotHeight]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value + shift.value }],
    zIndex: elevated.value ? 100 : 1,
    elevation: elevated.value ? 12 : 0,
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.row, animatedStyle]} onLayout={onLayout}>
        {children(isActive)}
      </Animated.View>
    </GestureDetector>
  );
}

export const RoundsTab = React.memo(function RoundsTab({
  rounds,
  isOrganizer,
  competitionId,
  playerCount,
  onAddRound,
  onScoreRound,
  onViewRound,
  onQuickScore,
  onManageScoringPairs,
  onDeleteRound,
  onReorder,
  scoringPairsStatus,
  allScoredStatus,
  colors,
}: RoundsTabProps) {
  const canSwipeDelete = isOrganizer && !!onDeleteRound;
  const canReorder = isOrganizer && !!onReorder && rounds.length > 1;

  const [forceSubmitRoundId, setForceSubmitRoundId] = useState<string | null>(null);
  const { mutate: forceFinalize, isPending: isForceSubmitting } = useForceFinalizeRound();
  const { showToast } = useToast();

  const handleForceSubmitConfirm = useCallback(() => {
    if (!forceSubmitRoundId) return;
    forceFinalize(
      { roundId: forceSubmitRoundId, competitionId },
      {
        onSuccess: () => {
          setForceSubmitRoundId(null);
          showToast({ variant: 'success', title: 'Round submitted' });
        },
        onError: (error) => {
          setForceSubmitRoundId(null);
          showToast({
            variant: 'error',
            title: 'Could not submit round',
            message: error instanceof Error
              ? error.message
              : 'Unknown error.',
          });
        },
      }
    );
  }, [forceFinalize, forceSubmitRoundId, competitionId, showToast]);

  // Per-round max points from the per-round rules (rules_override) already on
  // each round. Sub-match counts for split (pair-points) rounds need members
  // per team; competitions with pair-points rounds are two-team cups, so
  // playerCount / 2 matches the config screen's team-size figure for balanced
  // teams. Rounds without per-round points report 0 and show no badge.
  const { pointsByRound, totalPoints } = useMemo(() => {
    const membersPerTeam = Math.max(1, Math.floor(playerCount / 2));
    const { perRound, total } = summarizeCompetition(rounds, { membersPerTeam });
    return {
      pointsByRound: new Map(perRound.map((r) => [r.roundId, r.maxPoints])),
      totalPoints: total,
    };
  }, [rounds, playerCount]);

  // "4 rounds · 12 points · mixed formats" summary strip (design L167-170).
  // Falls back to the player count when no round carries per-round points.
  const formatsSummary = useMemo(() => {
    const labels = new Set(rounds.map((r) => getRoundFormatLabel(r)));
    return labels.size === 1 ? [...labels][0] : 'mixed formats';
  }, [rounds]);

  // Parent-owned drag state, shared with every DraggableRow so siblings can
  // compute where the dragged card is hovering and shift to open a gap.
  const activeIndex = useSharedValue(-1);
  const activeOffsetY = useSharedValue(0);

  // A "slot" is one card plus its bottom margin. onLayout measures the card
  // without margin, so we add spacing.md back to keep the opened gap and the
  // release drop index aligned. Lock to the first non-zero measurement so the
  // math stays stable across re-renders (the active card scales during drag).
  const [slotHeight, setSlotHeight] = useState(0);
  const handleRowLayout = useCallback((e: LayoutChangeEvent) => {
    const measured = e.nativeEvent.layout.height;
    if (measured > 0) {
      setSlotHeight((current) => (current === 0 ? measured + spacing.md : current));
    }
  }, []);

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!onReorder) return;
      const next = rounds.map((r) => r.id);
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      onReorder(next);
    },
    [rounds, onReorder]
  );

  return (
    <View>
      {rounds.length === 0 ? (
        <EmptyState
          title="No rounds yet"
          message={isOrganizer ? 'Add a round to get started with your competition.' : "The organiser hasn't added any rounds yet."}
          icon="golf"
          compact
        />
      ) : (
        <View>
          {/* Summary strip: "N rounds · X points · formats" (design L167-170) */}
          <View
            style={[
              styles.summaryStrip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            accessibilityRole="summary"
          >
            <Icon source="golf-tee" size={16} color={colors.textTertiary} />
            <Text style={[styles.summaryText, { color: colors.textSecondary }]} numberOfLines={1}>
              {rounds.length} {rounds.length === 1 ? 'round' : 'rounds'} ·{' '}
              {totalPoints > 0 ? (
                <>
                  <Text style={[styles.summaryTextBold, { color: colors.textPrimary }]}>
                    {totalPoints} points
                  </Text>
                  {' · '}
                  {formatsSummary}
                </>
              ) : (
                `${playerCount} ${playerCount === 1 ? 'player' : 'players'}`
              )}
            </Text>
          </View>

          {rounds.map((round, index) => {
            // Display number is derived from position so gaps left by deleted
            // rounds don't surface to users. The stored `round.round_number`
            // remains authoritative for IDs, ordering, and server references.
            const displayNumber = index + 1;

            const renderCard = (isDragging: boolean) => {
              const card = (
                <CompetitionRoundCard
                  round={round}
                  roundNumber={displayNumber}
                  isOrganizer={isOrganizer}
                  playerCount={playerCount}
                  onScoreRound={onScoreRound}
                  onViewRound={onViewRound}
                  onQuickScore={onQuickScore}
                  onManageScoringPairs={onManageScoringPairs}
                  hasScoringPairs={scoringPairsStatus?.[round.id]}
                  allPlayersScored={allScoredStatus?.[round.id]}
                  roundPoints={pointsByRound.get(round.id)}
                  colors={colors}
                  isDragging={isDragging}
                  canForceSubmit={
                    isOrganizer && round.status === 'in-progress' && (round.sub_match_size ?? 0) === 0
                  }
                  onForceSubmit={(id) => setForceSubmitRoundId(id)}
                />
              );

              if (!canSwipeDelete) {
                return card;
              }

              return (
                <SwipeableRow
                  onDelete={() => onDeleteRound?.(round)}
                  deleteAccessibilityLabel={`Delete round ${displayNumber}`}
                  enabled={!isDragging}
                >
                  {card}
                </SwipeableRow>
              );
            };

            return (
              <DraggableRow
                key={round.id}
                index={index}
                totalCount={rounds.length}
                reorderEnabled={canReorder}
                slotHeight={slotHeight}
                activeIndex={activeIndex}
                activeOffsetY={activeOffsetY}
                onMove={handleMove}
                onLayout={handleRowLayout}
              >
                {renderCard}
              </DraggableRow>
            );
          })}
        </View>
      )}

      {/* Add Round — dashed CTA (design L190) */}
      {isOrganizer && (
        <TouchableOpacity
          style={[styles.addRoundButton, { borderColor: colors.primaryLighter }]}
          onPress={onAddRound}
          accessibilityLabel="Add another round"
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Icon source="plus" size={18} color={colors.primary} />
          <Text style={[styles.addRoundButtonText, { color: colors.primary }]}>
            Add round · pick format & points
          </Text>
        </TouchableOpacity>
      )}

      <ForceSubmitRoundDialog
        visible={!!forceSubmitRoundId}
        roundId={forceSubmitRoundId ?? ''}
        loading={isForceSubmitting}
        onConfirm={handleForceSubmitConfirm}
        onCancel={() => setForceSubmitRoundId(null)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.md,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg + 1,
    paddingVertical: spacing.sm + 3,
    paddingHorizontal: spacing.md + 2,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  summaryText: {
    fontSize: 12.5,
    flexShrink: 1,
  },
  summaryTextBold: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  addRoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    minHeight: 48,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.xl,
  },
  addRoundButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RoundsTab;

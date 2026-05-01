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
 * only a deliberate hold engages drag. On release the new order is
 * computed from the pan offset and the surrounding cards re-layout via
 * the standard rounds-list re-render.
 */

import React, { useCallback, useState } from 'react';
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
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { ColorPalette } from '@/context/ThemeContext';
import type { RoundWithCourse } from './types';
import type { GameType } from '@/types';
import { CompetitionRoundCard } from './CompetitionRoundCard';
import { EmptyState, SwipeableRow } from '@/components/common';

/** Long-press threshold before drag activates. Short enough to feel snappy,
 *  long enough that vertical scrolls pass through to the parent ScrollView. */
const LONG_PRESS_MS = 300;

export interface RoundsTabProps {
  rounds: RoundWithCourse[];
  isOrganizer: boolean;
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
 * Single draggable row wrapper. Owns its own pan/long-press gestures and
 * the translateY shared value. Other rows are unaffected during drag —
 * they snap to their new positions when the parent re-renders after
 * `onMove` updates the ordering.
 */
interface DraggableRowProps {
  index: number;
  totalCount: number;
  reorderEnabled: boolean;
  rowHeight: number;
  onMove: (fromIndex: number, toIndex: number) => void;
  onActiveChange: (isActive: boolean) => void;
  onLayout: (e: LayoutChangeEvent) => void;
  children: (isDragging: boolean) => React.ReactNode;
}

function DraggableRow({
  index,
  totalCount,
  reorderEnabled,
  rowHeight,
  onMove,
  onActiveChange,
  onLayout,
  children,
}: DraggableRowProps) {
  const dragY = useSharedValue(0);
  const elevated = useSharedValue(0);
  // React state mirrors the active flag so child cards (which run their
  // wiggle from a prop) re-render when drag starts/ends.
  const [isActive, setIsActive] = useState(false);

  const setActiveJS = useCallback(
    (active: boolean) => {
      setIsActive(active);
      onActiveChange(active);
    },
    [onActiveChange]
  );

  const finishDrag = useCallback(
    (translationY: number) => {
      if (rowHeight <= 0) return;
      const indexDelta = Math.round(translationY / rowHeight);
      const newIndex = Math.max(
        0,
        Math.min(totalCount - 1, index + indexDelta)
      );
      if (newIndex !== index) {
        onMove(index, newIndex);
      }
    },
    [index, totalCount, rowHeight, onMove]
  );

  // LongPress fires after the hold threshold. Pan is composed simultaneously
  // and only activates after the long-press, so short vertical swipes pass
  // through to the parent ScrollView (no scroll fight).
  const longPress = Gesture.LongPress()
    .minDuration(LONG_PRESS_MS)
    .enabled(reorderEnabled)
    .onStart(() => {
      'worklet';
      elevated.value = 1;
      runOnJS(setActiveJS)(true);
    })
    .onFinalize(() => {
      'worklet';
      // Only the pan's onEnd fires the actual move; this just resets the
      // elevated state if the pan never activated (e.g. user lifted finger
      // immediately after long-press without panning).
      if (dragY.value === 0) {
        elevated.value = 0;
        runOnJS(setActiveJS)(false);
      }
    });

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .enabled(reorderEnabled)
    .onUpdate((e) => {
      'worklet';
      dragY.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      runOnJS(finishDrag)(e.translationY);
      dragY.value = withTiming(0, { duration: 180 });
      elevated.value = 0;
      runOnJS(setActiveJS)(false);
    })
    .onFinalize(() => {
      'worklet';
      // Safety net for cancelled gestures.
      dragY.value = withTiming(0, { duration: 180 });
      elevated.value = 0;
      runOnJS(setActiveJS)(false);
    });

  const composed = Gesture.Simultaneous(longPress, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
    zIndex: elevated.value ? 100 : 1,
    elevation: elevated.value ? 12 : 0,
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[styles.row, animatedStyle]}
        onLayout={onLayout}
      >
        {children(isActive)}
      </Animated.View>
    </GestureDetector>
  );
}

export const RoundsTab = React.memo(function RoundsTab({
  rounds,
  isOrganizer,
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

  // Track the height of a row so the drag can map translationY back to an
  // index delta. Cards are roughly the same height; we measure the first
  // one to land. Includes the bottom margin so each "step" in the drag is
  // exactly one row.
  const [rowHeight, setRowHeight] = useState(0);
  const handleRowLayout = useCallback((e: LayoutChangeEvent) => {
    const measured = e.nativeEvent.layout.height;
    if (measured > 0) {
      setRowHeight((current) =>
        // Lock to the first non-zero measurement to keep drag math stable
        // across re-renders (cards can shrink during drag for the active row).
        current === 0 ? measured : current
      );
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

  const handleActiveChange = useCallback(() => {
    // Hook left in place for future polish (e.g. dimming non-active rows).
    // Currently a no-op; per-row wiggle is driven by the render-prop arg.
  }, []);

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
                  colors={colors}
                  isDragging={isDragging}
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
                rowHeight={rowHeight}
                onMove={handleMove}
                onActiveChange={handleActiveChange}
                onLayout={handleRowLayout}
              >
                {renderCard}
              </DraggableRow>
            );
          })}
        </View>
      )}

      {/* Add Round Button */}
      {isOrganizer && (
        <TouchableOpacity
          style={[styles.addRoundButton, { borderColor: colors.primary }]}
          onPress={onAddRound}
          accessibilityLabel="Add another round"
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Icon source="plus" size={20} color={colors.primary} />
          <Text style={[styles.addRoundButtonText, { color: colors.primary }]}>Add another round</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.md,
  },
  addRoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
  },
  addRoundButtonText: {
    ...typography.bodyBold,
  },
});

export default RoundsTab;

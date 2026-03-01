/**
 * BracketStagePager - Horizontal paging through bracket stages
 *
 * Uses FlatList with pagingEnabled for swipeable stage navigation.
 */

import React, { useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { spacing } from '@/constants/theme';
import { BracketStageView } from './BracketStageView';
import type { BracketStage, KnockoutMatchWithPlayers } from '@/types/database';

export interface BracketStagePagerProps {
  stages: BracketStage[];
  activeStageIndex: number;
  onStageChange: (index: number) => void;
  currentUserId?: string;
  onMatchPress?: (match: KnockoutMatchWithPlayers) => void;
}

export const BracketStagePager = React.memo(function BracketStagePager({
  stages,
  activeStageIndex,
  onStageChange,
  currentUserId,
  onMatchPress,
}: BracketStagePagerProps) {
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const pageWidth = width - spacing.lg * 2;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      if (viewableItems.length > 0) {
        const index = viewableItems[0].index;
        if (index != null) {
          onStageChange(index);
        }
      }
    },
    [onStageChange]
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderStage = useCallback(
    ({ item }: { item: BracketStage }) => (
      <View style={{ width: pageWidth }}>
        <BracketStageView
          stage={item}
          currentUserId={currentUserId}
          onMatchPress={onMatchPress}
        />
      </View>
    ),
    [pageWidth, currentUserId, onMatchPress]
  );

  // Scroll to active stage when it changes externally (from indicator press)
  React.useEffect(() => {
    if (flatListRef.current && stages.length > 0) {
      flatListRef.current.scrollToIndex({
        index: Math.min(activeStageIndex, stages.length - 1),
        animated: true,
      });
    }
  }, [activeStageIndex, stages.length]);

  if (stages.length === 0) return null;

  return (
    <FlatList
      ref={flatListRef}
      data={stages}
      renderItem={renderStage}
      keyExtractor={(item) => `${item.stage}`}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      snapToInterval={pageWidth}
      decelerationRate="fast"
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      getItemLayout={(_data, index) => ({
        length: pageWidth,
        offset: pageWidth * index,
        index,
      })}
      style={styles.pager}
      contentContainerStyle={styles.pagerContent}
    />
  );
});

const styles = StyleSheet.create({
  pager: {
    flex: 1,
  },
  pagerContent: {
    // No extra padding — each page fills exactly pageWidth
  },
});

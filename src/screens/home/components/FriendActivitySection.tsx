/**
 * FriendActivitySection - Home preview of the friends' activity feed.
 *
 * Self-contained. Shows TODAY's friend activity; if nothing happened today,
 * falls back to the single most recent card (any day). When there are 2+
 * items it renders a swipeable carousel (snap paging, a peek of the next
 * card, position dots); a single item renders as one hero card. Renders
 * nothing while loading, on error, or when there is no activity.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, layout } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useHomeActivityPreview } from '@/hooks/activity';
import type { HomeActivityPreviewCard } from '@/hooks/activity';
import { HomeActivityHeroCard } from './HomeActivityHeroCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PEEK = 22;
const GAP = spacing.sm;

function isSameLocalDay(iso: string | null | undefined, now: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export const FriendActivitySection = React.memo(function FriendActivitySection() {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const { data, isLoading, isError } = useHomeActivityPreview(8);
  const [activeIndex, setActiveIndex] = useState(0);

  const openRound = useCallback(
    (roundId: string) => navigation.navigate('RoundActivity', { roundId }),
    [navigation]
  );

  // Today's activity, or the single most recent card when there's none today.
  const { items, isToday } = useMemo(() => {
    const cards = data ?? [];
    const now = new Date();
    const todays = cards.filter((c) => isSameLocalDay(c.activity_at, now));
    if (todays.length > 0) return { items: todays, isToday: true };
    return { items: cards.slice(0, 1), isToday: false };
  }, [data]);

  const containerWidth = width - layout.screenPadding * 2;
  const itemWidth = containerWidth - PEEK;
  const snapInterval = itemWidth + GAP;

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
      setActiveIndex(Math.max(0, Math.min(idx, items.length - 1)));
    },
    [snapInterval, items.length]
  );

  const renderItem = useCallback(
    ({ item }: { item: HomeActivityPreviewCard }) => (
      <View style={{ width: itemWidth }}>
        <HomeActivityHeroCard card={item} onPress={openRound} />
      </View>
    ),
    [itemWidth, openRound]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: itemWidth,
      offset: snapInterval * index,
      index,
    }),
    [itemWidth, snapInterval]
  );

  if (isLoading || isError || items.length === 0) return null;

  const isCarousel = items.length > 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>From your friends</Text>
          {isToday && items.length > 1 ? (
            <View style={[styles.dayPill, { backgroundColor: colors.primaryLighter }]}>
              <Text style={[styles.dayPillText, { color: colors.primary }]}>
                {items.length} today
              </Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Activity')}
          accessibilityRole="link"
          accessibilityLabel="See all activity"
        >
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
        </TouchableOpacity>
      </View>

      {isCarousel ? (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.round_id}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={snapInterval}
            snapToAlignment="start"
            decelerationRate="fast"
            onMomentumScrollEnd={handleScrollEnd}
            ItemSeparatorComponent={ItemSeparator}
            contentContainerStyle={styles.trackPadding}
          />
          <View style={styles.dots}>
            {items.map((item, idx) => (
              <View
                key={item.round_id}
                style={[
                  styles.dot,
                  { backgroundColor: colors.border },
                  idx === activeIndex && [styles.dotActive, { backgroundColor: colors.primary }],
                ]}
              />
            ))}
          </View>
        </>
      ) : (
        <HomeActivityHeroCard card={items[0]} onPress={openRound} />
      )}
    </View>
  );
});

function ItemSeparator() {
  return <View style={{ width: GAP }} />;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    ...typography.h4,
  },
  dayPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  dayPillText: {
    ...typography.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: 10,
  },
  seeAll: {
    ...typography.small,
    fontWeight: '600',
  },
  trackPadding: {
    paddingRight: PEEK,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 16,
    borderRadius: 999,
  },
});

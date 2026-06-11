/**
 * ActivityScreen - the full friends' activity feed.
 *
 * Infinite, keyset-paginated list of completed rounds where the viewer or a
 * friend submitted a scorecard. Pull-to-refresh + infinite scroll.
 */

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useThemeColors } from '@/context/ThemeContext';
import { spacing, layout } from '@/constants/theme';
import { PageHeader, EmptyState, ErrorState, LoadingSpinner } from '@/components/common';
import { ActivityRoundCard } from '@/components/activity';
import { useActivityFeed } from '@/hooks/activity';
import type { ActivityFeedCard } from '@/hooks/activity';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ActivityScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useActivityFeed();

  const cards = useMemo<ActivityFeedCard[]>(() => data?.pages.flat() ?? [], [data]);

  const openRound = useCallback(
    (roundId: string) => navigation.navigate('RoundActivity', { roundId }),
    [navigation]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ActivityFeedCard }) => (
      <ActivityRoundCard card={item} onOpen={openRound} />
    ),
    [openRound]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader variant="centered" title="Activity" />

      {isLoading ? (
        <View style={styles.centered}>
          <LoadingSpinner size="lg" />
        </View>
      ) : isError ? (
        <ErrorState
          error={error ?? 'Could not load activity.'}
          onRetry={() => refetch()}
        />
      ) : cards.length === 0 ? (
        <EmptyState
          icon="golf"
          title="No activity yet"
          message="When you or your friends finish a round, it'll show up here. Add friends to see their rounds."
        />
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.round_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.textPrimary}
              colors={[colors.textPrimary]}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={styles.footerLoader} color={colors.primary} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
  },
});

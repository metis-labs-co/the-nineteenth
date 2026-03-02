/**
 * GameResultsScreen - Side game results overview
 *
 * Shows the user's overall net results from Skins and Wolf
 * side-games with combined and filterable history.
 * Uses App Store safe terminology throughout.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { useGameResults } from '@/hooks/useGameResults';
import type { GameTypeFilter as GameTypeFilterValue, CombinedGameHistoryEntry } from '@/hooks/useGameResults';
import { GameResultsSummary, GameHistoryRow, GameTypeFilter } from './components';

export default function GameResultsScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { summary, combinedHistory, isLoading, refetch } = useGameResults();

  const [filter, setFilter] = useState<GameTypeFilterValue>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter history based on selected tab
  const filteredHistory = useMemo(() => {
    if (filter === 'all') return combinedHistory;
    return combinedHistory.filter((entry) => entry.gameType === filter);
  }, [combinedHistory, filter]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: CombinedGameHistoryEntry }) => (
      <GameHistoryRow entry={item} />
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: CombinedGameHistoryEntry) => `${item.gameType}-${item.id}`,
    []
  );

  const ListHeader = useMemo(
    () => (
      <>
        <GameResultsSummary summary={summary} />
        <GameTypeFilter value={filter} onChange={setFilter} />
      </>
    ),
    [summary, filter]
  );

  const ListEmpty = useMemo(() => {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="cash-multiple"
        title="No Game Results Yet"
        message="Complete a Skins or Wolf game to see your results here."
        compact
      />
    );
  }, [isLoading]);

  if (isLoading && combinedHistory.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Game Results"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Game Results"
        showBack
        onBack={() => navigation.goBack()}
      />
      <FlatList
        data={filteredHistory}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
});

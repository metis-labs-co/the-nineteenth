/**
 * HandicapHistoryScreen - Display player's handicap history and index
 *
 * Shows the calculated Social Handicap Index and the last 20 rounds
 * with their differentials. Qualifying rounds (best X of 20) are
 * highlighted with a checkmark and colored border.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { useHandicapHistory } from '@/hooks/useHandicapHistory';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import type { HandicapRound } from '@/types';

import {
  HandicapIndexCard,
  HandicapRoundRow,
  EmptyHandicapState,
} from './components';

// =====================================================
// TYPES
// =====================================================

type Props = NativeStackScreenProps<RootStackParamList, 'HandicapHistory'>;

// =====================================================
// COMPONENT
// =====================================================

export default function HandicapHistoryScreen({ navigation }: Props) {
  const { user } = useAuth();
  const colors = useThemeColors();
  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useHandicapHistory(user?.id);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderRound = useCallback(
    ({ item }: { item: HandicapRound }) => <HandicapRoundRow round={item} />,
    []
  );

  const keyExtractor = useCallback(
    (item: HandicapRound) => item.scorecardId,
    []
  );

  const ListHeader = useCallback(() => {
    if (!summary) return null;

    return (
      <View>
        {/* Handicap Index Card */}
        <HandicapIndexCard
          handicapIndex={summary.handicapIndex}
          totalRounds={summary.totalRounds}
          qualifyingCount={summary.qualifyingRoundsCount}
        />

        {/* Section Header */}
        {summary.rounds.length > 0 && (
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            Round History ({summary.totalRounds} rounds)
          </Text>
        )}
      </View>
    );
  }, [summary, colors.textSecondary]);

  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Handicap History" showBack onBack={handleGoBack} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // Render error state
  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Handicap History" showBack onBack={handleGoBack} />
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error?.message || 'Failed to load handicap history'}
          </Text>
          <Text
            style={[styles.retryText, { color: colors.primary }]}
            onPress={handleRefresh}
          >
            Tap to retry
          </Text>
        </View>
      </View>
    );
  }

  // Render empty state
  if (!summary || summary.totalRounds === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Handicap History" showBack onBack={handleGoBack} />
        <EmptyHandicapState />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Handicap History"
        showBack
        onBack={handleGoBack}
        rightActions={[
          {
            icon: 'refresh',
            onPress: handleRefresh,
            accessibilityLabel: 'Refresh handicap history',
          },
        ]}
      />

      <FlatList
        data={summary.rounds}
        renderItem={renderRound}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
      />
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.massive,
  },
  sectionHeader: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryText: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
});

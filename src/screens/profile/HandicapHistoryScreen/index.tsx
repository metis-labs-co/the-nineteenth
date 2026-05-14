/**
 * HandicapHistoryScreen - Display player's handicap history and index
 *
 * Shows the calculated Social Handicap Index and the last 20 rounds
 * with their differentials. Qualifying rounds (best X of 20) are
 * highlighted with a checkmark and colored border.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { useHandicapHistory } from '@/hooks/useHandicapHistory';
import {
  useCombineHandicapRounds,
  useUncombineHandicapRound,
} from '@/hooks/player';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState, LoadingSpinner } from '@/components/common';
import { FeatureLock } from '@/components/subscription';
import type { HandicapRound, CombinableNinePair } from '@/types';

import {
  HandicapIndexCard,
  HandicapRoundRow,
  EmptyHandicapState,
  CombinablePairsSection,
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
  const combineMutation = useCombineHandicapRounds();
  const uncombineMutation = useUncombineHandicapRound();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCombine = useCallback(
    (pair: CombinableNinePair) => {
      if (!user?.id) return;
      combineMutation.mutate(
        {
          frontScorecardId: pair.front.scorecardId,
          backScorecardId: pair.back.scorecardId,
          playerId: user.id,
        },
        {
          onError: (err) => {
            Alert.alert(
              "Couldn't combine rounds",
              err instanceof Error ? err.message : 'Something went wrong.',
            );
          },
        },
      );
    },
    [combineMutation, user?.id],
  );

  const handleUncombine = useCallback(
    (round: HandicapRound) => {
      if (!user?.id || !round.isCombined) return;
      uncombineMutation.mutate(
        { combinedRoundId: round.scorecardId, playerId: user.id },
        {
          onError: (err) => {
            Alert.alert(
              "Couldn't unlink round",
              err instanceof Error ? err.message : 'Something went wrong.',
            );
          },
        },
      );
    },
    [uncombineMutation, user?.id],
  );

  const renderRound = useCallback(
    ({ item }: { item: HandicapRound }) => (
      <HandicapRoundRow
        round={item}
        onUncombine={item.isCombined ? handleUncombine : undefined}
        isUncombining={uncombineMutation.isPending}
      />
    ),
    [handleUncombine, uncombineMutation.isPending],
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

        {/* Combinable 9-hole pairs (if any) */}
        {user?.id && summary.combinablePairs.length > 0 && (
          <CombinablePairsSection
            pairs={summary.combinablePairs}
            playerId={user.id}
            isCombining={combineMutation.isPending}
            onCombine={handleCombine}
          />
        )}

        {/* Section Header */}
        {summary.rounds.length > 0 && (
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            Round History ({summary.totalRounds} rounds)
          </Text>
        )}
      </View>
    );
  }, [
    summary,
    user?.id,
    combineMutation.isPending,
    handleCombine,
    colors.textSecondary,
  ]);

  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Handicap History" showBack onBack={handleGoBack} />
        <LoadingSpinner size="lg" />
      </View>
    );
  }

  // Render error state
  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Handicap History" showBack onBack={handleGoBack} />
        <ErrorState
          error={error instanceof Error ? error.message : 'Failed to load handicap history'}
          onRetry={handleRefresh}
          title="Failed to load handicap history"
        />
      </View>
    );
  }

  // Render empty state only when there are no rounds AND no pairs to combine
  if (
    !summary ||
    (summary.totalRounds === 0 && summary.combinablePairs.length === 0)
  ) {
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

      <FeatureLock feature="handicap_history" onUpgradePress={() => navigation.navigate('Subscription')}>
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
      </FeatureLock>
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
});

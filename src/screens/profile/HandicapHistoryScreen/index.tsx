/**
 * HandicapHistoryScreen - Display player's handicap history and index
 *
 * Shows the calculated Social Handicap and the last 20 rounds
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
import type { HandicapRoundLink } from '@/types/handicap.types';

import {
  HandicapIndexCard,
  HandicapTrendChart,
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

  const openScorecard = useCallback(
    (link: HandicapRoundLink) => {
      navigation.navigate('ViewRound', {
        roundId: link.roundId,
        competitionId: link.competitionId ?? undefined,
        initialTab: 'scorecard',
      });
    },
    [navigation],
  );

  const handleRoundPress = useCallback(
    (round: HandicapRound) => {
      if (!round.isCombined) {
        openScorecard({ roundId: round.roundId, competitionId: round.competitionId ?? null });
        return;
      }
      // A combined entry is two 9-hole rounds: let the player pick which card.
      const front = round.combinedFrontRound;
      const back = round.combinedBackRound;
      if (!front || !back) return;
      Alert.alert('Open scorecard', 'This entry combines two 9-hole rounds.', [
        { text: 'Front 9', onPress: () => openScorecard(front) },
        { text: 'Back 9', onPress: () => openScorecard(back) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [openScorecard],
  );

  const renderRound = useCallback(
    ({ item }: { item: HandicapRound }) => (
      <HandicapRoundRow
        round={item}
        onPress={handleRoundPress}
        onUncombine={item.isCombined ? handleUncombine : undefined}
        isUncombining={uncombineMutation.isPending}
      />
    ),
    [handleRoundPress, handleUncombine, uncombineMutation.isPending],
  );

  const keyExtractor = useCallback(
    (item: HandicapRound) => item.scorecardId,
    []
  );

  const ListHeader = useCallback(() => {
    if (!summary) return null;

    return (
      <View>
        {/* Differential trend chart */}
        {summary.rounds.length > 0 && (
          <HandicapTrendChart rounds={summary.rounds} onRoundPress={handleRoundPress} />
        )}

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
    handleRoundPress,
    colors.textSecondary,
  ]);

  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Social Handicap" showBack onBack={handleGoBack} />
        <LoadingSpinner size="lg" />
      </View>
    );
  }

  // Render error state
  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Social Handicap" showBack onBack={handleGoBack} />
        <ErrorState
          error={error instanceof Error ? error.message : 'Failed to load your Social Handicap'}
          onRetry={handleRefresh}
          title="Failed to load your Social Handicap"
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
        <PageHeader title="Social Handicap" showBack onBack={handleGoBack} />
        <EmptyHandicapState />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Social Handicap"
        showBack
        onBack={handleGoBack}
        rightActions={[
          {
            icon: 'refresh',
            onPress: handleRefresh,
            accessibilityLabel: 'Refresh Social Handicap',
          },
        ]}
      />

      {/* Current Social Handicap — available on all tiers. The index is
          calculated from app rounds regardless of subscription; only the deeper
          round-by-round history, trend chart and combinable pairs are gated. */}
      <View style={styles.indexCardWrapper}>
        <HandicapIndexCard
          handicapIndex={summary.handicapIndex}
          totalRounds={summary.totalRounds}
          qualifyingCount={summary.qualifyingRoundsCount}
        />
      </View>

      {/* Round history, trend chart & combinable pairs — Social tier and above */}
      <FeatureLock
        feature="handicap_history"
        onUpgradePress={() => navigation.navigate('Subscription')}
        style={styles.lockedFill}
      >
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
  indexCardWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  // Bounds the lock wrapper to the viewport; without it the wrapper grows to
  // the list's full scroll height and the upgrade overlay centres off-screen.
  lockedFill: {
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

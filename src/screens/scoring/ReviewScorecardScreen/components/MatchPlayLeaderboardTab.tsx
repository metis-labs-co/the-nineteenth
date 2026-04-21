/**
 * MatchPlayLeaderboardTab - Team match play leaderboard tab content
 *
 * Renders `MatchPlayLeaderboard` (card-based matchup view with team aggregate
 * header and per-matchup status badges) for the Review Scorecard screen.
 */

import React from 'react';
import { StyleSheet, ScrollView, RefreshControl, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { MatchPlayLeaderboard } from '@/components/leaderboard/MatchPlayLeaderboard';
import { useRoundLeaderboard } from '@/hooks/rounds';

interface MatchPlayLeaderboardTabProps {
  roundId: string | undefined;
  currentUserId: string | undefined;
  roundStatus?: string;
  isTeamRound: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

export function MatchPlayLeaderboardTab({
  roundId,
  currentUserId,
  roundStatus = 'in-progress',
  isTeamRound,
  isRefreshing,
  onRefresh,
  bottomInset,
}: MatchPlayLeaderboardTabProps) {
  const colors = useThemeColors();
  const { data, isLoading, refetch } = useRoundLeaderboard(roundId ?? '', {
    enabled: !!roundId,
  });

  const handleRefresh = React.useCallback(() => {
    onRefresh();
    refetch();
  }, [onRefresh, refetch]);

  const entries = data?.entries ?? [];
  const hasEntries = entries.length > 0;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing || isLoading}
          onRefresh={handleRefresh}
          tintColor={colors.textPrimary}
          colors={[colors.textPrimary]}
        />
      }
      showsVerticalScrollIndicator={true}
    >
      {hasEntries ? (
        <MatchPlayLeaderboard
          entries={entries}
          currentUserId={currentUserId}
          roundStatus={roundStatus}
          isTeamRound={isTeamRound}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {isLoading ? 'Loading match results…' : 'No match data yet.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
});

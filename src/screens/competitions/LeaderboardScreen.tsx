/**
 * LeaderboardScreen - Display competition leaderboard
 *
 * Features:
 * - Full leaderboard table with all players
 * - Pull-to-refresh to reload from Supabase
 * - Uses reusable LeaderboardTable component
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Text } from 'react-native-paper';
import { ErrorState } from '@/components/common';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useCompetitionLeaderboard } from '@/hooks/useCompetitionLeaderboard';
import type { LeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import { LeaderboardTable } from '@/components/leaderboard';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

export default function LeaderboardScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { competitionId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const {
    data: competitionLeaderboard,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCompetitionLeaderboard(competitionId, { filter: 'individuals' });

  // Transform to legacy LeaderboardEntry format for LeaderboardTable
  const leaderboard: LeaderboardEntry[] | undefined = competitionLeaderboard?.map((entry) => ({
    playerId: entry.participantId,
    playerName: entry.participantName,
    handicap: entry.handicap ?? 0,
    totalPoints: entry.totalPoints,
    roundsPlayed: entry.roundsPlayed,
  }));

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Render error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Leaderboard"
          variant="centered"
          showBack
          onBack={handleGoBack}
        />
        <ErrorState
          error={error instanceof Error ? error : 'An error occurred'}
          title="Unable to load leaderboard"
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Leaderboard"
        variant="centered"
        showBack
        onBack={handleGoBack}
      />

      {/* Leaderboard Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <LeaderboardTable
          leaderboard={leaderboard || []}
          currentUserId={user?.id}
          isLoading={isLoading}
          showTiedIndicator={true}
          testID="leaderboard-table"
        />

        {/* Last Updated */}
        {leaderboard && leaderboard.length > 0 && (
          <View style={styles.lastUpdated}>
            <Text style={[styles.lastUpdatedText, { color: colors.textDisabled }]}>Pull down to refresh</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },

  // Last Updated
  lastUpdated: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  lastUpdatedText: {
    ...typography.caption,
  },

});

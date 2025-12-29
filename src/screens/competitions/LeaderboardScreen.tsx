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
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text } from 'react-native-paper';
// LoadingSpinner import removed as it's not used (LeaderboardTable handles loading state)
import { IconAlertTriangle } from '@tabler/icons-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import { LeaderboardTable } from '@/components/leaderboard';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

export default function LeaderboardScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { competitionId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const {
    data: leaderboard,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useLeaderboard(competitionId);

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
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconContainer, { backgroundColor: colors.errorLight }]}>
            <IconAlertTriangle size={48} color={colors.error} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Unable to load leaderboard</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error instanceof Error ? error.message : 'An error occurred'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={handleRefresh}
            accessibilityRole="button"
            accessibilityLabel="Retry loading leaderboard"
          >
            <Text style={[styles.retryButtonText, { color: colors.white }]}>Retry</Text>
          </TouchableOpacity>
        </View>
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

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: {
    ...typography.bodyBold,
  },
});

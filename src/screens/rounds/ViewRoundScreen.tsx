/**
 * ViewRoundScreen - View a round (standalone or competition)
 *
 * @description
 * Displays round details with tabs:
 * - Details: Course info, tee time, match type, progress
 * - Scorecard: Read-only scorecard grid showing all players' scores
 *
 * Commented out tabs (for future use):
 * - Players: Player list with scores (Stableford points, birdies, pars, bogeys)
 * - Leaderboard: Round leaderboard
 *
 * Works for both standalone rounds (practice rounds) and competition rounds.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, TouchableOpacity } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useRoundDetails, useRoundScorecards, useRoundPlayers } from '@/hooks/useRoundDetails';
import { useDeleteRound } from '@/hooks/useDeleteRound';
import { competitionKeys } from '@/hooks/queryKeys';
import { supabase } from '@/services/supabase/client';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import {
  RoundDetailsTab,
  RoundScorecardTab,
  // Commented out for trial - keeping for potential future use
  // RoundPlayersTab,
  // RoundLeaderboardTab,
} from '@/components/rounds/ViewRound';

type Props = NativeStackScreenProps<RootStackParamList, 'ViewRound'>;

// =====================================================
// TYPES & CONSTANTS
// =====================================================

type TabKey = 'details' | 'scorecard';
// Commented out for trial - keeping for potential future use
// type TabKey = 'details' | 'players' | 'leaderboard';

const TABS: TabItem<TabKey>[] = [
  { key: 'details', label: 'Details' },
  { key: 'scorecard', label: 'Scorecard' },
  // Commented out for trial - keeping for potential future use
  // { key: 'players', label: 'Players' },
  // { key: 'leaderboard', label: 'Leaderboard' },
];

// =====================================================
// HOOKS
// =====================================================

interface CompetitionInfo {
  name: string;
  organizer_id: string;
}

/**
 * Fetch competition info for display in header and organizer check
 */
function useCompetitionInfo(competitionId: string | undefined) {
  return useQuery({
    queryKey: [...competitionKeys.detail(competitionId || ''), 'info'],
    queryFn: async (): Promise<CompetitionInfo | null> => {
      if (!competitionId) return null;
      const { data, error } = await supabase
        .from('competitions')
        .select('name, organizer_id')
        .eq('id', competitionId)
        .single();

      if (error) throw error;
      return data as CompetitionInfo | null;
    },
    enabled: !!competitionId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ViewRoundScreen({ route, navigation }: Props) {
  const { roundId, competitionId } = route.params;
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { user } = useAuth();
  const colors = useThemeColors();
  const isPremium = useIsPremium();

  // Delete mutation
  const { mutate: deleteRound, isPending: isDeleting } = useDeleteRound();

  // Determine if this is a standalone round
  const isStandalone = !competitionId;

  // Fetch competition info for header subtitle and organizer check
  const { data: competitionInfo } = useCompetitionInfo(competitionId);

  // Data fetching
  const {
    data: round,
    isLoading: isLoadingRound,
    error: roundError,
    refetch: refetchRound,
    isRefetching: isRefetchingRound,
  } = useRoundDetails(roundId);

  const {
    data: scorecards,
    isLoading: isLoadingScorecards,
    refetch: refetchScorecards,
    isRefetching: isRefetchingScorecards,
  } = useRoundScorecards(roundId);

  const {
    data: roundPlayers,
    isLoading: isLoadingPlayers,
    refetch: refetchPlayers,
    isRefetching: isRefetchingPlayers,
  } = useRoundPlayers(roundId);

  const isLoading = isLoadingRound || isLoadingScorecards || isLoadingPlayers;
  const isRefreshing = isRefetchingRound || isRefetchingScorecards || isRefetchingPlayers;

  // Check if current user is playing in this round
  // For standalone rounds, the user who created it is always playing
  const isUserPlaying = useMemo(() => {
    if (!user?.id) return false;

    // For standalone rounds, check if user is the round owner
    if (isStandalone && round?.user_id === user.id) {
      return true;
    }

    // Check scorecards for player participation
    if (scorecards) {
      return scorecards.some((sc) => sc.player_id === user.id);
    }

    return false;
  }, [user?.id, scorecards, isStandalone, round?.user_id]);

  // Check if current user is the organizer of the competition (or owner of standalone round)
  const isOrganizer = useMemo(() => {
    if (!user?.id) return false;

    // For standalone rounds, the user who created it is the organizer
    if (isStandalone && round?.user_id === user.id) {
      return true;
    }

    // For competition rounds, check if user is the competition organizer
    if (competitionInfo?.organizer_id === user.id) {
      return true;
    }

    return false;
  }, [user?.id, isStandalone, round?.user_id, competitionInfo?.organizer_id]);

  // Check if user can delete this round
  // - Practice rounds: Only the creator can delete
  // - Competition rounds: Only the organizer can delete, and only if status is 'upcoming'
  const canDelete = useMemo(() => {
    if (!user?.id || !round) return false;

    // For standalone/practice rounds, the creator can always delete
    if (isStandalone && round.user_id === user.id) {
      return true;
    }

    // For competition rounds, check if user is the organizer AND round hasn't started
    if (!isStandalone && competitionInfo?.organizer_id === user.id) {
      // Only allow deletion if the round status is 'upcoming' (not started)
      return round.status === 'upcoming';
    }

    return false;
  }, [user?.id, round, isStandalone, competitionInfo?.organizer_id]);

  // Navigation handlers
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleScoreRound = useCallback(() => {
    navigation.navigate('Scorecard', {
      roundId,
      competitionId: competitionId || 'standalone',
    });
  }, [navigation, roundId, competitionId]);

  const handleEditRound = useCallback(() => {
    navigation.navigate('EditRound', {
      roundId,
      competitionId,
    });
  }, [navigation, roundId, competitionId]);

  // Delete handlers
  const handleDeletePress = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    deleteRound(
      { roundId, competitionId },
      {
        onSuccess: () => {
          setShowDeleteDialog(false);
          navigation.goBack();
        },
        onError: (error) => {
          setShowDeleteDialog(false);
          console.error('[ViewRoundScreen] Delete failed:', error);
        },
      }
    );
  }, [deleteRound, roundId, competitionId, navigation]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    refetchRound();
    refetchScorecards();
    refetchPlayers();
  }, [refetchRound, refetchScorecards, refetchPlayers]);

  // Get header title
  const getHeaderTitle = () => {
    if (isStandalone) {
      return 'Practice Round';
    }
    return `Round ${round?.round_number || ''}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Round"
          variant="centered"
          showBack
          onBack={handleBack}
        />
        <LoadingSpinner size="lg" message="Loading round..." />
      </View>
    );
  }

  // Error state
  if (roundError || !round) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Round"
          variant="centered"
          showBack
          onBack={handleBack}
        />
        <ErrorState
          title="Unable to load round"
          error={roundError?.message || 'Round not found'}
          onRetry={refetchRound}
        />
      </View>
    );
  }

  // Get delete dialog message based on round type
  const getDeleteMessage = () => {
    if (isStandalone) {
      return 'Are you sure you want to delete this practice round? All scores and data will be permanently removed.';
    }
    return 'Are you sure you want to delete this round? All pairings, scores, and data will be permanently removed.';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader
        title={getHeaderTitle()}
        subtitle={competitionInfo?.name || undefined}
        variant="centered"
        showBack
        onBack={handleBack}
        rightActions={
          canDelete
            ? [
                {
                  icon: 'delete-outline',
                  onPress: handleDeletePress,
                  accessibilityLabel: 'Delete round',
                  color: colors.error,
                },
              ]
            : undefined
        }
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={showDeleteDialog}
        title="Delete Round"
        message={getDeleteMessage()}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={isDeleting}
        icon="delete-outline"
      />

      {/* Score Round Button */}
      {isUserPlaying && round.status !== 'completed' && (
        <View style={[styles.scoreButtonContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.scoreButton, { backgroundColor: colors.primary }]}
            onPress={handleScoreRound}
            activeOpacity={0.8}
            accessibilityLabel="Score this round"
            accessibilityRole="button"
          >
            <Icon source="golf" size={20} color={colors.textInverse} />
            <Text style={[styles.scoreButtonText, { color: colors.textInverse }]}>
              {round.status === 'in-progress' ? 'Continue Scoring' : 'Score Round'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Bar */}
      <Tabs<TabKey>
        tabs={TABS}
        selectedTab={activeTab}
        onTabChange={setActiveTab}
        style={styles.tabs}
      />

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'details' && (
          <RoundDetailsTab
            round={round}
            isOrganizer={isOrganizer}
            isPremium={isPremium}
            onEditPress={handleEditRound}
          />
        )}
        {activeTab === 'scorecard' && (
          <RoundScorecardTab
            scorecards={scorecards || []}
            roundPlayers={roundPlayers || []}
            holes={round.course?.holes || null}
          />
        )}
        {/* Commented out for trial - keeping for potential future use */}
        {/* {activeTab === 'players' && (
          <RoundPlayersTab
            scorecards={scorecards || []}
            holes={round.course?.holes || null}
          />
        )}
        {activeTab === 'leaderboard' && (
          <RoundLeaderboardTab scorecards={scorecards || []} />
        )} */}
      </ScrollView>
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

  // Score Button
  scoreButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 48,
    gap: spacing.sm,
    ...shadows.sm,
  },
  scoreButtonText: {
    ...typography.bodyBold,
  },

  // Tabs
  tabs: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
});

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
import { StyleSheet, ScrollView, RefreshControl, View, TouchableOpacity, Alert } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useRoundDetails, useRoundScorecards, useRoundPlayers } from '@/hooks/useRoundDetails';
import { useDeleteRound } from '@/hooks/useDeleteRound';
import { competitionKeys, roundKeys } from '@/hooks/queryKeys';
import { supabase } from '@/services/supabase/client';
import type { CourseWithFavorite } from '@/hooks/useCourses';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, borderRadius, shadows, typography, skinsColor } from '@/constants/theme';
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
import { ScoringPairsConfigBottomSheet } from '@/components/rounds/ViewRound/RoundDetailsTab/components';
import { SkinsConfigBottomSheet } from '@/components/skins';
import { MatchPlayLeaderboard } from '@/components/leaderboard/MatchPlayLeaderboard';
import { useRoundLeaderboard } from '@/hooks/useRoundLeaderboard';
import { useSkinsGamesByRound, useCreateSkinsGame, useSkinsResults } from '@/hooks/useSkins';
import { CourseSelectionModal } from '../admin/AddRoundScreen/components';
import { SkinsResultsCard } from '@/components/skins';
import type { SkinsConfig } from '@/types/database/skins.types';

type Props = NativeStackScreenProps<RootStackParamList, 'ViewRound'>;

// =====================================================
// TYPES & CONSTANTS
// =====================================================

type TabKey = 'details' | 'scorecard' | 'match' | 'skins';
// Commented out for trial - keeping for potential future use
// type TabKey = 'details' | 'players' | 'leaderboard';

const BASE_TABS: TabItem<TabKey>[] = [
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
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [showScoringPairsSheet, setShowScoringPairsSheet] = useState(false);
  const [showSkinsConfigSheet, setShowSkinsConfigSheet] = useState(false);
  const { user } = useAuth();
  const colors = useThemeColors();
  const isPremium = useIsPremium();
  const queryClient = useQueryClient();

  // Delete mutation
  const { mutate: deleteRound, isPending: isDeleting } = useDeleteRound();

  // Update course mutation
  const { mutate: updateCourse } = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from('rounds')
        .update({ course_id: courseId })
        .eq('id', roundId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate round queries to refresh data
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
    },
    onError: (error) => {
      console.error('[ViewRoundScreen] Failed to update course:', error);
    },
  });

  // Skins game mutations
  const { mutate: updateSkinsGame } = useMutation({
    mutationFn: async ({ gameId, updates }: { gameId: string; updates: Partial<SkinsConfig> }) => {
      const { error } = await supabase
        .from('skins_games')
        .update(updates)
        .eq('id', gameId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skinsGames', roundId] });
    },
  });
  const { mutate: createSkinsGame } = useCreateSkinsGame();

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

  // Check if this is an individual match play round (not team match play)
  const isMatchPlayRound = round?.game_type === 'match-play' && !round?.is_team_round;

  // Check if this is a team match play round
  const isTeamMatchPlayRound = round?.game_type === 'match-play' && round?.is_team_round;

  // Fetch match play leaderboard data (for both individual and team match play rounds)
  const {
    data: matchPlayData,
    isLoading: isLoadingMatchPlay,
    refetch: refetchMatchPlay,
    isRefetching: isRefetchingMatchPlay,
  } = useRoundLeaderboard(roundId, { enabled: isMatchPlayRound || isTeamMatchPlayRound });

  // Fetch skins games for this round (to determine if it's a skins match)
  const { data: skinsGames } = useSkinsGamesByRound(roundId);

  // Check if this round has an active or completed skins game
  const hasSkinsGame = useMemo(() => {
    if (!skinsGames || skinsGames.length === 0) return false;
    return skinsGames.some((g) => g.status === 'active' || g.status === 'completed');
  }, [skinsGames]);

  // Get the active or completed skins game for displaying results
  const activeSkinsGame = useMemo(() => {
    if (!skinsGames || skinsGames.length === 0) return null;
    return skinsGames.find((g) => g.status === 'active' || g.status === 'completed') || null;
  }, [skinsGames]);

  // Fetch skins results for the tab (only when there's an active game)
  const { data: skinsResults, refetch: refetchSkinsResults, isRefetching: isRefetchingSkinsResults } = useSkinsResults(activeSkinsGame?.id);

  // Build tabs dynamically based on game type and features
  const tabs = useMemo<TabItem<TabKey>[]>(() => {
    const result: TabItem<TabKey>[] = [...BASE_TABS];

    if (isMatchPlayRound || isTeamMatchPlayRound) {
      result.push({ key: 'match' as const, label: 'Match' });
    }

    if (hasSkinsGame) {
      result.push({ key: 'skins' as const, label: 'Skins' });
    }

    return result;
  }, [isMatchPlayRound, isTeamMatchPlayRound, hasSkinsGame]);

  const isLoading = isLoadingRound || isLoadingScorecards || isLoadingPlayers || ((isMatchPlayRound || isTeamMatchPlayRound) && isLoadingMatchPlay);
  const isRefreshing = isRefetchingRound || isRefetchingScorecards || isRefetchingPlayers || isRefetchingMatchPlay || isRefetchingSkinsResults;

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
    // Route to appropriate scoring screen based on game type
    if (isTeamMatchPlayRound) {
      // Team match play goes to TeamMatchPlayScoring
      navigation.navigate('TeamMatchPlayScoring', {
        roundId,
        // TODO: Pass actual team IDs from round pairings
        team1Id: undefined,
        team2Id: undefined,
      });
    } else if (isMatchPlayRound) {
      // Individual match play goes to MatchPlayScoring
      navigation.navigate('MatchPlayScoring', {
        roundId,
        // TODO: Pass actual player IDs from round pairings
        player1Id: undefined,
        player2Id: undefined,
      });
    } else {
      navigation.navigate('Scorecard', {
        roundId,
        competitionId: competitionId || 'standalone',
      });
    }
  }, [navigation, roundId, competitionId, isMatchPlayRound, isTeamMatchPlayRound]);

  const handleEditRound = useCallback(() => {
    navigation.navigate('EditRound', {
      roundId,
      competitionId,
    });
  }, [navigation, roundId, competitionId]);

  const handleCourseSelectPress = useCallback(() => {
    setShowCourseModal(true);
  }, []);

  const handleCourseSelect = useCallback(
    (course: CourseWithFavorite) => {
      updateCourse(course.id);
      setShowCourseModal(false);
      setCourseSearchQuery('');
    },
    [updateCourse]
  );

  const handleCourseModalClose = useCallback(() => {
    setShowCourseModal(false);
    setCourseSearchQuery('');
  }, []);

  // Scoring pairs handlers
  const handleScoringPairsEditPress = useCallback(() => {
    setShowScoringPairsSheet(true);
  }, []);

  const handleScoringPairsSheetClose = useCallback(() => {
    setShowScoringPairsSheet(false);
  }, []);

  // Skins handlers
  const handleSkinsEditPress = useCallback(() => {
    setShowSkinsConfigSheet(true);
  }, []);

  const handleSkinsConfigSave = useCallback(
    async (config: SkinsConfig) => {
      // Get current skins game if exists
      const currentSkinsGame = skinsGames?.[0];

      if (currentSkinsGame) {
        // Update existing skins game
        updateSkinsGame(
          {
            gameId: currentSkinsGame.id,
            updates: {
              pot_type: config.pot_type,
              pot_value: config.pot_value,
              scoring_type: config.scoring_type,
              currency: config.currency,
            },
          },
          {
            onSuccess: () => {
              setShowSkinsConfigSheet(false);
            },
          }
        );
      } else if (user?.id) {
        // Create new skins game
        // Collect participant IDs from multiple sources
        const playerIdsFromRoundPlayers = roundPlayers?.map((p) => p.id) ?? [];
        const playerIdsFromScorecards = scorecards?.map((sc) => sc.player_id) ?? [];

        // Combine and deduplicate
        const allPlayerIds = new Set([
          ...playerIdsFromRoundPlayers,
          ...playerIdsFromScorecards,
        ]);

        // If we don't have enough players and this is a competition round,
        // try fetching from competition_players
        if (allPlayerIds.size < 2 && competitionId) {
          console.log('[ViewRoundScreen] Fetching competition players for skins...');
          const { data: compPlayers } = await supabase
            .from('competition_players')
            .select('player_id')
            .eq('competition_id', competitionId) as { data: { player_id: string }[] | null };

          if (compPlayers && compPlayers.length > 0) {
            compPlayers.forEach((cp) => allPlayerIds.add(cp.player_id));
          }
        }

        // Always include current user
        allPlayerIds.add(user.id);

        const participantIds = Array.from(allPlayerIds);

        console.log('[ViewRoundScreen] Skins participants:', {
          fromRoundPlayers: playerIdsFromRoundPlayers.length,
          fromScorecards: playerIdsFromScorecards.length,
          total: participantIds.length,
          isCompetitionRound: !!competitionId,
        });

        // Skins requires at least 2 participants
        if (participantIds.length < 2) {
          Alert.alert(
            'Not Enough Players',
            competitionId
              ? 'Skins games require at least 2 players. Make sure the competition has players added.'
              : 'Skins games require at least 2 players. Add more players to the round first.',
            [{ text: 'OK' }]
          );
          return;
        }

        createSkinsGame(
          {
            round_id: roundId,
            participant_ids: participantIds,
            pot_type: config.pot_type,
            pot_value: config.pot_value,
            scoring_type: config.scoring_type,
            currency: config.currency,
            disclaimerAcceptedBy: user.id,
          },
          {
            onSuccess: () => {
              setShowSkinsConfigSheet(false);
            },
            onError: (error) => {
              console.error('[ViewRoundScreen] Failed to create skins game:', error);
              Alert.alert(
                'Error',
                'Failed to create skins game. Please try again.',
                [{ text: 'OK' }]
              );
            },
          }
        );
      }
    },
    [skinsGames, updateSkinsGame, createSkinsGame, roundId, user?.id, roundPlayers, scorecards, competitionId]
  );

  const handleSkinsConfigClose = useCallback(() => {
    setShowSkinsConfigSheet(false);
  }, []);

  const handlePlayerPress = useCallback((playerId: string) => {
    navigation.navigate('PlayerScorecard', {
      playerId,
      roundId,
    });
  }, [navigation, roundId]);

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
    if (isMatchPlayRound) {
      refetchMatchPlay();
    }
    if (hasSkinsGame) {
      refetchSkinsResults();
    }
  }, [refetchRound, refetchScorecards, refetchPlayers, isMatchPlayRound, refetchMatchPlay, hasSkinsGame, refetchSkinsResults]);

  // Get header title
  const getHeaderTitle = (): string | React.ReactNode => {
    if (isStandalone) {
      // Show "Skins Match" with icon if this standalone round has a skins game
      if (hasSkinsGame) {
        return (
          <View style={styles.skinsHeaderTitle}>
            <Icon source="dice-multiple" size={20} color={skinsColor} />
            <Text style={[styles.skinsHeaderText, { color: colors.textPrimary }]}>
              Skins Match
            </Text>
          </View>
        );
      }
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
        tabs={tabs}
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
            colors={[colors.textPrimary]}
            tintColor={colors.textPrimary}
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
            onCourseSelectPress={handleCourseSelectPress}
            onScoringPairsEditPress={handleScoringPairsEditPress}
            onSkinsEditPress={handleSkinsEditPress}
            competitionId={competitionId}
          />
        )}
        {activeTab === 'scorecard' && (
          <RoundScorecardTab
            scorecards={scorecards || []}
            roundPlayers={roundPlayers || []}
            holes={round.course?.holes || null}
            onPlayerPress={handlePlayerPress}
          />
        )}
        {activeTab === 'match' && (isMatchPlayRound || isTeamMatchPlayRound) && matchPlayData && (
          <View style={styles.matchTabContent}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Match Results
            </Text>
            <MatchPlayLeaderboard
              entries={matchPlayData.entries}
              currentUserId={user?.id}
              roundStatus={round.status}
              isTeamRound={round.is_team_round || false}
            />
          </View>
        )}
        {activeTab === 'skins' && hasSkinsGame && activeSkinsGame && (
          <View style={styles.skinsTabContent}>
            <SkinsResultsCard
              results={skinsResults || []}
              potType={activeSkinsGame.pot_type}
              potValue={activeSkinsGame.pot_value}
              scoringType={activeSkinsGame.scoring_type}
              participants={activeSkinsGame.participants}
              parValues={
                round.course?.holes?.reduce(
                  (acc, hole) => ({ ...acc, [hole.number]: hole.par }),
                  {} as Record<number, number>
                )
              }
            />
          </View>
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

      {/* Modals and Bottom Sheets - rendered last to appear on top */}
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

      <CourseSelectionModal
        visible={showCourseModal}
        onClose={handleCourseModalClose}
        onSelect={handleCourseSelect}
        searchQuery={courseSearchQuery}
        onSearchQueryChange={setCourseSearchQuery}
      />

      <ScoringPairsConfigBottomSheet
        visible={showScoringPairsSheet}
        onDismiss={handleScoringPairsSheetClose}
        roundId={roundId}
        competitionId={competitionId}
        scoringPairsRequired={round?.scoring_pairs_required ?? false}
        isPremium={isPremium}
      />

      <SkinsConfigBottomSheet
        visible={showSkinsConfigSheet}
        onDismiss={handleSkinsConfigClose}
        initialConfig={
          skinsGames?.[0]
            ? {
                pot_type: skinsGames[0].pot_type,
                pot_value: skinsGames[0].pot_value,
                scoring_type: skinsGames[0].scoring_type,
                currency: skinsGames[0].currency,
              }
            : null
        }
        onSave={handleSkinsConfigSave}
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

  // Match Tab
  matchTabContent: {
    gap: spacing.md,
  },
  skinsTabContent: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },

  // Skins Header Title
  skinsHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  skinsHeaderText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
  },
});

import React, { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { roundKeys } from '@/hooks/queryKeys';
import { supabase } from '@/services/supabase/client';
import type { CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type { Club } from '@/types/database.types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundWithCourse, ScorecardWithPlayer } from '@/hooks/useRoundDetails';

interface UseViewRoundHandlersParams {
  roundId: string;
  competitionId?: string;
  navigation: NativeStackNavigationProp<RootStackParamList, 'ViewRound'>;
  isStandalone: boolean;
  isMatchPlayRound: boolean;
  isTeamMatchPlayRound: boolean;
  hasSkinsGame: boolean;
  hasWolfGame: boolean;
  round: RoundWithCourse | undefined;
  scorecards: ScorecardWithPlayer[] | undefined;
  roundPlayers: { id: string }[] | undefined | null;
  // Refetch functions
  refetchRound: () => void;
  refetchScorecards: () => void;
  refetchPlayers: () => void;
  refetchMatchPlay: () => void;
  refetchSkinsResults: () => void;
  refetchSkinsGame: () => void;
  refetchWolfSummary: () => void;
  // State setters
  setShowCourseModal: (v: boolean) => void;
  setCourseSearchQuery: (v: string) => void;
  setShowTagLeagueSheet: (v: boolean) => void;
}

export function useViewRoundHandlers({
  roundId,
  competitionId,
  navigation,
  isStandalone,
  isMatchPlayRound,
  isTeamMatchPlayRound,
  hasSkinsGame,
  hasWolfGame,
  round,
  scorecards,
  roundPlayers,
  refetchRound,
  refetchScorecards,
  refetchPlayers,
  refetchMatchPlay,
  refetchSkinsResults,
  refetchSkinsGame,
  refetchWolfSummary,
  setShowCourseModal,
  setCourseSearchQuery,
  setShowTagLeagueSheet,
}: UseViewRoundHandlersParams) {
  const queryClient = useQueryClient();

  // Update course mutation
  const { mutate: updateCourse } = useMutation({
    mutationFn: async (courseId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('rounds') as any)
        .update({ course_id: courseId })
        .eq('id', roundId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
    },
    onError: (error) => {
      console.error('[ViewRoundScreen] Failed to update course:', error);
    },
  });

  // Navigation handlers
  const handleBack = useCallback(() => {
    // If the previous screen in the stack is a scoring screen, go to round list instead
    const state = navigation.getState();
    const currentIndex = state.index;
    if (currentIndex > 0) {
      const previousRoute = state.routes[currentIndex - 1];
      const scoringScreens = ['Scorecard', 'ReviewScorecard', 'MatchPlayScoring', 'TeamMatchPlayScoring'];
      if (scoringScreens.includes(previousRoute.name)) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
        return;
      }
    }
    navigation.goBack();
  }, [navigation]);

  const handleScoreRound = useCallback(() => {
    if (isTeamMatchPlayRound) {
      navigation.navigate('TeamMatchPlayScoring', {
        roundId,
        team1Id: undefined,
        team2Id: undefined,
      });
    } else if (isMatchPlayRound) {
      navigation.navigate('MatchPlayScoring', {
        roundId,
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

  const handleSettingsPress = useCallback(() => {
    navigation.navigate('RoundSettings', {
      roundId,
      competitionId,
    });
  }, [navigation, roundId, competitionId]);

  // Course modal handlers
  const handleCourseSelectPress = useCallback(() => {
    setShowCourseModal(true);
  }, [setShowCourseModal]);

  const handleCourseSelect = useCallback(
    (course: CourseWithFavoriteStatus, _club: Club) => {
      updateCourse(course.id);
      setShowCourseModal(false);
      setCourseSearchQuery('');
    },
    [updateCourse, setShowCourseModal, setCourseSearchQuery]
  );

  const handleCourseModalClose = useCallback(() => {
    setShowCourseModal(false);
    setCourseSearchQuery('');
  }, [setShowCourseModal, setCourseSearchQuery]);

  const handlePlayerPress = useCallback((playerId: string) => {
    navigation.navigate('PlayerScorecard', {
      playerId,
      roundId,
    });
  }, [navigation, roundId]);

  const handleCompetitionPress = useCallback(() => {
    if (round?.competition?.id) {
      navigation.navigate('CompetitionDetail', { id: round.competition.id });
    }
  }, [navigation, round?.competition?.id]);

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
      refetchSkinsGame();
    }
    if (hasWolfGame) {
      refetchWolfSummary();
    }
  }, [refetchRound, refetchScorecards, refetchPlayers, isMatchPlayRound, refetchMatchPlay, hasSkinsGame, refetchSkinsResults, refetchSkinsGame, hasWolfGame, refetchWolfSummary]);

  // Header helpers
  const getHeaderTitle = (): string | React.ReactNode => {
    if (isStandalone) {
      if (hasSkinsGame && hasWolfGame) return 'Skins & Wolf';
      if (hasSkinsGame) return 'Skins Match';
      if (hasWolfGame) return 'Wolf Game';
      const playerCount = scorecards?.length || roundPlayers?.length || 0;
      if (playerCount > 1) return 'Match';
      return round?.handicap_source && round.handicap_source !== 'none'
        ? 'Handicap Round'
        : 'Practice Round';
    }
    return `Round ${round?.round_number || ''}`;
  };

  const headerTitleHasIcons = isStandalone && (hasSkinsGame || hasWolfGame);

  const handleNavigateToSubscription = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  const handleTagLeagueSheetOpen = useCallback(() => {
    setShowTagLeagueSheet(true);
  }, [setShowTagLeagueSheet]);

  const handleTagLeagueSheetClose = useCallback(() => {
    setShowTagLeagueSheet(false);
  }, [setShowTagLeagueSheet]);

  return {
    // Handlers
    handleBack,
    handleScoreRound,
    handleEditRound,
    handleSettingsPress,
    handleCourseSelectPress,
    handleCourseSelect,
    handleCourseModalClose,
    handlePlayerPress,
    handleCompetitionPress,
    handleRefresh,
    getHeaderTitle,
    headerTitleHasIcons,
    handleNavigateToSubscription,
    handleTagLeagueSheetOpen,
    handleTagLeagueSheetClose,
  };
}

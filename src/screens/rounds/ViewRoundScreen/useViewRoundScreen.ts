/**
 * useViewRoundScreen - Custom hook for ViewRoundScreen
 *
 * Thin orchestrator that composes sub-hooks for data fetching,
 * permissions, side games, tabs, and handlers.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/context/ThemeContext';
import { useStatsVisibilityWithTier } from '@/hooks/useStatsVisibilityWithTier';
import { usePairings, useSubMatches } from '@/hooks/rounds';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { useShotLogByRound } from '@/hooks/shots';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { TabKey } from './types';
import {
  useViewRoundDataFetch,
  useViewRoundPermissions,
  useViewRoundSideGames,
  useViewRoundTabs,
  useViewRoundHandlers,
  useViewRoundPlayerData,
  useViewRoundScramble,
} from './hooks';

export type { TabKey } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'ViewRound'>;

export function useViewRoundScreen({ route, navigation }: Props) {
  const { roundId, competitionId, initialTab } = route.params;
  const { user } = useAuth();
  const colors = useThemeColors();
  const isStandalone = !competitionId;

  // Local UI state. Honour the optional `initialTab` deep-link param on
  // first mount, falling back to 'details' for the normal case.
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? 'details');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [showTagLeagueSheet, setShowTagLeagueSheet] = useState(false);
  const [showEditStatsModal, setShowEditStatsModal] = useState(false);
  const [editStatsInitialHole, setEditStatsInitialHole] = useState<number | undefined>(undefined);

  // Data fetching
  const dataFetch = useViewRoundDataFetch({ roundId, competitionId });
  const {
    round, roundError, scorecards, roundPlayers, matchPlayData, competitionInfo,
    isLoadingCompetitionInfo,
    isMatchPlayRound, isTeamMatchPlayRound, isShambleRound, isScrambleRound, isAltShotSplitRound, isStrokePlayRound, isStablefordRound, isParRound, isSplitRound, isTeamStrokeRound, isTeamRound,
    isLoading, refetchRound, refetchScorecards, refetchPlayers, refetchMatchPlay,
  } = dataFetch;

  // Side games
  const sideGames = useViewRoundSideGames({ roundId, round, scorecards });
  const {
    skinsResults, activeSkinsGame, skinsGameWithParticipants,
    hasSkinsGame, isTeamSkins, skinsTeams,
    wolfGame, wolfSummary, hasWolfGame,
    hasPayoutsTab, payoutsMode, playerNameMap,
    refetchSkinsResults, refetchSkinsGame, refetchWolfSummary,
  } = sideGames;

  // Add roundPlayers to the name map
  const fullPlayerNameMap = { ...playerNameMap };
  roundPlayers?.forEach((p) => {
    if ((p as { name?: string }).name && !fullPlayerNameMap[p.id]) {
      fullPlayerNameMap[p.id] = (p as { name: string }).name;
    }
  });

  // Permissions
  const permissions = useViewRoundPermissions({
    user,
    round,
    scorecards,
    roundPlayers,
    competitionInfo,
    isStandalone,
  });

  // Stats visibility (for Stats tab)
  const statsVisibility = useStatsVisibilityWithTier();
  const hasStats =
    statsVisibility.showPutts ||
    statsVisibility.showFairwayHit ||
    statsVisibility.showGreenInRegulation ||
    statsVisibility.showBunkerShots ||
    statsVisibility.showHazards;

  // Counts surfaced as tab badges. Pairings and sub-matches are TanStack
  // queries so the view inside the Groups / Sub-Matches tab shares the
  // same cache. Teams fetch is lightweight and already used elsewhere.
  const { data: pairingsForCount } = usePairings(roundId);
  const { data: subMatchesForCount } = useSubMatches(
    isSplitRound ? roundId : undefined
  );
  const { teams: teamsForCount } = useRoundTeams(
    competitionId ?? undefined,
    !!competitionId || isTeamRound,
    roundId
  );
  const groupCount = isSplitRound
    ? subMatchesForCount?.length ?? 0
    : pairingsForCount?.length ?? 0;
  const teamCount = teamsForCount.length;

  // Whether to surface the Shots tab — gated on at least one logged shot.
  const { data: shotLogForRound } = useShotLogByRound(roundId);
  const hasShots = (shotLogForRound?.length ?? 0) > 0;

  // Tabs
  const tabs = useViewRoundTabs({
    isMatchPlayRound,
    isTeamMatchPlayRound,
    isShambleRound,
    isScrambleRound,
    isAltShotSplitRound,
    isStrokePlayRound,
    isStablefordRound,
    isParRound,
    isSplitRound,
    isTeamStrokeRound,
    isTeamRound,
    hasSkinsGame,
    hasWolfGame,
    hasPayoutsTab,
    hasStats,
    hasShots,
    // Prefer the round-player count when it's higher than the scorecard
    // count — scorecards only exist once scoring starts, but tabs like
    // "Groups" need to appear before anyone has scored.
    playerCount: Math.max(
      scorecards?.length ?? 0,
      roundPlayers?.length ?? 0
    ),
    groupCount,
    teamCount,
  });

  // Player data transformations
  const playerData = useViewRoundPlayerData({
    isShambleRound,
    isStrokePlayRound,
    isStablefordRound,
    isParRound,
    isMatchPlayRound,
    scorecards,
    roundPlayers,
  });

  // Scramble data
  const scrambleData = useViewRoundScramble({
    isScrambleRound,
    round,
    scorecards,
    roundPlayers,
  });

  // Handlers (mutations, navigation, dialogs)
  const handlers = useViewRoundHandlers({
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
  });

  // Combine isRefreshing from data + side games
  const isRefreshing = dataFetch.isRefreshing || sideGames.isRefetchingSkinsResults;

  // Refetch scorecards whenever the user opens the Scorecard tab so they
  // see fresh scores immediately (e.g. after returning from score entry,
  // or when a co-scorer has updated scores in the background).
  useEffect(() => {
    if (activeTab === 'scorecard') {
      refetchScorecards();
    }
  }, [activeTab, refetchScorecards]);

  return {
    // Route params
    roundId,
    competitionId,

    // State
    activeTab,
    setActiveTab,
    showCourseModal,
    courseSearchQuery,
    setCourseSearchQuery,
    showTagLeagueSheet,
    selectedTeamIndex: scrambleData.selectedTeamIndex,
    setSelectedTeamIndex: scrambleData.setSelectedTeamIndex,

    // Auth
    user,
    colors,

    // Data
    round,
    roundError,
    scorecards,
    roundPlayers,
    matchPlayData,
    skinsResults,
    activeSkinsGame,
    skinsGameWithParticipants,
    wolfGame,
    wolfSummary,
    competitionInfo,
    isLoadingCompetitionInfo,

    // Loading/refreshing
    isLoading,
    isRefreshing,

    // Computed
    isStandalone,
    isMatchPlayRound,
    isTeamMatchPlayRound,
    isShambleRound,
    isScrambleRound,
    isStrokePlayRound,
    isStablefordRound,
    isParRound,
    isSplitRound,
    isTeamStrokeRound,
    isTeamRound,
    teams: teamsForCount,
    subMatches: subMatchesForCount,
    isUserPlaying: permissions.isUserPlaying,
    roundReadyToScore: permissions.roundReadyToScore,
    isOrganizer: permissions.isOrganizer,
    isTeamSkins,
    skinsTeams,
    hasSkinsGame,
    hasWolfGame,
    hasPayoutsTab,
    payoutsMode,
    playerNameMap: fullPlayerNameMap,
    canTagToLeague: permissions.canTagToLeague,
    userScorecardId: permissions.userScorecardId,
    userScorecardSubmitted: permissions.userScorecardSubmitted,
    tabs,
    statsVisibility,
    headerTitleHasIcons: handlers.headerTitleHasIcons,

    // Match play data
    matchPlayPlayers: playerData.matchPlayPlayers,
    getPlayerScore: playerData.getPlayerScore,

    // Shamble data
    shamblePlayers: playerData.shamblePlayers,
    getShamblePlayerScore: playerData.getShamblePlayerScore,
    getShambleTeamScore: playerData.getShambleTeamScore,

    // Stroke play data
    strokePlayPlayers: playerData.strokePlayPlayers,
    leaderboardPlayers: playerData.leaderboardPlayers,
    getStrokePlayPlayerScore: playerData.getStrokePlayPlayerScore,

    // Scramble data
    scrambleTeams: scrambleData.scrambleTeams,
    scrambleTeamPlayers: scrambleData.scrambleTeamPlayers,
    scrambleTeamHandicap: scrambleData.scrambleTeamHandicap,
    allScramblePlayers: scrambleData.allScramblePlayers,
    getScrambleTeamScore: scrambleData.getScrambleTeamScore,
    getScrambleTeamScoreByIndex: scrambleData.getScrambleTeamScoreByIndex,
    getScrambleTeamPlayersByIndex: scrambleData.getScrambleTeamPlayersByIndex,
    getScrambleTeamHandicapByIndex: scrambleData.getScrambleTeamHandicapByIndex,

    // Handlers
    handleBack: handlers.handleBack,
    handleScoreRound: handlers.handleScoreRound,
    handleSettingsPress: handlers.handleSettingsPress,
    handleCourseSelectPress: handlers.handleCourseSelectPress,
    handleCourseSelect: handlers.handleCourseSelect,
    handleCourseModalClose: handlers.handleCourseModalClose,
    handlePlayerPress: handlers.handlePlayerPress,
    handleCompetitionPress: handlers.handleCompetitionPress,
    handleRefresh: handlers.handleRefresh,
    getHeaderTitle: handlers.getHeaderTitle,
    handleNavigateToSubscription: handlers.handleNavigateToSubscription,
    handleTagLeagueSheetOpen: handlers.handleTagLeagueSheetOpen,
    handleTagLeagueSheetClose: handlers.handleTagLeagueSheetClose,
    // Edit Stats Modal
    showEditStatsModal,
    editStatsInitialHole,
    handleEditStatsOpen: (holeNumber?: number) => {
      setEditStatsInitialHole(holeNumber);
      setShowEditStatsModal(true);
    },
    handleEditStatsClose: () => {
      setShowEditStatsModal(false);
      setEditStatsInitialHole(undefined);
    },
    // Refetch functions
    refetchRound,
  };
}

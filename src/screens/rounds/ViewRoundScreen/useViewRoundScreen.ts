/**
 * useViewRoundScreen - Custom hook for ViewRoundScreen
 *
 * Thin orchestrator that composes sub-hooks for data fetching,
 * permissions, side games, tabs, and handlers.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/context/ThemeContext';
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
  const { roundId, competitionId } = route.params;
  const { user } = useAuth();
  const colors = useThemeColors();
  const isStandalone = !competitionId;

  // Local UI state
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [showTagLeagueSheet, setShowTagLeagueSheet] = useState(false);
  const [showEditStatsModal, setShowEditStatsModal] = useState(false);

  // Data fetching
  const dataFetch = useViewRoundDataFetch({ roundId, competitionId });
  const {
    round, roundError, scorecards, roundPlayers, matchPlayData, competitionInfo,
    isMatchPlayRound, isTeamMatchPlayRound, isShambleRound, isScrambleRound, isStrokePlayRound,
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
    competitionInfo,
    isStandalone,
  });

  // Tabs
  const tabs = useViewRoundTabs({
    isMatchPlayRound,
    isTeamMatchPlayRound,
    isShambleRound,
    isScrambleRound,
    isStrokePlayRound,
    hasSkinsGame,
    hasWolfGame,
    hasPayoutsTab,
  });

  // Player data transformations
  const playerData = useViewRoundPlayerData({
    isShambleRound,
    isStrokePlayRound,
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
    isUserPlaying: permissions.isUserPlaying,
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
    handleEditRound: handlers.handleEditRound,
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
    handleEditStatsOpen: () => setShowEditStatsModal(true),
    handleEditStatsClose: () => setShowEditStatsModal(false),
    // Refetch functions
    refetchRound,
  };
}

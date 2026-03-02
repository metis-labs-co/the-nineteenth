/**
 * useViewRoundScreen - Custom hook for ViewRoundScreen
 *
 * Contains all state, data fetching, computed values, and handlers
 * for the ViewRoundScreen component.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useConfirmationDialog, useCompetitionInfo } from '@/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useRoundDetails, useRoundScorecards, useRoundPlayers } from '@/hooks/useRoundDetails';
import { useDeleteRound } from '@/hooks/useDeleteRound';
import { roundKeys } from '@/hooks/queryKeys';
import { supabase } from '@/services/supabase/client';
import type { CourseWithFavorite } from '@/hooks/useCourses';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useRoundLeaderboard } from '@/hooks/useRoundLeaderboard';
import { useSkinsGamesByRound, useCreateSkinsGame, useSkinsResults, useSkinsGame } from '@/hooks/useSkins';
import { useWolfGameByRound, useWolfSummary } from '@/hooks/wolf';
import { useThemeColors } from '@/context/ThemeContext';
import type { SkinsConfig } from '@/types/database/skins.types';
import type { HoleScore, MultiBallHoleScore, Player } from '@/types';
import type { StandaloneTeamConfig } from '@/types/supabase/roundQueries';
import type { TabItem } from '@/components/common/Tabs';

// =====================================================
// TYPES & CONSTANTS
// =====================================================

export type TabKey = 'details' | 'gameSetup' | 'scorecard' | 'match' | 'skins' | 'wolf' | 'payouts' | 'teamScores' | 'scrambleTeamScore' | 'scrambleLeaderboard' | 'scrambleContributions' | 'leaderboard';

const BASE_TABS: TabItem<TabKey>[] = [
  { key: 'details', label: 'Details' },
  { key: 'gameSetup', label: 'Game Setup' },
  { key: 'scorecard', label: 'Scorecard' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'ViewRound'>;

export function useViewRoundScreen({ route, navigation }: Props) {
  const { roundId, competitionId } = route.params;
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [showScoringPairsSheet, setShowScoringPairsSheet] = useState(false);
  const [showSkinsConfigSheet, setShowSkinsConfigSheet] = useState(false);
  const [showTagLeagueSheet, setShowTagLeagueSheet] = useState(false);
  const { user } = useAuth();
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  // Dialog state
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  // Delete mutation
  const { mutate: deleteRound, isPending: isDeleting } = useDeleteRound();

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

  // Skins game mutations
  const { mutate: updateSkinsGame } = useMutation({
    mutationFn: async ({ gameId, updates }: { gameId: string; updates: Partial<SkinsConfig> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('skins_games') as any)
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

  // Check if this is a shamble round
  const isShambleRound = round?.game_type === 'shamble' || round?.team_format === 'shamble';

  // Check if this is a scramble round
  const isScrambleRound = round?.game_type === 'scramble' || round?.team_format === 'scramble';

  // Check if this is a stroke play round (for leaderboard tab)
  const isStrokePlayRound = round?.game_type === 'stroke';

  // State for selected team in multi-team scramble rounds
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);

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

  // Fetch wolf game for this round
  const { data: wolfGame } = useWolfGameByRound(roundId);

  // Check if this round has an active or completed wolf game
  const hasWolfGame = useMemo(() => {
    if (!wolfGame) return false;
    return wolfGame.status === 'active' || wolfGame.status === 'completed';
  }, [wolfGame]);

  // Fetch Wolf game summary for the tab (only when there's an active/completed game)
  const { data: wolfSummary, refetch: refetchWolfSummary } = useWolfSummary(hasWolfGame ? wolfGame?.id : undefined);

  // Get the active or completed skins game for displaying results
  const activeSkinsGame = useMemo(() => {
    if (!skinsGames || skinsGames.length === 0) return null;
    return skinsGames.find((g) => g.status === 'active' || g.status === 'completed') || null;
  }, [skinsGames]);

  // Fetch skins results for the tab (only when there's an active game)
  const { data: skinsResults, refetch: refetchSkinsResults, isRefetching: isRefetchingSkinsResults } = useSkinsResults(activeSkinsGame?.id);

  // Fetch full skins game data (including team participants for team skins)
  const { data: skinsGameWithParticipants, refetch: refetchSkinsGame } = useSkinsGame(activeSkinsGame?.id);

  // Determine if it's a team skins game and get team data
  // Check multiple sources: skins game flag, round team format, or team_winner_id in results
  const isTeamSkins = useMemo(() => {
    // Source 1: Explicit skins game flag
    if (skinsGameWithParticipants?.is_team_skins) return true;

    // Source 2: Round is a team format that uses team skins
    const TEAM_GAME_TYPES = ['best-ball', 'scramble', 'shamble'];
    if (round?.is_team_round && round?.team_format && TEAM_GAME_TYPES.includes(round.team_format)) {
      return true;
    }

    // Source 3: Check if results have team_winner_id (indicates team skins regardless of flag)
    if (skinsResults && skinsResults.some((r) => (r as { team_winner_id?: string }).team_winner_id)) {
      return true;
    }

    return false;
  }, [skinsGameWithParticipants?.is_team_skins, round?.is_team_round, round?.team_format, skinsResults]);

  const skinsTeams = useMemo((): { id: string; name: string; members: { id: string; name: string; handicap: number | null }[] }[] | undefined => {
    if (!isTeamSkins) return undefined;

    // Source 1: From useSkinsGame (has team member details)
    const gameTeams = (skinsGameWithParticipants as { teams?: { id: string; name: string; members?: { id: string; name: string; handicap: number | null }[] }[] })?.teams;
    if (gameTeams && gameTeams.length > 0) {
      // Filter to only teams with members and ensure members is defined
      return gameTeams
        .filter((t): t is { id: string; name: string; members: { id: string; name: string; handicap: number | null }[] } =>
          t.members !== undefined && t.members.length > 0
        );
    }

    // Source 2: From round's team_config (for standalone rounds)
    const teamConfig = (round as unknown as { team_config?: StandaloneTeamConfig })?.team_config;
    if (teamConfig?.teams && teamConfig.teams.length > 0) {
      // Convert team_config format to SkinsTeamParticipant format
      // Get player names from scorecards
      const playerMap = new Map<string, string>();
      scorecards?.forEach((sc) => {
        if (sc.player?.name) {
          playerMap.set(sc.player_id, sc.player.name);
        }
      });

      return teamConfig.teams.map((t) => ({
        id: t.id,
        name: t.name,
        members: t.memberIds.map((memberId) => ({
          id: memberId,
          name: playerMap.get(memberId) ?? 'Player',
          handicap: null,
        })),
      }));
    }

    return undefined;
  }, [isTeamSkins, skinsGameWithParticipants, round, scorecards]);

  // Check if individual games have pots (for payouts tab)
  const hasSkinsWithPot = useMemo(() => {
    if (!hasSkinsGame || isTeamSkins) return false; // v1: individual skins only
    if (!activeSkinsGame || activeSkinsGame.pot_value <= 0) return false;
    return true;
  }, [hasSkinsGame, isTeamSkins, activeSkinsGame]);

  const hasWolfWithPot = useMemo(() => {
    if (!hasWolfGame) return false;
    if (!wolfGame?.pot_enabled || !wolfGame?.pot_value_per_point || wolfGame.pot_value_per_point <= 0) return false;
    return true;
  }, [hasWolfGame, wolfGame]);

  const hasPayoutsTab = hasSkinsWithPot || hasWolfWithPot;
  const payoutsMode = hasSkinsWithPot && hasWolfWithPot
    ? 'combined' as const
    : hasSkinsWithPot
      ? 'skins-only' as const
      : hasWolfWithPot
        ? 'wolf-only' as const
        : null;

  // Build player name map from all available sources
  const playerNameMap = useMemo((): Record<string, string> => {
    const map: Record<string, string> = {};

    // From scorecards
    scorecards?.forEach((sc) => {
      if (sc.player?.name) {
        map[sc.player_id] = sc.player.name;
      }
    });

    // From round players
    roundPlayers?.forEach((p) => {
      if (p.name && !map[p.id]) {
        map[p.id] = p.name;
      }
    });

    // From wolf summary participants
    wolfSummary?.game.participants?.forEach((p) => {
      if (p.name && !map[p.id]) {
        map[p.id] = p.name;
      }
    });

    // From skins game participants
    activeSkinsGame?.participants?.forEach((p) => {
      if (p.name && !map[p.id]) {
        map[p.id] = p.name;
      }
    });

    return map;
  }, [scorecards, roundPlayers, wolfSummary, activeSkinsGame]);

  // Refetch skins data when screen gains focus (to sync with score entry screen)
  useFocusEffect(
    useCallback(() => {
      if (hasSkinsGame && activeSkinsGame?.id) {
        refetchSkinsResults();
        refetchSkinsGame();
      }
    }, [hasSkinsGame, activeSkinsGame?.id, refetchSkinsResults, refetchSkinsGame])
  );

  const isLoading = isLoadingRound || isLoadingScorecards || isLoadingPlayers || ((isMatchPlayRound || isTeamMatchPlayRound) && isLoadingMatchPlay);
  const isRefreshing = isRefetchingRound || isRefetchingScorecards || isRefetchingPlayers || isRefetchingMatchPlay || isRefetchingSkinsResults;

  // Check if current user is playing in this round
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

  // Build tabs dynamically based on game type and features
  const tabs = useMemo<TabItem<TabKey>[]>(() => {
    // For scramble rounds, skip the standard scorecard tab (covered by Team Score tab)
    let baseTabs = isScrambleRound
      ? BASE_TABS.filter((tab) => tab.key !== 'scorecard')
      : [...BASE_TABS];

    // Only show Game Setup tab if organizer OR if any game features are configured
    const hasScoringPairs = round?.scoring_pairs_required;
    const showGameSetupTab = isOrganizer || hasScoringPairs || hasSkinsGame || hasWolfGame;
    if (!showGameSetupTab) {
      baseTabs = baseTabs.filter((tab) => tab.key !== 'gameSetup');
    }

    const result: TabItem<TabKey>[] = baseTabs;

    if (isMatchPlayRound || isTeamMatchPlayRound) {
      result.push({ key: 'match' as const, label: 'Match' });
    }

    if (isShambleRound) {
      result.push({ key: 'teamScores' as const, label: 'Team Scores' });
    }

    if (isScrambleRound) {
      result.push({ key: 'scrambleTeamScore' as const, label: 'Scorecard' });
      result.push({ key: 'scrambleLeaderboard' as const, label: 'Leaderboard' });
      result.push({ key: 'scrambleContributions' as const, label: 'Contributions' });
    }

    if (isStrokePlayRound) {
      result.push({ key: 'leaderboard' as const, label: 'Leaderboard' });
    }

    if (hasSkinsGame) {
      result.push({ key: 'skins' as const, label: 'Skins' });
    }

    if (hasWolfGame) {
      result.push({ key: 'wolf' as const, label: 'Wolf' });
    }

    if (hasPayoutsTab) {
      result.push({ key: 'payouts' as const, label: 'Payouts' });
    }

    return result;
  }, [isMatchPlayRound, isTeamMatchPlayRound, isShambleRound, isScrambleRound, isStrokePlayRound, hasSkinsGame, hasWolfGame, hasPayoutsTab, isOrganizer, round?.scoring_pairs_required]);

  // Check if user can delete this round
  const canDelete = useMemo(() => {
    if (!user?.id || !round) return false;

    // For standalone/practice rounds, the creator can always delete
    if (isStandalone && round.user_id === user.id) {
      return true;
    }

    // For competition rounds, check if user is the organizer AND round hasn't started
    if (!isStandalone && competitionInfo?.organizer_id === user.id) {
      return round.status === 'upcoming';
    }

    return false;
  }, [user?.id, round, isStandalone, competitionInfo?.organizer_id]);

  // Find current user's scorecard ID and check if eligible for league tagging
  const userScorecardId = useMemo(() => {
    if (!user?.id || !scorecards) return undefined;
    return scorecards.find((sc) => sc.player_id === user.id)?.id;
  }, [user?.id, scorecards]);

  const canTagToLeague = useMemo(() => {
    if (!user?.id || !scorecards || !round) return false;
    const userScorecard = scorecards.find((sc) => sc.player_id === user.id);
    if (!userScorecard) return false;
    if (userScorecard.status !== 'completed' && userScorecard.status !== 'confirmed') return false;
    if (userScorecard.handicap_differential == null) return false;
    // Check 18 scored holes
    const scores = userScorecard.scores;
    if (!scores) return false;
    const scoredHoles = Object.values(scores).filter(
      (s) => s && 'strokes' in s && s.strokes != null && s.strokes > 0
    );
    return scoredHoles.length >= 18;
  }, [user?.id, scorecards, round]);

  // Get match play players for individual match play rounds
  const matchPlayPlayers = useMemo(() => {
    if (!isMatchPlayRound) return null;

    const players = scorecards?.map((sc) => ({
      id: sc.player_id,
      name: sc.player?.name || 'Unknown',
    })) || roundPlayers?.map((p) => ({
      id: p.id,
      name: p.name,
    })) || [];

    if (players.length >= 2) {
      return {
        player1: players[0],
        player2: players[1],
      };
    }

    return null;
  }, [isMatchPlayRound, scorecards, roundPlayers]);

  // Get player score from scorecards for match play scorecard table
  const getPlayerScore = useCallback((playerId: string, holeNumber: number) => {
    const scorecard = scorecards?.find((sc) => sc.player_id === playerId);
    if (!scorecard) return undefined;

    const holeScore = scorecard.scores?.[String(holeNumber)];
    if (!holeScore) return undefined;

    if ('strokes' in holeScore) {
      return holeScore.strokes;
    }

    return undefined;
  }, [scorecards]);

  // Get full hole score for shamble team scores tab
  const getShamblePlayerScore = useCallback((playerId: string, holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
    const scorecard = scorecards?.find((sc) => sc.player_id === playerId);
    if (!scorecard) return undefined;

    return scorecard.scores?.[String(holeNumber)];
  }, [scorecards]);

  // Get team score for shamble (uses first player's scorecard for shot contributions)
  const getShambleTeamScore = useCallback((holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
    if (!scorecards || scorecards.length === 0) return undefined;

    return scorecards[0]?.scores?.[String(holeNumber)];
  }, [scorecards]);

  // Convert round players to Player type for ContributionLeaderboard
  const shamblePlayers: Player[] = useMemo(() => {
    if (!isShambleRound) return [];

    if (scorecards && scorecards.length > 0) {
      return scorecards.map((sc) => ({
        id: sc.player_id,
        name: sc.player?.name || 'Unknown',
        handicap: sc.player?.handicap ?? 0,
        email: sc.player?.email || '',
      }));
    }

    if (roundPlayers && roundPlayers.length > 0) {
      return roundPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap ?? 0,
        email: p.email || '',
      }));
    }

    return [];
  }, [isShambleRound, scorecards, roundPlayers]);

  // Convert round players to Player type for StrokePlayLeaderboard
  const strokePlayPlayers: Player[] = useMemo(() => {
    if (!isStrokePlayRound) return [];

    if (scorecards && scorecards.length > 0) {
      return scorecards.map((sc) => ({
        id: sc.player_id,
        name: sc.player?.name || 'Unknown',
        handicap: sc.player?.handicap ?? 0,
        email: sc.player?.email || '',
      }));
    }

    if (roundPlayers && roundPlayers.length > 0) {
      return roundPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap ?? 0,
        email: p.email || '',
      }));
    }

    return [];
  }, [isStrokePlayRound, scorecards, roundPlayers]);

  // Get full hole score for stroke play leaderboard
  const getStrokePlayPlayerScore = useCallback((playerId: string, holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
    const scorecard = scorecards?.find((sc) => sc.player_id === playerId);
    if (!scorecard) return undefined;

    return scorecard.scores?.[String(holeNumber)];
  }, [scorecards]);

  // Extract teams from team_config for standalone scramble rounds
  const scrambleTeams = useMemo(() => {
    if (!isScrambleRound) return [];

    const teamConfig = (round as unknown as { team_config?: StandaloneTeamConfig })?.team_config;
    if (teamConfig?.teams && teamConfig.teams.length > 0) {
      return teamConfig.teams;
    }

    const allPlayerIds = scorecards?.map((sc) => sc.player_id) ||
      roundPlayers?.map((p) => p.id) || [];

    if (allPlayerIds.length > 0) {
      return [{
        id: 'default-team',
        name: 'Team',
        memberIds: allPlayerIds,
      }];
    }

    return [];
  }, [isScrambleRound, round, scorecards, roundPlayers]);

  // Get players for the currently selected scramble team
  const scrambleTeamPlayers: Player[] = useMemo(() => {
    if (!isScrambleRound || scrambleTeams.length === 0) return [];

    const selectedTeam = scrambleTeams[selectedTeamIndex] || scrambleTeams[0];
    if (!selectedTeam) return [];

    const playerMap = new Map<string, Player>();

    scorecards?.forEach((sc) => {
      playerMap.set(sc.player_id, {
        id: sc.player_id,
        name: sc.player?.name || 'Unknown',
        handicap: sc.player?.handicap ?? 0,
        email: sc.player?.email || '',
      });
    });

    roundPlayers?.forEach((p) => {
      if (!playerMap.has(p.id)) {
        playerMap.set(p.id, {
          id: p.id,
          name: p.name,
          handicap: p.handicap ?? 0,
          email: p.email || '',
        });
      }
    });

    return selectedTeam.memberIds
      .map((id) => playerMap.get(id))
      .filter((p): p is Player => p !== undefined);
  }, [isScrambleRound, scrambleTeams, selectedTeamIndex, scorecards, roundPlayers]);

  // Get team handicap (average of team members for scramble)
  const scrambleTeamHandicap = useMemo(() => {
    if (scrambleTeamPlayers.length === 0) return 0;
    const totalHandicap = scrambleTeamPlayers.reduce((sum, p) => sum + (p.handicap ?? 0), 0);
    return Math.round((totalHandicap * 0.25) * 10) / 10;
  }, [scrambleTeamPlayers]);

  // Get all players for scramble leaderboard (needed for player lookup)
  const allScramblePlayers: Player[] = useMemo(() => {
    if (!isScrambleRound) return [];

    if (scorecards && scorecards.length > 0) {
      return scorecards.map((sc) => ({
        id: sc.player_id,
        name: sc.player?.name || 'Unknown',
        handicap: sc.player?.handicap ?? 0,
        email: sc.player?.email || '',
      }));
    }

    if (roundPlayers && roundPlayers.length > 0) {
      return roundPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap ?? 0,
        email: p.email || '',
      }));
    }

    return [];
  }, [isScrambleRound, scorecards, roundPlayers]);

  // Get team score for scramble (from first team member's scorecard)
  const getScrambleTeamScore = useCallback((holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
    if (!scorecards || scorecards.length === 0) return undefined;

    const selectedTeam = scrambleTeams[selectedTeamIndex] || scrambleTeams[0];
    if (!selectedTeam) return undefined;

    const teamScorecard = scorecards.find((sc) =>
      selectedTeam.memberIds.includes(sc.player_id)
    );

    return teamScorecard?.scores?.[String(holeNumber)];
  }, [scorecards, scrambleTeams, selectedTeamIndex]);

  // Get team score for a specific team by index (for displaying all teams)
  const getScrambleTeamScoreByIndex = useCallback((teamIndex: number, holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
    if (!scorecards || scorecards.length === 0) return undefined;

    const team = scrambleTeams[teamIndex];
    if (!team) return undefined;

    const teamScorecard = scorecards.find((sc) =>
      team.memberIds.includes(sc.player_id)
    );

    return teamScorecard?.scores?.[String(holeNumber)];
  }, [scorecards, scrambleTeams]);

  // Get players for a specific team by index (for displaying all teams)
  const getScrambleTeamPlayersByIndex = useCallback((teamIndex: number): Player[] => {
    if (!isScrambleRound || scrambleTeams.length === 0) return [];

    const team = scrambleTeams[teamIndex];
    if (!team) return [];

    const playerMap = new Map<string, Player>();

    scorecards?.forEach((sc) => {
      playerMap.set(sc.player_id, {
        id: sc.player_id,
        name: sc.player?.name || 'Unknown',
        handicap: sc.player?.handicap ?? 0,
        email: sc.player?.email || '',
      });
    });

    roundPlayers?.forEach((p) => {
      if (!playerMap.has(p.id)) {
        playerMap.set(p.id, {
          id: p.id,
          name: p.name,
          handicap: p.handicap ?? 0,
          email: p.email || '',
        });
      }
    });

    return team.memberIds
      .map((id) => playerMap.get(id))
      .filter((p): p is Player => p !== undefined);
  }, [isScrambleRound, scrambleTeams, scorecards, roundPlayers]);

  // Get team handicap for a specific team by index
  const getScrambleTeamHandicapByIndex = useCallback((teamIndex: number): number => {
    const teamPlayers = getScrambleTeamPlayersByIndex(teamIndex);
    if (teamPlayers.length === 0) return 0;
    const totalHandicap = teamPlayers.reduce((sum, p) => sum + (p.handicap ?? 0), 0);
    return Math.round((totalHandicap * 0.25) * 10) / 10;
  }, [getScrambleTeamPlayersByIndex]);

  // Navigation handlers
  const handleBack = useCallback(() => {
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
      const currentSkinsGame = skinsGames?.[0];

      if (currentSkinsGame) {
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
        const playerIdsFromRoundPlayers = roundPlayers?.map((p) => p.id) ?? [];
        const playerIdsFromScorecards = scorecards?.map((sc) => sc.player_id) ?? [];

        const allPlayerIds = new Set([
          ...playerIdsFromRoundPlayers,
          ...playerIdsFromScorecards,
        ]);

        if (allPlayerIds.size < 2 && competitionId) {
          const { data: compPlayers } = await supabase
            .from('competition_players')
            .select('player_id')
            .eq('competition_id', competitionId) as { data: { player_id: string }[] | null };

          if (compPlayers && compPlayers.length > 0) {
            compPlayers.forEach((cp) => allPlayerIds.add(cp.player_id));
          }
        }

        allPlayerIds.add(user.id);

        const participantIds = Array.from(allPlayerIds);

        if (participantIds.length < 2) {
          showAlert(
            'Not Enough Players',
            competitionId
              ? 'Skins games require at least 2 players. Make sure the competition has players added.'
              : 'Skins games require at least 2 players. Add more players to the round first.'
          );
          return;
        }

        // Determine if this is a team skins game
        const TEAM_GAME_TYPES = ['best-ball', 'scramble', 'shamble'];
        const isTeamSkinsGame = round?.is_team_round && round?.team_format && TEAM_GAME_TYPES.includes(round.team_format);

        // Get team IDs if team skins
        let teamIds: string[] = [];
        if (isTeamSkinsGame && scrambleTeams.length > 0) {
          teamIds = scrambleTeams
            .filter((t) => t.id !== 'default-team')
            .map((t) => t.id);
        }

        // If we have teams, also try to fetch actual team records from DB
        if (isTeamSkinsGame && teamIds.length === 0 && competitionId) {
          const { data: dbTeams } = await supabase
            .from('teams')
            .select('id')
            .eq('round_id', roundId) as unknown as { data: { id: string }[] | null };

          if (dbTeams && dbTeams.length > 0) {
            teamIds = dbTeams.map((t) => t.id);
          }
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
            is_team_skins: isTeamSkinsGame ?? false,
            participant_team_ids: teamIds.length > 0 ? teamIds : undefined,
          },
          {
            onSuccess: () => {
              setShowSkinsConfigSheet(false);
            },
            onError: (error) => {
              console.error('[ViewRoundScreen] Failed to create skins game:', error);
              showAlert('Error', 'Failed to create skins game. Please try again.');
            },
          }
        );
      }
    },
    [skinsGames, updateSkinsGame, createSkinsGame, roundId, user?.id, roundPlayers, scorecards, competitionId, showAlert, round, scrambleTeams]
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

  // Navigate to competition
  const handleCompetitionPress = useCallback(() => {
    if (round?.competition?.id) {
      navigation.navigate('CompetitionDetail', { id: round.competition.id });
    }
  }, [navigation, round?.competition?.id]);

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
      refetchSkinsGame();
    }
    if (hasWolfGame) {
      refetchWolfSummary();
    }
  }, [refetchRound, refetchScorecards, refetchPlayers, isMatchPlayRound, refetchMatchPlay, hasSkinsGame, refetchSkinsResults, refetchSkinsGame, hasWolfGame, refetchWolfSummary]);

  // Get header title
  const getHeaderTitle = (): string | React.ReactNode => {
    if (isStandalone) {
      if (hasSkinsGame && hasWolfGame) {
        return 'Skins & Wolf';
      }
      if (hasSkinsGame) {
        return 'Skins Match';
      }
      if (hasWolfGame) {
        return 'Wolf Game';
      }
      const playerCount = scorecards?.length || roundPlayers?.length || 0;
      return playerCount > 1 ? 'Match' : 'Practice Round';
    }
    return `Round ${round?.round_number || ''}`;
  };

  // Get header title with icons (React node version for the component)
  const headerTitleHasIcons = isStandalone && (hasSkinsGame || hasWolfGame);

  // Get delete dialog message
  const getDeleteMessage = () => {
    if (isStandalone) {
      return 'Are you sure you want to delete this practice round? All scores and data will be permanently removed.';
    }
    return 'Are you sure you want to delete this round? All pairings, scores, and data will be permanently removed.';
  };

  const handleNavigateToSubscription = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  const handleTagLeagueSheetOpen = useCallback(() => {
    setShowTagLeagueSheet(true);
  }, []);

  const handleTagLeagueSheetClose = useCallback(() => {
    setShowTagLeagueSheet(false);
  }, []);

  return {
    // Route params
    roundId,
    competitionId,

    // State
    activeTab,
    setActiveTab,
    showDeleteDialog,
    showCourseModal,
    courseSearchQuery,
    setCourseSearchQuery,
    showScoringPairsSheet,
    showSkinsConfigSheet,
    showTagLeagueSheet,
    selectedTeamIndex,
    setSelectedTeamIndex,

    // Auth
    user,
    colors,

    // Dialog
    dialogConfig,
    dismissDialog,

    // Data
    round,
    roundError,
    scorecards,
    roundPlayers,
    matchPlayData,
    skinsGames,
    skinsResults,
    activeSkinsGame,
    skinsGameWithParticipants,
    wolfGame,
    wolfSummary,
    competitionInfo,

    // Loading/refreshing
    isLoading,
    isRefreshing,
    isDeleting,

    // Computed
    isStandalone,
    isMatchPlayRound,
    isTeamMatchPlayRound,
    isShambleRound,
    isScrambleRound,
    isStrokePlayRound,
    isUserPlaying,
    isOrganizer,
    isTeamSkins,
    skinsTeams,
    hasSkinsGame,
    hasWolfGame,
    hasPayoutsTab,
    payoutsMode,
    playerNameMap,
    canDelete,
    canTagToLeague,
    userScorecardId,
    tabs,
    headerTitleHasIcons,

    // Match play data
    matchPlayPlayers,
    getPlayerScore,

    // Shamble data
    shamblePlayers,
    getShamblePlayerScore,
    getShambleTeamScore,

    // Stroke play data
    strokePlayPlayers,
    getStrokePlayPlayerScore,

    // Scramble data
    scrambleTeams,
    scrambleTeamPlayers,
    scrambleTeamHandicap,
    allScramblePlayers,
    getScrambleTeamScore,
    getScrambleTeamScoreByIndex,
    getScrambleTeamPlayersByIndex,
    getScrambleTeamHandicapByIndex,

    // Handlers
    handleBack,
    handleScoreRound,
    handleEditRound,
    handleCourseSelectPress,
    handleCourseSelect,
    handleCourseModalClose,
    handleScoringPairsEditPress,
    handleScoringPairsSheetClose,
    handleSkinsEditPress,
    handleSkinsConfigSave,
    handleSkinsConfigClose,
    handlePlayerPress,
    handleCompetitionPress,
    handleDeletePress,
    handleDeleteCancel,
    handleDeleteConfirm,
    handleRefresh,
    getHeaderTitle,
    getDeleteMessage,
    handleNavigateToSubscription,
    handleTagLeagueSheetOpen,
    handleTagLeagueSheetClose,

    // Refetch functions
    refetchRound,
  };
}

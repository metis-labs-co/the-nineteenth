/**
 * useLeagueDetail - Data fetching, state, and callbacks for LeagueDetailScreen
 *
 * Supports all league types: ongoing, season, round_limit, ladder, eclectic, partnership
 */

import { useCallback, useMemo, useState } from 'react';
import { Share, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import {
  useLeague,
  useLeagueLeaderboard,
  useLeaguePlayers,
  useMyLeagueRounds,
  usePlayerLeagueRounds,
  useLeaveLeague,
  useJoinPublicLeague,
  useLadderStandings,
  useLeagueChallenges,
  useMyActiveChallenges,
  useCreateChallenge,
  useRespondToChallenge,
  useEclecticLeaderboard,
  useEclecticBestScores,
  usePlayerTagCount,
} from '@/hooks/useLeagues';
import {
  useMyPartnership,
  usePartnershipLeaderboard,
  usePartnershipCourseBests,
  usePartnershipRounds,
  useUntagPartnershipRound,
  useUpdatePartnershipName,
} from '@/hooks/usePartnershipLeague';
import { useCourseDetails } from '@/hooks/useCourseDetails';
import type { LeagueLeaderboardEntry, PartnershipLeaderboardEntry } from '@/types/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, 'LeagueDetail'>;

export type LeagueTab = 'leaderboard' | 'rounds' | 'stats' | 'players' | 'ladder' | 'challenges' | 'myCard' | 'courseBests';

export function useLeagueDetail() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailRoute>();
  const { user } = useAuth();
  const leagueId = route.params.id;

  const { data: league, isLoading, refetch } = useLeague(leagueId);
  const leagueType = league?.league_type ?? 'ongoing';

  // Standard leaderboard (ongoing, season, round_limit)
  const isStandardType = leagueType === 'ongoing' || leagueType === 'season' || leagueType === 'round_limit';
  const { data: leaderboard, refetch: refetchLeaderboard } = useLeagueLeaderboard(
    leagueId,
    isStandardType
  );

  const { data: players } = useLeaguePlayers(leagueId);
  const { data: myRounds, refetch: refetchRounds } = useMyLeagueRounds(leagueId);
  const { data: tagCount } = usePlayerTagCount(leagueId, leagueType === 'round_limit');
  const leaveMutation = useLeaveLeague();
  const joinPublicMutation = useJoinPublicLeague();

  // Check if current user is a member (creator or in players list)
  const isMember = useMemo(() => {
    if (!user?.id || !league) return false;
    if (league.created_by === user.id) return true;
    return players?.some((p) => p.player_id === user.id && p.status === 'accepted') ?? false;
  }, [user?.id, league, players]);

  // Ladder-specific data
  const isLadder = leagueType === 'ladder';
  const { data: ladderStandings, refetch: refetchLadder } = useLadderStandings(leagueId, isLadder);
  const { data: challenges, refetch: refetchChallenges } = useLeagueChallenges(leagueId, undefined, isLadder);
  const { data: myActiveChallenges } = useMyActiveChallenges(leagueId, isLadder);
  const createChallengeMutation = useCreateChallenge(leagueId);
  const respondMutation = useRespondToChallenge(leagueId);

  // Eclectic-specific data
  const isEclectic = leagueType === 'eclectic';
  const { data: eclecticLeaderboard, refetch: refetchEclectic } = useEclecticLeaderboard(leagueId, isEclectic);
  const { data: eclecticBestScores } = useEclecticBestScores(leagueId, user?.id, isEclectic);

  // Partnership-specific data
  const isPartnership = leagueType === 'partnership';
  const [selectedPartnershipEntry, setSelectedPartnershipEntry] = useState<PartnershipLeaderboardEntry | null>(null);
  const { data: myPartnership, refetch: refetchMyPartnership } = useMyPartnership(leagueId, isPartnership);
  const { data: partnershipLeaderboard, refetch: refetchPartnershipLb } = usePartnershipLeaderboard(leagueId, isPartnership);
  const { data: partnershipCourseBests, refetch: refetchPartnershipCB } = usePartnershipCourseBests(leagueId, isPartnership);
  const { data: partnershipRounds, refetch: refetchPartnershipRounds } = usePartnershipRounds(
    myPartnership?.id ?? '',
    isPartnership && !!myPartnership
  );
  const { data: selectedPartnershipRounds, isLoading: isLoadingSelectedPartnershipRounds } = usePartnershipRounds(
    selectedPartnershipEntry?.partnership_id ?? '',
    isPartnership && !!selectedPartnershipEntry
  );
  const untagPartnershipRoundMutation = useUntagPartnershipRound(leagueId, myPartnership?.id ?? '');
  const updatePartnershipNameMutation = useUpdatePartnershipName(leagueId);

  // Eclectic course details (holes, name)
  const { data: eclecticCourse } = useCourseDetails(league?.course_id ?? '', {
    enabled: isEclectic && !!league?.course_id,
  });

  const eclecticCourseHoles = useMemo(() => {
    if (!eclecticCourse?.holes) return [];
    return eclecticCourse.holes.map((h) => ({
      hole_number: h.number,
      par: h.par,
      stroke_index: h.strokeIndex,
    }));
  }, [eclecticCourse?.holes]);

  const eclecticCourseName = useMemo(() => {
    if (!eclecticCourse) return '';
    const clubName = eclecticCourse.club?.name;
    if (!clubName || eclecticCourse.name === clubName) return eclecticCourse.name;
    return `${eclecticCourse.name} @ ${clubName}`;
  }, [eclecticCourse]);

  // Default tab based on league type
  const defaultTab: LeagueTab = useMemo(() => {
    if (isLadder) return 'ladder';
    return 'leaderboard';
  }, [isLadder]);

  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [showStartRound, setShowStartRound] = useState(false);

  const [activeTab, setActiveTab] = useState<LeagueTab>(defaultTab);
  const [selectedPlayer, setSelectedPlayer] = useState<LeagueLeaderboardEntry | null>(null);

  const { data: playerRounds, isLoading: isLoadingPlayerRounds } = usePlayerLeagueRounds(
    leagueId,
    selectedPlayer?.player_id ?? null
  );

  const isCreator = league?.created_by === user?.id;
  const isArchived = league?.status === 'archived';

  // Current user's ladder position
  const currentUserPosition = useMemo(() => {
    if (!isLadder || !ladderStandings || !user?.id) return null;
    const entry = ladderStandings.find((s) => s.player_id === user.id);
    return entry?.ladder_position ?? null;
  }, [isLadder, ladderStandings, user?.id]);

  const hasActiveChallenge = (myActiveChallenges?.length ?? 0) > 0;

  // Season status info
  const seasonInfo = useMemo(() => {
    if (leagueType !== 'season' || !league?.start_date || !league?.end_date) return null;
    const today = new Date().toISOString().split('T')[0];
    const started = today >= league.start_date;
    const ended = today > league.end_date;

    if (ended) return { status: 'ended' as const, label: 'Season Complete' };
    if (!started) {
      const daysUntil = Math.ceil(
        (new Date(league.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return { status: 'upcoming' as const, label: `Starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}` };
    }

    const daysLeft = Math.ceil(
      (new Date(league.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return { status: 'active' as const, label: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining` };
  }, [leagueType, league?.start_date, league?.end_date]);

  // Round limit progress info
  const roundLimitInfo = useMemo(() => {
    if (leagueType !== 'round_limit' || !league?.max_rounds) return null;
    const used = tagCount ?? (myRounds?.length ?? 0);
    return {
      used,
      max: league.max_rounds,
      counting: league.counting_rounds,
      remaining: Math.max(0, league.max_rounds - used),
    };
  }, [leagueType, league?.max_rounds, league?.counting_rounds, tagCount, myRounds?.length]);

  const leaderboardWithTied = useMemo(() => {
    if (!leaderboard) return [];
    return leaderboard.map((entry, index) => {
      const isTied =
        (index > 0 && leaderboard[index - 1].avg_differential === entry.avg_differential) ||
        (index < leaderboard.length - 1 &&
          leaderboard[index + 1].avg_differential === entry.avg_differential);
      return { entry, isTied };
    });
  }, [leaderboard]);

  // Get the tabs based on league type
  const tabs = useMemo(() => {
    switch (leagueType) {
      case 'ladder':
        return [
          { key: 'ladder' as const, label: 'Ladder' },
          { key: 'challenges' as const, label: 'Challenges' },
          { key: 'players' as const, label: 'Players' },
        ];
      case 'eclectic':
        return [
          { key: 'leaderboard' as const, label: 'Leaderboard' },
          { key: 'myCard' as const, label: 'My Card' },
          { key: 'players' as const, label: 'Players' },
        ];
      case 'partnership':
        return [
          { key: 'leaderboard' as const, label: 'Leaderboard' },
          { key: 'courseBests' as const, label: 'Course Bests' },
          { key: 'rounds' as const, label: 'My Rounds' },
          { key: 'players' as const, label: 'Players' },
        ];
      default:
        return [
          { key: 'leaderboard' as const, label: 'Leaderboard' },
          { key: 'rounds' as const, label: 'My Rounds' },
          { key: 'stats' as const, label: 'Stats' },
          { key: 'players' as const, label: 'Players' },
        ];
    }
  }, [leagueType]);

  const handleRefresh = useCallback(() => {
    refetch();
    if (isStandardType) refetchLeaderboard();
    if (isLadder) { refetchLadder(); refetchChallenges(); }
    if (isEclectic) refetchEclectic();
    if (isPartnership) { refetchPartnershipLb(); refetchPartnershipCB(); refetchMyPartnership(); if (myPartnership) refetchPartnershipRounds(); }
    refetchRounds();
  }, [refetch, refetchLeaderboard, refetchRounds, refetchLadder, refetchChallenges, refetchEclectic, refetchPartnershipLb, refetchPartnershipCB, refetchMyPartnership, refetchPartnershipRounds, isStandardType, isLadder, isEclectic, isPartnership, myPartnership]);

  const handleShare = useCallback(async () => {
    if (!league) return;
    try {
      await Share.share({
        message: `Join my league "${league.name}" on The Nineteenth! Use code: ${league.invite_code}`,
      });
    } catch {
      // User cancelled
    }
  }, [league]);

  const handleTagRound = useCallback(() => {
    if (isPartnership && myPartnership) {
      navigation.navigate('TagPartnershipRound', { leagueId, partnershipId: myPartnership.id });
    } else {
      navigation.navigate('TagRoundToLeague', { leagueId });
    }
  }, [navigation, leagueId, isPartnership, myPartnership]);

  const handlePartnershipSetup = useCallback(() => {
    navigation.navigate('PartnershipSetup', { leagueId });
  }, [navigation, leagueId]);

  const handlePartnershipLeaderboardPress = useCallback((entry: PartnershipLeaderboardEntry) => {
    setSelectedPartnershipEntry(entry);
  }, []);

  const handleClosePartnershipRoundsModal = useCallback(() => {
    setSelectedPartnershipEntry(null);
  }, []);

  const handleUntagPartnershipRound = useCallback(
    async (roundId: string) => {
      try {
        await untagPartnershipRoundMutation.mutateAsync(roundId);
      } catch (error: unknown) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong');
      }
    },
    [untagPartnershipRoundMutation]
  );

  const handleRenamePartnership = useCallback(
    async (name: string) => {
      if (!myPartnership) return;
      try {
        await updatePartnershipNameMutation.mutateAsync({ partnershipId: myPartnership.id, name });
      } catch (error: unknown) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong');
      }
    },
    [myPartnership, updatePartnershipNameMutation]
  );

  const handleOpenAddPlayers = useCallback(() => {
    setShowAddPlayers(true);
  }, []);

  const handleCloseAddPlayers = useCallback(() => {
    setShowAddPlayers(false);
  }, []);

  // Start Round Now
  const handleStartRoundNow = useCallback(() => {
    setShowStartRound(true);
  }, []);

  const handleCloseStartRound = useCallback(() => {
    setShowStartRound(false);
  }, []);

  const handleSettings = useCallback(() => {
    navigation.navigate('LeagueSettings', { leagueId });
  }, [navigation, leagueId]);

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Leave League',
      'Your tagged rounds will be removed from this league. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveMutation.mutateAsync(leagueId);
              navigation.goBack();
            } catch (error: unknown) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong');
            }
          },
        },
      ]
    );
  }, [leagueId, leaveMutation, navigation]);

  const handleLeaderboardRowPress = useCallback((entry: LeagueLeaderboardEntry) => {
    setSelectedPlayer(entry);
  }, []);

  const handleClosePlayerRounds = useCallback(() => {
    setSelectedPlayer(null);
  }, []);

  const handleRoundPress = useCallback(
    (scorecardId: string, roundId: string, _playerId: string) => {
      if (!roundId) return;
      setSelectedPlayer(null);
      navigation.navigate('ViewRound', { roundId });
    },
    [navigation]
  );

  // Ladder-specific handlers
  const handleChallenge = useCallback(
    async (playerId: string) => {
      try {
        await createChallengeMutation.mutateAsync(playerId);
        Alert.alert('Challenge Sent', 'Your challenge has been sent. They have 48 hours to respond.');
      } catch (error: unknown) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong');
      }
    },
    [createChallengeMutation]
  );

  const handleChallengePress = useCallback(
    (challengeId: string) => {
      navigation.navigate('ChallengeDetail', { challengeId, leagueId });
    },
    [navigation, leagueId]
  );

  const handleAcceptChallenge = useCallback(
    async (challengeId: string) => {
      try {
        await respondMutation.mutateAsync({ challengeId, accept: true });
      } catch (error: unknown) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong');
      }
    },
    [respondMutation]
  );

  const handleDeclineChallenge = useCallback(
    async (challengeId: string) => {
      Alert.alert(
        'Decline Challenge',
        'Are you sure you want to decline this challenge?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Decline',
            style: 'destructive',
            onPress: async () => {
              try {
                await respondMutation.mutateAsync({ challengeId, accept: false });
              } catch (error: unknown) {
                Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong');
              }
            },
          },
        ]
      );
    },
    [respondMutation]
  );

  const handleJoinPublicLeague = useCallback(async () => {
    try {
      await joinPublicMutation.mutateAsync(leagueId);
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to join league');
    }
  }, [joinPublicMutation, leagueId]);

  return {
    // Data
    league,
    leagueType,
    leaderboardWithTied,
    players,
    myRounds,
    playerRounds,
    selectedPlayer,
    isLoading,
    isLoadingPlayerRounds,
    isCreator,
    isArchived,
    isMember,
    isJoining: joinPublicMutation.isPending,
    leagueId,
    userId: user?.id,

    // Type-specific data
    seasonInfo,
    roundLimitInfo,
    ladderStandings: ladderStandings ?? [],
    challenges: challenges ?? [],
    myActiveChallenges: myActiveChallenges ?? [],
    currentUserPosition,
    hasActiveChallenge,
    eclecticLeaderboard: eclecticLeaderboard ?? [],
    eclecticBestScores: eclecticBestScores ?? [],
    eclecticCourse: eclecticCourse ?? null,
    eclecticCourseHoles,
    eclecticCourseName,
    myPartnership: myPartnership ?? null,
    partnershipLeaderboard: partnershipLeaderboard ?? [],
    partnershipCourseBests: partnershipCourseBests ?? [],
    partnershipRounds: partnershipRounds ?? [],
    selectedPartnershipEntry,
    selectedPartnershipRounds: selectedPartnershipRounds ?? [],
    isLoadingSelectedPartnershipRounds,

    // Tab state
    tabs,
    activeTab,
    setActiveTab,

    // Handlers
    handleRefresh,
    handleShare,
    handleTagRound,
    handleSettings,
    handleLeave,
    handleLeaderboardRowPress,
    handleClosePlayerRounds,
    handleRoundPress,

    // Ladder handlers
    handleChallenge,
    handleChallengePress,
    handleAcceptChallenge,
    handleDeclineChallenge,

    // Partnership handlers
    handlePartnershipSetup,
    handlePartnershipLeaderboardPress,
    handleClosePartnershipRoundsModal,
    handleUntagPartnershipRound,
    handleRenamePartnership,

    // Add players
    showAddPlayers,
    handleOpenAddPlayers,
    handleCloseAddPlayers,

    // Start round now
    showStartRound,
    handleStartRoundNow,
    handleCloseStartRound,

    // Public join
    handleJoinPublicLeague,
  };
}

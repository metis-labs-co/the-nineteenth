/**
 * useLeagueDetail - Data fetching, state, and callbacks for LeagueDetailScreen
 *
 * Supports all league types: ongoing, season, round_limit, ladder, eclectic
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
  useLadderStandings,
  useLeagueChallenges,
  useMyActiveChallenges,
  useCreateChallenge,
  useRespondToChallenge,
  useEclecticLeaderboard,
  useEclecticBestScores,
  usePlayerTagCount,
} from '@/hooks/useLeagues';
import { useCourseDetails } from '@/hooks/useCourseDetails';
import type { LeagueLeaderboardEntry } from '@/types/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, 'LeagueDetail'>;

export type LeagueTab = 'leaderboard' | 'rounds' | 'stats' | 'players' | 'ladder' | 'challenges' | 'myCard';

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
    refetchRounds();
  }, [refetch, refetchLeaderboard, refetchRounds, refetchLadder, refetchChallenges, refetchEclectic, isStandardType, isLadder, isEclectic]);

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
    navigation.navigate('TagRoundToLeague', { leagueId });
  }, [navigation, leagueId]);

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
    eclecticCourseHoles,
    eclecticCourseName,

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
  };
}

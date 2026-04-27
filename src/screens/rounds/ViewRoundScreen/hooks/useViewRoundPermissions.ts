import { useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import type { RoundWithCourse, ScorecardWithPlayer, RoundPlayer } from '@/hooks/useRoundDetails';
import type { CompetitionInfo } from '@/hooks/useCompetitionInfo';
import { getHoleCount } from '@/constants/scoring';

interface UseViewRoundPermissionsParams {
  user: User | null;
  round: RoundWithCourse | undefined;
  scorecards: ScorecardWithPlayer[] | undefined;
  roundPlayers: RoundPlayer[] | undefined;
  competitionInfo: CompetitionInfo | null | undefined;
  isStandalone: boolean;
}

export function useViewRoundPermissions({
  user,
  round,
  scorecards,
  roundPlayers,
  competitionInfo,
  isStandalone,
}: UseViewRoundPermissionsParams) {
  const isUserPlaying = useMemo(() => {
    if (!user?.id) return false;
    if (isStandalone && round?.user_id === user.id) return true;
    if (scorecards?.some((sc) => sc.player_id === user.id)) return true;
    // Scorecards are created lazily on first score entry, so for upcoming
    // competition rounds we also have to check the roster (which pulls from
    // competition_players + pairings) — otherwise the Score Round button
    // never appears for competition players.
    if (roundPlayers?.some((rp) => rp.id === user.id)) return true;
    return false;
  }, [user?.id, scorecards, roundPlayers, isStandalone, round?.user_id]);

  const isOrganizer = useMemo(() => {
    if (!user?.id) return false;
    if (isStandalone && round?.user_id === user.id) return true;
    if (competitionInfo?.organizer_id === user.id) return true;
    return false;
  }, [user?.id, isStandalone, round?.user_id, competitionInfo?.organizer_id]);

  const canDelete = useMemo(() => {
    if (!user?.id || !round) return false;
    if (isStandalone && round.user_id === user.id) return true;
    if (!isStandalone && competitionInfo?.organizer_id === user.id) {
      return round.status === 'upcoming';
    }
    return false;
  }, [user?.id, round, isStandalone, competitionInfo?.organizer_id]);

  const userScorecardId = useMemo(() => {
    if (!user?.id || !scorecards) return undefined;
    return scorecards.find((sc) => sc.player_id === user.id)?.id;
  }, [user?.id, scorecards]);

  const userScorecardSubmitted = useMemo(() => {
    if (!user?.id || !scorecards) return false;
    const userScorecard = scorecards.find((sc) => sc.player_id === user.id);
    if (!userScorecard) return false;
    return userScorecard.status === 'completed' || userScorecard.status === 'confirmed';
  }, [user?.id, scorecards]);

  const canTagToLeague = useMemo(() => {
    if (!user?.id || !scorecards || !round) return false;
    // Competition rounds cannot be tagged to leagues — those rounds belong
    // to the competition leaderboard, not the league differentials feed.
    if (round.competition_id) return false;
    const userScorecard = scorecards.find((sc) => sc.player_id === user.id);
    if (!userScorecard) return false;
    if (userScorecard.status !== 'completed' && userScorecard.status !== 'confirmed') return false;
    if (userScorecard.handicap_differential == null) return false;
    const scores = userScorecard.scores;
    if (!scores) return false;
    const scoredHoles = Object.values(scores).filter(
      (s) => s && 'strokes' in s && s.strokes != null && s.strokes > 0
    );
    const expectedHoles = round?.nine_type ? getHoleCount(round.nine_type) : 18;
    return scoredHoles.length >= expectedHoles;
  }, [user?.id, scorecards, round]);

  return {
    isUserPlaying,
    isOrganizer,
    canDelete,
    canTagToLeague,
    userScorecardId,
    userScorecardSubmitted,
  };
}

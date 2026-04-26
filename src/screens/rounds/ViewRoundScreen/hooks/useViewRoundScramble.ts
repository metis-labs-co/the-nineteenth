/**
 * useViewRoundScramble - Scramble-specific logic for ViewRoundScreen
 *
 * Handles team extraction, player mapping, score retrieval,
 * and handicap calculation for scramble format rounds.
 */

import { useCallback, useMemo, useState } from 'react';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import type { HoleScore, MultiBallHoleScore, Player } from '@/types';
import type { StandaloneTeamConfig } from '@/types/supabase/roundQueries';
import { calculateScrambleTeamHandicap } from '@/utils/teamScoring/scramble';

interface UseViewRoundScrambleParams {
  isScrambleRound: boolean;
  round:
    | {
        id?: string;
        competition_id?: string | null;
        team_format?: string | null;
        is_team_round?: boolean;
      }
    | null
    | undefined;
  scorecards: Array<{
    player_id: string;
    player?: { name?: string; handicap?: number | null; email?: string } | null;
    scores?: Record<string, HoleScore | MultiBallHoleScore>;
    /**
     * DHC captured at scoring time — derived from the configured handicap
     * source (profile vs calculated index) and the round's tee slope/CR/par.
     * Preferred over `player.handicap` (raw index) when present so team
     * handicap reflects the day's playing handicap, not the raw index.
     */
    daily_handicap_used?: number | null;
  }> | undefined;
  roundPlayers: Array<{
    id: string;
    name: string;
    handicap?: number | null;
    email?: string;
  }> | undefined;
}

export function useViewRoundScramble({
  isScrambleRound,
  round,
  scorecards,
  roundPlayers,
}: UseViewRoundScrambleParams) {
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);

  // Competition rounds store teams in the `teams` table; standalone rounds use
  // `rounds.team_config`. `useRoundTeams` branches correctly for both.
  const { teams: fetchedTeams, isLoading: isLoadingTeams } = useRoundTeams(
    round?.competition_id ?? undefined,
    isScrambleRound,
    round?.id
  );

  const scrambleTeams = useMemo(() => {
    if (!isScrambleRound) return [];

    if (fetchedTeams.length > 0) {
      return fetchedTeams.map((t) => ({
        id: t.id,
        name: t.name,
        memberIds: (t.members ?? []).map((m) => m.player_id),
      }));
    }

    const teamConfig = (round as unknown as { team_config?: StandaloneTeamConfig })?.team_config;
    if (teamConfig?.teams && teamConfig.teams.length > 0) {
      return teamConfig.teams;
    }

    // Still fetching — avoid flashing the single-team fallback over the real roster.
    if (isLoadingTeams) return [];

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
  }, [isScrambleRound, fetchedTeams, isLoadingTeams, round, scorecards, roundPlayers]);

  // Build a player map from scorecards and round players.
  // For scramble team handicap purposes, `Player.handicap` here carries the
  // round's DHC (preferred) and falls back to the player's raw index. The
  // scramble formula sums these values, so resolving DHC at this seam keeps
  // every downstream consumer (team HC display, leaderboard) aligned.
  const buildPlayerMap = useCallback((): Map<string, Player> => {
    const playerMap = new Map<string, Player>();

    scorecards?.forEach((sc) => {
      const dhc =
        typeof sc.daily_handicap_used === 'number'
          ? sc.daily_handicap_used
          : null;
      playerMap.set(sc.player_id, {
        id: sc.player_id,
        name: sc.player?.name || 'Unknown',
        handicap: dhc ?? sc.player?.handicap ?? 0,
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

    return playerMap;
  }, [scorecards, roundPlayers]);

  // Get players for the currently selected scramble team
  const scrambleTeamPlayers: Player[] = useMemo(() => {
    if (!isScrambleRound || scrambleTeams.length === 0) return [];

    const selectedTeam = scrambleTeams[selectedTeamIndex] || scrambleTeams[0];
    if (!selectedTeam) return [];

    const playerMap = buildPlayerMap();

    return selectedTeam.memberIds
      .map((id) => playerMap.get(id))
      .filter((p): p is Player => p !== undefined);
  }, [isScrambleRound, scrambleTeams, selectedTeamIndex, buildPlayerMap]);

  // Get team handicap (25% of sum of member handicaps for scramble).
  // Shared with finalization via calculateScrambleTeamHandicap.
  const scrambleTeamHandicap = useMemo(
    () => calculateScrambleTeamHandicap(scrambleTeamPlayers),
    [scrambleTeamPlayers]
  );

  // Get all players for scramble leaderboard (needed for team member lookup).
  // Must UNION scorecards + roundPlayers, not either/or — a team member who
  // never personally submitted a scorecard (e.g. wasn't the designated scorer
  // in a scramble) still belongs in the team's member list. A scorecards-only
  // path silently drops them and the team appears with the wrong member count.
  // `handicap` here carries DHC where available (see buildPlayerMap).
  const allScramblePlayers: Player[] = useMemo(() => {
    if (!isScrambleRound) return [];

    const byId = new Map<string, Player>();

    scorecards?.forEach((sc) => {
      const dhc =
        typeof sc.daily_handicap_used === 'number'
          ? sc.daily_handicap_used
          : null;
      byId.set(sc.player_id, {
        id: sc.player_id,
        name: sc.player?.name || 'Unknown',
        handicap: dhc ?? sc.player?.handicap ?? 0,
        email: sc.player?.email || '',
      });
    });

    roundPlayers?.forEach((p) => {
      if (!byId.has(p.id)) {
        byId.set(p.id, {
          id: p.id,
          name: p.name,
          handicap: p.handicap ?? 0,
          email: p.email || '',
        });
      }
    });

    return Array.from(byId.values());
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

    const playerMap = buildPlayerMap();

    return team.memberIds
      .map((id) => playerMap.get(id))
      .filter((p): p is Player => p !== undefined);
  }, [isScrambleRound, scrambleTeams, buildPlayerMap]);

  // Get team handicap for a specific team by index (shared formula).
  const getScrambleTeamHandicapByIndex = useCallback(
    (teamIndex: number): number =>
      calculateScrambleTeamHandicap(getScrambleTeamPlayersByIndex(teamIndex)),
    [getScrambleTeamPlayersByIndex]
  );

  return {
    selectedTeamIndex,
    setSelectedTeamIndex,
    scrambleTeams,
    scrambleTeamPlayers,
    scrambleTeamHandicap,
    allScramblePlayers,
    getScrambleTeamScore,
    getScrambleTeamScoreByIndex,
    getScrambleTeamPlayersByIndex,
    getScrambleTeamHandicapByIndex,
  };
}

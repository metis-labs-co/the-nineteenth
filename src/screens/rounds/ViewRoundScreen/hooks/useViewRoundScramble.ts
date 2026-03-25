/**
 * useViewRoundScramble - Scramble-specific logic for ViewRoundScreen
 *
 * Handles team extraction, player mapping, score retrieval,
 * and handicap calculation for scramble format rounds.
 */

import { useCallback, useMemo, useState } from 'react';
import type { HoleScore, MultiBallHoleScore, Player } from '@/types';
import type { StandaloneTeamConfig } from '@/types/supabase/roundQueries';

interface UseViewRoundScrambleParams {
  isScrambleRound: boolean;
  round: { team_format?: string | null; is_team_round?: boolean } | null | undefined;
  scorecards: Array<{
    player_id: string;
    player?: { name?: string; handicap?: number | null; email?: string } | null;
    scores?: Record<string, HoleScore | MultiBallHoleScore>;
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

  // Build a player map from scorecards and round players
  const buildPlayerMap = useCallback((): Map<string, Player> => {
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

    const playerMap = buildPlayerMap();

    return team.memberIds
      .map((id) => playerMap.get(id))
      .filter((p): p is Player => p !== undefined);
  }, [isScrambleRound, scrambleTeams, buildPlayerMap]);

  // Get team handicap for a specific team by index
  const getScrambleTeamHandicapByIndex = useCallback((teamIndex: number): number => {
    const teamPlayers = getScrambleTeamPlayersByIndex(teamIndex);
    if (teamPlayers.length === 0) return 0;
    const totalHandicap = teamPlayers.reduce((sum, p) => sum + (p.handicap ?? 0), 0);
    return Math.round((totalHandicap * 0.25) * 10) / 10;
  }, [getScrambleTeamPlayersByIndex]);

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

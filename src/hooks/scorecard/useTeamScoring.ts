/**
 * useTeamScoring Hook
 *
 * Manages team scoring logic for different team formats:
 * - Scramble: All team members get the same score
 * - Best Ball: Each player scores individually, best counts
 * - Team Match Play: Track team vs team hole results
 */

import { useState, useCallback, useMemo } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import type { HoleScore, Player } from '@/types';
import type { TeamFormat, TeamWithMembers } from '@/types/database.types';

interface UseTeamScoringParams {
  teams: TeamWithMembers[];
  teamFormat: TeamFormat | null;
  currentHole: number;
  players: Player[];
}

interface UseTeamScoringResult {
  // State
  selectedContributor: string | undefined;
  teamMatchPlayResults: Map<number, 'team1' | 'team2' | 'halved'>;

  // Memoized data
  playerScoresMap: Map<string, HoleScore | undefined>;

  // Actions
  setSelectedContributor: (playerId: string | undefined) => void;
  handleTeamScoreSelect: (teamIndex: number, strokes: number) => Promise<void>;
  handleBestBallScoreSelect: (playerId: string, strokes: number) => Promise<void>;
  handleTeamMatchPlayScoreSelect: (teamIndex: number, strokes: number) => Promise<void>;
  getTeamScore: (teamIndex: number) => HoleScore | undefined;
}

/**
 * Hook for managing team-based scoring
 */
export function useTeamScoring({
  teams,
  teamFormat,
  currentHole,
  players,
}: UseTeamScoringParams): UseTeamScoringResult {
  const { setPlayerScore, getPlayerScore } = useScorecardStore();

  // Team-specific state
  const [selectedContributor, setSelectedContributor] = useState<string | undefined>();
  const [teamMatchPlayResults, setTeamMatchPlayResults] = useState<
    Map<number, 'team1' | 'team2' | 'halved'>
  >(new Map());

  // Memoized player scores map for team components
  // Includes both players array AND team members to ensure all rendered players have scores
  const playerScoresMap = useMemo(() => {
    const map = new Map<string, HoleScore | undefined>();

    // Add players from players array
    players.forEach((player) => {
      map.set(player.id, getPlayerScore(player.id, currentHole));
    });

    // Also add team members (they should have scorecards initialized)
    teams.forEach((team) => {
      (team.members || []).forEach((member) => {
        if (!map.has(member.player_id)) {
          map.set(member.player_id, getPlayerScore(member.player_id, currentHole));
        }
      });
    });

    return map;
  }, [players, teams, currentHole, getPlayerScore]);

  // Team score handlers for Scramble format
  const handleTeamScoreSelect = useCallback(
    async (teamIndex: number, strokes: number) => {
      // For Scramble, all team members get the same score
      const team = teams[teamIndex];
      if (!team) return;

      for (const member of team.members || []) {
        await setPlayerScore(member.player_id, currentHole, strokes);
      }
    },
    [currentHole, setPlayerScore, teams]
  );

  // Handler for Best Ball score selection
  const handleBestBallScoreSelect = useCallback(
    async (playerId: string, strokes: number) => {
      await setPlayerScore(playerId, currentHole, strokes);
    },
    [currentHole, setPlayerScore]
  );

  // Handler for Team Match Play score selection
  const handleTeamMatchPlayScoreSelect = useCallback(
    async (teamIndex: number, strokes: number) => {
      // For Team Match Play, we track the team's combined/best score
      const team = teams[teamIndex];
      if (!team) return;

      // Use the first player as the score holder for the team
      const firstMember = team.members?.[0];
      if (firstMember) {
        await setPlayerScore(firstMember.player_id, currentHole, strokes);
      }
    },
    [currentHole, setPlayerScore, teams]
  );

  // Get team score for match play
  const getTeamScore = useCallback(
    (teamIndex: number): HoleScore | undefined => {
      const team = teams[teamIndex];
      if (!team) return undefined;
      const firstMember = team.members?.[0];
      if (!firstMember) return undefined;
      return getPlayerScore(firstMember.player_id, currentHole);
    },
    [teams, getPlayerScore, currentHole]
  );

  return {
    selectedContributor,
    teamMatchPlayResults,
    playerScoresMap,
    setSelectedContributor,
    handleTeamScoreSelect,
    handleBestBallScoreSelect,
    handleTeamMatchPlayScoreSelect,
    getTeamScore,
  };
}

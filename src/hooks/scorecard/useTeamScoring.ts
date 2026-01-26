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
import { teamScoringLogger } from '@/utils/debugLogger';
import type { HoleScore, MultiBallHoleScore, Player, HoleShotContributions } from '@/types';
import { isSingleBallScore } from '@/types/database';
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
  playerScoresMap: Map<string, HoleScore | MultiBallHoleScore | undefined>;

  // Actions
  setSelectedContributor: (playerId: string | undefined) => void;
  handleTeamScoreSelect: (teamIndex: number, strokes: number) => Promise<void>;
  handleBestBallScoreSelect: (playerId: string, strokes: number) => Promise<void>;
  handleTeamMatchPlayScoreSelect: (teamIndex: number, strokes: number) => Promise<void>;
  getTeamScore: (teamIndex: number) => HoleScore | MultiBallHoleScore | undefined;
  /** Update shot contributions for scramble format */
  handleShotContributionsChange: (teamIndex: number, contributions: HoleShotContributions) => Promise<void>;
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
  const { setPlayerScore, getPlayerScore, updateShotContributions, groupScorecards } = useScorecardStore();

  // Team-specific state
  const [selectedContributor, setSelectedContributor] = useState<string | undefined>();
  const [teamMatchPlayResults, _setTeamMatchPlayResults] = useState<
    Map<number, 'team1' | 'team2' | 'halved'>
  >(new Map());

  // Memoized player scores map for team components
  // Includes both players array AND team members to ensure all rendered players have scores
  const playerScoresMap = useMemo(() => {
    const map = new Map<string, HoleScore | MultiBallHoleScore | undefined>();

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

    teamScoringLogger.debug('Player scores map updated', {
      hole: currentHole,
      teamFormat,
      playerCount: players.length,
      teamCount: teams.length,
      scoresMapSize: map.size,
      scores: Array.from(map.entries()).map(([id, score]) => ({
        playerId: id.substring(0, 8),
        strokes: score && isSingleBallScore(score) ? score.strokes : null,
      })),
    });

    return map;
  }, [players, teams, currentHole, getPlayerScore, teamFormat, groupScorecards]);

  // Team score handlers for Scramble format
  const handleTeamScoreSelect = useCallback(
    async (teamIndex: number, strokes: number) => {
      // For Scramble, all team members get the same score
      const team = teams[teamIndex];
      if (!team) {
        teamScoringLogger.warn('handleTeamScoreSelect: Team not found', { teamIndex });
        return;
      }

      teamScoringLogger.info('SCRAMBLE: Setting score for all team members', {
        teamIndex,
        teamName: team.name,
        strokes,
        hole: currentHole,
        memberCount: team.members?.length || 0,
        members: team.members?.map(m => m.player?.name || m.player_id.substring(0, 8)),
      });

      for (const member of team.members || []) {
        teamScoringLogger.debug('SCRAMBLE: Setting player score', {
          playerId: member.player_id.substring(0, 8),
          playerName: member.player?.name,
          strokes,
        });
        await setPlayerScore(member.player_id, currentHole, strokes);
      }
    },
    [currentHole, setPlayerScore, teams]
  );

  // Handler for Best Ball score selection
  const handleBestBallScoreSelect = useCallback(
    async (playerId: string, strokes: number) => {
      // Find which team this player is on
      const playerTeam = teams.find(t => t.members?.some(m => m.player_id === playerId));
      const playerName = playerTeam?.members?.find(m => m.player_id === playerId)?.player?.name;

      teamScoringLogger.info('BEST BALL: Setting individual player score', {
        playerId: playerId.substring(0, 8),
        playerName,
        teamName: playerTeam?.name,
        strokes,
        hole: currentHole,
      });
      await setPlayerScore(playerId, currentHole, strokes);
    },
    [currentHole, setPlayerScore, teams]
  );

  // Handler for Team Match Play score selection
  const handleTeamMatchPlayScoreSelect = useCallback(
    async (teamIndex: number, strokes: number) => {
      // For Team Match Play, we track the team's combined/best score
      const team = teams[teamIndex];
      if (!team) {
        teamScoringLogger.warn('handleTeamMatchPlayScoreSelect: Team not found', { teamIndex });
        return;
      }

      // Use the first player as the score holder for the team
      const firstMember = team.members?.[0];
      if (firstMember) {
        teamScoringLogger.info('TEAM MATCH PLAY: Setting team score', {
          teamIndex,
          teamName: team.name,
          strokes,
          hole: currentHole,
          scoreHolderPlayerId: firstMember.player_id.substring(0, 8),
          scoreHolderName: firstMember.player?.name,
        });
        await setPlayerScore(firstMember.player_id, currentHole, strokes);
      } else {
        teamScoringLogger.warn('TEAM MATCH PLAY: No members in team', {
          teamIndex,
          teamName: team.name,
        });
      }
    },
    [currentHole, setPlayerScore, teams]
  );

  // Get team score for match play
  const getTeamScore = useCallback(
    (teamIndex: number): HoleScore | MultiBallHoleScore | undefined => {
      const team = teams[teamIndex];
      if (!team) {
        teamScoringLogger.debug('getTeamScore: Team not found', { teamIndex });
        return undefined;
      }
      const firstMember = team.members?.[0];
      if (!firstMember) {
        teamScoringLogger.debug('getTeamScore: No members in team', { teamIndex, teamName: team.name });
        return undefined;
      }
      const score = getPlayerScore(firstMember.player_id, currentHole);
      teamScoringLogger.debug('getTeamScore result', {
        teamIndex,
        teamName: team.name,
        hole: currentHole,
        strokes: score && isSingleBallScore(score) ? score.strokes : null,
      });
      return score;
    },
    [teams, getPlayerScore, currentHole]
  );

  // Handler for shot contributions (scramble format)
  const handleShotContributionsChange = useCallback(
    async (teamIndex: number, contributions: HoleShotContributions) => {
      const team = teams[teamIndex];
      if (!team) {
        teamScoringLogger.warn('handleShotContributionsChange: Team not found', { teamIndex });
        return;
      }

      teamScoringLogger.info('SCRAMBLE: Updating shot contributions for team', {
        teamIndex,
        teamName: team.name,
        hole: currentHole,
        contributions,
        memberCount: team.members?.length || 0,
      });

      // Update shot contributions for all team members (they share the same scorecard data)
      for (const member of team.members || []) {
        await updateShotContributions(member.player_id, currentHole, contributions);
      }
    },
    [currentHole, updateShotContributions, teams]
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
    handleShotContributionsChange,
  };
}

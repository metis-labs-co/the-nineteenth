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
import { teamScoringLogger, scoringLogger } from '@/utils/debugLogger';
import type { HoleScore, MultiBallHoleScore, Player, HoleShotContributions, Hole } from '@/types';
import { isSingleBallScore } from '@/types/database';
import type { TeamFormat, TeamWithMembers } from '@/types/database.types';

/** Skins processing function signature */
interface ProcessSkinsHoleParams {
  roundId: string;
  holeNumber: number;
  scorecards: Record<string, { [holeNumber: string]: { strokes: number } | number }>;
  hole: { par: number; strokeIndex: number };
}

interface ProcessSkinsHoleResult {
  processed: boolean;
  hasWinner?: boolean;
  winnerName?: string;
  winningsAmount?: number;
  carryoverAmount?: number;
}

interface UseTeamScoringParams {
  teams: TeamWithMembers[];
  teamFormat: TeamFormat | null;
  currentHole: number;
  players: Player[];
  /** Round ID for skins processing */
  roundId?: string;
  /** Function to get hole info for skins processing */
  getHoleInfo?: (holeNumber: number) => Hole | undefined;
  /** Skins processing function */
  processSkinsHole?: (params: ProcessSkinsHoleParams) => Promise<ProcessSkinsHoleResult>;
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
  roundId,
  getHoleInfo,
  processSkinsHole,
}: UseTeamScoringParams): UseTeamScoringResult {
  const { setPlayerScore, getPlayerScore, updateShotContributions, groupScorecards } = useScorecardStore();

  // Helper to trigger skins processing after team score entry
  const triggerSkinsProcessing = useCallback(async (holeNumber: number) => {
    if (!processSkinsHole || !roundId || !getHoleInfo) {
      teamScoringLogger.debug('Skins processing skipped - missing dependencies', {
        hasProcessFn: !!processSkinsHole,
        hasRoundId: !!roundId,
        hasGetHoleInfo: !!getHoleInfo,
      });
      return;
    }

    const holeData = getHoleInfo(holeNumber);
    if (!holeData) {
      teamScoringLogger.debug('Skins processing skipped - no hole data', { holeNumber });
      return;
    }

    // Get fresh state from store after scores were saved
    const latestScorecards = useScorecardStore.getState().groupScorecards;
    const scorecardsRecord: Record<string, { [holeNumber: string]: { strokes: number } | number }> = {};
    latestScorecards.forEach((scorecard, pId) => {
      // Cast scores to expected type - runtime compatible even though TS types differ
      scorecardsRecord[pId] = scorecard.scores as unknown as { [holeNumber: string]: { strokes: number } | number };
    });

    teamScoringLogger.debug('Triggering skins processing', {
      roundId: roundId.substring(0, 8),
      holeNumber,
      teamFormat,
      scorecardCount: Object.keys(scorecardsRecord).length,
    });

    try {
      const result = await processSkinsHole({
        roundId,
        holeNumber,
        scorecards: scorecardsRecord,
        hole: { par: holeData.par, strokeIndex: holeData.strokeIndex },
      });

      if (result.processed) {
        if (result.hasWinner) {
          scoringLogger.info('SKINS (team): Hole winner', {
            hole: holeNumber,
            winner: result.winnerName,
            amount: result.winningsAmount,
          });
        } else if (result.carryoverAmount) {
          scoringLogger.info('SKINS (team): Hole tied, carryover', {
            hole: holeNumber,
            carryover: result.carryoverAmount,
          });
        }
      }
    } catch (error) {
      // Non-blocking - log error but don't fail score entry
      scoringLogger.warn('SKINS (team): Processing error (non-blocking)', { error });
    }
  }, [processSkinsHole, roundId, getHoleInfo, teamFormat]);

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
    // groupScorecards must be a dep — getPlayerScore reads from it via the
    // store's `get()`, so without this the memo returns stale scores after
    // setPlayerScore writes (the BestBallScoreView would never re-render
    // with the new score). Lint flags it as unnecessary because it's not
    // referenced directly in the memo body, but it is — through the closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, teams, currentHole, getPlayerScore, teamFormat, groupScorecards]);

  // Team score handlers for Scramble format
  const handleTeamScoreSelect = useCallback(
    async (teamIndex: number, strokes: number) => {
      teamScoringLogger.info('SCRAMBLE: handleTeamScoreSelect', {
        teamIndex,
        strokes,
        hole: currentHole,
        teamsCount: teams.length,
      });

      // For Scramble, all team members get the same score
      const team = teams[teamIndex];
      if (!team) {
        teamScoringLogger.warn('handleTeamScoreSelect: Team not found', { teamIndex });
        return;
      }

      teamScoringLogger.debug('SCRAMBLE: Setting score for all team members', {
        teamIndex,
        teamName: team.name,
        strokes,
        hole: currentHole,
        memberCount: team.members?.length || 0,
      });

      for (const member of team.members || []) {
        await setPlayerScore(member.player_id, currentHole, strokes);
      }

      // Trigger skins processing after all scores are saved (non-blocking)
      triggerSkinsProcessing(currentHole);
    },
    [currentHole, setPlayerScore, teams, triggerSkinsProcessing]
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

      // Trigger skins processing after score is saved (non-blocking)
      triggerSkinsProcessing(currentHole);
    },
    [currentHole, setPlayerScore, teams, triggerSkinsProcessing]
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

        // Trigger skins processing after score is saved (non-blocking)
        triggerSkinsProcessing(currentHole);
      } else {
        teamScoringLogger.warn('TEAM MATCH PLAY: No members in team', {
          teamIndex,
          teamName: team.name,
        });
      }
    },
    [currentHole, setPlayerScore, teams, triggerSkinsProcessing]
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

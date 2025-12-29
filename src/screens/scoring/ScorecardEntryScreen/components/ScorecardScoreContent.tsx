/**
 * ScorecardScoreContent Component
 *
 * Renders the appropriate score content based on round format:
 * - Individual player scoring (default)
 * - Multi-ball scoring (solo practice rounds)
 * - Team Scramble format
 * - Best Ball format
 * - Team Match Play format
 *
 * Also handles scoring pairs filtering to show only players
 * the current user is allowed to score.
 */

import React from 'react';
import {
  PlayerScoreCard,
  TeamScoreCard,
  BestBallScoreView,
  TeamMatchPlayScoreView,
  MultiBallScoreInput,
} from '@/components/scorecard';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import type { TeamFormat, TeamWithMembers } from '@/types/database.types';
import type { BallCount } from '@/types/multiball.types';

export interface ScorecardScoreContentProps {
  // Current hole info
  currentHoleData: Hole;
  currentHole: number;
  // Players
  currentPlayers: Player[];
  playersToScore: Player[];
  scoringPairsEnabled: boolean;
  // Team round info
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  teams: TeamWithMembers[];
  // Score handlers
  onScoreSelect: (playerId: string, strokes: number) => void;
  onStatsUpdate: (playerId: string, updates: Partial<HoleScore>) => void;
  onPlayerPress: (playerId: string) => void;
  // Score getters - matches useScorecardStore interface
  getPlayerScore: (playerId: string, hole: number) => HoleScore | MultiBallHoleScore | undefined;
  getTeamScore: (teamIndex: number) => HoleScore | MultiBallHoleScore | undefined;
  // Team scoring handlers - matches useTeamScoring interface
  handleTeamScoreSelect: (teamIndex: number, strokes: number) => Promise<void>;
  handleBestBallScoreSelect: (playerId: string, strokes: number) => Promise<void>;
  handleTeamMatchPlayScoreSelect: (teamIndex: number, strokes: number) => Promise<void>;
  setSelectedContributor: (playerId: string | undefined) => void;
  selectedContributor: string | undefined;
  // Team match play results - Map of hole number -> result
  teamMatchPlayResults: Map<number, 'team1' | 'team2' | 'halved'>;
  playerScoresMap: Map<string, HoleScore | MultiBallHoleScore | undefined>;
  // Multi-ball props (solo practice rounds)
  isMultiBall?: boolean;
  ballCount?: BallCount;
  onMultiBallScoreChange?: (playerId: string, ballIndex: number, strokes: number) => void;
  getMultiBallScores?: (playerId: string, hole: number) => HoleScore[];
}

export function ScorecardScoreContent({
  currentHoleData,
  currentHole,
  currentPlayers,
  playersToScore,
  scoringPairsEnabled,
  isTeamRound,
  teamFormat,
  teams,
  onScoreSelect,
  onStatsUpdate,
  onPlayerPress,
  getPlayerScore,
  getTeamScore,
  handleTeamScoreSelect,
  handleBestBallScoreSelect,
  handleTeamMatchPlayScoreSelect,
  setSelectedContributor,
  selectedContributor,
  teamMatchPlayResults,
  playerScoresMap,
  // Multi-ball props
  isMultiBall = false,
  ballCount = 1,
  onMultiBallScoreChange,
  getMultiBallScores,
}: ScorecardScoreContentProps) {
  // Determine which players to render based on scoring pairs setting
  const playersToRender =
    scoringPairsEnabled && playersToScore.length > 0 ? playersToScore : currentPlayers;

  // Filter teams to only include members the user can score (for team rounds with scoring pairs)
  const getFilteredTeamMembers = (team: TeamWithMembers) => {
    if (!scoringPairsEnabled || playersToScore.length === 0) {
      return team.members;
    }
    const allowedPlayerIds = new Set(playersToScore.map((p) => p.id));
    return team.members?.filter((m) => allowedPlayerIds.has(m.player_id));
  };

  // Team round: Scramble format
  if (isTeamRound && teamFormat === 'scramble' && teams.length > 0) {
    return (
      <>
        {teams
          .map((team, index) => {
            const filteredMembers = getFilteredTeamMembers(team);
            // Skip team if no members are allowed to be scored by this user
            if (scoringPairsEnabled && (!filteredMembers || filteredMembers.length === 0)) {
              return null;
            }
            return (
              <TeamScoreCard
                key={team.id}
                team={{ ...team, members: filteredMembers }}
                currentHole={currentHoleData}
                currentScore={getTeamScore(index)}
                onScoreSelect={(strokes) => handleTeamScoreSelect(index, strokes)}
                onContributorSelect={setSelectedContributor}
                selectedContributor={selectedContributor}
              />
            );
          })
          .filter(Boolean)}
      </>
    );
  }

  // Team round: Best Ball format
  // Show ALL team members but only allow editing players in playersToScore
  if (isTeamRound && teamFormat === 'best-ball' && teams.length > 0) {
    // Build set of editable player IDs (players the current user can score)
    const editablePlayerIds =
      scoringPairsEnabled && playersToScore.length > 0
        ? new Set(playersToScore.map((p) => p.id))
        : undefined; // undefined means all players are editable

    return (
      <>
        {teams.map((team) => (
          <BestBallScoreView
            key={team.id}
            team={team}
            currentHole={currentHoleData}
            playerScores={playerScoresMap}
            onScoreSelect={handleBestBallScoreSelect}
            editablePlayerIds={editablePlayerIds}
          />
        ))}
      </>
    );
  }

  // Team round: Match Play format (requires exactly 2 teams)
  if (isTeamRound && teamFormat === 'match-play-team' && teams.length >= 2) {
    return (
      <TeamMatchPlayScoreView
        team1={teams[0]}
        team2={teams[1]}
        currentHole={currentHoleData}
        team1Score={getTeamScore(0)}
        team2Score={getTeamScore(1)}
        onTeam1ScoreSelect={(strokes) => handleTeamMatchPlayScoreSelect(0, strokes)}
        onTeam2ScoreSelect={(strokes) => handleTeamMatchPlayScoreSelect(1, strokes)}
        holeResults={teamMatchPlayResults}
      />
    );
  }

  // Multi-ball scoring: Solo practice rounds with multiple balls
  if (isMultiBall && ballCount > 1 && playersToRender.length === 1 && onMultiBallScoreChange && getMultiBallScores) {
    const player = playersToRender[0];
    const ballScores = getMultiBallScores(player.id, currentHole);

    return (
      <MultiBallScoreInput
        player={player}
        currentHole={currentHoleData}
        ballCount={ballCount}
        ballScores={ballScores}
        onBallScoreChange={(ballIndex, strokes) => onMultiBallScoreChange(player.id, ballIndex, strokes)}
      />
    );
  }

  // Default: Individual player scoring
  return (
    <>
      {playersToRender.map((player) => (
        <PlayerScoreCard
          key={player.id}
          player={player}
          currentHole={currentHoleData}
          currentScore={getPlayerScore(player.id, currentHole)}
          onScoreSelect={(strokes) => onScoreSelect(player.id, strokes)}
          onStatsUpdate={(updates) => onStatsUpdate(player.id, updates)}
          onPlayerPress={onPlayerPress}
        />
      ))}
    </>
  );
}

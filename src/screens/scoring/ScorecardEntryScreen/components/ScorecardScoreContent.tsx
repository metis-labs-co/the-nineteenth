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

import React, { useCallback } from 'react';
import {
  PlayerScoreCard,
  TeamScoreCard,
  BestBallScoreView,
  TeamMatchPlayScoreView,
  MultiBallScoreInput,
  StrokePlayScoreCard,
  StrokePlayLeaderboard,
  DriveContributorPicker,
} from '@/components/scorecard';
import { WolfDecisionPrompt } from '@/components/wolf';
import type { Player, Hole, HoleScore, MultiBallHoleScore, ShotContributions, HoleShotContributions } from '@/types';
import type { WolfGameWithParticipants, WolfHoleDecision } from '@/types/database/wolf.types';
import type { TeamFormat, TeamWithMembers, GameType } from '@/types/database.types';
import type { BallCount } from '@/types/multiball.types';
import { isSingleBallScore } from '@/types/database';
import { calculateStablefordPoints, calculateNetScore, calculateParScore, getStrokesOnHole } from '@/utils/scoring';
import { PICKUP_SCORE } from '@/constants/scoring';

export interface ScorecardScoreContentProps {
  // Current hole info
  currentHoleData: Hole;
  currentHole: number;
  // All holes (for leaderboard calculations)
  holes: Hole[];
  // Game type
  gameType: GameType;
  // Players
  currentPlayers: Player[];
  playersToScore: Player[];
  scoringPairsEnabled: boolean;
  currentUserId?: string;
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
  // Shot contributions handler for scramble format
  handleShotContributionsChange?: (teamIndex: number, contributions: HoleShotContributions) => Promise<void>;
  // Multi-ball props (solo practice rounds)
  isMultiBall?: boolean;
  ballCount?: BallCount;
  onMultiBallScoreChange?: (playerId: string, ballIndex: number, strokes: number) => void;
  onMultiBallStatsChange?: (playerId: string, ballIndex: number, updates: Partial<HoleScore>) => void;
  getMultiBallScores?: (playerId: string, hole: number) => HoleScore[];
  // Stats visibility (Premium-only)
  showFIR?: boolean;
  showGIR?: boolean;
  // Wolf game props
  wolfGame?: WolfGameWithParticipants | null;
  wolfDecision?: WolfHoleDecision | null;
  onWolfChoosePartner?: () => void;
  isWolfProcessing?: boolean;
}

export function ScorecardScoreContent({
  currentHoleData,
  currentHole,
  holes,
  gameType,
  currentPlayers,
  playersToScore,
  scoringPairsEnabled,
  currentUserId,
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
  handleShotContributionsChange,
  // Multi-ball props
  isMultiBall = false,
  ballCount = 1,
  onMultiBallScoreChange,
  onMultiBallStatsChange,
  getMultiBallScores,
  // Stats visibility
  showFIR = false,
  showGIR = false,
  // Wolf game props
  wolfGame,
  wolfDecision,
  onWolfChoosePartner,
  isWolfProcessing = false,
}: ScorecardScoreContentProps) {
  // Get shot contributions for a specific team (persisted in scorecard)
  // Each team stores its own contributions in its members' scorecards
  const getTeamShotContributions = useCallback(
    (teamIndex: number): ShotContributions | undefined => {
      if (!isTeamRound || teamFormat !== 'scramble' || teams.length === 0) {
        return undefined;
      }
      // Get the first team member's score (all members share the same score in scramble)
      const team = teams[teamIndex];
      const firstMember = team?.members?.[0];
      if (!firstMember) return undefined;

      const score = playerScoresMap.get(firstMember.player_id);
      if (score && isSingleBallScore(score)) {
        return score.shotContributions;
      }
      return undefined;
    },
    [isTeamRound, teamFormat, teams, playerScoresMap]
  );

  // Create a callback for shot contributions change for a specific team
  const createShotContributionsHandler = useCallback(
    (teamIndex: number) => (contributions: ShotContributions) => {
      if (handleShotContributionsChange) {
        // Convert ShotContributions to HoleShotContributions (same structure)
        handleShotContributionsChange(teamIndex, contributions as HoleShotContributions);
      }
    },
    [handleShotContributionsChange]
  );

  // Determine which players to render based on scoring pairs setting
  const playersToRender =
    scoringPairsEnabled && playersToScore.length > 0 ? playersToScore : currentPlayers;

  /**
   * Calculate running total Stableford points for a player up to (but not including) the current hole.
   * This is used to show cumulative points in the header.
   */
  const getRunningTotalPoints = useCallback(
    (playerId: string, playerHandicap: number): number => {
      let totalPoints = 0;

      // Loop through all holes BEFORE the current hole
      for (let holeNum = 1; holeNum < currentHole; holeNum++) {
        const holeData = holes.find((h) => h.number === holeNum);
        if (!holeData) continue;

        const score = getPlayerScore(playerId, holeNum);
        if (!score) continue;

        // Get strokes from score (handle both single-ball and multi-ball)
        const strokes = isSingleBallScore(score) ? score.strokes : undefined;
        if (!strokes || strokes <= 0) continue;

        // Calculate Stableford points for this hole
        totalPoints += calculateStablefordPoints(strokes, playerHandicap, holeData);
      }

      return totalPoints;
    },
    [currentHole, holes, getPlayerScore]
  );

  /**
   * Calculate running gross and net totals for a player up to (but not including) the current hole.
   * Used for Stroke Play and Par game types.
   */
  const getRunningGrossNet = useCallback(
    (playerId: string, playerHandicap: number): { gross: number; net: number } => {
      let totalGross = 0;
      let totalNet = 0;

      for (let holeNum = 1; holeNum < currentHole; holeNum++) {
        const holeData = holes.find((h) => h.number === holeNum);
        if (!holeData) continue;

        const score = getPlayerScore(playerId, holeNum);
        if (!score) continue;

        const strokes = isSingleBallScore(score) ? score.strokes : undefined;
        if (!strokes || strokes <= 0 || strokes === PICKUP_SCORE) continue;

        totalGross += strokes;
        totalNet += calculateNetScore(strokes, playerHandicap, holeData);
      }

      return { gross: totalGross, net: totalNet };
    },
    [currentHole, holes, getPlayerScore]
  );

  /**
   * Calculate running par score for a player up to (but not including) the current hole.
   * Returns sum of +1 (win), 0 (square), -1 (loss) for each completed hole.
   */
  const getRunningParScore = useCallback(
    (playerId: string, playerHandicap: number): number => {
      let totalParScore = 0;
      for (let holeNum = 1; holeNum < currentHole; holeNum++) {
        const holeData = holes.find((h) => h.number === holeNum);
        if (!holeData) continue;
        const score = getPlayerScore(playerId, holeNum);
        if (!score) continue;
        const strokes = isSingleBallScore(score) ? score.strokes : undefined;
        if (!strokes || strokes <= 0 || strokes === PICKUP_SCORE) continue;
        const strokesReceived = getStrokesOnHole(playerHandicap, holeData);
        totalParScore += calculateParScore(strokes, holeData.par, strokesReceived);
      }
      return totalParScore;
    },
    [currentHole, holes, getPlayerScore]
  );

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
                shotContributions={getTeamShotContributions(index)}
                onShotContributionsChange={createShotContributionsHandler(index)}
                // Legacy props - kept for backward compatibility
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

  // Team round: Shamble format
  // Best drive selected, then each player plays their own ball - sum all Stableford points
  if (isTeamRound && teamFormat === 'shamble' && teams.length > 0) {
    // Build set of editable player IDs (players the current user can score)
    const editablePlayerIds =
      scoringPairsEnabled && playersToScore.length > 0
        ? new Set(playersToScore.map((p) => p.id))
        : undefined;

    // Get drive contributor from the first team member's score (shared across team)
    const shambleDriveContributor = (() => {
      const firstMember = teams[0]?.members?.[0];
      if (!firstMember) return undefined;
      const score = playerScoresMap.get(firstMember.player_id);
      if (score && isSingleBallScore(score)) {
        return score.shotContributions?.drive;
      }
      return undefined;
    })();

    return (
      <>
        {teams.map((team, index) => (
          <React.Fragment key={team.id}>
            <DriveContributorPicker
              team={team}
              selectedPlayerId={shambleDriveContributor}
              onSelect={(playerId) => {
                // Store drive contributor in shotContributions
                if (handleShotContributionsChange) {
                  handleShotContributionsChange(index, { drive: playerId });
                }
              }}
            />
            <BestBallScoreView
              team={team}
              currentHole={currentHoleData}
              playerScores={playerScoresMap}
              onScoreSelect={handleBestBallScoreSelect}
              editablePlayerIds={editablePlayerIds}
              aggregation="sum"
              formatLabel="Shamble Format"
            />
          </React.Fragment>
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
        onBallStatsChange={onMultiBallStatsChange ? (ballIndex, updates) => onMultiBallStatsChange(player.id, ballIndex, updates) : undefined}
        showFIR={showFIR}
        showGIR={showGIR}
      />
    );
  }

  // Stroke Play & Par: Individual scoring with relative-to-par UI
  if ((gameType === 'stroke' || gameType === 'par') && !isTeamRound) {
    const isPar = gameType === 'par';
    return (
      <>
        {/* Wolf Decision Prompt - show for individual play game types */}
        {wolfGame && onWolfChoosePartner && (
          <WolfDecisionPrompt
            wolfGame={wolfGame}
            currentHole={currentHole}
            currentDecision={wolfDecision}
            onChoosePartner={onWolfChoosePartner}
            isProcessing={isWolfProcessing}
          />
        )}
        {playersToRender.map((player) => {
          const handicap = player.handicap ?? 0;
          const { gross, net } = getRunningGrossNet(player.id, handicap);
          return (
            <StrokePlayScoreCard
              key={player.id}
              player={player}
              currentHole={currentHoleData}
              currentScore={getPlayerScore(player.id, currentHole)}
              onScoreSelect={(strokes) => onScoreSelect(player.id, strokes)}
              onStatsUpdate={(updates) => onStatsUpdate(player.id, updates)}
              onPlayerPress={() => onPlayerPress(player.id)}
              runningGross={gross}
              runningNet={net}
              displayMode={isPar ? 'par' : 'stroke'}
              runningParScore={isPar ? getRunningParScore(player.id, handicap) : undefined}
              isOwnScore={scoringPairsEnabled && currentUserId ? player.id === currentUserId : undefined}
            />
          );
        })}
        {!isPar && (
          <StrokePlayLeaderboard
            players={playersToRender}
            getPlayerScore={getPlayerScore}
            currentHole={currentHole}
            holes={holes}
            currentUserId={currentUserId}
            sortBy="net"
          />
        )}
      </>
    );
  }

  // Default: Individual player scoring (Stableford and other formats)
  // For Stableford, we show running total points
  const isStableford = gameType === 'stableford';

  return (
    <>
      {/* Wolf Decision Prompt - show for Stableford individual play */}
      {wolfGame && onWolfChoosePartner && (
        <WolfDecisionPrompt
          wolfGame={wolfGame}
          currentHole={currentHole}
          currentDecision={wolfDecision}
          onChoosePartner={onWolfChoosePartner}
          isProcessing={isWolfProcessing}
        />
      )}
      {playersToRender.map((player) => (
        <PlayerScoreCard
          key={player.id}
          player={player}
          currentHole={currentHoleData}
          currentScore={getPlayerScore(player.id, currentHole)}
          onScoreSelect={(strokes) => onScoreSelect(player.id, strokes)}
          onStatsUpdate={(updates) => onStatsUpdate(player.id, updates)}
          onPlayerPress={onPlayerPress}
          runningTotalPoints={isStableford ? getRunningTotalPoints(player.id, player.handicap ?? 0) : undefined}
          showPointsPreview={isStableford}
          isOwnScore={scoringPairsEnabled && currentUserId ? player.id === currentUserId : undefined}
        />
      ))}
    </>
  );
}

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

import React, { useCallback, useMemo } from 'react';
import {
  PlayerScoreCard,
  TeamScoreCard,
  BestBallScoreView,
  BestBallTeamHeader,
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
import type { TeeBox } from '@/types/database/base';
import { resolvePlayerTee } from '@/utils/teeResolution';
import { getTeeColor } from '@/services/courses';
import type { BallCount } from '@/types/multiball.types';
import { isSingleBallScore } from '@/types/database';
import { calculateStablefordPointsNet, calculateNetScore, calculateParScore, getStrokesOnHole, getStrokesReceived } from '@/utils/scoring';
import { PICKUP_SCORE } from '@/constants/scoring';
import { useSettingsStore } from '@/store/settingsStore';

/** Display info for a player's handicap on scorecard cards */
export interface PlayerHandicapDisplay {
  /** Effective HC used for scoring calculations */
  playingHandicap: number;
  /** Rounded daily handicap (null if not applied -- no tee/rating data) */
  dailyHandicap: number | null;
  /** Raw decimal base value (profile HC or social index) */
  baseHandicap: number;
  /** Label for the base value: 'HC' (profile) or 'SHC' (social handicap) */
  baseLabel: string;
}

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
  /**
   * Competition-level teams. Populated for any competition round (regardless
   * of `isTeamRound`) so individual cards can label players with their team
   * — e.g. singles match play where each player belongs to a competition
   * team but scores individually.
   */
  competitionTeams?: TeamWithMembers[];
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
  /** True when at least one tier-gated detailed stats field is visible.
   *  Drives whether the best-ball compact view shows its per-player stats
   *  button. */
  anyStatsVisible?: boolean;
  // Playing handicap display info (daily HC when tee/rating data is available)
  playerHandicapMap?: Map<string, PlayerHandicapDisplay>;
  // Tee dot indicators (shown when players play from different tees)
  showTeeDots?: boolean;
  playerTeeMap?: Map<string, TeeBox>;
  selectedTeeData?: TeeBox | null;
  // Wolf game props
  wolfGame?: WolfGameWithParticipants | null;
  wolfDecision?: WolfHoleDecision | null;
  onWolfChoosePartner?: () => void;
  isWolfProcessing?: boolean;
  // Detailed stats sheet callback (hoisted to screen level)
  onDetailedStatsPress?: (playerId: string) => void;
  // Solo round (hide leaderboard)
  isSoloRound?: boolean;
  /**
   * When provided and scoring pairs are NOT enabled, replaces `currentPlayers`
   * in the rendered list. Used by the group-filter feature to scope scoring
   * to the signed-in user's pairing.
   */
  playersOverride?: Player[];
  /**
   * Round ID — forwarded to PlayerScoreCard so it can render the inline
   * "Log Shot" action for shot-tracking-eligible rounds.
   */
  roundId?: string;
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
  competitionTeams = [],
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
  anyStatsVisible = false,
  // Playing handicap display info (daily HC when tee/rating data is available)
  playerHandicapMap,
  // Tee dot indicators
  showTeeDots = false,
  playerTeeMap,
  selectedTeeData,
  // Wolf game props
  wolfGame,
  wolfDecision,
  onWolfChoosePartner,
  isWolfProcessing = false,
  onDetailedStatsPress,
  isSoloRound = false,
  playersOverride,
  roundId,
}: ScorecardScoreContentProps) {
  // Map of player_id -> team name, used to render team affiliation under
  // each player's name on individual score cards. Sources, in priority:
  //  1. Competition-level teams (covers singles match play and any
  //     individual round inside a team competition).
  //  2. Round-level `teams` (covers standalone team rounds built from
  //     team_config when there is no competition).
  const playerTeamNames = useMemo(() => {
    const map = new Map<string, string>();
    const sources: TeamWithMembers[][] = [];
    if (competitionTeams.length > 0) sources.push(competitionTeams);
    if (teams.length > 0) sources.push(teams);
    for (const source of sources) {
      for (const team of source) {
        for (const member of team.members ?? []) {
          if (member.player_id && team.name && !map.has(member.player_id)) {
            map.set(member.player_id, team.name);
          }
        }
      }
    }
    return map;
  }, [competitionTeams, teams]);
  // Get shot contributions for a specific team (persisted in scorecard)
  // Each team stores its own contributions in its members' scorecards.
  // Reads via getPlayerScore directly so the UI reflects store updates immediately
  // (playerScoresMap is memoized without groupScorecards as a dep and would be stale here).
  const getTeamShotContributions = useCallback(
    (teamIndex: number): ShotContributions | undefined => {
      if (!isTeamRound || (teamFormat !== 'scramble' && teamFormat !== 'alt-shot') || teams.length === 0) {
        return undefined;
      }
      const team = teams[teamIndex];
      const firstMember = team?.members?.[0];
      if (!firstMember) return undefined;

      const score = getPlayerScore(firstMember.player_id, currentHole);
      if (score && isSingleBallScore(score)) {
        return score.shotContributions;
      }
      return undefined;
    },
    [isTeamRound, teamFormat, teams, getPlayerScore, currentHole]
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

  // Helper: get the playing handicap for a player (daily HC when tee data is available, raw otherwise)
  const getHandicap = useCallback(
    (player: Player): number => playerHandicapMap?.get(player.id)?.playingHandicap ?? player.handicap ?? 0,
    [playerHandicapMap]
  );

  // Helper: get the full handicap display info for a player
  const getHandicapDisplay = useCallback(
    (player: Player): PlayerHandicapDisplay | undefined => playerHandicapMap?.get(player.id),
    [playerHandicapMap]
  );

  // Determine which players to render based on scoring pairs setting
  // When scoring pairs are off, an optional `playersOverride` (e.g. group filter) wins over the full list
  const playersToRender =
    scoringPairsEnabled && playersToScore.length > 0
      ? playersToScore
      : playersOverride ?? currentPlayers;

  // Auto-collapse the FIR/GIR/Putts stats row when scoring 3+ players (configurable in settings)
  const autoCollapseStats = useSettingsStore((s) => s.autoCollapseStatsForLargeGroups);
  const collapseStatsByDefault = autoCollapseStats && playersToRender.length >= 3;

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
        const strokesReceived = getStrokesReceived(playerHandicap, holeData.strokeIndex);
        totalPoints += calculateStablefordPointsNet(strokes, holeData.par, strokesReceived);
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
    (playerId: string, playerHandicap: number): { gross: number; net: number; par: number } => {
      let totalGross = 0;
      let totalNet = 0;
      let totalPar = 0;

      for (let holeNum = 1; holeNum < currentHole; holeNum++) {
        const holeData = holes.find((h) => h.number === holeNum);
        if (!holeData) continue;

        const score = getPlayerScore(playerId, holeNum);
        if (!score) continue;

        const strokes = isSingleBallScore(score) ? score.strokes : undefined;
        if (!strokes || strokes <= 0 || strokes === PICKUP_SCORE) continue;

        totalGross += strokes;
        totalNet += calculateNetScore(strokes, playerHandicap, holeData);
        totalPar += holeData.par;
      }

      return { gross: totalGross, net: totalNet, par: totalPar };
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

  // Team round: Scramble / Alt Shot format (single-ball formats)
  if (isTeamRound && (teamFormat === 'scramble' || teamFormat === 'alt-shot') && teams.length > 0) {
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
  if (isTeamRound && teamFormat === 'best-ball' && teams.length > 0) {
    // Branch A — scoring pairs ON: each scorer is only entering scores for
    // their pair, so use the full per-player Stableford UI for richer score
    // entry, with a team-points header card on top per team for context.
    if (scoringPairsEnabled && playersToScore.length > 0) {
      const editablePlayerIds = new Set(playersToScore.map((p) => p.id));
      return (
        <>
          {teams.map((team) => {
            const members = team.members ?? [];
            // Skip teams where no member is in the user's pair so the user
            // doesn't see an opposing team's full Stableford layout.
            const hasEditableMember = members.some((m) =>
              editablePlayerIds.has(m.player_id)
            );
            if (!hasEditableMember) return null;
            return (
              <React.Fragment key={team.id}>
                <BestBallTeamHeader
                  team={team}
                  holes={holes}
                  currentHole={currentHoleData}
                  getPlayerScore={getPlayerScore}
                />
                {members.map((member) => {
                  const player = member.player;
                  if (!player) return null;
                  const isEditable = editablePlayerIds.has(player.id);
                  const handicapDisplay = getHandicapDisplay(player);
                  const teeDotColor = showTeeDots && playerTeeMap
                    ? getTeeColor(
                        resolvePlayerTee(
                          player.id,
                          playerTeeMap,
                          selectedTeeData ?? null
                        )?.name ?? ''
                      )
                    : undefined;
                  return (
                    <PlayerScoreCard
                      key={player.id}
                      player={player}
                      currentHole={currentHoleData}
                      currentScore={getPlayerScore(player.id, currentHole)}
                      onScoreSelect={(strokes) =>
                        handleBestBallScoreSelect(player.id, strokes)
                      }
                      onStatsUpdate={(updates) => onStatsUpdate(player.id, updates)}
                      onPlayerPress={onPlayerPress}
                      runningTotalPoints={getRunningTotalPoints(
                        player.id,
                        getHandicap(player)
                      )}
                      showPointsPreview
                      isOwnScore={
                        currentUserId ? player.id === currentUserId : undefined
                      }
                      teeDotColor={teeDotColor}
                      onDetailedStatsPress={
                        onDetailedStatsPress
                          ? () => onDetailedStatsPress(player.id)
                          : undefined
                      }
                      playingHandicap={handicapDisplay?.playingHandicap}
                      dailyHandicap={handicapDisplay?.dailyHandicap}
                      baseHandicap={handicapDisplay?.baseHandicap}
                      baseLabel={handicapDisplay?.baseLabel}
                      collapseStatsByDefault={collapseStatsByDefault}
                      teamName={playerTeamNames.get(player.id)}
                      disabled={!isEditable}
                      roundId={roundId}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}
        </>
      );
    }

    // Branch B — scoring pairs OFF: keep the compact per-team view with all
    // players visible. Adds a stats action that opens the detailed stats
    // sheet at screen level.
    return (
      <>
        {teams.map((team) => (
          <BestBallScoreView
            key={team.id}
            team={team}
            currentHole={currentHoleData}
            playerScores={playerScoresMap}
            onScoreSelect={handleBestBallScoreSelect}
            onPlayerStatsPress={onDetailedStatsPress}
            anyStatsVisible={anyStatsVisible}
            onPlayerPress={onPlayerPress}
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
        return score.shotContributions?.teeShot;
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
                if (handleShotContributionsChange) {
                  handleShotContributionsChange(index, { teeShot: playerId });
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
              onPlayerPress={onPlayerPress}
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
          const handicap = getHandicap(player);
          const handicapDisplay = getHandicapDisplay(player);
          const { gross, par } = getRunningGrossNet(player.id, handicap);
          const teeDotColor = showTeeDots && playerTeeMap
            ? getTeeColor(resolvePlayerTee(player.id, playerTeeMap, selectedTeeData ?? null)?.name ?? '')
            : undefined;
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
              cumulativePar={par}
              displayMode={isPar ? 'par' : 'stroke'}
              runningParScore={isPar ? getRunningParScore(player.id, handicap) : undefined}
              isOwnScore={scoringPairsEnabled && currentUserId ? player.id === currentUserId : undefined}
              teeDotColor={teeDotColor}
              onDetailedStatsPress={onDetailedStatsPress ? () => onDetailedStatsPress(player.id) : undefined}
              playingHandicap={handicapDisplay?.playingHandicap}
              dailyHandicap={handicapDisplay?.dailyHandicap}
              baseHandicap={handicapDisplay?.baseHandicap}
              baseLabel={handicapDisplay?.baseLabel}
              collapseStatsByDefault={collapseStatsByDefault}
              teamName={playerTeamNames.get(player.id)}
            />
          );
        })}
        {!isPar && !isSoloRound && (
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
      {playersToRender.map((player) => {
        const handicapDisplay = getHandicapDisplay(player);
        const teeDotColor = showTeeDots && playerTeeMap
          ? getTeeColor(resolvePlayerTee(player.id, playerTeeMap, selectedTeeData ?? null)?.name ?? '')
          : undefined;
        return (
          <PlayerScoreCard
            key={player.id}
            player={player}
            currentHole={currentHoleData}
            currentScore={getPlayerScore(player.id, currentHole)}
            onScoreSelect={(strokes) => onScoreSelect(player.id, strokes)}
            onStatsUpdate={(updates) => onStatsUpdate(player.id, updates)}
            onPlayerPress={onPlayerPress}
            runningTotalPoints={isStableford ? getRunningTotalPoints(player.id, getHandicap(player)) : undefined}
            showPointsPreview={isStableford}
            isOwnScore={scoringPairsEnabled && currentUserId ? player.id === currentUserId : undefined}
            teeDotColor={teeDotColor}
            onDetailedStatsPress={onDetailedStatsPress ? () => onDetailedStatsPress(player.id) : undefined}
            playingHandicap={handicapDisplay?.playingHandicap}
            dailyHandicap={handicapDisplay?.dailyHandicap}
            baseHandicap={handicapDisplay?.baseHandicap}
            baseLabel={handicapDisplay?.baseLabel}
            collapseStatsByDefault={collapseStatsByDefault}
            teamName={playerTeamNames.get(player.id)}
            roundId={roundId}
          />
        );
      })}
    </>
  );
}

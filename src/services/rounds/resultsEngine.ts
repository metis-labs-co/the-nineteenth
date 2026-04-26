/**
 * Round Results Engine
 *
 * Single source of truth for "what does finalization do for this game type?".
 * The orchestrator (`refinalizeRoundResults`) consults this contract instead
 * of branching by game type ad-hoc.
 *
 * Shape semantics:
 *   - 'individual'                     → write player rows only (Stableford,
 *                                        Stroke, Par, individual Match Play).
 *   - 'team-only'                      → write team rows only; never write
 *                                        per-player rows (Scramble, Best Ball,
 *                                        Shamble — formats where the team is
 *                                        the unit of competition).
 *   - 'individual+team-aggregated'     → reserved for templates that overlay
 *                                        team aggregation on an individual
 *                                        format (e.g. Team Stableford
 *                                        best-3-of-4). Triggered by the
 *                                        rules_override at the orchestrator
 *                                        level, not the base game type.
 *   - 'pair-points'                    → split-round (Ryder Cup) pair points;
 *                                        handled by finalizePairResults.
 *
 * Why team-only formats deserve their own shape: previously the orchestrator
 * always called finalizeRound (writing player rows) and then conditionally
 * called finalizeTeamResults gated on rules_override.team_points being set.
 * For Scramble that meant a round with no template wrote individual rows
 * with no team rows — both leaderboards looked broken. Routing Scramble
 * through 'team-only' fixes the data shape regardless of override state.
 */

import type { GameType } from '@/types/database/enums';
import type { RoundResultData } from '@/types/database/team.types';
import type { Scorecard } from '@/types/database/scorecard.types';
import {
  computeScrambleTeamRoundScore,
  type ScrambleTeamMember,
} from '@/utils/teamScoring/scramble';

export type RoundShape =
  | 'individual'
  | 'team-only'
  | 'individual+team-aggregated'
  | 'pair-points';

export interface PickedScore {
  rawScore: number;
  rawResultData: RoundResultData;
}

/**
 * Team member context the engine needs to compute team-format scores.
 * Notably: handicap, which scramble's 25%-of-sum formula reads.
 */
export interface EngineTeamMember {
  player_id: string;
  handicap: number | null | undefined;
}

export interface RoundEngineSpec {
  gameType: GameType;
  /** Base shape for the game type, before any rules_override is consulted. */
  shape: Exclude<RoundShape, 'individual+team-aggregated' | 'pair-points'>;
  /** Direction that "better" goes — used for position ranking. */
  betterDirection: 'higher' | 'lower';
  /**
   * Pick the per-team raw score from one team's completed scorecards.
   *
   * For scramble: computes team handicap (25% of sum of member handicaps)
   * and team net (gross - floor(team_handicap)) using the shared
   * `computeScrambleTeamRoundScore` utility. Returns team_handicap +
   * team_gross + team_net in raw_result_data so the round results card
   * can render the correct HC.
   *
   * For best-ball / shamble: takes the first scorecard's total directly
   * (the entry UI aggregates per hole before submission). This is an
   * approximation for round-total ranking; per-hole aggregation is a
   * separate concern not handled at finalization time.
   */
  pickTeamRawScore(
    teamScorecards: Scorecard[],
    teamMembers: EngineTeamMember[]
  ): PickedScore;
  /**
   * Pick the per-player raw score from a player's scorecard. Used by the
   * 'individual' shape's finalization path. Mirrors the inline switch in
   * roundResultsService.calculateStandardResults().
   */
  pickIndividualRawScore(scorecard: Scorecard): PickedScore;
}

function pickStablefordIndividual(sc: Scorecard): PickedScore {
  return { rawScore: sc.total_points, rawResultData: { stableford_points: sc.total_points } };
}

function pickStrokeIndividual(sc: Scorecard): PickedScore {
  return {
    rawScore: sc.total_net,
    rawResultData: { gross_score: sc.total_gross, net_score: sc.total_net },
  };
}

function pickParIndividual(sc: Scorecard): PickedScore {
  return {
    rawScore: sc.total_par_score ?? 0,
    rawResultData: {
      par_score: sc.total_par_score,
      gross_score: sc.total_gross,
      net_score: sc.total_net,
    },
  };
}

/**
 * Team-format scorecards (best-ball, scramble, shamble) carry the team's
 * round total in `total_points` (when scored as Stableford) or `total_net`
 * (when scored as stroke). We prefer points when present, falling back to
 * net — matching the existing `calculateStandardResults` behaviour.
 */
function pickTeamFormatScore(sc: Scorecard): PickedScore {
  const rawScore = sc.total_points || sc.total_net;
  return {
    rawScore,
    rawResultData: {
      team_score: rawScore,
      gross_score: sc.total_gross,
      net_score: sc.total_net,
    },
  };
}

function pickFirstScorecard(
  teamScorecards: Scorecard[],
  _teamMembers: EngineTeamMember[]
): PickedScore {
  if (teamScorecards.length === 0) {
    throw new Error('pickTeamRawScore called with empty scorecards array');
  }
  return pickTeamFormatScore(teamScorecards[0]);
}

/**
 * Scramble: team plays one ball; gross is read from any team member's
 * scorecard (all should be identical). Team handicap is 25% of sum of
 * member handicaps. Net = gross - floor(team_handicap). Stored in
 * raw_result_data so the round results card can render team_handicap as
 * the HC column instead of the misleading rounded avg of member handicaps.
 */
function pickScrambleScore(
  teamScorecards: Scorecard[],
  teamMembers: EngineTeamMember[]
): PickedScore {
  if (teamScorecards.length === 0) {
    throw new Error('pickTeamRawScore called with empty scorecards array');
  }
  const members: ScrambleTeamMember[] = teamMembers.map((m) => ({
    player_id: m.player_id,
    handicap: m.handicap,
  }));
  const score = computeScrambleTeamRoundScore(teamScorecards, members);
  return {
    // Lower is better for stroke scramble; calculateCompetitionPoints
    // infers direction from gameType ('scramble' → ascending sort), so
    // raw_score being team_net gives the correct ranking.
    rawScore: score.teamNet,
    rawResultData: {
      team_score: score.teamNet,
      gross_score: score.teamGross,
      net_score: score.teamNet,
      team_handicap: score.teamHandicap,
    },
  };
}

const STABLEFORD: RoundEngineSpec = {
  gameType: 'stableford',
  shape: 'individual',
  betterDirection: 'higher',
  pickIndividualRawScore: pickStablefordIndividual,
  pickTeamRawScore: pickFirstScorecard,
};

const STROKE: RoundEngineSpec = {
  gameType: 'stroke',
  shape: 'individual',
  betterDirection: 'lower',
  pickIndividualRawScore: pickStrokeIndividual,
  pickTeamRawScore: pickFirstScorecard,
};

const PAR: RoundEngineSpec = {
  gameType: 'par',
  shape: 'individual',
  betterDirection: 'higher',
  pickIndividualRawScore: pickParIndividual,
  pickTeamRawScore: pickFirstScorecard,
};

const MATCH_PLAY: RoundEngineSpec = {
  gameType: 'match-play',
  shape: 'individual',
  // Direction isn't meaningful for match-play (results are win/loss/halved,
  // not rankable scores). Keep at 'higher' since holes_won is higher-better.
  betterDirection: 'higher',
  // Match-play has its own dedicated path (calculateMatchPlayResults) — these
  // pickers are placeholders for shape consistency and aren't called.
  pickIndividualRawScore: pickStablefordIndividual,
  pickTeamRawScore: pickFirstScorecard,
};

const SCRAMBLE: RoundEngineSpec = {
  gameType: 'scramble',
  shape: 'team-only',
  // Stroke-based: lower team net wins. calculateCompetitionPoints infers
  // ascending sort from gameType === 'scramble'.
  betterDirection: 'lower',
  pickIndividualRawScore: pickTeamFormatScore,
  pickTeamRawScore: pickScrambleScore,
};

const BEST_BALL: RoundEngineSpec = {
  gameType: 'best-ball',
  shape: 'team-only',
  betterDirection: 'higher',
  pickIndividualRawScore: pickTeamFormatScore,
  // Best-ball / shamble round-totals at finalization time use the simpler
  // "first scorecard's total" approach — proper per-hole aggregation needs
  // hole data and is a separate enhancement.
  pickTeamRawScore: pickFirstScorecard,
};

const SHAMBLE: RoundEngineSpec = {
  gameType: 'shamble',
  shape: 'team-only',
  betterDirection: 'higher',
  pickIndividualRawScore: pickTeamFormatScore,
  pickTeamRawScore: pickFirstScorecard,
};

export const ROUND_ENGINES: Record<GameType, RoundEngineSpec> = {
  stableford: STABLEFORD,
  stroke: STROKE,
  par: PAR,
  'match-play': MATCH_PLAY,
  scramble: SCRAMBLE,
  'best-ball': BEST_BALL,
  shamble: SHAMBLE,
};

/** Game types whose unit of competition is the team, not the player. */
export const TEAM_ONLY_GAME_TYPES: GameType[] = (
  Object.values(ROUND_ENGINES)
    .filter((e) => e.shape === 'team-only')
    .map((e) => e.gameType)
);

export function getEngine(gameType: GameType): RoundEngineSpec {
  const engine = ROUND_ENGINES[gameType];
  if (!engine) {
    throw new Error(`No results engine configured for game type: ${gameType}`);
  }
  return engine;
}

export function isTeamOnlyGameType(
  gameType: GameType | string | null | undefined
): boolean {
  if (!gameType) return false;
  const engine = ROUND_ENGINES[gameType as GameType];
  return engine?.shape === 'team-only';
}
